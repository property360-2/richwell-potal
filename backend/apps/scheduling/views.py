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
        dean_actions = ['create', 'update', 'partial_update', 'destroy', 'assign', 'publish', 'randomize', 'pending_slots', 'section_completion', 'faculty_load_report', 'capacity_bottlenecks', 'sectioning_report', 'distribute_students', 'validate_slot', 'resource_availability', 'available_slots', 'professor_insights', 'room_insights', 'section_insights']
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
        try:
            term = self._get_term(request.data.get('term_id'))
            section = Section.objects.get(id=request.data.get('section_id'))
            updated = SchedulingService.randomize_section_schedule(
                term, section, 
                respect_professor=request.data.get('respect_professor', False), 
                respect_room=request.data.get('respect_room', False)
            )
            return Response(self.get_serializer(updated, many=True).data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['POST'])
    def transfer(self, request):
        """Transfers schedules from one section to another."""
        try:
            term = self._get_term(request.data.get('term_id'))
            from_section_id = request.data.get('from_section_id')
            to_section_id = request.data.get('to_section_id')
            
            transferred = SchedulingService.transfer_schedules(
                term, from_section_id, to_section_id
            )
            return Response({'count': len(transferred)})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['POST'], url_path='pick-regular')
    def pick_regular(self, request):
        """
        Regular students pick their session preference (AM/PM).
        """
        try:
            if request.user.role != 'STUDENT': raise PermissionDenied("Unauthorized")
            term, student = Term.objects.get(id=request.data.get('term_id')), request.user.student_profile
            section, redirected = self.picking_service.pick_schedule_regular(student, term, request.data.get('session'))
            return Response({"message": f"Successfully assigned to {section.name}.", "redirected": redirected, "section_id": section.id, "schedules": self.get_serializer(Schedule.objects.filter(section=section), many=True).data})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['POST'], url_path='pick-irregular')
    def pick_irregular(self, request):
        """
        Irregular students pick per-subject schedule slots.
        """
        try:
            if request.user.role != 'STUDENT': raise PermissionDenied("Unauthorized")
            term, student = Term.objects.get(id=request.data.get('term_id')), request.user.student_profile
            self.picking_service.pick_schedule_irregular(student, term, request.data.get('selections', []))
            return Response({"message": "Schedule picked successfully."})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

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
        try:
            term = self._get_term(request.data.get('term_id'))
            SchedulingService.publish_schedule(term)
            return Response({"message": f"Schedule Published for {term.code}"})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['GET'], url_path='pending-slots')
    def pending_slots(self, request):
        """
        Returns schedule slots that are missing Professor, Room, or Time/Days.
        """
        term = self._get_term(request.query_params.get('term_id'))
        slots = Schedule.objects.filter(
            models.Q(professor__isnull=True) | 
            models.Q(room__isnull=True) | 
            models.Q(start_time__isnull=True) | 
            models.Q(days=[]),
            term=term
        ).select_related('term', 'section', 'subject', 'professor', 'room')
        
        # Flatten for the report component
        data = []
        for s in slots:
            data.append({
                "id": s.id,
                "subject_code": s.subject.code,
                "subject_description": s.subject.description,
                "section_id": s.section.id,
                "section_name": s.section.name,
                "component_type": s.component_type,
                "professor": str(s.professor) if s.professor else None,
                "room": str(s.room) if s.room else None,
                "days": s.days,
                "start_time": s.start_time.strftime("%H:%M") if s.start_time else None
            })
        return Response(data)

    @action(detail=False, methods=['GET'], url_path='section-completion')
    def section_completion(self, request):
        """
        Tracks completion percentage per section for the Reports Hub.
        """
        term = self._get_term(request.query_params.get('term_id'))
        return Response(self.report_service.get_section_completion_report(term))

    @action(detail=False, methods=['GET'], url_path='faculty-load-report')
    def faculty_load_report(self, request):
        """
        Retrieves current teaching hours vs target for faculty.
        """
        term = self._get_term(request.query_params.get('term_id'))
        return Response(self.report_service.get_faculty_load_report(term))

    def _get_term(self, term_id):
        """Helper to get Term or raise 400/404 explicitly."""
        if not term_id or term_id == 'undefined':
            raise ValidationError({'error': 'term_id is required and must be a number.'})
        try:
            return Term.objects.get(id=term_id)
        except (Term.DoesNotExist, ValueError):
            raise ValidationError({'error': f'Term with id {term_id} not found.'})

    @action(detail=False, methods=['GET'], url_path='capacity-bottlenecks')
    def capacity_bottlenecks(self, request):
        """
        Reporting: Capacity bottlenecks (students without slots).
        """
        term = self._get_term(request.query_params.get('term_id'))
        return Response(self.report_service.get_capacity_bottlenecks(term))

    @action(detail=False, methods=['GET'], url_path='sectioning-report')
    def sectioning_report(self, request):
        """
        High-level report for the Dean to monitor sectioning progress.
        """
        term = self._get_term(request.query_params.get('term_id'))
        return Response(self.report_service.get_sectioning_dashboard_report(term))

    @action(detail=False, methods=['POST'], url_path='distribute-students')
    def distribute_students(self, request):
        """
        Dean triggers absolute auto-assignment for all approved but unassigned students.
        """
        try:
            term = self._get_term(request.data.get('term_id'))
            assigned_count = self.picking_service.auto_assign_remaining(term)
            
            return Response({
                "message": f"Successfully distributed {assigned_count} students to sections.",
                "count": assigned_count
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['POST'], url_path='validate-slot')
    def validate_slot(self, request):
        """
        Validates a hypothetical slot configuration for conflicts.
        """
        d = request.data
        term = self._get_term(d.get('term_id'))
        
        st, et = datetime.strptime(d.get('start_time'), "%H:%M").time(), datetime.strptime(d.get('end_time'), "%H:%M").time()
        professor, room, section = Professor.objects.get(id=d.get('professor_id')) if d.get('professor_id') else None, Room.objects.get(id=d.get('room_id')) if d.get('room_id') else None, Section.objects.get(id=d.get('section_id')) if d.get('section_id') else None
        
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
        term = self._get_term(d.get('term_id'))
        
        st, et = datetime.strptime(d.get('start_time'), "%H:%M").time(), datetime.strptime(d.get('end_time'), "%H:%M").time()
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
