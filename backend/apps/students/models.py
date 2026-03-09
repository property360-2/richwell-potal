from django.db import models
from django.conf import settings
from apps.academics.models import Program, CurriculumVersion
from apps.terms.models import Term

class Student(models.Model):
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
        ('APPROVED', 'Approved'),
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
    is_advising_unlocked = models.BooleanField(default=False, help_text="For transferees: Must be unlocked by registrar after crediting.")
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='APPLICANT')


    
    appointment_date = models.DateField(null=True, blank=True)
    document_checklist = models.JSONField(default=dict)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"[{self.idn}] {self.user.get_full_name()}"

    def save(self, *args, **kwargs):
        if not self.document_checklist:
            self.document_checklist = self.DEFAULT_CHECKLIST
        
        # Freshmen are unlocked by default, Transferees need registrar approval
        if not self.id and self.student_type == 'FRESHMAN':
            self.is_advising_unlocked = True
            
        super().save(*args, **kwargs)



class StudentEnrollment(models.Model):
    ADVISING_STATUS_CHOICES = [
        ('DRAFT', 'Draft/Open'),
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
    year_level = models.PositiveIntegerField(null=True, blank=True, help_text="Cached computed year level for this term")
    
    monthly_commitment = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    enrolled_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='enrolled_students')
    enrollment_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'term')
        ordering = ['-enrollment_date']

    def __str__(self):
        return f"{self.student.idn} - {self.term.code}"
