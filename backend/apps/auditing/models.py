"""
Richwell Portal — Auditing Models

This module defines the AuditLog model used to track all sensitive data changes 
and authentication events across the system.
"""

from django.db import models
from django.conf import settings

class AuditLog(models.Model):
    """
    Stores a single audit entry representing a change or event.
    Tracks the user, action type, affected model, and specific field changes.
    """
    ACTION_CHOICES = [
        ('CREATE', 'Create'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
        ('LOGIN_FAILED', 'Login Failed'),
        ('BULK_IMPORT', 'Bulk Import'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs'
    )
    action = models.CharField(max_length=15, choices=ACTION_CHOICES)
    model_name = models.CharField(max_length=100)
    object_id = models.CharField(max_length=255)
    object_repr = models.CharField(max_length=255, blank=True)
    changes = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        """
        Returns a human readable summary of the audit entry.
        """
        return f"{self.action} on {self.model_name} ({self.object_id}) by {self.user}"
