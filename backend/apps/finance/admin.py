from django.contrib import admin
from .models import Payment

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('student', 'term', 'month', 'amount', 'is_promissory', 'entry_type', 'created_at')
    list_filter = ('term', 'month', 'is_promissory', 'entry_type')
    search_fields = ('student__idn', 'student__user__last_name')
    readonly_fields = ('created_at',)
