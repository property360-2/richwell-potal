"""
Admin configuration for audit app.
"""

from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['timestamp', 'actor', 'action', 'target_model', 'ip_address']
    list_filter = ['action', 'target_model', 'timestamp']
    search_fields = ['actor__email', 'target_model', 'ip_address']
    readonly_fields = [
        'id', 'actor', 'action', 'target_model', 'target_id', 
        'payload', 'ip_address', 'user_agent', 'timestamp'
    ]
    date_hierarchy = 'timestamp'
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False
