from django.db import models
from django.conf import settings

class Notification(models.Model):
    class NotificationType(models.TextChoices):
        ADVISING = 'ADVISING', 'Advising'
        GRADE = 'GRADE', 'Grade'
        FINANCE = 'FINANCE', 'Finance'
        ENROLLMENT = 'ENROLLMENT', 'Enrollment'
        SCHEDULE = 'SCHEDULE', 'Schedule'
        GENERAL = 'GENERAL', 'General'

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='notifications'
    )
    type = models.CharField(
        max_length=20, 
        choices=NotificationType.choices, 
        default=NotificationType.GENERAL
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    link_url = models.CharField(max_length=255, blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.recipient.username} - {self.title} ({self.type})"
