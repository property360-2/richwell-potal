from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone


class User(AbstractUser):
    """Extended user model with role-based permissions."""
    ROLE_CHOICES = [
        ('STUDENT', 'Student'),
        ('PROFESSOR', 'Professor'),
        ('REGISTRAR', 'Registrar'),
        ('HEAD_REGISTRAR', 'Head Registrar'),
        ('ADMIN', 'Administrator'),
        ('CASHIER', 'Cashier'),
        ('ADMISSION_STAFF', 'Admission Staff'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='STUDENT')
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['role']),
            models.Index(fields=['email']),
        ]

    def __str__(self):
        return f"{self.get_full_name()} ({self.get_role_display()})"


class Program(models.Model):
    """Degree programs offered by the institution."""
    name = models.CharField(max_length=255, unique=True)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    duration_years = models.IntegerField(default=4, validators=[MinValueValidator(1), MaxValueValidator(8)])
    total_units_required = models.IntegerField(default=120)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"


class Semester(models.Model):
    """Academic periods/semesters."""
    SEMESTER_CHOICES = [
        ('FIRST', 'First Semester'),
        ('SECOND', 'Second Semester'),
        ('SUMMER', 'Summer Term'),
    ]

    year = models.IntegerField(validators=[MinValueValidator(2000)])
    semester = models.CharField(max_length=10, choices=SEMESTER_CHOICES)
    start_date = models.DateField()
    end_date = models.DateField()
    enrollment_start = models.DateField()
    enrollment_end = models.DateField()
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-year', '-semester']
        unique_together = ['year', 'semester']
        indexes = [
            models.Index(fields=['is_active']),
            models.Index(fields=['year', 'semester']),
        ]

    def __str__(self):
        return f"{self.get_semester_display()} {self.year}"


class Subject(models.Model):
    """Courses/subjects offered."""
    SUBJECT_TYPE_CHOICES = [
        ('MAJOR', 'Major'),
        ('MINOR', 'Minor'),
        ('ELECTIVE', 'Elective'),
    ]

    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    units = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)])
    subject_type = models.CharField(max_length=20, choices=SUBJECT_TYPE_CHOICES, default='MAJOR')
    prerequisites = models.ManyToManyField('self', symmetrical=False, blank=True, related_name='dependent_subjects')
    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name='subjects')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['program', 'code']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['program']),
        ]

    def __str__(self):
        return f"{self.code} - {self.name}"


class Student(models.Model):
    """Student profile and lifecycle information."""
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('LOA', 'Leave of Absence'),
        ('WITHDRAWN', 'Withdrawn'),
        ('GRADUATED', 'Graduated'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student_profile')
    student_id = models.CharField(max_length=20, unique=True)
    program = models.ForeignKey(Program, on_delete=models.PROTECT, related_name='students')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    enrollment_year = models.IntegerField(validators=[MinValueValidator(2000)])
    gpa = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    is_transferee = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['student_id']),
            models.Index(fields=['status']),
            models.Index(fields=['program']),
        ]

    def __str__(self):
        return f"{self.student_id} - {self.user.get_full_name()}"


class Enrollment(models.Model):
    """Student enrollment record for a semester (tracks unit cap)."""
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='enrollments')
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name='enrollments')
    total_units = models.IntegerField(default=0, validators=[MinValueValidator(0), MaxValueValidator(30)])
    enrollment_date = models.DateTimeField(auto_now_add=True)
    is_confirmed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['student', 'semester']
        ordering = ['-semester']
        indexes = [
            models.Index(fields=['student', 'semester']),
        ]

    def __str__(self):
        return f"{self.student} - {self.semester}"


class SubjectEnrollment(models.Model):
    """Individual course enrollment with grade tracking."""
    ENROLLMENT_STATUS_CHOICES = [
        ('ENROLLED', 'Enrolled'),
        ('DROPPED', 'Dropped'),
        ('COMPLETED', 'Completed'),
    ]

    GRADE_STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('SUBMITTED', 'Submitted'),
        ('FINALIZED', 'Finalized'),
    ]

    SUBJECT_STATUS_CHOICES = [
        ('PASSED', 'Passed'),
        ('FAILED', 'Failed'),
        ('INC', 'Incomplete'),
        ('CREDITED', 'Credited'),
        ('RETAKE', 'Retake'),
    ]

    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name='subject_enrollments')
    subject = models.ForeignKey(Subject, on_delete=models.PROTECT, related_name='enrollments')
    section = models.ForeignKey('Section', on_delete=models.SET_NULL, null=True, blank=True, related_name='enrollments')
    enrollment_status = models.CharField(max_length=20, choices=ENROLLMENT_STATUS_CHOICES, default='ENROLLED')
    grade = models.CharField(max_length=5, blank=True, null=True)
    grade_status = models.CharField(max_length=20, choices=GRADE_STATUS_CHOICES, default='PENDING')
    subject_status = models.CharField(max_length=20, choices=SUBJECT_STATUS_CHOICES, default='PASSED')
    enrolled_date = models.DateTimeField(auto_now_add=True)
    dropped_date = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['enrollment', 'subject']
        ordering = ['-enrolled_date']
        indexes = [
            models.Index(fields=['enrollment']),
            models.Index(fields=['grade_status']),
        ]

    def __str__(self):
        return f"{self.enrollment.student} - {self.subject} ({self.grade_status})"


class Section(models.Model):
    """Class sections with professor assignments."""
    code = models.CharField(max_length=50)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='sections')
    professor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'role': 'PROFESSOR'}, related_name='taught_sections')
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name='sections')
    capacity = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(100)])
    current_enrollment = models.IntegerField(default=0)
    room = models.CharField(max_length=50, blank=True)
    schedule_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['semester', 'subject']
        unique_together = ['code', 'semester']
        indexes = [
            models.Index(fields=['subject', 'semester']),
        ]

    def __str__(self):
        return f"{self.subject.code} - Section {self.code}"


class ScheduleSlot(models.Model):
    """Time slots for class meetings."""
    DAY_CHOICES = [
        ('MON', 'Monday'),
        ('TUE', 'Tuesday'),
        ('WED', 'Wednesday'),
        ('THU', 'Thursday'),
        ('FRI', 'Friday'),
        ('SAT', 'Saturday'),
        ('SUN', 'Sunday'),
    ]

    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='schedule_slots')
    day = models.CharField(max_length=3, choices=DAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()

    class Meta:
        ordering = ['section', 'day', 'start_time']
        unique_together = ['section', 'day', 'start_time']

    def __str__(self):
        return f"{self.section} - {self.get_day_display()} {self.start_time}-{self.end_time}"


class PaymentMonth(models.Model):
    """Monthly payment buckets (6 per semester)."""
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name='payment_months')
    month_number = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(6)])
    amount_due = models.DecimalField(max_digits=10, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    due_date = models.DateField()
    is_paid = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['enrollment', 'month_number']
        ordering = ['enrollment', 'month_number']
        indexes = [
            models.Index(fields=['enrollment', 'is_paid']),
        ]

    def __str__(self):
        return f"{self.enrollment} - Month {self.month_number}"


class Payment(models.Model):
    """Payment transaction records."""
    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'Cash'),
        ('CHECK', 'Check'),
        ('CREDIT_CARD', 'Credit Card'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('ONLINE', 'Online Payment'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('REFUNDED', 'Refunded'),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='payments')
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    payment_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='COMPLETED')
    reference_number = models.CharField(max_length=100, unique=True)
    notes = models.TextField(blank=True)
    processed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'role': 'CASHIER'}, related_name='processed_payments')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-payment_date']
        indexes = [
            models.Index(fields=['student']),
            models.Index(fields=['status']),
            models.Index(fields=['payment_date']),
        ]

    def __str__(self):
        return f"Payment {self.reference_number} - {self.student} ({self.amount})"


class Grade(models.Model):
    """Grade records for subject enrollment."""
    GRADE_VALUE_CHOICES = [
        ('A', 'A (4.0)'),
        ('A-', 'A- (3.7)'),
        ('B+', 'B+ (3.3)'),
        ('B', 'B (3.0)'),
        ('B-', 'B- (2.7)'),
        ('C+', 'C+ (2.3)'),
        ('C', 'C (2.0)'),
        ('C-', 'C- (1.7)'),
        ('D+', 'D+ (1.3)'),
        ('D', 'D (1.0)'),
        ('F', 'F (0.0)'),
        ('INC', 'Incomplete'),
    ]

    subject_enrollment = models.OneToOneField(SubjectEnrollment, on_delete=models.CASCADE, related_name='grade_record')
    grade_value = models.CharField(max_length=5, choices=GRADE_VALUE_CHOICES)
    comments = models.TextField(blank=True)
    submitted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'role': 'PROFESSOR'}, related_name='submitted_grades')
    submitted_date = models.DateTimeField(blank=True, null=True)
    finalized_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='finalized_grades')
    finalized_date = models.DateTimeField(blank=True, null=True)
    is_finalized = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Grade for {self.subject_enrollment} - {self.grade_value}"


class ExamPermit(models.Model):
    """Exam permits - unlocked when Month 1 payment is completed."""
    PERMIT_STATUS_CHOICES = [
        ('LOCKED', 'Locked'),
        ('UNLOCKED', 'Unlocked'),
        ('USED', 'Used'),
        ('EXPIRED', 'Expired'),
    ]

    enrollment = models.OneToOneField(Enrollment, on_delete=models.CASCADE, related_name='exam_permit')
    status = models.CharField(max_length=20, choices=PERMIT_STATUS_CHOICES, default='LOCKED')
    issued_date = models.DateTimeField(blank=True, null=True)
    expiry_date = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Exam Permit - {self.enrollment.student} ({self.status})"


class AuditLog(models.Model):
    """Immutable audit logging for critical operations."""
    ACTION_CHOICES = [
        ('USER_CREATED', 'User Created'),
        ('USER_UPDATED', 'User Updated'),
        ('ENROLLMENT_CREATED', 'Enrollment Created'),
        ('SUBJECT_ENROLLED', 'Subject Enrolled'),
        ('SUBJECT_DROPPED', 'Subject Dropped'),
        ('PAYMENT_RECORDED', 'Payment Recorded'),
        ('GRADE_SUBMITTED', 'Grade Submitted'),
        ('GRADE_FINALIZED', 'Grade Finalized'),
        ('GRADE_OVERRIDDEN', 'Grade Overridden'),
        ('PERMIT_UNLOCKED', 'Permit Unlocked'),
        ('INC_EXPIRED', 'Incomplete Expired'),
        ('SCHEDULE_CONFLICT_OVERRIDE', 'Schedule Conflict Override'),
        ('CAPACITY_OVERRIDE', 'Capacity Override'),
    ]

    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    target_model = models.CharField(max_length=100)
    target_id = models.IntegerField()
    before_data = models.JSONField(default=dict, blank=True)
    after_data = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['target_model', 'target_id']),
            models.Index(fields=['action']),
            models.Index(fields=['timestamp']),
        ]

    def __str__(self):
        return f"{self.action} - {self.target_model} ({self.target_id})"


class Notification(models.Model):
    """In-app system notifications."""
    NOTIFICATION_TYPE_CHOICES = [
        ('PAYMENT', 'Payment'),
        ('PERMIT', 'Exam Permit'),
        ('GRADE', 'Grade'),
        ('INC_EXPIRY', 'Incomplete Expiry'),
        ('ENROLLMENT', 'Enrollment'),
        ('SYSTEM', 'System'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPE_CHOICES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    read = models.BooleanField(default=False)
    related_object_id = models.IntegerField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'read']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.notification_type} - {self.title}"


class TransferCredit(models.Model):
    """Credits transferred from prior institution for transferee students."""
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='transfer_credits')
    subject = models.ForeignKey(Subject, on_delete=models.PROTECT)
    credited_subject_code = models.CharField(max_length=50, help_text="Code from prior institution")
    credited_subject_name = models.CharField(max_length=255, help_text="Name from prior institution")
    units = models.IntegerField(validators=[MinValueValidator(1)])
    prior_institution = models.CharField(max_length=255)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'role': 'REGISTRAR'}, related_name='approved_transfers')
    approval_date = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['student', 'subject']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.student} - {self.subject} (Transfer)"
