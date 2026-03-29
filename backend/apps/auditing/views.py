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

from core.permissions import IsHeadRegistrar


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing system audit logs. Supports filtering by user, 
    action type, and model name.
    """
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsHeadRegistrar]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['user', 'action', 'model_name', 'created_at']
    search_fields = ['object_id', 'object_repr', 'user__username', 'user__first_name', 'user__last_name']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        """
        Filters logs based on the user's role. Head Registrars can see logs 
        for all registrar staff.
        """
        user = self.request.user
        queryset = super().get_queryset()
        if user.role in ('REGISTRAR', 'HEAD_REGISTRAR'):
             # Head Registrar sees logs for anyone in the registrar department
             queryset = queryset.filter(user__role__in=['REGISTRAR', 'HEAD_REGISTRAR'])
        return queryset

    @decorators.action(detail=False, methods=['get'])
    def export_csv(self, request):
        """
        Exports the filtered audit logs to a CSV file for offline analysis.
        """
        queryset = self.filter_queryset(self.get_queryset())
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="audit_logs.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['ID', 'Time', 'User', 'Action', 'Model', 'Object ID', 'Object Repr', 'Changes', 'IP Address'])
        
        for log in queryset:
            writer.writerow([
                log.id,
                log.created_at,
                log.user.username if log.user else 'System',
                log.action,
                log.model_name,
                log.object_id,
                log.object_repr,
                json.dumps(log.changes),
                log.ip_address
            ])
            
        return response
