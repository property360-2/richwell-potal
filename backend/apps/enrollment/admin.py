"""
Admin configuration for enrollment app.
"""

from django.contrib import admin
from .models import (
    Semester, Enrollment, MonthlyPaymentBucket, 
    EnrollmentDocument, SubjectEnrollment, CreditSource
)


class MonthlyPaymentBucketInline(admin.TabularInline):
    model = MonthlyPaymentBucket
    extra = 0
    readonly_fields = ['remaining_amount', 'payment_percentage']


class EnrollmentDocumentInline(admin.TabularInline):
    model = EnrollmentDocument
    extra = 0


class SubjectEnrollmentInline(admin.TabularInline):
    model = SubjectEnrollment
    extra = 0
    raw_id_fields = ['subject', 'section']


@admin.register(Semester)
class SemesterAdmin(admin.ModelAdmin):
    list_display = ['name', 'academic_year', 'start_date', 'end_date', 'is_current']
    list_filter = ['is_current', 'academic_year']
    search_fields = ['name', 'academic_year']


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ['student', 'semester', 'status', 'created_via', 'monthly_commitment', 'first_month_paid']
    list_filter = ['status', 'created_via', 'semester', 'first_month_paid']
    search_fields = ['student__email', 'student__first_name', 'student__last_name', 'student__student_number']
    raw_id_fields = ['student', 'semester']
    inlines = [MonthlyPaymentBucketInline, EnrollmentDocumentInline, SubjectEnrollmentInline]


@admin.register(EnrollmentDocument)
class EnrollmentDocumentAdmin(admin.ModelAdmin):
    list_display = ['enrollment', 'document_type', 'original_filename', 'is_verified', 'verified_by']
    list_filter = ['document_type', 'is_verified']
    search_fields = ['enrollment__student__email', 'original_filename']


@admin.register(SubjectEnrollment)
class SubjectEnrollmentAdmin(admin.ModelAdmin):
    list_display = ['enrollment', 'subject', 'status', 'grade', 'is_irregular']
    list_filter = ['status', 'is_irregular']
    search_fields = ['enrollment__student__email', 'subject__code']
    raw_id_fields = ['enrollment', 'subject', 'section']


@admin.register(CreditSource)
class CreditSourceAdmin(admin.ModelAdmin):
    list_display = ['subject_enrollment', 'original_school', 'original_subject_code', 'credited_by']
    search_fields = ['original_school', 'original_subject_code']


# ============================================================
# EPIC 4 — Payment & Exam Permit Admin
# ============================================================

from .models import PaymentTransaction, ExamMonthMapping, ExamPermit


class PaymentTransactionInline(admin.TabularInline):
    model = PaymentTransaction
    extra = 0
    readonly_fields = ['receipt_number', 'processed_at', 'total_allocated']
    fields = ['receipt_number', 'amount', 'payment_mode', 'processed_at', 'is_adjustment']


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = ['receipt_number', 'enrollment', 'amount', 'payment_mode', 'processed_by', 'processed_at', 'is_adjustment']
    list_filter = ['payment_mode', 'is_adjustment', 'processed_at']
    search_fields = ['receipt_number', 'reference_number', 'enrollment__student__email', 'enrollment__student__student_number']
    readonly_fields = ['receipt_number', 'processed_at', 'allocated_buckets', 'total_allocated']
    raw_id_fields = ['enrollment', 'processed_by', 'original_transaction']
    date_hierarchy = 'processed_at'


@admin.register(ExamMonthMapping)
class ExamMonthMappingAdmin(admin.ModelAdmin):
    list_display = ['semester', 'exam_period', 'required_month', 'is_active']
    list_filter = ['semester', 'exam_period', 'is_active']
    ordering = ['semester', 'required_month']


@admin.register(ExamPermit)
class ExamPermitAdmin(admin.ModelAdmin):
    list_display = ['permit_code', 'enrollment', 'exam_period', 'required_month', 'is_printed', 'created_at']
    list_filter = ['exam_period', 'is_printed', 'created_at']
    search_fields = ['permit_code', 'enrollment__student__email', 'enrollment__student__student_number']
    readonly_fields = ['permit_code', 'created_at']
    raw_id_fields = ['enrollment', 'printed_by']
