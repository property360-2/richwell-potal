"""
Audit models - Immutable audit log for all critical operations.
"""

import uuid
from django.db import models
from django.conf import settings


class AuditLog(models.Model):
    """
    Immutable audit log for tracking all critical operations.
    Records cannot be updated or deleted.
    """
    
    class Action(models.TextChoices):
        # Enrollment actions
        ENROLLMENT_CREATED = 'ENROLLMENT_CREATED', 'Enrollment Created'
        ENROLLMENT_UPDATED = 'ENROLLMENT_UPDATED', 'Enrollment Updated'
        ENROLLMENT_STATUS_CHANGED = 'ENROLLMENT_STATUS_CHANGED', 'Enrollment Status Changed'
        
        # Payment actions
        PAYMENT_RECORDED = 'PAYMENT_RECORDED', 'Payment Recorded'
        PAYMENT_ADJUSTED = 'PAYMENT_ADJUSTED', 'Payment Adjusted'
        PAYMENT_ALLOCATED = 'PAYMENT_ALLOCATED', 'Payment Allocated'
        
        # Subject enrollment actions
        SUBJECT_ENROLLED = 'SUBJECT_ENROLLED', 'Subject Enrolled'
        SUBJECT_DROPPED = 'SUBJECT_DROPPED', 'Subject Dropped'
        
        # Grade actions
        GRADE_SUBMITTED = 'GRADE_SUBMITTED', 'Grade Submitted'
        GRADE_UPDATED = 'GRADE_UPDATED', 'Grade Updated'
        GRADE_FINALIZED = 'GRADE_FINALIZED', 'Grade Finalized'
        INC_CONVERTED_TO_FAILED = 'INC_CONVERTED_TO_FAILED', 'INC Converted to Failed'
        
        # User actions
        USER_CREATED = 'USER_CREATED', 'User Created'
        USER_UPDATED = 'USER_UPDATED', 'User Updated'
        USER_LOGIN = 'USER_LOGIN', 'User Login'
        USER_LOGOUT = 'USER_LOGOUT', 'User Logout'
        USER_IMPERSONATED = 'USER_IMPERSONATED', 'User Impersonated'
        
        # Document actions
        DOCUMENT_RELEASED = 'DOCUMENT_RELEASED', 'Document Released'
        DOCUMENT_REVOKED = 'DOCUMENT_REVOKED', 'Document Revoked'
        DOCUMENT_REISSUED = 'DOCUMENT_REISSUED', 'Document Reissued'
        DOCUMENT_ACCESSED = 'DOCUMENT_ACCESSED', 'Document Accessed'
        DOCUMENT_VERIFIED = 'DOCUMENT_VERIFIED', 'Document Verified'
        
        # Schedule actions
        SCHEDULE_CONFLICT_OVERRIDE = 'SCHEDULE_CONFLICT_OVERRIDE', 'Schedule Conflict Override'
        
        # Credit actions (transferee)
        CREDIT_ASSIGNED = 'CREDIT_ASSIGNED', 'Credit Assigned'
        CREDIT_REMOVED = 'CREDIT_REMOVED', 'Credit Removed'
        
        # Curriculum actions (EPIC 2)
        CURRICULUM_CHANGED = 'CURRICULUM_CHANGED', 'Curriculum Changed'
        CURRICULUM_VERSION_CREATED = 'CURRICULUM_VERSION_CREATED', 'Curriculum Version Created'
        SECTION_CREATED = 'SECTION_CREATED', 'Section Created'
        SECTION_UPDATED = 'SECTION_UPDATED', 'Section Updated'
        
        # System actions
        CONFIG_CHANGED = 'CONFIG_CHANGED', 'Configuration Changed'
        SYSTEM_EVENT = 'SYSTEM_EVENT', 'System Event'
        
        # Override actions
        OVERRIDE_APPLIED = 'OVERRIDE_APPLIED', 'Override Applied'
        
        # Exam Permit actions (EPIC 4)
        EXAM_PERMIT_GENERATED = 'EXAM_PERMIT_GENERATED', 'Exam Permit Generated'
        EXAM_PERMIT_PRINTED = 'EXAM_PERMIT_PRINTED', 'Exam Permit Printed'
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    # Actor - who performed the action (null for system actions)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
        help_text='User who performed the action (null for system)'
    )
    
    # Action performed
    action = models.CharField(
        max_length=50,
        choices=Action.choices,
        db_index=True,
        help_text='Type of action performed'
    )
    
    # Target - what was affected
    target_model = models.CharField(
        max_length=100,
        db_index=True,
        help_text='Model name of the affected object'
    )
    target_id = models.UUIDField(
        null=True,
        blank=True,
        db_index=True,
        help_text='ID of the affected object'
    )
    
    # Details
    payload = models.JSONField(
        default=dict,
        help_text='Additional details: before/after states, reason, metadata'
    )
    
    # Request context
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text='IP address of the client'
    )
    user_agent = models.CharField(
        max_length=500,
        blank=True,
        help_text='User agent string'
    )
    
    # Timestamp
    timestamp = models.DateTimeField(
        auto_now_add=True,
        db_index=True
    )
    
    class Meta:
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['actor', 'timestamp']),
            models.Index(fields=['action', 'timestamp']),
            models.Index(fields=['target_model', 'target_id']),
        ]
    
    def __str__(self):
        actor_name = self.actor.get_full_name() if self.actor else 'SYSTEM'
        return f"{actor_name} - {self.get_action_display()} - {self.timestamp}"
    
    def save(self, *args, **kwargs):
        """
        Override save to prevent updates to existing records.
        Audit logs are immutable - once created, they cannot be modified.
        """
        if self.pk and AuditLog.objects.filter(pk=self.pk).exists():
            raise ValueError("AuditLog records cannot be modified after creation.")
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        """
        Override delete to prevent deletion of records.
        Audit logs are immutable - they cannot be deleted.
        """
        raise ValueError("AuditLog records cannot be deleted.")
    
    @classmethod
    def log(cls, action, target_model, target_id=None, payload=None, actor=None, ip_address=None, user_agent=''):
        """
        Convenience method to create an audit log entry.
        
        Args:
            action: The action type (use Action choices)
            target_model: Name of the affected model (e.g., 'Enrollment')
            target_id: UUID of the affected object
            payload: Dict with additional details
            actor: User who performed the action (auto-detected if not provided)
            ip_address: Client IP (auto-detected if not provided)
            user_agent: Client user agent
        """
        from apps.audit.middleware import get_current_user, get_client_ip
        
        if actor is None:
            actor = get_current_user()
        
        if ip_address is None:
            ip_address = get_client_ip()
        
        return cls.objects.create(
            actor=actor,
            action=action,
            target_model=target_model,
            target_id=target_id,
            payload=payload or {},
            ip_address=ip_address,
            user_agent=user_agent
        )
