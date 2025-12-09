"""
Audit serializers.
"""

from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for audit logs."""
    
    actor_name = serializers.CharField(source='actor.get_full_name', read_only=True, default='SYSTEM')
    actor_email = serializers.CharField(source='actor.email', read_only=True, default=None)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'actor_name', 'actor_email', 'action', 'action_display',
            'target_model', 'target_id', 'payload',
            'ip_address', 'timestamp'
        ]
        read_only_fields = fields
