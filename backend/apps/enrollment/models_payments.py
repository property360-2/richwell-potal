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


# ============================================================
# EPIC 5 — Promissory Notes
# ============================================================


class PromissoryNote(BaseModel):
    """
    Promissory note for deferred payment.
    Allows students to attend exams while committing to pay by a due date.
    Workflow: Cashier creates → Student signs → Due date enforced → Fulfilled/Defaulted.
    """

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        PARTIALLY_PAID = 'PARTIALLY_PAID', 'Partially Paid'
        FULFILLED = 'FULFILLED', 'Fulfilled'
        DEFAULTED = 'DEFAULTED', 'Defaulted'
        CANCELLED = 'CANCELLED', 'Cancelled'

    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.CASCADE,
        related_name='promissory_notes'
    )

    # Amount details
    total_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text='Total amount promised'
    )
    amount_paid = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Amount paid so far against this promissory note'
    )

    # Which months this covers
    covered_months = models.JSONField(
        default=list,
        help_text='List of month numbers (1-6) covered by this promissory note'
    )

    # Due date and status
    due_date = models.DateField(
        help_text='Date by which the student must pay'
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE
    )

    # Reason and terms
    reason = models.TextField(
        help_text='Reason for requesting promissory note'
    )
    terms = models.TextField(
        blank=True,
        help_text='Terms and conditions agreed upon'
    )

    # Guarantor (parent/guardian)
    guarantor_name = models.CharField(
        max_length=200,
        blank=True,
        help_text='Name of parent/guardian guarantor'
    )
    guarantor_contact = models.CharField(
        max_length=50,
        blank=True,
        help_text='Contact number of guarantor'
    )
    guarantor_relationship = models.CharField(
        max_length=50,
        blank=True,
        help_text='Relationship to student (e.g., Parent, Guardian)'
    )

    # Approval tracking
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_promissory_notes',
        help_text='Cashier who created the promissory note'
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_promissory_notes',
        help_text='Registrar/admin who approved the promissory note'
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    # Fulfillment tracking
    fulfilled_at = models.DateTimeField(null=True, blank=True)
    defaulted_at = models.DateTimeField(null=True, blank=True)

    # Note reference code
    reference_code = models.CharField(
        max_length=50,
        unique=True,
        help_text='Unique reference code (PN-YYYYMMDD-XXXXX)'
    )

    class Meta:
        verbose_name = 'Promissory Note'
        verbose_name_plural = 'Promissory Notes'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.reference_code} - ₱{self.total_amount} ({self.status})"

    @property
    def student(self):
        return self.enrollment.student

    @property
    def remaining_balance(self):
        """Amount still owed."""
        return self.total_amount - self.amount_paid

    @property
    def is_overdue(self):
        """Check if the promissory note is past due."""
        from django.utils import timezone
        return (
            self.status in [self.Status.ACTIVE, self.Status.PARTIALLY_PAID]
            and timezone.now().date() > self.due_date
        )

    @property
    def payment_percentage(self):
        """Percentage of total amount paid."""
        if self.total_amount == 0:
            return Decimal('0.00')
        return (self.amount_paid / self.total_amount * 100).quantize(Decimal('0.01'))
