"""
Django admin configuration for SIS models.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from . import models


@admin.register(models.User)
class UserAdmin(BaseUserAdmin):
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Role', {'fields': ('role',)}),
    )
    list_filter = BaseUserAdmin.list_filter + ('role',)
    list_display = ('email', 'get_full_name', 'role', 'is_active')


@admin.register(models.Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('student_number', 'user', 'program', 'year_level', 'status')
    list_filter = ('status', 'program', 'year_level')
    search_fields = ('student_number', 'user__email', 'user__first_name', 'user__last_name')
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(models.Program)
class ProgramAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('code', 'name')


@admin.register(models.Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ('code', 'title', 'program', 'units', 'is_major', 'year_level')
    list_filter = ('program', 'is_major', 'year_level', 'semester_number')
    search_fields = ('code', 'title')
    filter_horizontal = ('prerequisites',)


@admin.register(models.Semester)
class SemesterAdmin(admin.ModelAdmin):
    list_display = ('academic_year', 'number', 'start_date', 'end_date', 'is_active')
    list_filter = ('academic_year', 'is_active')


@admin.register(models.AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    list_display = ('year', 'start_date', 'end_date', 'is_current')
    list_filter = ('is_current',)


@admin.register(models.Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ('student', 'semester', 'program', 'status', 'first_month_paid')
    list_filter = ('status', 'semester', 'first_month_paid')
    search_fields = ('student__student_number', 'student__user__email')
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(models.Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ('code', 'semester', 'capacity', 'is_open')
    list_filter = ('semester', 'is_open')
    search_fields = ('code',)


@admin.register(models.SectionSubject)
class SectionSubjectAdmin(admin.ModelAdmin):
    list_display = ('section', 'subject', 'professor', 'is_tba')
    list_filter = ('section__semester', 'is_tba')
    search_fields = ('section__code', 'subject__code')


@admin.register(models.SubjectEnrollment)
class SubjectEnrollmentAdmin(admin.ModelAdmin):
    list_display = ('enrollment', 'subject', 'status', 'is_irregular')
    list_filter = ('status', 'is_irregular')
    search_fields = ('enrollment__student__student_number', 'subject__code')
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(models.MonthlyPaymentBucket)
class MonthlyPaymentBucketAdmin(admin.ModelAdmin):
    list_display = ('enrollment', 'month_number', 'required_amount', 'paid_amount', 'is_fully_paid')
    list_filter = ('is_fully_paid', 'month_number')
    search_fields = ('enrollment__student__student_number',)
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(models.PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = ('receipt_number', 'enrollment', 'amount', 'allocated_to_month', 'payment_mode')
    list_filter = ('payment_mode', 'allocated_to_month', 'is_adjustment')
    search_fields = ('receipt_number', 'enrollment__student__student_number')
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(models.Grade)
class GradeAdmin(admin.ModelAdmin):
    list_display = ('subject_enrollment', 'value', 'special_grade', 'is_finalized', 'professor')
    list_filter = ('is_finalized', 'value')
    search_fields = ('subject_enrollment__enrollment__student__student_number',)
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(models.ExamPermit)
class ExamPermitAdmin(admin.ModelAdmin):
    list_display = ('permit_code', 'enrollment', 'exam_type', 'month_number', 'unlocked_at')
    list_filter = ('exam_type', 'unlocked_at')
    search_fields = ('permit_code', 'enrollment__student__student_number')
    readonly_fields = ('id', 'created_at', 'unlocked_at')


@admin.register(models.AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('action', 'target_model', 'actor', 'created_at')
    list_filter = ('action', 'target_model', 'created_at')
    search_fields = ('actor__email', 'target_id')
    readonly_fields = ('id', 'created_at', 'payload')


@admin.register(models.Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'notification_type', 'is_read', 'created_at')
    list_filter = ('notification_type', 'is_read', 'created_at')
    search_fields = ('user__email',)
    readonly_fields = ('id', 'created_at')


@admin.register(models.SystemConfig)
class SystemConfigAdmin(admin.ModelAdmin):
    list_display = ('key', 'value', 'updated_at')
    search_fields = ('key',)
    readonly_fields = ('id', 'created_at')


@admin.register(models.ExamMonthMapping)
class ExamMonthMappingAdmin(admin.ModelAdmin):
    list_display = ('semester', 'exam_type', 'month_number')
    list_filter = ('semester', 'exam_type')
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(models.DocumentRelease)
class DocumentReleaseAdmin(admin.ModelAdmin):
    list_display = ('student', 'document_type', 'released_by', 'revoked')
    list_filter = ('document_type', 'revoked', 'created_at')
    search_fields = ('student__student_number',)
    readonly_fields = ('id', 'created_at')


@admin.register(models.Transcript)
class TranscriptAdmin(admin.ModelAdmin):
    list_display = ('student', 'semester', 'gpa')
    list_filter = ('semester',)
    search_fields = ('student__student_number',)
    readonly_fields = ('id', 'created_at', 'updated_at')
