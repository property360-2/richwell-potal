"""
Enrollment models - Semester, Enrollment, Payment Buckets, and Documents.
"""

from decimal import Decimal
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator

from apps.core.models import BaseModel


class Semester(BaseModel):
    """
    Academic semester with start/end dates.
    Used to group enrollments and track academic periods.
    """
    
    name = models.CharField(
        max_length=50,
        help_text='Semester name (e.g., "1st Semester", "2nd Semester", "Summer")'
    )
    academic_year = models.CharField(
        max_length=20,
        help_text='Academic year (e.g., "2024-2025")'
    )
    start_date = models.DateField(
        help_text='Semester start date'
    )
    end_date = models.DateField(
        help_text='Semester end date'
    )
    enrollment_start_date = models.DateField(
        null=True, blank=True,
        help_text='Date when enrollment opens'
    )
    enrollment_end_date = models.DateField(
        null=True, blank=True,
        help_text='Date when enrollment closes'
    )
    is_current = models.BooleanField(
        default=False,
        help_text='Whether this is the current active semester'
    )
    
    class Meta:
        verbose_name = 'Semester'
        verbose_name_plural = 'Semesters'
        ordering = ['-academic_year', '-start_date']
        unique_together = ['name', 'academic_year']
    
    def __str__(self):
        return f"{self.name} {self.academic_year}"
    
    def save(self, *args, **kwargs):
        # Ensure only one semester is marked as current
        if self.is_current:
            Semester.objects.filter(is_current=True).exclude(pk=self.pk).update(is_current=False)
        super().save(*args, **kwargs)


class Enrollment(BaseModel):
    """
    Student enrollment record for a specific semester.
    Tracks payment status and enrollment type.
    """
    
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending Approval'
        ACTIVE = 'ACTIVE', 'Active'
        PENDING_PAYMENT = 'PENDING_PAYMENT', 'Pending Payment'
        HOLD = 'HOLD', 'On Hold'
        COMPLETED = 'COMPLETED', 'Completed'
        REJECTED = 'REJECTED', 'Rejected'
    
    class CreatedVia(models.TextChoices):
        ONLINE = 'ONLINE', 'Online Enrollment'
        TRANSFEREE = 'TRANSFEREE', 'Transferee Registration'
        MANUAL = 'MANUAL', 'Manual Registration'
    
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='enrollments',
        limit_choices_to={'role': 'STUDENT'}
    )
    semester = models.ForeignKey(
        Semester,
        on_delete=models.PROTECT,
        related_name='enrollments'
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    created_via = models.CharField(
        max_length=20,
        choices=CreatedVia.choices,
        default=CreatedVia.ONLINE
    )
    
    # Payment tracking
    monthly_commitment = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text='Monthly payment commitment amount'
    )
    first_month_paid = models.BooleanField(
        default=False,
        help_text='Whether the first month payment has been completed'
    )
    
    class Meta:
        verbose_name = 'Enrollment'
        verbose_name_plural = 'Enrollments'
        unique_together = ['student', 'semester']
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.student.get_full_name()} - {self.semester}"
    
    @property
    def total_required(self):
        """Total amount required for the semester."""
        return self.payment_buckets.aggregate(
            total=models.Sum('required_amount')
        )['total'] or Decimal('0.00')
    
    @property
    def total_paid(self):
        """Total amount paid so far."""
        return self.payment_buckets.aggregate(
            total=models.Sum('paid_amount')
        )['total'] or Decimal('0.00')
    
    @property
    def balance(self):
        """Remaining balance to be paid."""
        return self.total_required - self.total_paid
    
    @property
    def is_fully_paid(self):
        """Whether all payment buckets are fully paid."""
        return not self.payment_buckets.filter(is_fully_paid=False).exists()


class MonthlyPaymentBucket(BaseModel):
    """
    Payment bucket for each month of the semester.
    6 buckets per enrollment (one for each month).
    """
    
    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.CASCADE,
        related_name='payment_buckets'
    )
    month_number = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(6)],
        help_text='Month number (1-6)'
    )
    event_label = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text='Event associated with this payment month (e.g., Subject Enrollment, Midterms)'
    )
    required_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text='Amount required for this month'
    )
    paid_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text='Amount paid so far for this month'
    )
    is_fully_paid = models.BooleanField(
        default=False,
        help_text='Whether this month is fully paid'
    )
    
    class Meta:
        verbose_name = 'Monthly Payment Bucket'
        verbose_name_plural = 'Monthly Payment Buckets'
        unique_together = ['enrollment', 'month_number']
        ordering = ['month_number']
    
    def __str__(self):
        return f"{self.enrollment} - Month {self.month_number}"
    
    @property
    def remaining_amount(self):
        """Amount still needed to fully pay this month."""
        return max(self.required_amount - self.paid_amount, Decimal('0.00'))
    
    @property
    def payment_percentage(self):
        """Percentage of this month that has been paid."""
        if self.required_amount == 0:
            return 100
        return round((self.paid_amount / self.required_amount) * 100, 2)
    
    def add_payment(self, amount):
        """
        Add payment to this bucket.
        Returns the amount that was actually allocated (may be less than amount if overpaid).
        """
        needed = self.remaining_amount
        to_allocate = min(amount, needed)
        
        self.paid_amount += to_allocate
        if self.paid_amount >= self.required_amount:
            self.is_fully_paid = True
        
        self.save()
        return to_allocate


class EnrollmentDocument(BaseModel):
    """
    Documents uploaded during enrollment process.
    """
    
    class DocumentType(models.TextChoices):
        ID = 'ID', 'Government ID'
        FORM_138 = 'FORM_138', 'Form 138 / Report Card'
        TOR = 'TOR', 'Transcript of Records'
        GOOD_MORAL = 'GOOD_MORAL', 'Certificate of Good Moral'
        BIRTH_CERTIFICATE = 'BIRTH_CERTIFICATE', 'Birth Certificate'
        PHOTO = 'PHOTO', '2x2 Photo'
        OTHER = 'OTHER', 'Other Document'
    
    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    document_type = models.CharField(
        max_length=20,
        choices=DocumentType.choices
    )
    file = models.FileField(
        upload_to='enrollment_docs/%Y/%m/'
    )
    original_filename = models.CharField(
        max_length=255,
        help_text='Original filename when uploaded'
    )
    is_verified = models.BooleanField(
        default=False,
        help_text='Whether the document has been verified by staff'
    )
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_documents'
    )
    verified_at = models.DateTimeField(
        null=True,
        blank=True
    )
    notes = models.TextField(
        blank=True,
        help_text='Staff notes about this document'
    )
    
    class Meta:
        verbose_name = 'Enrollment Document'
        verbose_name_plural = 'Enrollment Documents'
        ordering = ['document_type']
    
    def __str__(self):
        return f"{self.get_document_type_display()} - {self.enrollment.student.get_full_name()}"


class SubjectEnrollment(BaseModel):
    """
    Tracks a student's enrollment in a specific subject.
    Handles credits (CREDITED status for transferees), regular enrollment, and grades.
    """
    
    class EnrollmentType(models.TextChoices):
        HOME = 'HOME', 'Home Section [H]'
        RETAKE = 'RETAKE', 'Retake/Irregular [R]'
        OVERLOAD = 'OVERLOAD', 'Overload [O]'

    class Status(models.TextChoices):
        ENROLLED = 'ENROLLED', 'Currently Enrolled'
        PASSED = 'PASSED', 'Passed'
        FAILED = 'FAILED', 'Failed'
        INC = 'INC', 'Incomplete'
        DROPPED = 'DROPPED', 'Dropped'
        CREDITED = 'CREDITED', 'Credited (Transferee)'
        RETAKE = 'RETAKE', 'Retake'
        PENDING_PAYMENT = 'PENDING_PAYMENT', 'Pending Payment'
        PENDING_HEAD = 'PENDING_HEAD', 'Pending Head Approval'
    
    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.CASCADE,
        related_name='subject_enrollments'
    )
    subject = models.ForeignKey(
        'academics.Subject',
        on_delete=models.PROTECT,
        related_name='student_enrollments'
    )
    section = models.ForeignKey(
        'academics.Section',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='student_enrollments',
        help_text='Section for regular enrollment (null for credited subjects)'
    )
    
    enrollment_type = models.CharField(
        max_length=10, 
        choices=EnrollmentType.choices,
        default=EnrollmentType.HOME,
        help_text='Classification of this subject enrollment'
    )
    
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ENROLLED
    )
    
    # Grade information
    grade = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Numeric grade (1.0 to 5.0)'
    )
    
    # Flags
    is_irregular = models.BooleanField(
        default=False,
        help_text='Subject is outside recommended year/semester'
    )
    count_in_gpa = models.BooleanField(
        default=True,
        help_text='Whether to include in GPA calculation'
    )
    
    # INC tracking
    inc_marked_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When INC status was set (for expiry calculation)'
    )
    
    # Grade finalization (EPIC 5)
    is_finalized = models.BooleanField(
        default=False,
        help_text='Whether grade has been finalized by registrar'
    )
    finalized_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When grade was finalized'
    )
    finalized_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='finalized_grades',
        help_text='Registrar who finalized this grade'
    )
    
    # Retake tracking (EPIC 5)
    is_retake = models.BooleanField(
        default=False,
        help_text='Whether this is a retake enrollment'
    )
    original_enrollment = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='retakes',
        help_text='Original failed enrollment if this is a retake'
    )

    # Dual approval tracking
    payment_approved = models.BooleanField(
        default=False,
        help_text='Whether first month payment requirement is satisfied'
    )
    head_approved = models.BooleanField(
        default=False,
        help_text='Whether department head approval is complete'
    )
    registrar_approved = models.BooleanField(
        default=False,
        help_text='Whether registrar approval is complete (required for overload)'
    )

    class Meta:
        verbose_name = 'Subject Enrollment'
        verbose_name_plural = 'Subject Enrollments'
        unique_together = ['enrollment', 'subject']
        ordering = ['subject__year_level', 'subject__semester_number']

    
    def __str__(self):
        return f"{self.enrollment.student.get_full_name()} - {self.subject.code}"
    
    @property
    def units(self):
        """Get units from the subject."""
        return self.subject.units
    
    @property
    def is_credited(self):
        return self.status == self.Status.CREDITED
    
    @property
    def is_passed(self):
        return self.status in [self.Status.PASSED, self.Status.CREDITED]

    @property
    def is_fully_enrolled(self):
        """Subject is fully enrolled when both approvals are satisfied."""
        # For overload, also check registrar_approved
        if self.enrollment_type == self.EnrollmentType.OVERLOAD:
             return self.payment_approved and self.head_approved and self.registrar_approved and self.status == self.Status.ENROLLED
        return self.payment_approved and self.head_approved and self.status == self.Status.ENROLLED

    def get_approval_status_display(self):
        """Get human-readable approval status for UI."""
        if self.is_fully_enrolled:
            return "Enrolled"
        elif self.payment_approved and not self.head_approved:
            return "Payment Complete - Awaiting Head Approval"
        elif not self.payment_approved and self.head_approved:
            return "Head Approved - Payment Pending"
        else:
            return "Pending Approval"


class EnrollmentApproval(BaseModel):
    """
    Audit trail for enrollment approval actions (Head/Registrar).
    """
    
    class Role(models.TextChoices):
        HEAD = 'HEAD', 'Department Head'
        REGISTRAR = 'REGISTRAR', 'Registrar'
        ADMIN = 'ADMIN', 'Administrator'
    
    class Action(models.TextChoices):
        APPROVE = 'APPROVE', 'Data Approved'
        REJECT = 'REJECT', 'Rejected'
        OVERRIDE = 'OVERRIDE', 'Manual Override'
    
    subject_enrollment = models.ForeignKey(
        SubjectEnrollment,
        on_delete=models.CASCADE,
        related_name='approvals'
    )
    approver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='enrollment_approvals'
    )
    role = models.CharField(max_length=20, choices=Role.choices)
    action = models.CharField(max_length=20, choices=Action.choices)
    comment = models.TextField(blank=True, null=True)
    
    class Meta:
        ordering = ['-created_at']


class OverloadRequest(BaseModel):
    """
    Request to exceed maximum unit limit.
    """
    
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='overload_requests'
    )
    semester = models.ForeignKey(
        Semester,
        on_delete=models.CASCADE
    )
    requested_units = models.PositiveIntegerField()
    reason = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_overloads'
    )
    rejection_reason = models.TextField(blank=True)
    
    class Meta:
        unique_together = ['student', 'semester']


class CreditSource(BaseModel):
    """
    Tracks the source of a credited subject (for transferees).
    Links to the original school and subject information.
    """
    
    subject_enrollment = models.OneToOneField(
        SubjectEnrollment,
        on_delete=models.CASCADE,
        related_name='credit_source',
        limit_choices_to={'status': SubjectEnrollment.Status.CREDITED}
    )
    original_school = models.CharField(
        max_length=255,
        help_text='Name of the previous school'
    )
    original_subject_code = models.CharField(
        max_length=50,
        help_text='Subject code from the previous school'
    )
    original_grade = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Grade from previous school (optional)'
    )
    tor_document = models.ForeignKey(
        EnrollmentDocument,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='credited_subjects',
        help_text='Reference to uploaded TOR document'
    )
    notes = models.TextField(
        blank=True,
        help_text='Notes about this credit (e.g., evaluation notes)'
    )
    credited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='credits_assigned',
        help_text='Registrar who assigned this credit'
    )
    
    class Meta:
        verbose_name = 'Credit Source'
        verbose_name_plural = 'Credit Sources'
    
    def __str__(self):
        return f"{self.subject_enrollment.subject.code} from {self.original_school}"


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
    previous_grade = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Previous grade value'
    )
    new_grade = models.DecimalField(
        max_digits=3,
        decimal_places=2,
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
# EPIC 6 — Document Release System
# ============================================================

class DocumentRelease(BaseModel):
    """
    Tracks official documents released by the registrar.
    Documents include TOR, certificates, diplomas, etc.
    """
    
    class DocumentType(models.TextChoices):
        TOR = 'TOR', 'Transcript of Records'
        GOOD_MORAL = 'GOOD_MORAL', 'Good Moral Certificate'
        ENROLLMENT_CERT = 'ENROLLMENT_CERT', 'Certificate of Enrollment'
        GRADES_CERT = 'GRADES_CERT', 'Certificate of Grades'
        COMPLETION_CERT = 'COMPLETION_CERT', 'Certificate of Completion'
        TRANSFER_CRED = 'TRANSFER_CRED', 'Transfer Credentials'
        HONORABLE_DISMISSAL = 'HONORABLE_DISMISSAL', 'Honorable Dismissal'
        DIPLOMA = 'DIPLOMA', 'Diploma'
        OTHER = 'OTHER', 'Other Document'
    
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        REVOKED = 'REVOKED', 'Revoked'
        REISSUED = 'REISSUED', 'Reissued (superseded)'
    
    # Document identification
    document_code = models.CharField(
        max_length=50,
        unique=True,
        help_text='Unique document code (DOC-YYYYMMDD-XXXXX)'
    )
    document_type = models.CharField(
        max_length=30,
        choices=DocumentType.choices,
        help_text='Type of document released'
    )
    
    # Who it's for
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='document_releases',
        limit_choices_to={'role': 'STUDENT'},
        help_text='Student receiving the document'
    )
    
    # Who issued it
    released_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='documents_released',
        help_text='Registrar who released the document'
    )
    released_at = models.DateTimeField(
        auto_now_add=True,
        help_text='When the document was released'
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
        help_text='Current status of the document'
    )
    
    # Revocation (if applicable)
    revoked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='documents_revoked',
        help_text='Registrar who revoked the document'
    )
    revoked_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the document was revoked'
    )
    revocation_reason = models.TextField(
        blank=True,
        help_text='Reason for revocation (required if revoked)'
    )
    
    # Reissue chain (links to replaced document)
    replaces = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='replaced_by',
        help_text='Document that this one replaces (for reissues)'
    )
    
    # Document details
    purpose = models.TextField(
        blank=True,
        help_text='Purpose of document request'
    )
    copies_released = models.PositiveIntegerField(
        default=1,
        help_text='Number of copies released'
    )
    notes = models.TextField(
        blank=True,
        help_text='Internal notes (not visible to student)'
    )
    
    # Optional file attachment
    document_file = models.FileField(
        upload_to='documents/releases/%Y/%m/',
        blank=True,
        null=True,
        help_text='Optional PDF copy of the document'
    )
    
    class Meta:
        verbose_name = 'Document Release'
        verbose_name_plural = 'Document Releases'
        ordering = ['-released_at']
        indexes = [
            models.Index(fields=['student', 'status']),
            models.Index(fields=['released_by', 'released_at']),
            models.Index(fields=['document_type']),
        ]
    
    def __str__(self):
        return f"{self.document_code} - {self.get_document_type_display()} for {self.student.get_full_name()}"
    
    @property
    def is_active(self):
        return self.status == self.Status.ACTIVE
    
    @property
    def is_revoked(self):
        return self.status == self.Status.REVOKED
    
    @property
    def has_replacement(self):
        return self.replaced_by.exists()
