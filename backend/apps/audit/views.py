"""
Audit views - Audit log endpoints.
"""

from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Q
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from apps.core.permissions import CanViewAuditLogs, IsAdmin

from .models import AuditLog
from .serializers import AuditLogSerializer


@extend_schema_view(
    get=extend_schema(
        summary="List Audit Logs",
        description="Get paginated list of audit logs with filtering (admin only)",
        tags=["Audit"],
        parameters=[
            OpenApiParameter(name='action', description='Filter by action type', required=False, type=str),
            OpenApiParameter(name='target_model', description='Filter by target model', required=False, type=str),
            OpenApiParameter(name='actor', description='Filter by actor ID', required=False, type=str),
            OpenApiParameter(name='search', description='Search in actor name/email or payload', required=False, type=str),
            OpenApiParameter(name='date_from', description='Filter from date (YYYY-MM-DD)', required=False, type=str),
            OpenApiParameter(name='date_to', description='Filter to date (YYYY-MM-DD)', required=False, type=str),
        ]
    )
)
class AuditLogListView(generics.ListAPIView):
    """List audit logs with role-based filtering and search."""
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, CanViewAuditLogs]

    def get_queryset(self):
        user = self.request.user
        queryset = AuditLog.objects.select_related('actor').order_by('-timestamp')

        # Admin sees all
        if user.role == 'ADMIN' or user.is_superuser:
            pass  # No filtering
        # Head-Registrar sees registrar actions, documents, grades
        elif user.role == 'HEAD_REGISTRAR':
            queryset = queryset.filter(
                actor__role__in=['REGISTRAR', 'HEAD_REGISTRAR']
            )
        else:
            # Registrar sees only own actions
            queryset = queryset.filter(actor=user)

        # Apply filters
        action = self.request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action)

        target_model = self.request.query_params.get('target_model')
        if target_model:
            queryset = queryset.filter(target_model__icontains=target_model)

        actor_id = self.request.query_params.get('actor')
        if actor_id:
            queryset = queryset.filter(actor_id=actor_id)

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(actor__first_name__icontains=search) |
                Q(actor__last_name__icontains=search) |
                Q(actor__email__icontains=search) |
                Q(target_model__icontains=search)
            )

        date_from = self.request.query_params.get('date_from')
        if date_from:
            try:
                from_date = datetime.strptime(date_from, '%Y-%m-%d')
                queryset = queryset.filter(timestamp__gte=from_date)
            except ValueError:
                pass

        date_to = self.request.query_params.get('date_to')
        if date_to:
            try:
                to_date = datetime.strptime(date_to, '%Y-%m-%d')
                # Add 1 day to include the entire end date
                to_date = to_date + timedelta(days=1)
                queryset = queryset.filter(timestamp__lt=to_date)
            except ValueError:
                pass

        return queryset


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


class AuditLogFiltersView(APIView):
    """Get available filter options for audit logs."""
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(
        summary="Get Audit Log Filters",
        description="Get available action types and target models for filtering",
        tags=["Audit"]
    )
    def get(self, request):
        # Get unique action types that have been used
        actions = AuditLog.objects.values_list('action', flat=True).distinct()
        action_choices = [
            {'value': action, 'label': dict(AuditLog.Action.choices).get(action, action)}
            for action in actions
        ]

        # Get unique target models
        target_models = AuditLog.objects.values_list('target_model', flat=True).distinct()

        return Response({
            'actions': sorted(action_choices, key=lambda x: x['label']),
            'target_models': sorted(list(target_models))
        })
