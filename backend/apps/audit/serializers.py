"""
Audit serializers.
"""

from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for audit logs."""
    
    actor_name = serializers.SerializerMethodField()
    actor_email = serializers.SerializerMethodField()
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    ip_address = serializers.CharField(read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'actor_name', 'actor_email', 'action', 'action_display',
            'target_model', 'target_id', 'payload',
            'ip_address', 'timestamp'
        ]
        read_only_fields = fields

    def get_actor_name(self, obj):
        if obj.actor:
            return obj.actor.get_full_name()
        return "SYSTEM"

    def get_actor_email(self, obj):
        if obj.actor:
            return obj.actor.email
        return "CORE"
