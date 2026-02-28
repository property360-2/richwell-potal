"""
Scheduling views — schedule slots, conflict checking, availability, professor schedule.
"""

from datetime import time
from rest_framework import viewsets, status, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from apps.core.permissions import IsRegistrarOrAdmin
from apps.audit.models import AuditLog

from .models import ScheduleSlot, SectionSubject
from .serializers import ScheduleSlotSerializer, ScheduleSlotCreateSerializer
from .services import SchedulingService


# ============================================================
# Schedule Slot Management
# ============================================================

@extend_schema_view(
    list=extend_schema(summary="List Schedule Slots", tags=["Scheduling"]),
    create=extend_schema(summary="Create Schedule Slot", tags=["Scheduling"]),
    retrieve=extend_schema(summary="Get Schedule Slot", tags=["Scheduling"]),
    update=extend_schema(summary="Update Schedule Slot", tags=["Scheduling"]),
    partial_update=extend_schema(summary="Partial Update Schedule Slot", tags=["Scheduling"]),
    destroy=extend_schema(summary="Delete Schedule Slot", tags=["Scheduling"]),
)
class ScheduleSlotViewSet(viewsets.ModelViewSet):
    """Manage schedule slots with conflict detection."""
    queryset = ScheduleSlot.objects.filter(is_deleted=False)
    permission_classes = [IsRegistrarOrAdmin]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ScheduleSlotCreateSerializer
        return ScheduleSlotSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        section_subject_id = self.request.query_params.get('section_subject')
        if section_subject_id:
            queryset = queryset.filter(section_subject_id=section_subject_id)
            
        room = self.request.query_params.get('room')
        if room:
            queryset = queryset.filter(room=room)
            
        semester_id = self.request.query_params.get('semester')
        if semester_id:
            queryset = queryset.filter(section_subject__section__semester_id=semester_id)
        
        return queryset.select_related(
            'section_subject__subject',
            'section_subject__section',
            'section_subject__professor'
        )
    
    def perform_create(self, serializer):
        slot = serializer.save()
        
        # Mark section subject as no longer TBA if schedule is added
        section_subject = slot.section_subject
        if section_subject.is_tba:
            section_subject.is_tba = False
            section_subject.save()
        
        payload = {
            'section': slot.section_subject.section.name,
            'subject': slot.section_subject.subject.code,
            'day': slot.get_day_display(),
            'time': f"{slot.start_time}-{slot.end_time}",
            'room': slot.room
        }
        
        if hasattr(serializer.validated_data, '_override_reason'):
            payload['override_reason'] = serializer.validated_data['_override_reason']
            AuditLog.log(
                action=AuditLog.Action.SCHEDULE_CONFLICT_OVERRIDE,
                target_model='ScheduleSlot',
                target_id=slot.id,
                payload=payload
            )
        else:
            AuditLog.log(
                action=AuditLog.Action.RECORD_CREATED,
                target_model='ScheduleSlot',
                target_id=slot.id,
                payload=payload
            )
    
    def perform_destroy(self, instance):
        """Soft delete."""
        instance.is_deleted = True
        instance.save()
        AuditLog.log(
            action=AuditLog.Action.RECORD_DELETED,
            target_model='ScheduleSlot',
            target_id=instance.id,
            payload={
                'section': instance.section_subject.section.name,
                'subject': instance.section_subject.subject.code,
                'day': instance.get_day_display()
            }
        )


# ============================================================
# Conflict Checking Endpoints
# ============================================================

class ProfessorConflictCheckView(APIView):
    """Check professor schedule conflict."""
    permission_classes = [IsRegistrarOrAdmin]
    
    @extend_schema(
        summary="Check Professor Conflict",
        description="Check if a professor has a schedule conflict",
        tags=["Scheduling"]
    )
    def post(self, request):
        from apps.accounts.models import User
        from apps.enrollment.models import Semester
        
        professor_id = request.data.get('professor_id')
        semester_id = request.data.get('semester_id')
        day = request.data.get('day')
        start_time = request.data.get('start_time')
        end_time = request.data.get('end_time')
        exclude_slot = request.data.get('exclude_slot')
        
        if not all([professor_id, semester_id, day, start_time, end_time]):
            return Response(
                {'error': 'Missing required fields'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            professor = User.objects.get(id=professor_id, role='PROFESSOR')
            semester = Semester.objects.get(id=semester_id)
        except (User.DoesNotExist, Semester.DoesNotExist):
            return Response(
                {'error': 'Professor or semester not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        start = time.fromisoformat(start_time[:5])
        end = time.fromisoformat(end_time[:5])
        
        has_conflict, conflict = SchedulingService.check_professor_conflict(
            professor, day, start, end, semester, exclude_slot_id=exclude_slot
        )
        
        return Response({
            'has_conflict': has_conflict,
            'conflict': str(conflict) if conflict else None
        })


class RoomConflictCheckView(APIView):
    """Check room booking conflict."""
    permission_classes = [IsRegistrarOrAdmin]
    
    @extend_schema(
        summary="Check Room Conflict",
        description="Check if a room is double-booked",
        tags=["Scheduling"]
    )
    def post(self, request):
        from apps.enrollment.models import Semester
        
        room = request.data.get('room')
        semester_id = request.data.get('semester_id')
        day = request.data.get('day')
        start_time = request.data.get('start_time')
        end_time = request.data.get('end_time')
        exclude_slot = request.data.get('exclude_slot')
        
        if not all([room, semester_id, day, start_time, end_time]):
            return Response(
                {'error': 'Missing required fields'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            semester = Semester.objects.get(id=semester_id)
        except Semester.DoesNotExist:
            return Response(
                {'error': 'Semester not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        start = time.fromisoformat(start_time[:5])
        end = time.fromisoformat(end_time[:5])
        
        has_conflict, conflict = SchedulingService.check_room_conflict(
            room, day, start, end, semester, exclude_slot_id=exclude_slot
        )
        
        return Response({
            'has_conflict': has_conflict,
            'conflict': str(conflict) if conflict else None,
            'is_warning': True
        })


class SectionConflictCheckView(APIView):
    """Check if a section has overlapping subjects."""
    permission_classes = [IsRegistrarOrAdmin]
    
    @extend_schema(
        summary="Check Section Conflict",
        description="Check if a section has overlapping subjects",
        tags=["Scheduling"]
    )
    def post(self, request):
        section_id = request.data.get('section_id')
        day = request.data.get('day')
        start_time = request.data.get('start_time')
        end_time = request.data.get('end_time')
        exclude_slot = request.data.get('exclude_slot')
        
        if not all([section_id, day, start_time, end_time]):
            return Response(
                {'error': 'Missing required fields'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        start = time.fromisoformat(start_time[:5])
        end = time.fromisoformat(end_time[:5])
        
        has_conflict, conflict = SchedulingService.check_section_conflict(
            section_id, day, start, end, exclude_slot_id=exclude_slot
        )
        
        return Response({
            'has_conflict': has_conflict,
            'conflict': str(conflict) if conflict else None
        })


class AvailabilityView(APIView):
    """Check availability of rooms and times."""
    permission_classes = [IsRegistrarOrAdmin]
    
    @extend_schema(
        summary="Check Availability",
        description="Check available rooms for a time or busy times for a room",
        tags=["Scheduling"]
    )
    def get(self, request):
        from apps.enrollment.models import Semester
        
        check_type = request.query_params.get('type')
        semester_id = request.query_params.get('semester_id')
        day = request.query_params.get('day')
        
        if not all([check_type, semester_id, day]):
            return Response({'error': 'Missing type, semester_id, or day'}, status=400)
            
        try:
            semester = Semester.objects.get(id=semester_id)
        except Semester.DoesNotExist:
            return Response({'error': 'Semester not found'}, status=404)
            
        if check_type == 'rooms':
            start_time = request.query_params.get('start_time')
            end_time = request.query_params.get('end_time')
            if not all([start_time, end_time]):
                return Response({'error': 'Missing start_time or end_time'}, status=400)
                
            start = time.fromisoformat(start_time)
            end = time.fromisoformat(end_time)
            
            all_rooms = request.query_params.getlist('rooms[]')
            if not all_rooms:
                all_rooms = request.query_params.getlist('rooms')
            
            available_rooms = SchedulingService.get_available_rooms(
                day, start, end, semester, all_rooms if all_rooms else None
            )
            return Response({'available_rooms': available_rooms})
            
        elif check_type == 'times':
            room = request.query_params.get('room')
            if not room:
                return Response({'error': 'Missing room'}, status=400)
                
            busy_slots = SchedulingService.get_room_busy_slots(room, day, semester)
            
            formatted_busy = []
            for slot in busy_slots:
                formatted_busy.append({
                    'start_time': slot['start_time'].strftime('%H:%M'),
                    'end_time': slot['end_time'].strftime('%H:%M'),
                    'label': f"{slot['section_subject__subject__code']} ({slot['section_subject__section__name']})"
                })
                
            return Response({'busy_slots': formatted_busy})
            
        return Response({'error': 'Invalid check type'}, status=400)


class ProfessorScheduleView(APIView):
    """Get a professor's schedule for a semester."""
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="Get Professor Schedule",
        description="Get a professor's full schedule for a semester",
        tags=["Scheduling"]
    )
    def get(self, request, professor_id, semester_id):
        from apps.accounts.models import User
        from apps.enrollment.models import Semester, SubjectEnrollment
        
        try:
            professor = User.objects.get(id=professor_id, role='PROFESSOR')
            semester = Semester.objects.get(id=semester_id)
        except (User.DoesNotExist, Semester.DoesNotExist):
            return Response(
                {'error': 'Professor or semester not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        schedule = SchedulingService.get_professor_schedule(professor, semester)
        
        assigned_subjects = SectionSubject.objects.filter(
            professor=professor,
            section__semester=semester,
            is_deleted=False
        ).select_related('section', 'subject').prefetch_related('schedule_slots')
        
        assigned_sections = []
        for assignment in assigned_subjects:
            slots = assignment.schedule_slots.filter(is_deleted=False)
            schedule_text = "TBA"
            if slots.exists():
                schedule_parts = []
                for slot in slots:
                    time_str = f"{slot.start_time.strftime('%I:%M %p').lstrip('0')} - {slot.end_time.strftime('%I:%M %p').lstrip('0')}"
                    schedule_parts.append(f"{slot.get_day_display()} {time_str} ({slot.room or 'TBA'})")
                schedule_text = "; ".join(schedule_parts)
            elif not assignment.is_tba:
                schedule_text = "No schedule set"

            assigned_sections.append({
                'id': str(assignment.id),
                'section_id': str(assignment.section.id),
                'section_name': assignment.section.name,
                'subject_id': str(assignment.subject.id),
                'subject_code': assignment.subject.code,
                'subject_title': assignment.subject.title,
                'units': assignment.subject.units,
                'schedule': schedule_text,
                'is_tba': assignment.is_tba,
                'enrolled_count': SubjectEnrollment.objects.filter(section=assignment.section, subject=assignment.subject, is_deleted=False).count()
            })

        return Response({
            'professor': professor.get_full_name(),
            'semester': str(semester),
            'schedule': schedule,
            'assigned_sections': assigned_sections
        })
