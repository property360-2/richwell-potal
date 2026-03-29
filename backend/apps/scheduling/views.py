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
        dean_actions = ['create', 'update', 'partial_update', 'destroy', 'assign', 'publish', 'randomize', 'pending_slots', 'section_completion', 'faculty_load_report', 'validate_slot', 'resource_availability']
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
        Deans use this to manually assign professor, room, and time.
        """
        try:
            sch = Schedule.objects.get(id=request.data.get('id'))
            prof = Professor.objects.get(id=request.data.get('professor_id')) if request.data.get('professor_id') else None
            room = Room.objects.get(id=request.data.get('room_id')) if request.data.get('room_id') else None
            st = datetime.strptime(request.data.get('start_time'), "%H:%M").time() if request.data.get('start_time') else None
            et = datetime.strptime(request.data.get('end_time'), "%H:%M").time() if request.data.get('end_time') else None
            
            updated = self.scheduling_service.create_or_update_schedule(sch.term, sch.section, sch.subject, sch.component_type, professor=prof, room=room, days=request.data.get('days', []), start_time=st, end_time=et, exclude_id=sch.id)
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

    @action(detail=False, methods=['GET'], url_path='faculty-load-report')
    def faculty_load_report(self, request):
        """
        Reporting: Faculty loading analytics.
        """
        term = Term.objects.get(id=request.query_params.get('term_id'))
        return Response(self.report_service.get_faculty_load_report(term))

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
