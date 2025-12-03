"""
Django signals for SIS application.
Handles automatic operations when models are created/updated.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from . import models


@receiver(post_save, sender=models.Enrollment)
def create_monthly_payment_buckets(sender, instance, created, **kwargs):
    """
    Automatically create 6 monthly payment buckets when enrollment is created.
    """
    if created:
        for month_number in range(1, 7):
            models.MonthlyPaymentBucket.objects.create(
                enrollment=instance,
                month_number=month_number,
                required_amount=instance.monthly_commitment,
            )


@receiver(post_save, sender=models.Student)
def ensure_user_role(sender, instance, **kwargs):
    """
    Ensure student's user has STUDENT role.
    """
    if instance.user.role != 'STUDENT':
        instance.user.role = 'STUDENT'
        instance.user.save()
