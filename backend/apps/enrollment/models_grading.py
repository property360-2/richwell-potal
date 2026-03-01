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
    Grade resolution workflow (Sir Gil's 5-step flow):
    1. Professor/Dean opens request
    2. Registrar reviews and approves to proceed
    3. Professor/Dean inputs grade + comment
    4. Head reviews and approves
    5. Registrar final sign-off → grade applied

    If professor is inactive/resigned, Dean can submit on their behalf.
    """

    class Status(models.TextChoices):
        # Step 1: Request submitted → waiting for registrar initial review
        PENDING_REGISTRAR_INITIAL = 'PENDING_REGISTRAR_INITIAL', 'Pending Registrar Review'
        # Step 2: Registrar approved → waiting for professor/dean to input grade
        GRADE_INPUT_PENDING = 'GRADE_INPUT_PENDING', 'Waiting for Grade Input'
        # Step 3: Grade inputted → waiting for head approval
        PENDING_HEAD = 'PENDING_HEAD', 'Pending Head Approval'
        # Step 4: Head approved → waiting for registrar final sign-off
        PENDING_REGISTRAR_FINAL = 'PENDING_REGISTRAR_FINAL', 'Pending Registrar Final Approval'
        # Terminal states
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

    current_status = models.CharField(max_length=20)
    proposed_status = models.CharField(max_length=20)

    reason = models.TextField(help_text='Reason for grade change request')

    # Workflow status
    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.PENDING_REGISTRAR_INITIAL
    )

    # Step 1: Who requested
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='requested_resolutions'
    )
    submitted_by_dean = models.BooleanField(
        default=False,
        help_text='True if dean submitted on behalf of inactive/resigned professor'
    )

    # Step 2: Registrar initial review
    reviewed_by_registrar = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_resolutions_registrar'
    )
    registrar_notes = models.TextField(blank=True)
    registrar_action_at = models.DateTimeField(null=True, blank=True)

    # Step 3: Grade input by professor/dean
    grade_input_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='grade_input_resolutions',
        help_text='Professor or Dean who inputted the grade'
    )
    grade_input_at = models.DateTimeField(null=True, blank=True)
    grade_input_comment = models.TextField(
        blank=True,
        help_text='Optional comment from professor/dean when inputting grade'
    )

    # Step 4: Head approval
    reviewed_by_head = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_resolutions_head'
    )
    head_notes = models.TextField(blank=True)
    head_action_at = models.DateTimeField(null=True, blank=True)

    # Step 5: Registrar final — reuses reviewed_by_registrar fields
    # registrar_final_notes stored in registrar_notes (appended)
    registrar_final_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Grade Resolution"
        verbose_name_plural = "Grade Resolutions"
        ordering = ['-created_at']

    def __str__(self):
        return f"Resolution for {self.subject_enrollment} ({self.status})"

    @property
    def current_step_number(self):
        """Return the current step number (1-5) for UI display."""
        step_map = {
            self.Status.PENDING_REGISTRAR_INITIAL: 1,
            self.Status.GRADE_INPUT_PENDING: 2,
            self.Status.PENDING_HEAD: 3,
            self.Status.PENDING_REGISTRAR_FINAL: 4,
            self.Status.APPROVED: 5,
            self.Status.REJECTED: 0,
            self.Status.CANCELLED: 0,
        }
        return step_map.get(self.status, 0)
