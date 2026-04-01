"""
Richwell Portal — Auditing Views

This module provides API endpoints for viewing and exporting system audit logs. 
Access is restricted to administrative roles to ensure security and compliance.
"""

import csv
import json
from django.http import HttpResponse
from rest_framework import viewsets, permissions, filters, decorators
from django_filters.rest_framework import DjangoFilterBackend
from .models import AuditLog
from .serializers import AuditLogSerializer
from .filters import AuditLogFilter

from core.permissions import IsAdmin, IsAdminOrRegistrar


class AuditLogExportMixin:
    """
    Mixin to provide CSV export functionality for audit log viewsets.
    """
    export_filename = 'audit_logs.csv'

    @decorators.action(detail=False, methods=['get'])
    def export_csv(self, request):
        """
        Exports the filtered audit logs to a CSV file for offline analysis.
        """
        queryset = self.filter_queryset(self.get_queryset())
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{self.export_filename}"'
        
        writer = csv.writer(response)
        writer.writerow(['ID', 'Time', 'User', 'Action', 'Model', 'Object ID', 'Object Repr', 'Changes', 'IP Address'])
        
        for log in queryset:
            writer.writerow([
                log.id,
                log.created_at,
                log.user.username if log.user else 'System',
                log.action,
                log.get_action_display(),
                log.model_name,
                log.object_id,
                log.object_repr,
                json.dumps(log.changes),
                log.ip_address
            ])
            
        return response


class AuditLogViewSet(AuditLogExportMixin, viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing system audit logs. Supports filtering by user, 
    action type, and model name. Restricted to system administrators.
    """
    queryset = AuditLog.objects.all().select_related('user')
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = AuditLogFilter
    search_fields = ['object_id', 'object_repr', 'user__username', 'user__first_name', 'user__last_name']
    ordering_fields = ['created_at', 'user__username', 'model_name', 'action']
    ordering = ['-created_at']


class RegistrarActionLogViewSet(AuditLogExportMixin, viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for registrar staff to view actions performed by their department.
    This provides a focused action history for accountability within the registrar office.
    """
    export_filename = 'registrar_history.csv'
    queryset = AuditLog.objects.all().select_related('user')
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminOrRegistrar]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = AuditLogFilter
    search_fields = ['object_id', 'object_repr', 'user__username', 'user__first_name', 'user__last_name']
    ordering_fields = ['created_at', 'user__username', 'model_name', 'action']
    ordering = ['-created_at']

    def get_queryset(self):
        """
        Restricts logs to those performed by registrar or head registrar staff.
        """
        return super().get_queryset().filter(
            user__role__in=['REGISTRAR', 'HEAD_REGISTRAR']
        )
