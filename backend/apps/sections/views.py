"""
Richwell Portal — Sections Views

This module manages academic sectioning, including student transfers, roster generation, 
and automated section creation. It coordinates with the SectioningService and 
Scheduling app to provide accurate student-subject assignments.
"""

import math
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.sections.models import Section, SectionStudent
from apps.sections.serializers import SectionSerializer, SectionStudentSerializer
from apps.sections.services.sectioning_service import SectioningService
from apps.terms.models import Term
from apps.academics.models import Program
from apps.students.models import Student, StudentEnrollment

class SectionViewSet(viewsets.ModelViewSet):
    """
    Handles section management, enrollment statistics, and professor schedules.
    Enforces role-based access for deans, registrars, and program heads.
    """
    queryset = Section.objects.all().order_by('program__code', 'year_level', 'section_number')
    serializer_class = SectionSerializer
    permission_classes = [permissions.IsAuthenticated]
    service = SectioningService()

    def get_permissions(self):
        """
        Applies strict access control: Dean/Registrar for writes, adds PH for management.
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'generate', 'preview_generation']:
            from core.permissions import IsDean, IsRegistrar
            class DeanOrRegistrar(permissions.BasePermission):
                def has_permission(self, request, view):
                    return IsDean().has_permission(request, view) or IsRegistrar().has_permission(request, view)
            return [DeanOrRegistrar()]
        if self.action in ['transfer', 'roster']:
            from core.permissions import IsDean, IsRegistrar, IsProgramHead
            class MgmtPermissions(permissions.BasePermission):
                def has_permission(self, request, view):
                    return any([IsDean().has_permission(request, view), IsRegistrar().has_permission(request, view), IsProgramHead().has_permission(request, view)])
            return [MgmtPermissions()]
        return super().get_permissions()

    def get_queryset(self):
        """
        Provides filtered section lists based on role and query parameters.
        """
        queryset = super().get_queryset()
        if self.request.user.role == 'PROGRAM_HEAD':
            queryset = queryset.filter(program__program_head=self.request.user)
        
        q = self.request.query_params
        for field in ['term_id', 'program_id', 'year_level']:
            if val := q.get(field): queryset = queryset.filter(**{field: val})
        if sub := q.get('subject_id'): queryset = queryset.filter(schedules__subject_id=sub).distinct()
        return queryset

    @action(detail=False, methods=['GET'])
    def stats(self, request):
        if not (tid := request.query_params.get('term_id')): return Response({"error": "term_id required"}, 400)
        return Response(self.service.get_enrollment_stats(Term.objects.get(id=tid)))

    @action(detail=False, methods=['POST'])
    def generate(self, request):
        d = request.data
        term, prog = Term.objects.get(id=d.get('term_id')), Program.objects.get(id=d.get('program_id'))
        sections = self.service.generate_sections(term, prog, int(d.get('year_level')), num_sections=int(d.get('num_sections')) if d.get('num_sections') else None, auto_schedule=d.get('auto_schedule', False))
        return Response(self.get_serializer(sections, many=True).data, status=201)

    @action(detail=False, methods=['POST'], url_path='preview-generation')
    def preview_generation(self, request):
        d = request.data
        count = StudentEnrollment.objects.filter(term_id=d.get('term_id'), student__program_id=d.get('program_id'), year_level=d.get('year_level'), advising_status='APPROVED').count()
        num_sections = int(d['desired_sections']) if d.get('desired_sections') else math.ceil(count / 40.0)
        return Response({"total_students": count, "num_sections": num_sections, "students_per_section": math.ceil(count / num_sections) if num_sections > 0 else 0})

    @action(detail=True, methods=['POST'], url_path='transfer')
    def transfer(self, request, pk=None):
        section, sid, tid = self.get_object(), request.data.get('student_id'), request.data.get('term_id')
        override = request.data.get('override', False) or self.request.user.role == 'PROGRAM_HEAD'
        count = self.service.manual_transfer_student(Student.objects.get(id=sid), section, Term.objects.get(id=tid), override_capacity=override)
        return Response({"message": f"Transferred to {section.name}.", "updated": count})

    @action(detail=True, methods=['GET'])
    def roster(self, request, pk=None):
        return Response(SectionStudentSerializer(SectionStudent.objects.filter(section=self.get_object()), many=True).data)

    @action(detail=False, methods=['GET'], url_path='my-schedule')
    def my_schedule(self, request):
        if not hasattr(request.user, 'professor_profile'): return Response({"error": "No prof profile"}, 400)
        term = Term.objects.get(id=request.query_params.get('term_id')) if request.query_params.get('term_id') else Term.objects.filter(is_active=True).first()
        from apps.scheduling.models import Schedule
        schedules = Schedule.objects.filter(professor=request.user.professor_profile, term=term).select_related('section', 'subject', 'room')
        return Response([{ "id": s.id, "days": s.days, "start_time": s.start_time.strftime("%H:%M") if s.start_time else None, "room": s.room.name if s.room else "TBA", "section": s.section.name, "subject": s.subject.code } for s in schedules])

    @action(detail=False, methods=['GET'], url_path='my-sections')
    def my_sections(self, request):
        if not hasattr(request.user, 'professor_profile'): return Response({"error": "No prof profile"}, 400)
        term = Term.objects.get(id=request.query_params.get('term_id')) if request.query_params.get('term_id') else Term.objects.filter(is_active=True).first()
        from apps.scheduling.models import Schedule
        schedules = Schedule.objects.filter(professor=request.user.professor_profile, term=term).select_related('section', 'subject').values('section__id', 'section__name', 'subject__id', 'subject__code').distinct()
        return Response([{"section": {"id": s['section__id'], "name": s['section__name']}, "subject": {"id": s['subject__id'], "code": s['subject__code']}} for s in schedules])
