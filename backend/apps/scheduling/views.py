from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.scheduling.models import Schedule
from apps.scheduling.serializers import ScheduleSerializer
from apps.scheduling.services.scheduling_service import SchedulingService
from apps.scheduling.services.picking_service import PickingService
from apps.sections.models import Section
from apps.faculty.models import Professor
from apps.facilities.models import Room
from django.db import models

class ScheduleViewSet(viewsets.ModelViewSet):
    queryset = Schedule.objects.select_related(
        'term', 'section', 'subject', 'professor__user', 'room'
    ).all().order_by('section__name', 'start_time')
    serializer_class = ScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    scheduling_service = SchedulingService()
    picking_service = PickingService()

    def get_queryset(self):
        queryset = super().get_queryset()
        term_id = self.request.query_params.get('term_id')
        section_id = self.request.query_params.get('section_id')
        if term_id:
            queryset = queryset.filter(term_id=term_id)
        if section_id:
            queryset = queryset.filter(section_id=section_id)
        return queryset

    @action(detail=False, methods=['POST'])
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
            return Response({"error": "term_id and session are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            student = request.user.student_profile
            section, redirected = self.picking_service.pick_schedule_regular(student, term_id, session)
            
            schedules = Schedule.objects.filter(section=section)
            return Response({
                "message": f"Successfully assigned to {section.name}.",
                "redirected": redirected,
                "section_id": section.id,
                "section_name": section.name,
                "schedules": self.get_serializer(schedules, many=True).data
            })
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['POST'], url_path='pick-irregular')
    def pick_irregular(self, request):
        """
        Irregular students pick specific sections for each approved subject.
        """
        term_id = request.data.get('term_id')
        selections = request.data.get('selections', []) # [{subject_id, section_id}, ...]
        
        if not term_id:
            return Response({"error": "term_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            student = request.user.student_profile
            self.picking_service.pick_schedule_irregular(student, term_id, selections)
            return Response({"message": "Successfully picked schedules."})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['GET'])
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
                "is_full": s.current_students >= s.max_students
            } for s in sections
        ])
    @action(detail=False, methods=['GET'])
    def available_slots(self, request):
        """
        Returns unassigned schedule slots matching a professor's assigned subjects.
        """
        term_id = request.query_params.get('term_id')
        professor_id = request.query_params.get('professor_id')
        
        if not all([term_id, professor_id]):
            return Response({"error": "term_id and professor_id are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            professor = Professor.objects.get(id=professor_id)
            # Find subject IDs assigned to this professor
            assigned_subject_ids = professor.assigned_subjects.values_list('subject_id', flat=True)
            
            # Find schedule slots for these subjects in this term where professor is null
            slots = Schedule.objects.filter(
                term_id=term_id,
                subject_id__in=assigned_subject_ids,
                professor__isnull=True
            ).select_related('section', 'subject').order_by('section__name', 'component_type')
            
            return Response(self.get_serializer(slots, many=True).data)
        except Professor.DoesNotExist:
            return Response({"error": "Professor not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
