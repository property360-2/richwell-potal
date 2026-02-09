"""
Audit views - Audit log endpoints.
"""

from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Q, Count
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
        else:
            # Check for fine-grained permission override
            scope = user.get_permission_scope('audit.view')
            
            if scope.get('all_users'):
                pass  # Granted visibility to everything
            elif 'roles' in scope:
                queryset = queryset.filter(actor__role__in=scope['roles'])
            elif user.role == 'HEAD_REGISTRAR':
                queryset = queryset.filter(
                    actor__role__in=['REGISTRAR', 'HEAD_REGISTRAR']
                )
            else:
                # Registrar sees only own actions unless scoped
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


class DashboardAlertsView(APIView):
    """
    Get administrative dashboard alerts based on section capacity and system logs.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Get Dashboard Alerts",
        description="Get alerts for full sections, underfilled sections, and audit log spikes",
        tags=["Dashboard"]
    )
    def get(self, request):
        user = request.user
        # Checking role permission or custom grant for dashboard
        if not (user.role in ['ADMIN', 'HEAD_REGISTRAR', 'REGISTRAR'] or user.is_superuser):
            return Response({"error": "Unauthorized access to dashboard alerts"}, status=403)

        alerts = []
        
        # 1. Section Capacity Alerts
        from apps.academics.models import Section
        from apps.enrollment.models import Semester
        
        active_semester = Semester.objects.filter(is_current=True).first()
        if active_semester:
            sections = Section.objects.filter(semester=active_semester, is_deleted=False, is_dissolved=False)
            
            for section in sections:
                count = section.enrolled_count
                capacity = section.capacity
                if capacity > 0:
                    occupancy = float(count) / capacity
                    if occupancy >= 0.95:
                        alerts.append({
                            'level': 'danger',
                            'type': 'SECTION_FULL',
                            'message': f"Section {section.name} is nearly full ({count}/{capacity})",
                            'target_id': str(section.id)
                        })
                elif occupancy <= 0.30 and count > 0:
                        alerts.append({
                            'level': 'warning',
                            'type': 'UNDERFILLED',
                            'message': f"Section {section.name} is underfilled ({count}/{capacity})",
                            'target_id': str(section.id)
                        })

            # 2. Overlap / Irregular Conflict Alerts
            from apps.academics.models import ScheduleSlot
            conflicts = ScheduleSlot.objects.filter(
                section_subject__section__semester=active_semester,
                is_deleted=False
            ).values('section_subject__section_id', 'day').annotate(
                slot_count=Count('id')
            ).filter(slot_count__gt=1)
            
            for conf in conflicts:
                # For each section-day with multiple slots, check for actual overlaps
                section_id = conf['section_subject__section_id']
                day = conf['day']
                slots = list(ScheduleSlot.objects.filter(
                    section_subject__section_id=section_id,
                    day=day,
                    is_deleted=False
                ).select_related('section_subject__subject', 'section_subject__section'))
                
                for i in range(len(slots)):
                    for j in range(i + 1, len(slots)):
                        if slots[i].start_time < slots[j].end_time and slots[j].start_time < slots[i].end_time:
                            alerts.append({
                                'level': 'warning',
                                'type': 'IRREGULAR_CONFLICT',
                                'message': f"Schedule overlap in {slots[i].section_subject.section.name} on {day}: {slots[i].section_subject.subject.code} and {slots[j].section_subject.subject.code}",
                                'target_id': str(section_id)
                            })
                            break # One alert per section-day enough? or maybe per conflict. Let's do break to avoid spam.

        # 3. Audit Spike Alerts
        one_hour_ago = timezone.now() - timedelta(hours=1)
        recent_logs_count = AuditLog.objects.filter(timestamp__gte=one_hour_ago).count()
        if recent_logs_count > 100:
             alerts.append({
                'level': 'danger',
                'type': 'AUDIT_SPIKE',
                'message': f"High system activity detected: {recent_logs_count} actions in the last hour",
                'count': recent_logs_count
            })

        return Response({
            "success": True,
            "alerts": alerts,
            "semester": str(active_semester) if active_semester else None
        })
