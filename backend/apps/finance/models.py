from django.db import models

# Create your models here.

class Payment(models.Model):
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='payments')
    term = models.ForeignKey('terms.Term', on_delete=models.CASCADE, related_name='payments')
    month_number = models.PositiveIntegerField() # 1-6
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2)
    
    is_promissory = models.BooleanField(default=False)
    is_adjustment = models.BooleanField(default=False)
    
    processed_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, related_name='processed_payments')
    payment_date = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student.idn} - Term {self.term.code} (Month {self.month_number})"
