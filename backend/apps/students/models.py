"""
Richwell Portal — Student Models

This module defines the core student-related data structures, including the 
Student profile and term-specific StudentEnrollment records. It handles 
application status, document tracking, and graduation state.
"""

from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from apps.academics.models import Program, CurriculumVersion
from apps.terms.models import Term
from apps.auditing.mixins import AuditMixin

class Student(AuditMixin, models.Model):
    """
    Core student profile. Maintains personal information, academic program, 
    and document submission status. 
    
    Advising must be explicitly unlocked by the Registrar after physical 
    document verification. For transferees, advising is automatically 
    unlocked once their subject crediting request is approved by the 
    Program Head.
    """
    GENDER_CHOICES = [
        ('MALE', 'Male'),
        ('FEMALE', 'Female'),
        ('OTHER', 'Other'),
    ]

    STUDENT_TYPE_CHOICES = [
        ('FRESHMAN', 'Freshman'),
        ('TRANSFEREE', 'Transferee'),
        ('CURRENT', 'Current Student'),
    ]

    STATUS_CHOICES = [
        ('APPLICANT', 'Applicant'),
        ('ADMITTED', 'Admitted'),
        ('REJECTED', 'Rejected'),
        ('ENROLLED', 'Enrolled'),
        ('INACTIVE', 'Inactive'),
        ('GRADUATED', 'Graduated'),
    ]

    DEFAULT_CHECKLIST = {
        "F138": { "submitted": False, "verified": False },
        "PSA": { "submitted": False, "verified": False },
        "F137": { "submitted": False, "verified": False },
        "GOOD_MORAL": { "submitted": False, "verified": False },
        "PICTURE": { "submitted": False, "verified": False },
        "COG": { "submitted": False, "verified": False },
        "COR": { "submitted": False, "verified": False },
        "TOR": { "submitted": False, "verified": False },
        "HD": { "submitted": False, "verified": False },
        "CET": { "submitted": False, "verified": False }
    }

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='student_profile')
    idn = models.CharField(max_length=15, unique=True, help_text="e.g., 270001")
    
    middle_name = models.CharField(max_length=100, null=True, blank=True)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    
    address_municipality = models.CharField(max_length=100, null=True, blank=True)
    address_barangay = models.CharField(max_length=100, null=True, blank=True)
    address_full = models.TextField(null=True, blank=True)
    
    contact_number = models.CharField(max_length=20, null=True, blank=True)
    guardian_name = models.CharField(max_length=200, null=True, blank=True)
    guardian_contact = models.CharField(max_length=20, null=True, blank=True)
    
    program = models.ForeignKey(Program, on_delete=models.PROTECT)
    curriculum = models.ForeignKey(CurriculumVersion, on_delete=models.PROTECT)
    
    student_type = models.CharField(max_length=15, choices=STUDENT_TYPE_CHOICES)
    previous_school = models.CharField(max_length=255, null=True, blank=True, help_text="For transferees: Name of the previous school/university")
    is_advising_unlocked = models.BooleanField(default=False, help_text="Unlocked by Registrar after document verification, or automatically for transferees upon crediting approval.")
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='APPLICANT')


    
    appointment_date = models.DateField(null=True, blank=True)
    document_checklist = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        """
        Returns a human readable name of the student.
        Format: [IDN] Full Name
        """
        return f"[{self.idn}] {self.user.get_full_name()}"

    def clean(self):
        """
        Ensures data integrity for program and curriculum associations.
        """
        if self.curriculum and self.program and self.curriculum.program_id != self.program_id:
            raise ValidationError({
                'curriculum': f"The selected curriculum ({self.curriculum.version_name}) does not belong to the selected program ({self.program.name})."
            })

    def save(self, *args, **kwargs):
        """
        Overrides default save to enforce document checklist initialization
        and data integrity validation.

        # NOTE: Advising is normally NOT auto-unlocked on save to ensure verification.
        # It is explicitly unlocked in AdvisingService during the crediting approval flow.
        The Registrar must explicitly call the unlock-advising endpoint after
        physically verifying the student's documents.
        """
        if not self.document_checklist:
            self.document_checklist = self.DEFAULT_CHECKLIST

        self.full_clean()

        super().save(*args, **kwargs)



class StudentEnrollment(AuditMixin, models.Model):
    """
    Represents a student's enrollment for a particular academic term.
    Tracks advising status, monthly payment commitments, and computed year level.
    """
    ADVISING_STATUS_CHOICES = [
        ('DRAFT', 'Draft/Open'),
        ('FOR_ADVISING', 'For Advising'),
        ('PENDING', 'Pending Approval'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='enrollments')
    term = models.ForeignKey(Term, on_delete=models.CASCADE)
    
    advising_status = models.CharField(max_length=15, choices=ADVISING_STATUS_CHOICES, default='DRAFT')
    advising_approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_advisings')
    advising_approved_at = models.DateTimeField(null=True, blank=True)
    
    is_regular = models.BooleanField(default=True)
    regularity_reason = models.TextField(null=True, blank=True, help_text="Reason for being flagged as irregular")
    max_units_override = models.PositiveIntegerField(default=30, help_text="Maximum units allowed for this student in this term (default 30, max 36)")
    year_level = models.PositiveIntegerField(null=True, blank=True, help_text="Cached computed year level for this term")
    
    monthly_commitment = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    enrolled_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='enrolled_students')
    enrollment_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'term')
        ordering = ['-enrollment_date']

    def __str__(self):
        """
        Returns a human readable enrollment summary.
        Format: IDN - Term Code
        """
        return f"{self.student.idn} - {self.term.code}"
