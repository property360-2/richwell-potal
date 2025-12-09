"""
Audit views - Audit log endpoints.
"""

from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, extend_schema_view

from apps.core.permissions import CanViewAuditLogs, IsAdmin

from .models import AuditLog
from .serializers import AuditLogSerializer


@extend_schema_view(
    get=extend_schema(
        summary="List Audit Logs",
        description="Get paginated list of audit logs (admin/registrar only)",
        tags=["Audit"]
    )
)
class AuditLogListView(generics.ListAPIView):
    """List audit logs with role-based filtering."""
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, CanViewAuditLogs]
    
    def get_queryset(self):
        user = self.request.user
        queryset = AuditLog.objects.select_related('actor')
        
        # Admin sees all
        if user.role == 'ADMIN' or user.is_superuser:
            return queryset
        
        # Head-Registrar sees registrar actions, documents, grades
        if user.role == 'HEAD_REGISTRAR':
            return queryset.filter(
                actor__role__in=['REGISTRAR', 'HEAD_REGISTRAR']
            )
        
        # Registrar sees only own actions
        return queryset.filter(actor=user)


@extend_schema_view(
    get=extend_schema(
        summary="Audit Log Detail",
        description="Get details of a specific audit log entry",
        tags=["Audit"]
    )
)
class AuditLogDetailView(generics.RetrieveAPIView):
    """Get audit log detail."""
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, CanViewAuditLogs]
    queryset = AuditLog.objects.select_related('actor')
