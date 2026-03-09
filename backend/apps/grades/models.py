from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


class Grade(models.Model):
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

    GRADE_STATUS_CHOICES = [
        (STATUS_ADVISING, 'Advising'),
        (STATUS_ENROLLED, 'Enrolled'),
        (STATUS_PASSED, 'Passed'),
        (STATUS_FAILED, 'Failed'),
        (STATUS_INC, 'Incomplete'),
        (STATUS_DROPPED, 'Dropped'),
        (STATUS_RETAKE, 'Retake'),
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
        return f"{self.student.idn} - {self.subject.code} ({self.grade_status})"
