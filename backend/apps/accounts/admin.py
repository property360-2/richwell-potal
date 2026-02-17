"""
Admin configuration for accounts app.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, StudentProfile, ProfessorProfile


class StudentProfileInline(admin.StackedInline):
    model = StudentProfile
    can_delete = False
    verbose_name_plural = 'Student Profile'


class ProfessorProfileInline(admin.StackedInline):
    model = ProfessorProfile
    can_delete = False
    verbose_name_plural = 'Professor Profile'
    filter_horizontal = ['assigned_subjects', 'programs']


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'first_name', 'last_name', 'role', 'student_number', 'is_active']
    list_filter = ['role', 'is_active', 'is_staff']
    search_fields = ['email', 'first_name', 'last_name', 'student_number']
    ordering = ['-created_at']
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'username')}),
        ('Role & Student Info', {'fields': ('role', 'student_number')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important Dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'role', 'password1', 'password2'),
        }),
    )
    
    inlines = [StudentProfileInline]
    
    def get_inline_instances(self, request, obj=None):
        if not obj:
            return []
        
        inlines = []
        if obj.role == 'STUDENT':
            inlines.append(StudentProfileInline(self.model, self.admin_site))
        elif obj.role == 'PROFESSOR':
            inlines.append(ProfessorProfileInline(self.model, self.admin_site))
            
        return inlines


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'program', 'year_level', 'status', 'is_transferee']
    list_filter = ['status', 'is_transferee', 'program', 'year_level']
    search_fields = ['user__email', 'user__first_name', 'user__last_name']
    raw_id_fields = ['user', 'program']
@admin.register(ProfessorProfile)
class ProfessorProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'department', 'specialization', 'is_active']
    list_filter = ['is_active', 'department']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'specialization']
    filter_horizontal = ['assigned_subjects', 'programs']
    raw_id_fields = ['user']
