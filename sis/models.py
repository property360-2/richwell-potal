"""
Database models for Richwell Colleges Portal - Student Information System

This module contains all models for managing admissions, enrollment,
payments, grades, and academic records.
"""

import uuid
from decimal import Decimal
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.postgres.fields import JSONField as PostgresJSONField
from django.utils import timezone
from datetime import timedelta


# ============================================================================
# USER & AUTHENTICATION MODELS
# ============================================================================

class User(AbstractUser):
    """
    Custom user model extending Django's AbstractUser.
    Supports multiple roles: Student, Professor, Registrar, etc.
    """
    ROLE_CHOICES = (
        ('STUDENT', 'Student'),
        ('PROFESSOR', 'Professor'),
        ('REGISTRAR', 'Registrar'),
        ('HEAD_REGISTRAR', 'Head Registrar'),
        ('CASHIER', 'Cashier'),
        ('ADMIN', 'Admin'),
        ('ADMISSION_STAFF', 'Admission Staff'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='STUDENT')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sis_user'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['role']),
        ]

    def __str__(self):
        return f"{self.get_full_name()} ({self.role})"


# ============================================================================
# ACADEMIC STRUCTURE MODELS
# ============================================================================

class AcademicYear(models.Model):
    """Academic year definition (e.g., 2024-2025)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    year = models.CharField(max_length=9, unique=True)  # e.g., "2024-2025"
    start_date = models.DateField()
    end_date = models.DateField()
    is_current = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sis_academicyear'
        ordering = ['-year']

    def __str__(self):
        return self.year


class Semester(models.Model):
    """Semester definition (1st or 2nd semester of an academic year)"""
    SEMESTER_CHOICES = ((1, '1st Semester'), (2, '2nd Semester'))

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.PROTECT, related_name='semesters')
    number = models.IntegerField(choices=SEMESTER_CHOICES)  # 1 or 2
    start_date = models.DateField()
    end_date = models.DateField()
    enrollment_deadline = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sis_semester'
        unique_together = ('academic_year', 'number')
        ordering = ['-academic_year', '-number']
        indexes = [
            models.Index(fields=['academic_year', 'is_active']),
        ]

    def __str__(self):
        return f"{self.academic_year} - Semester {self.number}"


class Program(models.Model):
    """Academic program/degree"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sis_program'
        ordering = ['name']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.code} - {self.name}"


class Subject(models.Model):
    """Course/subject"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name='subjects')
    code = models.CharField(max_length=20)
    title = models.CharField(max_length=255)
    units = models.IntegerField()  # Credit units (1-6 typical)
    is_major = models.BooleanField(default=True)  # Affects INC expiry duration
    year_level = models.IntegerField()  # 1, 2, 3, 4
    semester_number = models.IntegerField(choices=((1, '1st Semester'), (2, '2nd Semester')))
    allow_multiple_sections = models.BooleanField(default=False)
    prerequisites = models.ManyToManyField('self', symmetrical=False, related_name='dependent_subjects', blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sis_subject'
        unique_together = ('program', 'code')
        ordering = ['program', 'year_level', 'semester_number', 'code']
        indexes = [
            models.Index(fields=['program', 'code']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.code} - {self.title}"


# ============================================================================
# STUDENT & ENROLLMENT MODELS
# ============================================================================

class Student(models.Model):
    """Student profile"""
    STUDENT_STATUS_CHOICES = (
        ('ACTIVE', 'Active'),
        ('LOA', 'Leave of Absence'),
        ('GRADUATED', 'Graduated'),
        ('WITHDRAWN', 'Withdrawn'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student')
    student_number = models.CharField(max_length=20, unique=True)
    program = models.ForeignKey(Program, on_delete=models.PROTECT, related_name='students')
    year_level = models.IntegerField(default=1)
    status = models.CharField(max_length=20, choices=STUDENT_STATUS_CHOICES, default='ACTIVE')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sis_student'
        ordering = ['student_number']
        indexes = [
            models.Index(fields=['student_number']),
            models.Index(fields=['program', 'status']),
        ]

    def __str__(self):
        return f"{self.student_number} - {self.user.get_full_name()}"


class Enrollment(models.Model):
    """Student enrollment in a semester"""
    ENROLLMENT_STATUS_CHOICES = (
        ('ACTIVE', 'Active'),
        ('LOA', 'Leave of Absence'),
        ('GRADUATED', 'Graduated'),
        ('WITHDRAWN', 'Withdrawn'),
    )
    CREATED_VIA_CHOICES = (
        ('ONLINE', 'Online Enrollment'),
        ('TRANSFEREE', 'Transferee'),
        ('MANUAL', 'Manual'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='enrollments')
    semester = models.ForeignKey(Semester, on_delete=models.PROTECT, related_name='enrollments')
    program = models.ForeignKey(Program, on_delete=models.PROTECT, related_name='enrollments')
    status = models.CharField(max_length=20, choices=ENROLLMENT_STATUS_CHOICES, default='ACTIVE')
    first_month_paid = models.BooleanField(default=False)  # Critical for subject enrollment gate
    monthly_commitment = models.DecimalField(max_digits=10, decimal_places=2)
    created_via = models.CharField(max_length=20, choices=CREATED_VIA_CHOICES, default='ONLINE')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sis_enrollment'
        unique_together = ('student', 'semester')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['student', 'semester']),
            models.Index(fields=['semester', 'status']),
            models.Index(fields=['first_month_paid']),
        ]

    def __str__(self):
        return f"{self.student.student_number} - {self.semester}"


# ============================================================================
# SECTION & SCHEDULING MODELS
# ============================================================================

class Section(models.Model):
    """Class section with capacity"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name='sections')
    code = models.CharField(max_length=20)  # e.g., "BSIT-1A"
    capacity = models.IntegerField()
    is_open = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sis_section'
        unique_together = ('semester', 'code')
        ordering = ['code']
        indexes = [
            models.Index(fields=['semester', 'code']),
        ]

    def __str__(self):
        return f"{self.code} ({self.semester})"

    def get_available_slots(self):
        """Get number of available enrollment slots"""
        enrolled = self.subject_enrollments.filter(status='ENROLLED').count()
        return max(0, self.capacity - enrolled)


class SectionSubject(models.Model):
    """Junction model: Section + Subject + Professor + Schedule"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='section_subjects')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='section_subjects')
    professor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='section_subjects')
    is_tba = models.BooleanField(default=False)  # To Be Assigned
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sis_sectionsubject'
        unique_together = ('section', 'subject')
        ordering = ['section', 'subject']
        indexes = [
            models.Index(fields=['section', 'subject']),
            models.Index(fields=['professor']),
        ]

    def __str__(self):
        return f"{self.section} - {self.subject}"


class ScheduleSlot(models.Model):
    """Schedule slot for a section's subject"""
    DAY_CHOICES = (
        ('MON', 'Monday'),
        ('TUE', 'Tuesday'),
        ('WED', 'Wednesday'),
        ('THU', 'Thursday'),
        ('FRI', 'Friday'),
        ('SAT', 'Saturday'),
        ('SUN', 'Sunday'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    section_subject = models.ForeignKey(SectionSubject, on_delete=models.CASCADE, related_name='schedule_slots')
    day = models.CharField(max_length=3, choices=DAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    room = models.CharField(max_length=50, blank=True)  # e.g., "Room 301"
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sis_scheduleslot'
        ordering = ['section_subject', 'day', 'start_time']
        indexes = [
            models.Index(fields=['section_subject', 'day']),
        ]

    def __str__(self):
        return f"{self.section_subject} - {self.day} {self.start_time}-{self.end_time}"


# ============================================================================
# SUBJECT ENROLLMENT MODELS
# ============================================================================

class SubjectEnrollment(models.Model):
    """Student enrollment in a subject"""
    STATUS_CHOICES = (
        ('ENROLLED', 'Enrolled'),
        ('PASSED', 'Passed'),
        ('FAILED', 'Failed'),
        ('INC', 'Incomplete'),
        ('DROPPED', 'Dropped'),
        ('CREDITED', 'Credited'),
        ('RETAKE', 'Retake'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name='subject_enrollments')
    subject = models.ForeignKey(Subject, on_delete=models.PROTECT, related_name='enrollments')
    section = models.ForeignKey(SectionSubject, on_delete=models.SET_NULL, null=True, blank=True, related_name='subject_enrollments')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ENROLLED')
    is_irregular = models.BooleanField(default=False)  # Outside recommended year/semester
    count_in_gpa = models.BooleanField(default=True)  # For transferee credits
    units = models.IntegerField()  # Denormalized from subject for historical records
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sis_subjectenrollment'
        unique_together = ('enrollment', 'subject')  # No duplicate enrollments
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['enrollment', 'status']),
            models.Index(fields=['subject', 'status']),
        ]

    def __str__(self):
        return f"{self.enrollment.student.student_number} - {self.subject.code} ({self.status})"


# ============================================================================
# PAYMENT MODELS
# ============================================================================

class MonthlyPaymentBucket(models.Model):
    """Monthly payment bucket (6 per enrollment)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name='monthly_payment_buckets')
    month_number = models.IntegerField()  # 1-6
    required_amount = models.DecimalField(max_digits=10, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_fully_paid = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sis_monthlypaymentbucket'
        unique_together = ('enrollment', 'month_number')
        ordering = ['enrollment', 'month_number']
        indexes = [
            models.Index(fields=['enrollment', 'is_fully_paid']),
            models.Index(fields=['enrollment', 'month_number']),
        ]

    def __str__(self):
        return f"{self.enrollment.student.student_number} - Month {self.month_number}"


class PaymentTransaction(models.Model):
    """Individual payment transaction"""
    PAYMENT_MODE_CHOICES = (
        ('CASH', 'Cash'),
        ('ONLINE', 'Online'),
        ('CHECK', 'Check'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name='payment_transactions')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_mode = models.CharField(max_length=20, choices=PAYMENT_MODE_CHOICES)
    allocated_to_month = models.IntegerField()  # Which month this payment goes to
    cashier = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments_recorded')
    receipt_number = models.CharField(max_length=50, unique=True)
    receipt_url = models.URLField(null=True, blank=True)  # URL to receipt PDF
    is_adjustment = models.BooleanField(default=False)  # Special payment or adjustment
    adjustment_reason = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sis_paymenttransaction'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['enrollment']),
            models.Index(fields=['receipt_number']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.receipt_number} - {self.enrollment.student.student_number} - ₱{self.amount}"


# ============================================================================
# EXAM & GRADE MODELS
# ============================================================================

class ExamPermit(models.Model):
    """Exam permit - authorization to take exam"""
    EXAM_CHOICES = (
        ('PRELIM', 'Preliminary Exam'),
        ('MIDTERM', 'Midterm Exam'),
        ('PREFINAL', 'Prefinal Exam'),
        ('FINAL', 'Final Exam'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name='exam_permits')
    exam_type = models.CharField(max_length=20, choices=EXAM_CHOICES)
    month_number = models.IntegerField()  # Which payment month unlocked this
    permit_code = models.CharField(max_length=50, unique=True)  # For verification
    unlocked_at = models.DateTimeField(auto_now_add=True)
    printed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sis_exampermit'
        ordering = ['enrollment', 'exam_type']
        indexes = [
            models.Index(fields=['enrollment', 'exam_type']),
            models.Index(fields=['permit_code']),
        ]

    def __str__(self):
        return f"{self.enrollment.student.student_number} - {self.exam_type}"


class Grade(models.Model):
    """Grade for a subject enrollment"""
    GRADE_CHOICES = (
        (1.0, '1.0 - Excellent'),
        (1.25, '1.25 - Very Good'),
        (1.5, '1.5 - Very Good'),
        (1.75, '1.75 - Good'),
        (2.0, '2.0 - Good'),
        (2.25, '2.25 - Satisfactory'),
        (2.5, '2.5 - Satisfactory'),
        (2.75, '2.75 - Passing'),
        (3.0, '3.0 - Passing'),
        (5.0, '5.0 - Failed'),
    )
    SPECIAL_GRADES = (
        ('INC', 'Incomplete'),
        ('DRP', 'Dropped'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject_enrollment = models.OneToOneField(SubjectEnrollment, on_delete=models.CASCADE, related_name='grade')
    value = models.FloatField(null=True, blank=True, choices=GRADE_CHOICES)  # Numeric grade
    special_grade = models.CharField(max_length=10, null=True, blank=True, choices=SPECIAL_GRADES)
    professor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='grades_given')
    is_finalized = models.BooleanField(default=False)
    finalized_at = models.DateTimeField(null=True, blank=True)
    inc_marked_at = models.DateTimeField(null=True, blank=True)  # When INC was marked
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sis_grade'
        ordering = ['subject_enrollment']
        indexes = [
            models.Index(fields=['subject_enrollment']),
            models.Index(fields=['is_finalized']),
        ]

    def __str__(self):
        grade_str = f"{self.value}" if self.value is not None else self.special_grade
        return f"{self.subject_enrollment.subject.code} - {grade_str}"


class GradeHistory(models.Model):
    """Audit trail for grade changes"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    grade = models.ForeignKey(Grade, on_delete=models.CASCADE, related_name='history')
    old_value = models.CharField(max_length=20, null=True, blank=True)
    new_value = models.CharField(max_length=20)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='grade_changes')
    reason = models.TextField(null=True, blank=True)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sis_gradehistory'
        ordering = ['grade', '-changed_at']
        indexes = [
            models.Index(fields=['grade', 'changed_at']),
        ]

    def __str__(self):
        return f"{self.grade} - {self.old_value} → {self.new_value}"


class Transcript(models.Model):
    """Student transcript for a semester (GPA)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='transcripts')
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name='transcripts')
    gpa = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sis_transcript'
        unique_together = ('student', 'semester')
        ordering = ['-semester']

    def __str__(self):
        return f"{self.student.student_number} - {self.semester} (GPA: {self.gpa})"


# ============================================================================
# TRANSFEREE & CREDIT MODELS
# ============================================================================

class CreditSource(models.Model):
    """Track source of credited subject (for transferees)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject_enrollment = models.OneToOneField(SubjectEnrollment, on_delete=models.CASCADE, related_name='credit_source')
    original_school = models.CharField(max_length=255)
    original_subject_code = models.CharField(max_length=50)
    original_grade = models.CharField(max_length=20, null=True, blank=True)
    tor_document_url = models.URLField(null=True, blank=True)  # TOR/transcript URL
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sis_creditsource'
        ordering = ['subject_enrollment']

    def __str__(self):
        return f"{self.subject_enrollment} - from {self.original_school}"


# ============================================================================
# DOCUMENT & AUDIT MODELS
# ============================================================================

class DocumentRelease(models.Model):
    """Official document release (TOR, COE, etc.)"""
    DOC_TYPE_CHOICES = (
        ('TOR', 'Transcript of Records'),
        ('COE', 'Certificate of Enrollment'),
        ('CGM', 'Certificate of Good Moral'),
        ('DIP', 'Diploma'),
        ('HD', 'Honorable Dismissal'),
        ('OTH', 'Other'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='document_releases')
    document_type = models.CharField(max_length=10, choices=DOC_TYPE_CHOICES)
    released_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='documents_released')
    release_date = models.DateField(auto_now_add=True)
    protected_url = models.URLField()  # Protected/signed URL
    revoked = models.BooleanField(default=False)
    revocation_reason = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sis_documentrelease'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['student', 'document_type']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.student.student_number} - {self.document_type}"


class AuditLog(models.Model):
    """Immutable audit trail of critical operations"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    action = models.CharField(max_length=100)  # e.g., "PAYMENT_RECORDED", "GRADE_FINALIZED"
    target_model = models.CharField(max_length=50)  # Model name (e.g., "PaymentTransaction")
    target_id = models.CharField(max_length=50)  # ID of affected model
    payload = models.JSONField(default=dict)  # {before, after, reason, metadata}
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'sis_auditlog'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['actor', 'created_at']),
            models.Index(fields=['target_model', 'target_id']),
            models.Index(fields=['action']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.action} - {self.target_model}({self.target_id}) by {self.actor}"


# ============================================================================
# NOTIFICATION & CONFIGURATION MODELS
# ============================================================================

class Notification(models.Model):
    """In-app notification for users"""
    NOTIFICATION_CHOICES = (
        ('PAYMENT', 'Payment'),
        ('PERMIT_UNLOCKED', 'Permit Unlocked'),
        ('INC_WARNING', 'INC Warning'),
        ('INC_EXPIRY', 'INC Expiry'),
        ('GRADE_POSTED', 'Grade Posted'),
        ('ENROLLMENT', 'Enrollment'),
        ('SYSTEM', 'System'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_CHOICES)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sis_notification'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.notification_type}"


class SystemConfig(models.Model):
    """System configuration key-value store"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    key = models.CharField(max_length=100, unique=True)
    value = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sis_systemconfig'
        ordering = ['key']

    def __str__(self):
        return f"{self.key} = {self.value}"


class ExamMonthMapping(models.Model):
    """Map exams to payment months"""
    EXAM_CHOICES = (
        ('PRELIM', 'Preliminary Exam'),
        ('MIDTERM', 'Midterm Exam'),
        ('PREFINAL', 'Prefinal Exam'),
        ('FINAL', 'Final Exam'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name='exam_mappings')
    exam_type = models.CharField(max_length=20, choices=EXAM_CHOICES)
    month_number = models.IntegerField()  # 1-6
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sis_exammonthmapping'
        unique_together = ('semester', 'exam_type')
        ordering = ['semester', 'exam_type']

    def __str__(self):
        return f"{self.semester} - {self.exam_type} → Month {self.month_number}"
