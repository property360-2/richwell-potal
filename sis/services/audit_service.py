"""
Audit Service - Handles immutable audit logging for compliance.

All critical operations are logged to AuditLog for accountability.
"""

from django.utils import timezone
from sis.models import AuditLog


class AuditService:
    """Service for audit logging critical operations."""

    @staticmethod
    def log_action(
        actor,
        action,
        target_model,
        target_id,
        payload=None,
        ip_address=None,
    ):
        """
        Log a critical action to immutable audit log.

        Args:
            actor: User performing action (or None for system actions)
            action: Action code (e.g., 'PAYMENT_RECORDED', 'GRADE_FINALIZED')
            target_model: Model name affected (e.g., 'PaymentTransaction')
            target_id: ID of affected record
            payload: dict with before/after/reason/metadata
            ip_address: Client IP address

        Returns:
            AuditLog: Created audit log entry
        """
        audit_log = AuditLog.objects.create(
            actor=actor,
            action=action,
            target_model=target_model,
            target_id=str(target_id),
            payload=payload or {},
            ip_address=ip_address,
        )

        return audit_log

    @staticmethod
    def get_audit_trail(target_model, target_id, limit=50):
        """
        Get audit trail for a specific record.

        Args:
            target_model: Model name
            target_id: Record ID
            limit: Number of entries to return (default 50)

        Returns:
            QuerySet: Ordered audit logs (newest first)
        """
        return AuditLog.objects.filter(
            target_model=target_model,
            target_id=str(target_id),
        ).order_by('-created_at')[:limit]

    @staticmethod
    def get_user_actions(user, action_type=None, limit=100):
        """
        Get all actions performed by a user.

        Args:
            user: User object
            action_type: Specific action to filter (optional)
            limit: Number of entries to return

        Returns:
            QuerySet: Audit logs for user (newest first)
        """
        query = AuditLog.objects.filter(actor=user)
        if action_type:
            query = query.filter(action=action_type)

        return query.order_by('-created_at')[:limit]

    @staticmethod
    def get_action_history(action, limit=100):
        """
        Get all occurrences of a specific action type.

        Args:
            action: Action code to search for
            limit: Number of entries to return

        Returns:
            QuerySet: Audit logs for action (newest first)
        """
        return AuditLog.objects.filter(
            action=action
        ).order_by('-created_at')[:limit]
