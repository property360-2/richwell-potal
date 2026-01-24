"""
Core models - Base classes for all models in the system.
"""

import uuid
from django.db import models
from django.conf import settings


class BaseModel(models.Model):
    """
    Abstract base model providing common fields for all models:
    - UUID primary key
    - Timestamps (created_at, updated_at)
    - Soft delete support (is_deleted)
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for this record"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when this record was created"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp when this record was last updated"
    )
    is_deleted = models.BooleanField(
        default=False,
        help_text="Soft delete flag - if True, record is considered deleted"
    )

    class Meta:
        abstract = True
        ordering = ['-created_at']

    def soft_delete(self):
        """Mark record as deleted without actually removing from database."""
        self.is_deleted = True
        self.save(update_fields=['is_deleted', 'updated_at'])

    def restore(self):
        """Restore a soft-deleted record."""
        self.is_deleted = False
        self.save(update_fields=['is_deleted', 'updated_at'])


class ActiveManager(models.Manager):
    """Manager that returns only non-deleted records by default."""
    
    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)


class BaseModelWithActiveManager(BaseModel):
    """
    BaseModel with ActiveManager as default.
    Use `all_objects` to include soft-deleted records.
    """
    
    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        abstract = True


class SystemConfig(BaseModel):
    """
    Dynamic system configuration.
    Stores key-value pairs for runtime settings.
    """
    
    key = models.CharField(
        max_length=100,
        unique=True,
        help_text='Configuration key (e.g., ENROLLMENT_ENABLED)'
    )
    value = models.JSONField(
        default=dict,
        help_text='Configuration value (can be boolean, string, number, or object)'
    )
    description = models.TextField(
        blank=True,
        help_text='Description of what this setting controls'
    )
    
    class Meta:
        verbose_name = 'System Configuration'
        verbose_name_plural = 'System Configurations'
        ordering = ['key']
        
    def __str__(self):
        return f"{self.key}: {self.value}"

    @classmethod
    def get_value(cls, key, default=None):
        """Get config value by key."""
        try:
            return cls.objects.get(key=key, is_deleted=False).value
        except cls.DoesNotExist:
            return default
            
    @classmethod
    def set_value(cls, key, value, description=''):
        """Set config value."""
        config, created = cls.objects.update_or_create(
            key=key,
            defaults={
                'value': value,
                'description': description,
                'is_deleted': False
            }
        )
        return config


class Notification(models.Model):
    """
    Model for storing user notifications.
    Supports various notification types for different events in the system.
    """
    NOTIFICATION_TYPES = [
        ('PAYMENT', 'Payment'),
        ('ENROLLMENT', 'Enrollment'),
        ('DOCUMENT', 'Document'),
        ('GRADE', 'Grade'),
        ('ANNOUNCEMENT', 'Announcement'),
        ('SYSTEM', 'System'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        help_text='User who will receive this notification'
    )
    notification_type = models.CharField(
        max_length=20,
        choices=NOTIFICATION_TYPES,
        help_text='Type of notification'
    )
    title = models.CharField(
        max_length=200,
        help_text='Notification title/subject'
    )
    message = models.TextField(
        help_text='Notification message body'
    )
    link = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        help_text='Optional link to related resource (e.g., /soa.html, /grades.html)'
    )
    is_read = models.BooleanField(
        default=False,
        help_text='Whether the user has read this notification'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text='When the notification was created'
    )
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'is_read']),
        ]
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
    
    def __str__(self):
        return f"{self.get_notification_type_display()} - {self.title} ({self.user.email})"
    
    def mark_as_read(self):
        """Mark this notification as read"""
        if not self.is_read:
            self.is_read = True
            self.save(update_fields=['is_read'])
