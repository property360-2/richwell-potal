"""
Admin configuration for academics app.
"""

from django.contrib import admin
from .models import (
    Program, Subject, Section, SectionSubject, ScheduleSlot,
    CurriculumVersion, Curriculum, CurriculumSubject
)


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
    list_display = ['code', 'title', 'program', 'units', 'is_major', 'year_level', 'semester_number', 'qualified_count']
    list_filter = ['program', 'is_major', 'year_level', 'semester_number']
    search_fields = ['code', 'title']
    filter_horizontal = ['prerequisites']
    readonly_fields = ['display_qualified_professors']

    def qualified_count(self, obj):
        return obj.qualified_professors.count()
    qualified_count.short_description = 'Qual. Profs'

    def display_qualified_professors(self, obj):
        profs = obj.qualified_professors.all()
        if not profs:
            return "No professors qualified for this subject."
        return ", ".join([p.user.get_full_name() for p in profs])
    display_qualified_professors.short_description = 'Professors Qualified to Teach'


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


@admin.register(Curriculum)
class CurriculumAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'program', 'effective_year', 'is_active', 'total_subjects']
    list_filter = ['is_active', 'program', 'effective_year']
    search_fields = ['code', 'name', 'program__code']
    readonly_fields = ['created_at', 'updated_at']

    def total_subjects(self, obj):
        return obj.curriculumsubject_set.filter(is_deleted=False).count()
    total_subjects.short_description = 'Total Subjects'


@admin.register(CurriculumSubject)
class CurriculumSubjectAdmin(admin.ModelAdmin):
    list_display = ['curriculum', 'subject', 'year_level', 'semester_number', 'is_required']
    list_filter = ['curriculum__program', 'year_level', 'semester_number', 'is_required']
    search_fields = ['curriculum__code', 'subject__code', 'subject__title']
    raw_id_fields = ['curriculum', 'subject', 'semester']

