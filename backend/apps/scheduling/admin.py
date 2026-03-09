from django.contrib import admin
from .models import Schedule

@admin.register(Schedule)
class ScheduleAdmin(admin.ModelAdmin):
    list_display = ('section', 'subject', 'professor', 'room', 'days', 'term')
    list_filter = ('term', 'section', 'room', 'professor')
    search_fields = ('section__name', 'subject__code', 'professor__user__last_name')
