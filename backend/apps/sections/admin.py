from django.contrib import admin
from .models import Section, SectionStudent

@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ('name', 'term', 'program', 'year_level', 'session', 'section_number', 'is_active')
    list_filter = ('term', 'program', 'year_level', 'session', 'is_active')
    search_fields = ('name',)

@admin.register(SectionStudent)
class SectionStudentAdmin(admin.ModelAdmin):
    list_display = ('student', 'section', 'is_home_section', 'created_at')
    list_filter = ('section__term', 'section__program', 'is_home_section')
    search_fields = ('student__idn', 'student__user__last_name', 'section__name')
