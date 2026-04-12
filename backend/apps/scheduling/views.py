"""
Richwell Portal — Scheduling Views

This module manages the university's academic schedule, including professor assignments, 
room management, and student section picking. It coordinates complex logic 
via the Scheduling, Picking, and Report Services.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.db import models
from datetime import datetime

from apps.scheduling.models import Schedule
from apps.scheduling.serializers import ScheduleSerializer
from apps.scheduling.services.scheduling_service import SchedulingService
from apps.scheduling.services.picking_service import PickingService
from apps.scheduling.services.report_service import ReportService
from apps.sections.models import Section
from apps.faculty.models import Professor
from apps.facilities.models import Room
from apps.terms.models import Term

class ScheduleViewSet(viewsets.ModelViewSet):
    """
    Handles scheduling, conflict detection, and student slot management.
    Only Deans may create or modify schedule slots.
    """
    queryset = Schedule.objects.select_related('term', 'section', 'subject', 'professor__user', 'room').all().order_by('section__name', 'start_time')
    serializer_class = ScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    scheduling_service = SchedulingService()
    picking_service = PickingService()
    report_service = ReportService()

    def get_permissions(self):
        """
        Dynamically applies Dean-only permissions for writing and administrative actions.
        """
        dean_actions = ['create', 'update', 'partial_update', 'destroy', 'assign', 'publish', 'randomize', 'pending_slots', 'section_completion', 'faculty_load_report', 'capacity_bottlenecks', 'validate_slot', 'resource_availability', 'available_slots', 'professor_insights', 'room_insights', 'section_insights']
        if self.action in dean_actions:
            from core.permissions import IsDean
            return [IsDean()]
        return super().get_permissions()

    def get_queryset(self):
        """
        Filters the schedule queryset by term, section, professor, or room.
        Restricts Program Heads to their own sections.
        """
        queryset = super().get_queryset()
        if self.request.user.role == 'PROGRAM_HEAD':
            queryset = queryset.filter(section__program__program_head=self.request.user)
        
        q_params = self.request.query_params
        for field in ['term_id', 'section_id', 'professor_id', 'room_id']:
            if val := q_params.get(field): queryset = queryset.filter(**{field: val})
        return queryset

    @action(detail=False, methods=['POST'])
    def assign(self, request):
        """
        Deans use this to manually assign professor, room, and time to a schedule slot.
        Logs the assignment to the audit trail via the Schedule model's AuditMixin.
        """
        try:
            sch = Schedule.objects.get(id=request.data.get('id'))
            prof = Professor.objects.get(id=request.data.get('professor_id')) if request.data.get('professor_id') else None
            room = Room.objects.get(id=request.data.get('room_id')) if request.data.get('room_id') else None
            st = datetime.strptime(request.data.get('start_time'), "%H:%M").time() if request.data.get('start_time') else None
            et = datetime.strptime(request.data.get('end_time'), "%H:%M").time() if request.data.get('end_time') else None

            updated = self.scheduling_service.create_or_update_schedule(
                sch.term, sch.section, sch.subject, sch.component_type,
                professor=prof, room=room, days=request.data.get('days', []),
                start_time=st, end_time=et, exclude_id=sch.id
            )

            # Audit: log schedule assignment using the model instance's AuditMixin method
            updated.audit_action(
                request, 'UPDATE',
                f'Schedule:{updated.id}',
                f'Schedule assigned: {updated.subject.code} in {updated.section.name}',
                metadata={
                    'professor': str(prof) if prof else None,
                    'room': str(room) if room else None,
                    'days': request.data.get('days', []),
                    'start_time': str(st) if st else None,
                    'end_time': str(et) if et else None,
                }
            )

            return Response(self.get_serializer(updated).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['POST'])
    def randomize(self, request):
        """
        Automatically randomizes Day/Time assignments for a whole section.
        """
        term, section = Term.objects.get(id=request.data.get('term_id')), Section.objects.get(id=request.data.get('section_id'))
        updated = SchedulingService.randomize_section_schedule(term, section, respect_professor=request.data.get('respect_professor', False), respect_room=request.data.get('respect_room', False))
        return Response(self.get_serializer(updated, many=True).data)

    @action(detail=False, methods=['POST'], url_path='pick-regular')
    def pick_regular(self, request):
        """
        Regular students pick their session preference (AM/PM).
        """
        if request.user.role != 'STUDENT': raise PermissionDenied("Unauthorized")
        term, student = Term.objects.get(id=request.data.get('term_id')), request.user.student_profile
        section, redirected = self.picking_service.pick_schedule_regular(student, term, request.data.get('session'))
        return Response({"message": f"Successfully assigned to {section.name}.", "redirected": redirected, "section_id": section.id, "schedules": self.get_serializer(Schedule.objects.filter(section=section), many=True).data})

    @action(detail=False, methods=['POST'], url_path='pick-irregular')
    def pick_irregular(self, request):
        """
        Irregular students pick per-subject schedule slots.
        """
        if request.user.role != 'STUDENT': raise PermissionDenied("Unauthorized")
        term, student = Term.objects.get(id=request.data.get('term_id')), request.user.student_profile
        self.picking_service.pick_schedule_irregular(student, term, request.data.get('selections', []))
        return Response({"message": "Schedule picked successfully."})

    @action(detail=False, methods=['GET'], url_path='status-matrix')
    def status_matrix(self, request):
        """
        Returns sections with real-time slot counts.
        """
        q = self.request.query_params
        sections = Section.objects.filter(term_id=q.get('term_id'), program_id=q.get('program_id'), year_level=q.get('year_level')).annotate(current_students=models.Count('student_assignments')).order_by('section_number')
        return Response([{"id": s.id, "name": s.name, "session": s.session, "current": s.current_students, "max": s.max_students, "is_full": s.current_students >= s.max_students, "schedules": [{"subject": sch.subject.code, "days": sch.days, "start": sch.start_time.strftime("%H:%M") if sch.start_time else None} for sch in s.schedules.all()]} for s in sections.prefetch_related('schedules', 'schedules__subject')])

    @action(detail=False, methods=['POST'])
    def publish(self, request):
        """
        Dean publishes the entire term schedule.
        """
        term = Term.objects.get(id=request.data.get('term_id'))
        SchedulingService.publish_schedule(term)
        return Response({"message": f"Schedule Published for {term.code}"})

    @action(detail=False, methods=['GET'], url_path='capacity-bottlenecks')
    def capacity_bottlenecks(self, request):
        """
        Reporting: Capacity bottlenecks (students without slots).
        """
        term_id = request.query_params.get('term_id')
        if not term_id:
            return Response({"error": "term_id required"}, status=400)
        
        term = Term.objects.get(id=term_id)
        return Response(self.report_service.get_capacity_bottlenecks(term))

    @action(detail=False, methods=['POST'], url_path='validate-slot')
    def validate_slot(self, request):
        """
        Validates a hypothetical slot configuration for conflicts.
        """
        d = request.data
        st, et = datetime.strptime(d.get('start_time'), "%H:%M").time(), datetime.strptime(d.get('end_time'), "%H:%M").time()
        term, professor, room, section = Term.objects.get(id=d.get('term_id')), Professor.objects.get(id=d.get('professor_id')) if d.get('professor_id') else None, Room.objects.get(id=d.get('room_id')) if d.get('room_id') else None, Section.objects.get(id=d.get('section_id')) if d.get('section_id') else None
        
        for entity, method in [(professor, 'check_professor_conflict'), (room, 'check_room_conflict'), (section, 'check_section_conflict')]:
            if entity:
                err = getattr(self.scheduling_service, method)(entity, term, d.get('days'), st, et, exclude_id=d.get('id'))
                if err: return Response(err, status=status.HTTP_409_CONFLICT)
        return Response({"status": "ok"})

    @action(detail=False, methods=['POST'], url_path='resource-availability')
    def resource_availability(self, request):
        """
        Batch check for resource availability at a given time.
        """
        d = request.data
        st, et = datetime.strptime(d.get('start_time'), "%H:%M").time(), datetime.strptime(d.get('end_time'), "%H:%M").time()
        term = Term.objects.get(id=d.get('term_id'))
        return Response(self.report_service.check_resource_availability(term, d.get('days'), st, et, d.get('exclude_id'), self.scheduling_service))

    @action(detail=False, methods=['GET'], url_path='available-slots')
    def available_slots(self, request):
        """
        Returns unassigned schedule slots in the given term that the requested professor
        is qualified to teach (based on their assigned ProfessorSubject records).

        Query params:
            professor_id (int): The ID of the professor.
            term_id (int): The ID of the academic term.

        Returns:
            List of Schedule records with no professor assigned, filtered by the
            professor's subject qualifications for the specified term.
        """
        professor_id = request.query_params.get('professor_id')
        term_id = request.query_params.get('term_id')

        if not professor_id or not term_id:
            return Response(
                {'error': 'Both professor_id and term_id are required query parameters.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            professor = Professor.objects.get(id=professor_id)
        except Professor.DoesNotExist:
            return Response({'error': 'Professor not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            term = Term.objects.get(id=term_id)
        except Term.DoesNotExist:
            return Response({'error': 'Term not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Collect subject IDs the professor is qualified to teach
        qualified_subject_ids = professor.assigned_subjects.values_list('subject_id', flat=True)

        # Find schedule slots for this term that are unassigned and match the professor's qualifications
        slots = Schedule.objects.filter(
            term=term,
            subject_id__in=qualified_subject_ids,
            professor__isnull=True
        ).select_related('term', 'section', 'subject', 'room')

        return Response(self.get_serializer(slots, many=True).data)
        
    @action(detail=False, methods=['GET'], url_path=r'insights/professor/(?P<prof_id>\d+)')
    def professor_insights(self, request, prof_id=None):
        """
        Returns a timetable-ready grouped view of a specific professor's teaching load.
        Usage: GET /api/scheduling/insights/professor/{id}/?term_id={term_id}
        """
        term_id = request.query_params.get('term_id')
        if not term_id:
            return Response({'error': 'term_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        schedules = Schedule.objects.filter(term_id=term_id, professor_id=prof_id)
        return Response(self.scheduling_service.get_schedule_insights(schedules))

    @action(detail=False, methods=['GET'], url_path=r'insights/room/(?P<room_id>\d+)')
    def room_insights(self, request, room_id=None):
        """
        Returns a timetable-ready grouped view of a specific room's usage.
        Usage: GET /api/scheduling/insights/room/{id}/?term_id={term_id}
        """
        term_id = request.query_params.get('term_id')
        if not term_id:
            return Response({'error': 'term_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        schedules = Schedule.objects.filter(term_id=term_id, room_id=room_id)
        return Response(self.scheduling_service.get_schedule_insights(schedules))

    @action(detail=False, methods=['GET'], url_path=r'insights/section/(?P<section_id>\d+)')
    def section_insights(self, request, section_id=None):
        """
        Returns a timetable-ready grouped view of a specific section's full schedule.
        Usage: GET /api/scheduling/insights/section/{id}/
        """
        schedules = Schedule.objects.filter(section_id=section_id)
        return Response(self.scheduling_service.get_schedule_insights(schedules))
