from django.db import models
from apps.auditing.mixins import AuditMixin

# Create your models here.

class Payment(AuditMixin, models.Model):
    class EntryType(models.TextChoices):
        PAYMENT = 'PAYMENT', 'Payment'
        ADJUSTMENT = 'ADJUSTMENT', 'Adjustment'

    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='payments')
    term = models.ForeignKey('terms.Term', on_delete=models.CASCADE, related_name='payments')
    month = models.PositiveIntegerField() # 1-6
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    entry_type = models.CharField(max_length=20, choices=EntryType.choices, default=EntryType.PAYMENT)
    
    is_promissory = models.BooleanField(default=False)
    notes = models.TextField(blank=True, null=True)
    reference_number = models.CharField(max_length=50, unique=True, null=True, blank=True)
    processed_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, related_name='processed_payments')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.student.idn} - {self.entry_type} - Month {self.month} - {self.amount}"
