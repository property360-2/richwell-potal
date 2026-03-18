from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from apps.scheduling.models import Schedule
from apps.scheduling.serializers import ScheduleSerializer
from apps.scheduling.services.scheduling_service import SchedulingService
from apps.scheduling.services.picking_service import PickingService
from apps.sections.models import Section
from apps.faculty.models import Professor
from apps.facilities.models import Room
from apps.terms.models import Term
from django.db import models
from datetime import datetime, time

class ScheduleViewSet(viewsets.ModelViewSet):
    queryset = Schedule.objects.select_related(
        'term', 'section', 'subject', 'professor__user', 'room'
    ).all().order_by('section__name', 'start_time')
    serializer_class = ScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_permissions(self):
        if self.action in [
            'create', 'update', 'partial_update', 'destroy', 
            'assign', 'publish', 'randomize', 'pending_slots', 
            'section_completion', 'faculty_load_report',
            'validate_slot', 'resource_availability'
        ]:
            from core.permissions import IsDean
            return [IsDean()]
        return super().get_permissions()

    scheduling_service = SchedulingService()
    picking_service = PickingService()

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # If Program Head, filter by programs they manage
        if self.request.user.role == 'PROGRAM_HEAD':
            queryset = queryset.filter(section__program__program_head=self.request.user)

        term_id = self.request.query_params.get('term_id')
        section_id = self.request.query_params.get('section_id')
        professor_id = self.request.query_params.get('professor_id')
        room_id = self.request.query_params.get('room_id')
        
        if term_id:
            queryset = queryset.filter(term_id=term_id)
        if section_id:
            queryset = queryset.filter(section_id=section_id)
        if professor_id:
            queryset = queryset.filter(professor_id=professor_id)
        if room_id:
            queryset = queryset.filter(room_id=room_id)
            
        return queryset

    @action(detail=False, methods=['POST'], url_path='assign')
    def assign(self, request):
        """
        Deans use this to assign professor, room, and time to a schedule slot.
        """
        schedule_id = request.data.get('id')
        professor_id = request.data.get('professor_id')
        room_id = request.data.get('room_id')
        days = request.data.get('days', [])
        start_time = request.data.get('start_time')
        end_time = request.data.get('end_time')
        
        if not schedule_id:
            return Response({"error": "id (schedule slot id) is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            schedule = Schedule.objects.get(id=schedule_id)
            professor = Professor.objects.get(id=professor_id) if professor_id else None
            room = Room.objects.get(id=room_id) if room_id else None
            
            from datetime import datetime
            st = datetime.strptime(start_time, "%H:%M").time() if start_time else None
            et = datetime.strptime(end_time, "%H:%M").time() if end_time else None
            
            updated_schedule = self.scheduling_service.create_or_update_schedule(
                schedule.term, schedule.section, schedule.subject, schedule.component_type,
                professor=professor, room=room, days=days, start_time=st, end_time=et,
                exclude_id=schedule.id
            )
            return Response(self.get_serializer(updated_schedule).data)
        except ValueError as e:
            # Handle structured conflict error
            if isinstance(e.args[0], dict):
                return Response(e.args[0], status=status.HTTP_400_BAD_REQUEST)
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['POST'], url_path='randomize')
    def randomize(self, request):
        """
        Auto-generates day/time assignments for all slots of a section.
        Each subject gets one continuous block on one day.
        Professor and room are NOT touched.
        """
        section_id = request.data.get('section_id')
        term_id = request.data.get('term_id')
        respect_professor = request.data.get('respect_professor', False)
        respect_room = request.data.get('respect_room', False)

        if not all([section_id, term_id]):
            return Response({"error": "section_id and term_id are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            term = Term.objects.get(id=term_id)
            section = Section.objects.get(id=section_id)
            updated = SchedulingService.randomize_section_schedule(
                term, section, 
                respect_professor=respect_professor, 
                respect_room=respect_room
            )
            return Response(self.get_serializer(updated, many=True).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['POST'], url_path='pick-regular')
    def pick_regular(self, request):
        """
        Students pick their preferred session (AM/PM).
        """
        term_id = request.data.get('term_id')
        session = request.data.get('session')
        
        if not all([term_id, session]):
            raise ValidationError({'detail': 'term_id and session are required.'})
        if request.user.role != 'STUDENT':
            raise PermissionDenied("Only students can pick schedules.")

        student = request.user.student_profile
        try:
            term = Term.objects.get(id=term_id)
        except Term.DoesNotExist as exc:
            raise ValidationError({'detail': 'Term not found.'}) from exc
        section, redirected = self.picking_service.pick_schedule_regular(student, term, session)
        
        schedules = Schedule.objects.filter(section=section)
        return Response({
            "message": f"Successfully assigned to {section.name}.",
            "redirected": redirected,
            "section_id": section.id,
            "section_name": section.name,
            "schedules": self.get_serializer(schedules, many=True).data
        })

    @action(detail=False, methods=['POST'], url_path='pick-irregular')
    def pick_irregular(self, request):
        """
        Irregular students pick specific sections for each approved subject.
        """
        term_id = request.data.get('term_id')
        selections = request.data.get('selections', []) # [{subject_id, section_id}, ...]
        
        if not term_id:
            raise ValidationError({'detail': 'term_id is required.'})
        if request.user.role != 'STUDENT':
            raise PermissionDenied("Only students can pick schedules.")

        student = request.user.student_profile
        try:
            term = Term.objects.get(id=term_id)
        except Term.DoesNotExist as exc:
            raise ValidationError({'detail': 'Term not found.'}) from exc
        self.picking_service.pick_schedule_irregular(student, term, selections)
        return Response({"message": "Successfully picked schedules."})

    @action(detail=False, methods=['GET'], url_path='status-matrix')
    def status_matrix(self, request):
        """
        Returns sections with real-time slot counts.
        """
        term_id = request.query_params.get('term_id')
        program_id = request.query_params.get('program_id')
        year_level = request.query_params.get('year_level')
        
        if not all([term_id, program_id, year_level]):
            return Response({"error": "term_id, program_id, and year_level are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        sections = Section.objects.filter(
            term_id=term_id, 
            program_id=program_id, 
            year_level=year_level
        ).annotate(
            current_students=models.Count('student_assignments')
        ).order_by('section_number')
        
        return Response([
            {
                "id": s.id,
                "name": s.name,
                "session": s.session,
                "current": s.current_students,
                "max": s.max_students,
                "is_full": s.current_students >= s.max_students,
                "schedules": [
                    {
                        "subject": sch.subject.code,
                        "days": sch.days,
                        "start": sch.start_time.strftime("%H:%M") if sch.start_time else None,
                        "end": sch.end_time.strftime("%H:%M") if sch.end_time else None
                    } for sch in s.schedules.all()
                ]
            } for s in sections.prefetch_related('schedules', 'schedules__subject')
        ])

    @action(detail=False, methods=['GET'], url_path='available-slots')
    def available_slots(self, request):
        """
        Returns schedules that have NO professor assigned, but are for subjects
        that the given professor is qualified to teach.
        Used by the Dean to find load for a specific faculty member.
        """
        professor_id = request.query_params.get('professor_id')
        term_id = request.query_params.get('term_id')

        if not all([professor_id, term_id]):
            return Response({"error": "professor_id and term_id are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            professor = Professor.objects.get(id=professor_id)
            # Find subject IDs this professor can teach
            qualified_subject_ids = professor.assigned_subjects.values_list('subject_id', flat=True)

            # Find schedules for those subjects that have no professor in this term
            slots = Schedule.objects.filter(
                term_id=term_id,
                subject_id__in=qualified_subject_ids,
                professor__isnull=True
            ).select_related('section', 'subject').order_by('section__name')

            return Response(self.get_serializer(slots, many=True).data)
        except Professor.DoesNotExist:
            return Response({"error": "Professor not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    @action(detail=False, methods=['POST'], url_path='publish')
    def publish(self, request):
        """
        Dean publishes the schedule for a term, opening student picking.
        Notifies all students with approved advising.
        """
        term_id = request.data.get('term_id')
        if not term_id:
            return Response({"error": "term_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            term = Term.objects.get(id=term_id)
            SchedulingService.publish_schedule(term)
            return Response({"message": f"Schedule for {term.code} has been published. Students may now pick their schedules."})
        except Term.DoesNotExist:
            return Response({"error": "Term not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['GET'], url_path='insights/professor/(?P<prof_id>[^/.]+)')
    def professor_insights(self, request, prof_id=None):
        term_id = request.query_params.get('term_id')
        if not term_id:
            return Response({"error": "term_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        schedules = Schedule.objects.filter(professor_id=prof_id, term_id=term_id).select_related('subject', 'section', 'room')
        insights = self.scheduling_service.get_schedule_insights(schedules)
        return Response(insights)

    @action(detail=False, methods=['GET'], url_path='insights/room/(?P<room_id>[^/.]+)')
    def room_insights(self, request, room_id=None):
        term_id = request.query_params.get('term_id')
        if not term_id:
            return Response({"error": "term_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        schedules = Schedule.objects.filter(room_id=room_id, term_id=term_id).select_related('subject', 'section', 'professor__user')
        insights = self.scheduling_service.get_schedule_insights(schedules)
        return Response(insights)

    @action(detail=False, methods=['GET'], url_path='insights/section/(?P<section_id>[^/.]+)')
    def section_insights(self, request, section_id=None):
        schedules = Schedule.objects.filter(section_id=section_id).select_related('subject', 'room', 'professor__user')
        insights = self.scheduling_service.get_schedule_insights(schedules)
        return Response(insights)

    @action(detail=False, methods=['GET'], url_path='pending-slots')
    def pending_slots(self, request):
        term_id = request.query_params.get('term_id')
        if not term_id:
            return Response({"error": "term_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        slots = Schedule.objects.filter(
            term_id=term_id
        ).filter(
            models.Q(professor__isnull=True) | 
            models.Q(room__isnull=True) | 
            models.Q(days=[]) | 
            models.Q(start_time__isnull=True)
        ).select_related('section', 'subject', 'professor__user', 'room').order_by('section__name')
        
        return Response(self.get_serializer(slots, many=True).data)

    @action(detail=False, methods=['GET'], url_path='section-completion')
    def section_completion(self, request):
        term_id = request.query_params.get('term_id')
        if not term_id:
            return Response({"error": "term_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        sections = Section.objects.filter(term_id=term_id)
        report = []
        for section in sections:
            total_slots = Schedule.objects.filter(term_id=term_id, section=section).count()
            # Successfully assigned slots have room, professor, and days/time
            assigned_slots = Schedule.objects.filter(
                term_id=term_id, 
                section=section,
                professor__isnull=False,
                room__isnull=False,
                start_time__isnull=False
            ).exclude(days=[]).count()
            
            report.append({
                "section_id": section.id,
                "section_name": section.name,
                "assigned": assigned_slots,
                "total": total_slots
            })
        return Response(report)

    @action(detail=False, methods=['GET'], url_path='faculty-load-report')
    def faculty_load_report(self, request):
        term_id = request.query_params.get('term_id')
        if not term_id:
            return Response({"error": "term_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        professors = Professor.objects.filter(is_active=True).select_related('user')
        report = []
        for prof in professors:
            hours = Schedule.objects.filter(term_id=term_id, professor=prof).aggregate(
                total=models.Sum('subject__hrs_per_week')
            )['total'] or 0
            
            target = 24 if prof.employment_status == 'FULL_TIME' else 12
            
            report.append({
                "professor_id": prof.id,
                "name": f"{prof.user.first_name} {prof.user.last_name}",
                "status": prof.employment_status,
                "current_hours": float(hours),
                "target_hours": target,
                "is_underloaded": hours < target
            })
        return Response(report)

    @action(detail=False, methods=['POST'], url_path='validate-slot')
    def validate_slot(self, request):
        """
        Real-time validation for a specific slot configuration.
        """
        schedule_id = request.data.get('id')
        professor_id = request.data.get('professor_id')
        room_id = request.data.get('room_id')
        section_id = request.data.get('section_id')
        term_id = request.data.get('term_id')
        days = request.data.get('days', [])
        start_time = request.data.get('start_time')
        end_time = request.data.get('end_time')

        if not all([term_id, days, start_time, end_time]):
            return Response({"error": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            term = Term.objects.get(id=term_id)
            professor = Professor.objects.get(id=professor_id) if professor_id else None
            room = Room.objects.get(id=room_id) if room_id else None
            section = Section.objects.get(id=section_id) if section_id else None
            
            st = datetime.strptime(start_time, "%H:%M").time()
            et = datetime.strptime(end_time, "%H:%M").time()

            # Check Professor
            if professor:
                err = self.scheduling_service.check_professor_conflict(professor, term, days, st, et, exclude_id=schedule_id)
                if err: return Response(err, status=status.HTTP_409_CONFLICT)
            
            # Check Room
            if room:
                err = self.scheduling_service.check_room_conflict(room, term, days, st, et, exclude_id=schedule_id)
                if err: return Response(err, status=status.HTTP_409_CONFLICT)

            # Check Section
            if section:
                err = self.scheduling_service.check_section_conflict(section, term, days, st, et, exclude_id=schedule_id)
                if err: return Response(err, status=status.HTTP_409_CONFLICT)

            return Response({"status": "ok"})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['POST'], url_path='resource-availability')
    def resource_availability(self, request):
        """
        Checks which professors and rooms are available for a given time slot.
        """
        term_id = request.data.get('term_id')
        days = request.data.get('days', [])
        start_time = request.data.get('start_time')
        end_time = request.data.get('end_time')
        exclude_id = request.data.get('exclude_id')

        if not all([term_id, days, start_time, end_time]):
            return Response({"error": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            term = Term.objects.get(id=term_id)
            st = datetime.strptime(start_time, "%H:%M").time()
            et = datetime.strptime(end_time, "%H:%M").time()

            # 1. Get all professors and their availability status
            professors = Professor.objects.filter(is_active=True).select_related('user')
            prof_status = []
            for prof in professors:
                err = self.scheduling_service.check_professor_conflict(prof, term, days, st, et, exclude_id=exclude_id)
                prof_status.append({
                    "id": prof.id,
                    "is_available": err is None,
                    "conflict": err
                })

            # 2. Get all rooms and their availability status
            rooms = Room.objects.filter(is_active=True)
            room_status = []
            for room in rooms:
                err = self.scheduling_service.check_room_conflict(room, term, days, st, et, exclude_id=exclude_id)
                room_status.append({
                    "id": room.id,
                    "is_available": err is None,
                    "conflict": err
                })

            return Response({
                "professors": prof_status,
                "rooms": room_status
            })
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
