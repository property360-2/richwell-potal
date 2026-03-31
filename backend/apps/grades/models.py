"""
Richwell Portal — Grades Models

This module defines the Grade data structure, which tracks student academic performance, 
subject enrollment status, midterm/final scores, and INC (Incomplete) resolution workflows.
It serves as the central record for transcript generation and advising.
"""

from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.auditing.mixins import AuditMixin


class Grade(AuditMixin, models.Model):
    """
    Represents a student's performance in a specific subject for a specific term.
    Tracks advising status, enrollment, and final grades, including support 
    for historical encoding and INC Resolution.
    """
    ADVISING_PENDING = 'PENDING'
    ADVISING_APPROVED = 'APPROVED'
    ADVISING_REJECTED = 'REJECTED'

    ADVISING_STATUS_CHOICES = [
        (ADVISING_PENDING, 'Pending'),
        (ADVISING_APPROVED, 'Approved'),
        (ADVISING_REJECTED, 'Rejected'),
    ]

    STATUS_ADVISING = 'ADVISING'
    STATUS_ENROLLED = 'ENROLLED'
    STATUS_PASSED = 'PASSED'
    STATUS_FAILED = 'FAILED'
    STATUS_INC = 'INC'
    STATUS_DROPPED = 'DROPPED'
    STATUS_RETAKE = 'RETAKE'
    STATUS_NO_GRADE = 'NO_GRADE'

    GRADE_STATUS_CHOICES = [
        (STATUS_ADVISING, 'Advising'),
        (STATUS_ENROLLED, 'Enrolled'),
        (STATUS_PASSED, 'Passed'),
        (STATUS_FAILED, 'Failed'),
        (STATUS_INC, 'Incomplete'),
        (STATUS_DROPPED, 'Dropped'),
        (STATUS_RETAKE, 'Retake'),
        (STATUS_NO_GRADE, 'No Grade'),
    ]

    student = models.ForeignKey(
        'students.Student', 
        on_delete=models.CASCADE, 
        related_name='grades'
    )
    subject = models.ForeignKey(
        'academics.Subject', 
        on_delete=models.PROTECT, 
        related_name='student_grades'
    )
    term = models.ForeignKey(
        'terms.Term', 
        on_delete=models.PROTECT, 
        related_name='grades'
    )
    section = models.ForeignKey(
        'sections.Section', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='grades'
    )

    advising_status = models.CharField(
        max_length=20,
        choices=ADVISING_STATUS_CHOICES,
        default=ADVISING_PENDING
    )
    grade_status = models.CharField(
        max_length=20,
        choices=GRADE_STATUS_CHOICES,
        default=STATUS_ADVISING
    )

    midterm_grade = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(1.0), MaxValueValidator(5.0)]
    )
    final_grade = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(1.0), MaxValueValidator(5.0)]
    )

    is_credited = models.BooleanField(default=False)
    is_retake = models.BooleanField(default=False)
    is_historical = models.BooleanField(default=False, help_text="Manually encoded from the student's previous TOR.")
    historical_source = models.CharField(max_length=255, null=True, blank=True, help_text="Reference to the physical TOR or source document.")
    
    submitted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='submitted_grades')
    midterm_submitted_at = models.DateTimeField(null=True, blank=True)
    final_submitted_at = models.DateTimeField(null=True, blank=True)
    
    finalized_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='finalized_grades')
    finalized_at = models.DateTimeField(null=True, blank=True)
    
    # Resolution fields for INC
    resolution_status = models.CharField(max_length=30, null=True, blank=True) 
    resolution_new_grade = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    resolution_reason = models.TextField(null=True, blank=True)
    resolution_requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='requested_resolutions')
    resolution_requested_at = models.DateTimeField(null=True, blank=True)
    resolution_approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_resolutions')
    resolution_approved_at = models.DateTimeField(null=True, blank=True)

    rejection_reason = models.TextField(blank=True)
    inc_deadline = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('student', 'subject', 'term')
        ordering = ['student', 'subject', 'term']

    def __str__(self):
        """
        Returns a human readable representation of the grade record.
        Format: IDN - Subject Code (Status)
        """
        return f"{self.student.idn} - {self.subject.code} ({self.grade_status})"


class CreditingRequest(models.Model):
    """
    Represents a bulk request by the Registrar to credit historical subjects
    for a transferee student. Awaits approval from the Program Head.
    """
    STATUS_PENDING = 'PENDING'
    STATUS_APPROVED = 'APPROVED'
    STATUS_REJECTED = 'REJECTED'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_REJECTED, 'Rejected'),
    ]

    student = models.ForeignKey(
        'students.Student', 
        on_delete=models.CASCADE, 
        related_name='crediting_requests'
    )
    term = models.ForeignKey(
        'terms.Term', 
        on_delete=models.PROTECT, 
        related_name='crediting_requests'
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='submitted_crediting_requests'
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='reviewed_crediting_requests'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING
    )
    rejection_reason = models.TextField(blank=True, null=True)
    comment = models.TextField(blank=True, null=True, help_text="Optional comment from the Head on approval/rejection.")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Crediting Request for {self.student.idn} - {self.status}"


class CreditingRequestItem(models.Model):
    """
    Represents an individual subject to be credited within a CreditingRequest.
    """
    request = models.ForeignKey(
        CreditingRequest, 
        on_delete=models.CASCADE, 
        related_name='items'
    )
    subject = models.ForeignKey(
        'academics.Subject', 
        on_delete=models.PROTECT
    )
    final_grade = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        validators=[MinValueValidator(1.0), MaxValueValidator(5.0)]
    )
    
    class Meta:
        unique_together = ('request', 'subject')

    def __str__(self):
        return f"{self.subject.code} - {self.final_grade}"
