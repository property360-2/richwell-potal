import csv
import json
from django.http import HttpResponse
from rest_framework import viewsets, permissions, filters, decorators
from django_filters.rest_framework import DjangoFilterBackend
from .models import AuditLog
from .serializers import AuditLogSerializer

class IsAdminOrHeadRegistrar(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.role == 'ADMIN':
            return True
        if request.user.role == 'REGISTRAR' and getattr(request.user, 'is_head', False):
            return True
        return False

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminOrHeadRegistrar]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['user', 'action', 'model_name', 'created_at']
    search_fields = ['object_id', 'object_repr', 'user__username', 'user__first_name', 'user__last_name']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        if user.role == 'REGISTRAR':
             queryset = queryset.filter(user__role='REGISTRAR')
        return queryset

    @decorators.action(detail=False, methods=['get'])
    def export_csv(self, request):
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
