from django.contrib import admin
from .models import Payment

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('student', 'term', 'month_number', 'amount_paid', 'is_promissory', 'is_adjustment', 'payment_date')
    list_filter = ('term', 'month_number', 'is_promissory', 'is_adjustment')
    search_fields = ('student__idn', 'student__user__last_name')
    readonly_fields = ('payment_date', 'created_at')
