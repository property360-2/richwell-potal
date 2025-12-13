"""
Admin configuration for academics app.
"""

from django.contrib import admin
from .models import Program, Subject, Section, SectionSubject, ScheduleSlot, CurriculumVersion


class SubjectInline(admin.TabularInline):
    model = Subject
    extra = 0
    show_change_link = True


class SectionSubjectInline(admin.TabularInline):
    model = SectionSubject
    extra = 0
    raw_id_fields = ['subject', 'professor']


class ScheduleSlotInline(admin.TabularInline):
    model = ScheduleSlot
    extra = 0


@admin.register(Program)
class ProgramAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'duration_years', 'is_active', 'total_subjects']
    list_filter = ['is_active', 'duration_years']
    search_fields = ['code', 'name']
    inlines = [SubjectInline]


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ['code', 'title', 'program', 'units', 'is_major', 'year_level', 'semester_number']
    list_filter = ['program', 'is_major', 'year_level', 'semester_number']
    search_fields = ['code', 'title']
    filter_horizontal = ['prerequisites']


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ['name', 'program', 'semester', 'year_level', 'capacity', 'enrolled_count']
    list_filter = ['program', 'semester', 'year_level']
    search_fields = ['name']
    inlines = [SectionSubjectInline]


@admin.register(SectionSubject)
class SectionSubjectAdmin(admin.ModelAdmin):
    list_display = ['section', 'subject', 'professor', 'is_tba']
    list_filter = ['is_tba', 'section__semester']
    search_fields = ['section__name', 'subject__code']
    inlines = [ScheduleSlotInline]


@admin.register(ScheduleSlot)
class ScheduleSlotAdmin(admin.ModelAdmin):
    list_display = ['section_subject', 'day', 'start_time', 'end_time', 'room']
    list_filter = ['day', 'section_subject__section__semester']
    search_fields = ['room', 'section_subject__subject__code']


@admin.register(CurriculumVersion)
class CurriculumVersionAdmin(admin.ModelAdmin):
    list_display = ['program', 'semester', 'version_number', 'is_active', 'created_by', 'created_at']
    list_filter = ['is_active', 'program', 'semester']
    search_fields = ['program__code', 'notes']
    readonly_fields = ['subjects_snapshot', 'version_number', 'created_at']

