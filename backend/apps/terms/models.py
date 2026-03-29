"""
Richwell Portal — Terms Models

This module defines the academic calendar periods (terms), including 
enrollment windows, advising periods, and grade submission deadlines.
"""

from django.db import models
from django.core.exceptions import ValidationError
from apps.auditing.mixins import AuditMixin

class Term(AuditMixin, models.Model):
    """
    Represents an academic term (e.g., First Semester 2027-2028).
    Manages all critical dates and global state for the portal during its duration.
    """
    SEMESTER_CHOICES = [
        ('1', 'First Semester'),
        ('2', 'Second Semester'),
        ('S', 'Summer'),
    ]

    code = models.CharField(max_length=10, unique=True, help_text="e.g., 2027-1, 2027-2, 2027-S")
    academic_year = models.CharField(max_length=20, help_text="e.g., 2027-2028")
    semester_type = models.CharField(max_length=2, choices=SEMESTER_CHOICES)
    
    start_date = models.DateField()
    end_date = models.DateField()
    
    enrollment_start = models.DateField()
    enrollment_end = models.DateField()
    
    advising_start = models.DateField()
    advising_end = models.DateField()
    
    schedule_picking_start = models.DateField(null=True, blank=True)
    schedule_picking_end = models.DateField(null=True, blank=True)
    schedule_published = models.BooleanField(default=False, help_text="Dean publishes schedule to open student picking")
    
    midterm_grade_start = models.DateField(null=True, blank=True)
    midterm_grade_end = models.DateField(null=True, blank=True)
    
    final_grade_start = models.DateField(null=True, blank=True)
    final_grade_end = models.DateField(null=True, blank=True)
    grade_submission_deadline = models.DateTimeField(null=True, blank=True, help_text="Hard deadline for all grade submissions")
    
    is_active = models.BooleanField(default=False)
    is_grades_locked = models.BooleanField(default=False, help_text="Global lock: No more grade edits allowed for this term")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-academic_year', '-semester_type']

    def __str__(self):
        """
        Returns a human readable term identifier.
        """
        return f"{self.academic_year} - {self.get_semester_type_display()} ({self.code})"

    def save(self, *args, **kwargs):
        """
        Custom save logic to enforce that only one term is active at a time.
        """
        if self.is_active:
            # Extract audit context to propagate to other terms
            audit_user = kwargs.get('audit_user')
            audit_ip = kwargs.get('audit_ip')
            
            # Deactivate all other terms if this one is active
            other_active_terms = Term.objects.filter(is_active=True).exclude(pk=self.pk)
            for term in other_active_terms:
                term.is_active = False
                term.save(audit_user=audit_user, audit_ip=audit_ip)

        super().save(*args, **kwargs)

    def clean(self):
        """
        Validates date ranges and logical constraints for the term.
        """
        # Basic date validation
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValidationError("Start date cannot be after end date.")
        
        if self.enrollment_start and self.enrollment_end and self.enrollment_start > self.enrollment_end:
            raise ValidationError("Enrollment start cannot be after enrollment end.")
        
        # Ensure enrollment is within term range or starts before
        if self.enrollment_start and self.start_date and self.enrollment_start > self.start_date:
             # Enrollment usually starts before or on the term start
             pass
