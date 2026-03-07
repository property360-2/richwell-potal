from django.contrib import admin
from .models import Program, CurriculumVersion, Subject, SubjectPrerequisite

@admin.register(Program)
class ProgramAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'effective_year', 'has_summer', 'is_active', 'program_head')
    search_fields = ('code', 'name')
    list_filter = ('is_active', 'has_summer')

@admin.register(CurriculumVersion)
class CurriculumVersionAdmin(admin.ModelAdmin):
    list_display = ('program', 'version_name', 'is_active', 'created_at')
    search_fields = ('program__code', 'version_name')
    list_filter = ('is_active',)

@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ('code', 'description', 'curriculum', 'year_level', 'semester', 'total_units', 'is_major', 'is_practicum')
    search_fields = ('code', 'description', 'curriculum__program__code')
    list_filter = ('year_level', 'semester', 'is_major', 'is_practicum')

@admin.register(SubjectPrerequisite)
class SubjectPrerequisiteAdmin(admin.ModelAdmin):
    list_display = ('subject', 'prerequisite_type', 'prerequisite_subject', 'standing_year')
    search_fields = ('subject__code', 'prerequisite_subject__code')
    list_filter = ('prerequisite_type',)
