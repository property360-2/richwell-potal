"""
Payment & Exam Permit models (EPIC 4).
Split from enrollment/models.py for maintainability.
"""

from decimal import Decimal
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator

from apps.core.models import BaseModel
from .models import Enrollment, Semester


# ============================================================
# EPIC 4 — Payment & Exam Permit Models
# ============================================================


class PaymentTransaction(BaseModel):
    """
    Individual payment transaction record.
    Tracks all payments made by students and their allocation to monthly buckets.
    """
    
    class PaymentMode(models.TextChoices):
        CASH = 'CASH', 'Cash'
        ONLINE = 'ONLINE', 'Online Banking'
        GCASH = 'GCASH', 'GCash'
        MAYA = 'MAYA', 'Maya'
        CHECK = 'CHECK', 'Check'
        OTHER = 'OTHER', 'Other'
    
    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.CASCADE,
        related_name='transactions'
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text='Payment amount'
    )
    payment_mode = models.CharField(
        max_length=20,
        choices=PaymentMode.choices,
        default=PaymentMode.CASH
    )
    receipt_number = models.CharField(
        max_length=50,
        unique=True,
        help_text='Unique receipt number (RCV-YYYYMMDD-XXXXX)'
    )
    reference_number = models.CharField(
        max_length=100,
        blank=True,
        help_text='External reference number (for online payments)'
    )
    
    # Allocation details - stores which buckets received funds
    allocated_buckets = models.JSONField(
        default=list,
        help_text='List of allocations: [{"bucket_id": uuid, "month": 1, "amount": 1000.00}]'
    )
    
    # Adjustment tracking
    is_adjustment = models.BooleanField(
        default=False,
        help_text='Whether this is an adjustment transaction (not a regular payment)'
    )
    adjustment_reason = models.TextField(
        blank=True,
        help_text='Justification for adjustment (required if is_adjustment=True)'
    )
    original_transaction = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='adjustments',
        help_text='Original transaction if this is an adjustment'
    )
    
    # Cashier info
    processed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='processed_payments',
        help_text='Cashier who processed this payment'
    )
    processed_at = models.DateTimeField(
        auto_now_add=True,
        help_text='When the payment was processed'
    )
    
    # Receipt file
    receipt_file = models.FileField(
        upload_to='receipts/%Y/%m/',
        null=True,
        blank=True,
        help_text='Generated PDF receipt'
    )
    receipt_generated = models.BooleanField(
        default=False,
        help_text='Whether the receipt PDF has been generated'
    )
    
    # Notes
    notes = models.TextField(
        blank=True,
        help_text='Additional notes about this payment'
    )
    
    class Meta:
        verbose_name = 'Payment Transaction'
        verbose_name_plural = 'Payment Transactions'
        ordering = ['-processed_at']
    
    def __str__(self):
        return f"{self.receipt_number} - ₱{self.amount} ({self.payment_mode})"
    
    @property
    def student(self):
        return self.enrollment.student
    
    @property
    def total_allocated(self):
        """Total amount allocated to buckets."""
        if not self.allocated_buckets:
            return Decimal('0.00')
        return sum(Decimal(str(a.get('amount', 0))) for a in self.allocated_buckets)


class ExamMonthMapping(BaseModel):
    """
    Maps exam periods to payment months.
    Admin-configurable per semester.
    """
    
    class ExamPeriod(models.TextChoices):
        PRELIM = 'PRELIM', 'Preliminary Exam'
        MIDTERM = 'MIDTERM', 'Midterm Exam'
        PREFINAL = 'PREFINAL', 'Pre-Final Exam'
        FINAL = 'FINAL', 'Final Exam'
    
    semester = models.ForeignKey(
        Semester,
        on_delete=models.CASCADE,
        related_name='exam_mappings'
    )
    exam_period = models.CharField(
        max_length=20,
        choices=ExamPeriod.choices,
        help_text='The exam period'
    )
    required_month = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(6)],
        help_text='Month number (1-6) that must be fully paid'
    )
    is_active = models.BooleanField(
        default=True,
        help_text='Whether this mapping is active'
    )
    
    class Meta:
        verbose_name = 'Exam-Month Mapping'
        verbose_name_plural = 'Exam-Month Mappings'
        unique_together = ['semester', 'exam_period']
        ordering = ['semester', 'required_month']
    
    def __str__(self):
        return f"{self.get_exam_period_display()} → Month {self.required_month} ({self.semester})"


class ExamPermit(BaseModel):
    """
    Exam permit generated when payment month is completed.
    Students need this permit to take exams.
    """
    
    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.CASCADE,
        related_name='exam_permits'
    )
    exam_period = models.CharField(
        max_length=20,
        choices=ExamMonthMapping.ExamPeriod.choices,
        help_text='The exam period this permit is for'
    )
    permit_code = models.CharField(
        max_length=50,
        unique=True,
        help_text='Unique permit code (EXP-YYYYMMDD-XXXXX)'
    )
    required_month = models.PositiveIntegerField(
        help_text='The month that was paid to unlock this permit'
    )
    
    # Status tracking
    is_printed = models.BooleanField(
        default=False,
        help_text='Whether the permit has been printed'
    )
    printed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the permit was printed'
    )
    printed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='printed_permits',
        help_text='Who printed the permit'
    )
    
    class Meta:
        verbose_name = 'Exam Permit'
        verbose_name_plural = 'Exam Permits'
        unique_together = ['enrollment', 'exam_period']
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.permit_code} - {self.get_exam_period_display()}"
    
    @property
    def student(self):
        return self.enrollment.student
    
    @property
    def is_valid(self):
        """Check if the permit is still valid (month still paid)."""
        bucket = self.enrollment.payment_buckets.filter(
            month_number=self.required_month
        ).first()
        return bucket and bucket.is_fully_paid
