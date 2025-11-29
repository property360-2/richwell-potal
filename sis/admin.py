from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, Program, Semester, Subject, Student, Enrollment, SubjectEnrollment,
    Section, ScheduleSlot, PaymentMonth, Payment, Grade, ExamPermit,
    AuditLog, Notification, TransferCredit
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom user admin with role and contact information."""
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('role', 'phone_number', 'address', 'date_of_birth')}),
    )
    list_display = ['username', 'email', 'first_name', 'last_name', 'role', 'is_staff']
    list_filter = ['role', 'is_staff', 'is_superuser', 'created_at']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering = ['-created_at']


@admin.register(Program)
class ProgramAdmin(admin.ModelAdmin):
    """Program/degree administration."""
    list_display = ['code', 'name', 'duration_years', 'total_units_required', 'is_active']
    list_filter = ['is_active', 'created_at']
    search_fields = ['code', 'name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Semester)
class SemesterAdmin(admin.ModelAdmin):
    """Semester/academic period administration."""
    list_display = ['__str__', 'start_date', 'end_date', 'is_active']
    list_filter = ['year', 'semester', 'is_active']
    search_fields = ['year']
    readonly_fields = ['created_at']


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    """Subject/course administration."""
    list_display = ['code', 'name', 'program', 'units', 'subject_type', 'is_active']
    list_filter = ['subject_type', 'program', 'is_active']
    search_fields = ['code', 'name']
    readonly_fields = ['created_at', 'updated_at']
    filter_horizontal = ['prerequisites']


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    """Student profile administration."""
    list_display = ['student_id', 'user', 'program', 'status', 'gpa', 'is_transferee']
    list_filter = ['status', 'program', 'is_transferee', 'created_at']
    search_fields = ['student_id', 'user__first_name', 'user__last_name', 'user__email']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    """Semester enrollment administration."""
    list_display = ['student', 'semester', 'total_units', 'is_confirmed']
    list_filter = ['semester', 'is_confirmed']
    search_fields = ['student__user__first_name', 'student__user__last_name', 'student__student_id']
    readonly_fields = ['enrollment_date', 'created_at', 'updated_at']


class SubjectEnrollmentInline(admin.TabularInline):
    """Inline admin for subject enrollments within enrollment."""
    model = SubjectEnrollment
    extra = 0
    fields = ['subject', 'section', 'enrollment_status', 'grade_status', 'grade']
    readonly_fields = ['created_at']


@admin.register(SubjectEnrollment)
class SubjectEnrollmentAdmin(admin.ModelAdmin):
    """Subject enrollment (course) administration."""
    list_display = ['enrollment', 'subject', 'enrollment_status', 'grade_status', 'grade']
    list_filter = ['enrollment_status', 'grade_status', 'subject_status']
    search_fields = ['enrollment__student__student_id', 'subject__code', 'subject__name']
    readonly_fields = ['enrolled_date', 'created_at', 'updated_at']


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    """Class section administration."""
    list_display = ['code', 'subject', 'professor', 'semester', 'capacity', 'current_enrollment']
    list_filter = ['semester', 'subject']
    search_fields = ['code', 'subject__code', 'professor__first_name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(ScheduleSlot)
class ScheduleSlotAdmin(admin.ModelAdmin):
    """Class schedule slot administration."""
    list_display = ['section', 'day', 'start_time', 'end_time']
    list_filter = ['day', 'section__semester']
    search_fields = ['section__code']


@admin.register(PaymentMonth)
class PaymentMonthAdmin(admin.ModelAdmin):
    """Monthly payment bucket administration."""
    list_display = ['enrollment', 'month_number', 'amount_due', 'amount_paid', 'is_paid']
    list_filter = ['month_number', 'is_paid']
    search_fields = ['enrollment__student__student_id']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    """Payment transaction administration."""
    list_display = ['reference_number', 'student', 'amount', 'payment_method', 'status', 'payment_date']
    list_filter = ['status', 'payment_method', 'payment_date']
    search_fields = ['reference_number', 'student__student_id', 'student__user__email']
    readonly_fields = ['payment_date', 'created_at', 'updated_at']


@admin.register(Grade)
class GradeAdmin(admin.ModelAdmin):
    """Grade administration."""
    list_display = ['subject_enrollment', 'grade_value', 'is_finalized', 'submitted_by', 'finalized_by']
    list_filter = ['grade_value', 'is_finalized', 'created_at']
    search_fields = ['subject_enrollment__enrollment__student__student_id']
    readonly_fields = ['submitted_date', 'finalized_date', 'created_at', 'updated_at']


@admin.register(ExamPermit)
class ExamPermitAdmin(admin.ModelAdmin):
    """Exam permit administration."""
    list_display = ['enrollment', 'status', 'issued_date', 'expiry_date']
    list_filter = ['status']
    search_fields = ['enrollment__student__student_id']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Audit log administration (read-only)."""
    list_display = ['action', 'target_model', 'target_id', 'actor', 'timestamp']
    list_filter = ['action', 'timestamp']
    search_fields = ['target_model', 'action']
    readonly_fields = ['actor', 'action', 'target_model', 'target_id', 'before_data', 'after_data', 'timestamp']

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """Notification administration."""
    list_display = ['notification_type', 'user', 'title', 'read', 'created_at']
    list_filter = ['notification_type', 'read', 'created_at']
    search_fields = ['user__email', 'title', 'message']
    readonly_fields = ['created_at']


@admin.register(TransferCredit)
class TransferCreditAdmin(admin.ModelAdmin):
    """Transfer credit administration."""
    list_display = ['student', 'subject', 'credited_subject_code', 'units', 'prior_institution']
    list_filter = ['subject__program', 'approval_date']
    search_fields = ['student__student_id', 'credited_subject_code', 'prior_institution']
    readonly_fields = ['created_at']
