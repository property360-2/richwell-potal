"""
Grade & GPA models (EPIC 5).
Split from enrollment/models.py for maintainability.
"""

from decimal import Decimal
from django.db import models
from django.conf import settings

from apps.core.models import BaseModel
from .models import SubjectEnrollment, Enrollment


# ============================================================
# EPIC 5 — Grade & GPA Models
# ============================================================

class GradeHistory(BaseModel):
    """
    Tracks grade changes for audit purposes.
    Every grade submission or change creates a history entry.
    """
    
    subject_enrollment = models.ForeignKey(
        SubjectEnrollment,
        on_delete=models.CASCADE,
        related_name='grade_history'
    )
    previous_grade = models.CharField(
        max_length=5,
        null=True,
        blank=True,
        help_text='Previous grade value'
    )
    new_grade = models.CharField(
        max_length=5,
        null=True,
        blank=True,
        help_text='New grade value'
    )
    previous_status = models.CharField(
        max_length=20,
        choices=SubjectEnrollment.Status.choices,
        help_text='Status before change'
    )
    new_status = models.CharField(
        max_length=20,
        choices=SubjectEnrollment.Status.choices,
        help_text='Status after change'
    )
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='grade_changes',
        help_text='User who made the change'
    )
    change_reason = models.TextField(
        blank=True,
        help_text='Reason for the change (required for overrides)'
    )
    is_system_action = models.BooleanField(
        default=False,
        help_text='Whether this was an automated system action (e.g., INC expiry)'
    )
    is_finalization = models.BooleanField(
        default=False,
        help_text='Whether this was a registrar finalization action'
    )
    
    class Meta:
        verbose_name = 'Grade History'
        verbose_name_plural = 'Grade Histories'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.subject_enrollment} - {self.previous_grade} → {self.new_grade}"


class SemesterGPA(BaseModel):
    """
    Stores calculated GPA per semester for quick access.
    Updated automatically when grades are finalized.
    """
    
    enrollment = models.OneToOneField(
        Enrollment,
        on_delete=models.CASCADE,
        related_name='gpa_record'
    )
    gpa = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Calculated semester GPA'
    )
    total_units = models.IntegerField(
        default=0,
        help_text='Total units included in GPA calculation'
    )
    total_grade_points = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Sum of (grade × units)'
    )
    subjects_included = models.IntegerField(
        default=0,
        help_text='Number of subjects included in GPA'
    )
    calculated_at = models.DateTimeField(
        auto_now=True,
        help_text='When GPA was last calculated'
    )
    is_finalized = models.BooleanField(
        default=False,
        help_text='Whether all grades are finalized'
    )
    
    class Meta:
        verbose_name = 'Semester GPA'
        verbose_name_plural = 'Semester GPAs'
    
    def __str__(self):
        return f"{self.enrollment} - GPA: {self.gpa}"


class GradeResolution(BaseModel):
    """
    Formal request handling for grade changes/resolutions.
    Required for changing grades after they are finalized or during restricted periods.
    Workflow: Professor Request -> Registrar Review -> Program Head Approval
    """
    
    class Status(models.TextChoices):
        PENDING_REGISTRAR = 'PENDING_REGISTRAR', 'Pending Registrar Review'
        PENDING_HEAD = 'PENDING_HEAD', 'Pending Program Head Approval'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        CANCELLED = 'CANCELLED', 'Cancelled'

    subject_enrollment = models.ForeignKey(
        'enrollment.SubjectEnrollment',
        on_delete=models.CASCADE,
        related_name='grade_resolutions',
        help_text='The enrollment record being resolved'
    )
    
    current_grade = models.CharField(max_length=5, null=True, blank=True)
    proposed_grade = models.CharField(max_length=5, null=True, blank=True)
    
    current_status = models.CharField(max_length=20) # Snapshot of status
    proposed_status = models.CharField(max_length=20)
    
    reason = models.TextField(help_text='Reason for grade change request')
    
    # Workflow Tracking
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING_HEAD
    )
    
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='requested_resolutions'
    )
    
    reviewed_by_registrar = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_resolutions_registrar'
    )
    registrar_notes = models.TextField(blank=True)
    registrar_action_at = models.DateTimeField(null=True, blank=True)
    
    reviewed_by_head = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_resolutions_head'
    )
    head_notes = models.TextField(blank=True)
    head_action_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = "Grade Resolution"
        verbose_name_plural = "Grade Resolutions"
        ordering = ['-created_at']

    def __str__(self):
        return f"Resolution for {self.subject_enrollment} ({self.status})"
