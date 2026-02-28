"""
Section and SectionSubject views — section management, bulk creation, student assignment.
"""

import uuid
from django.db import transaction, models
from django.db.models import Q
from rest_framework import generics, viewsets, status, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from apps.core.permissions import IsRegistrarOrAdmin
from apps.audit.models import AuditLog

from .models import Section, SectionSubject, ScheduleSlot
from .serializers import (
    SectionSerializer, SectionCreateSerializer, BulkSectionCreateSerializer,
    SectionSubjectSerializer, SectionSubjectCreateSerializer,
    ScheduleSlotSerializer
)


# ============================================================
# Section Management
# ============================================================

@extend_schema_view(
    list=extend_schema(summary="List Sections", tags=["Section Management"]),
    create=extend_schema(summary="Create Section", tags=["Section Management"]),
    retrieve=extend_schema(summary="Get Section", tags=["Section Management"]),
    update=extend_schema(summary="Update Section", tags=["Section Management"]),
    partial_update=extend_schema(summary="Partial Update Section", tags=["Section Management"]),
    destroy=extend_schema(summary="Delete Section", tags=["Section Management"]),
)
class SectionViewSet(viewsets.ModelViewSet):
    """Full CRUD for sections."""
    queryset = Section.objects.filter(is_deleted=False)
    permission_classes = [IsRegistrarOrAdmin]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['name', 'year_level', 'program__code']
    ordering = ['name']
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return SectionCreateSerializer
        return SectionSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        semester_id = self.request.query_params.get('semester')
        if semester_id:
            try:
                uuid.UUID(semester_id)
                queryset = queryset.filter(semester_id=semester_id)
            except (ValueError, TypeError):
                queryset = queryset.none()
        
        program_id = self.request.query_params.get('program')
        if program_id:
            try:
                uuid.UUID(program_id)
                queryset = queryset.filter(program_id=program_id)
            except (ValueError, TypeError):
                pass

        year_level = self.request.query_params.get('year_level')
        if year_level:
            queryset = queryset.filter(year_level=year_level)

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(name__icontains=search)
        
        return queryset.select_related('program', 'semester').prefetch_related(
            'section_subjects__subject',
            'section_subjects__professor',
            'section_subjects__schedule_slots'
        )
    
    def perform_create(self, serializer):
        subject_ids = serializer.validated_data.pop('subject_ids', [])
        section = serializer.save()
        
        if subject_ids:
            from apps.academics.models import SectionSubject, Subject
            subjects = Subject.objects.filter(id__in=subject_ids)
            records = [
                SectionSubject(section=section, subject=s, is_tba=True)
                for s in subjects
            ]
            SectionSubject.objects.bulk_create(records)

        AuditLog.log(
            action=AuditLog.Action.SECTION_CREATED,
            target_model='Section',
            target_id=section.id,
            payload={'name': section.name, 'program': section.program.code}
        )
    
    def perform_destroy(self, instance):
        """Soft delete."""
        instance.is_deleted = True
        instance.save()

    @extend_schema(
        summary="Bulk Create Sections",
        description="Create multiple sections with automatic subject linking from curriculum",
        request=BulkSectionCreateSerializer,
        tags=["Section Management"]
    )
    @action(detail=False, methods=['post'], url_path='bulk-create')
    def bulk_create(self, request):
        """Bulk create sections with curriculum subjects."""
        serializer = BulkSectionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        from .services import SectionService
        result = SectionService.bulk_create_sections(serializer.validated_data, user=request.user)
        
        if not result['success']:
            status_code = status.HTTP_400_BAD_REQUEST
            if "unexpected" in result.get('error', ''):
                status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
                
            return Response({'error': result['error']}, status=status_code)
            
        if result.get('warning'):
            return Response({'warning': result['warning']}, status=status.HTTP_200_OK)
            
        return Response(
            SectionSerializer(result['data'], many=True).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['get'], url_path='detailed-view')
    @extend_schema(summary="Get All Sections Detailed View", tags=["Section Management"])
    def list_detailed_view(self, request):
        """Returns details for all sections including their scheduling progress."""
        from apps.academics.models import CurriculumSubject, Curriculum
        sections = self.get_queryset()
        
        results = []
        for section in sections:
            target_curriculum = section.curriculum or Curriculum.objects.filter(program=section.program, is_active=True).first()
            if not target_curriculum: continue

            semester_number = 1 if "1st" in section.semester.name.lower() or "first" in section.semester.name.lower() else 2
            
            curriculum_subjects = CurriculumSubject.objects.filter(
                curriculum=target_curriculum,
                year_level=section.year_level,
                semester_number=semester_number,
                is_deleted=False
            )
            
            assigned_subjects = SectionSubject.objects.filter(section=section, is_deleted=False)
            assigned_map = {ss.subject_id: ss for ss in assigned_subjects}
            
            subject_data = []
            for cs in curriculum_subjects:
                assigned_ss = assigned_map.get(cs.subject_id)
                slots_count = assigned_ss.schedule_slots.filter(is_deleted=False).count() if assigned_ss else 0
                
                subject_data.append({
                    'subject_id': str(cs.subject_id),
                    'schedule_slots': [True] * slots_count if slots_count > 0 else [] 
                })

            results.append({
                'id': str(section.id),
                'name': section.name,
                'program_code': section.program.code if section.program else 'N/A',
                'year_level': section.year_level,
                'subjects': subject_data
            })
            
        return Response(results)

    @action(detail=True, methods=['get'], url_path='detailed-view')
    @extend_schema(summary="Get Section Detailed View", tags=["Section Management"])
    def detailed_view(self, request, pk=None):
        """Returns details of a section including semester-aware subjects and qualified professors."""
        section = self.get_object()
        from apps.academics.models import CurriculumSubject, Curriculum
        
        target_curriculum = section.curriculum
        if not target_curriculum:
            target_curriculum = Curriculum.objects.filter(
                program=section.program,
                is_active=True
            ).first()

        semester = section.semester
        if not semester:
             return Response({"error": "Section has no semester assigned"}, status=400)

        semester_name = semester.name.lower()
        semester_number = 1
        if "2nd" in semester_name or "second" in semester_name: 
            semester_number = 2
        elif "summer" in semester_name: 
            semester_number = 3
        
        curriculum_subjects = CurriculumSubject.objects.filter(
            curriculum=target_curriculum,
            year_level=section.year_level,
            semester_number=semester_number,
            is_deleted=False
        ).select_related('subject')
        
        assigned_subjects = SectionSubject.objects.filter(
            section=section,
            is_deleted=False
        )
        
        assigned_map = {str(ss.subject.id): ss for ss in assigned_subjects}
        subject_data = []
        for cs in curriculum_subjects:
            subj = cs.subject
            assigned_ss = assigned_map.get(str(subj.id))
            
            # Auto-ensure SectionSubject exists so it can be scheduled
            if not assigned_ss:
                assigned_ss = SectionSubject.objects.create(section=section, subject=subj)

            qualified_professors = subj.qualified_professors.filter(
                is_active=True,
                user__is_active=True
            ).select_related('user')

            print(f"DEBUG: Subject {subj.code} ({subj.id}) has {qualified_professors.count()} qualified professors.")
            for p in qualified_professors:
                print(f" - {p.user.get_full_name()} ({p.user.id})")
            
            prof_list = [{
                'id': str(p.user.id),
                'name': p.user.get_full_name(),
                'specialization': p.specialization
            } for p in qualified_professors]
            
            assigned_professors = []
            if assigned_ss:
                if assigned_ss.professor_assignments.exists():
                    assigned_professors = [{
                        'id': str(pa.professor.id),
                        'name': pa.professor.get_full_name(),
                        'is_primary': pa.is_primary
                    } for pa in assigned_ss.professor_assignments.all()]
                elif assigned_ss.professor:
                    assigned_professors = [{
                        'id': str(assigned_ss.professor.id),
                        'name': assigned_ss.professor.get_full_name(),
                        'is_primary': True
                    }]
            
            slots_data = []
            if assigned_ss:
                slots = assigned_ss.schedule_slots.filter(is_deleted=False).select_related('professor', 'section_subject__section')
                slots_data = ScheduleSlotSerializer(slots, many=True).data

            subject_type = 'LAB' if 'LAB' in subj.title.upper() or 'LABORATORY' in subj.title.upper() else 'LEC'

            item = {
                'id': str(assigned_ss.id) if assigned_ss else None,
                'subject_id': str(subj.id),
                'subject_code': subj.code,
                'subject_title': subj.title,
                'units': subj.units,
                'subject_type': subject_type,
                'semester_tag': f"{semester_number}{'st' if semester_number==1 else 'nd' if semester_number==2 else 'rd'} Sem",
                'is_assigned': assigned_ss is not None,
                'section_subject_id': str(assigned_ss.id) if assigned_ss else None,
                'assigned_professors': assigned_professors,
                'qualified_professors': prof_list,
                'schedule_slots': slots_data,
                'professor_id': assigned_professors[0]['id'] if assigned_professors else None,
                'professor_name': assigned_professors[0]['name'] if assigned_professors else 'TBA'
            }
            subject_data.append(item)
            
        return Response({
            'section': SectionSerializer(section).data,
            'subjects': subject_data,
            'semester_info': {
                'id': str(semester.id),
                'name': semester.name,
                'number': semester_number
            }
        })

    @action(detail=False, methods=['post'], url_path='validate-names')
    @extend_schema(summary="Validate Section Names", tags=["Section Management"])
    def validate_names(self, request):
        """Check availability of multiple section names."""
        names = request.data.get('names', [])
        semester_id = request.data.get('semester_id')
        
        if not semester_id or not names:
            return Response({'available': True})
            
        from apps.enrollment.models import Semester
        try:
            semester = Semester.objects.get(id=semester_id)
        except Semester.DoesNotExist:
            return Response({'error': 'Invalid semester'}, status=400)

        active_names = set(Section.objects.filter(
            semester=semester,
            name__in=names,
            is_deleted=False
        ).values_list('name', flat=True))

        deleted_names = set(Section.objects.filter(
            semester=semester,
            name__in=names,
            is_deleted=True
        ).values_list('name', flat=True))

        return Response({
            'active_conflicts': list(active_names),
            'archived_conflicts': list(deleted_names)
        })

    @action(detail=True, methods=['post'], url_path='merge')
    @extend_schema(summary="Merge Section", tags=["Section Management"])
    def merge(self, request, pk=None):
        """Merge this section into a target section."""
        section = self.get_object()
        target_id = request.data.get('target_section_id')
        
        if not target_id:
            return Response({'error': 'Target section ID required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            target = Section.objects.get(id=target_id)
        except Section.DoesNotExist:
            return Response({'error': 'Target section not found'}, status=status.HTTP_404_NOT_FOUND)
            
        if section.semester != target.semester or section.program != target.program:
             return Response({'error': 'Sections must match semester and program'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.accounts.models import StudentProfile
        students = StudentProfile.objects.filter(home_section=section)
        count = students.count()
        students.update(home_section=target)
        
        section.is_dissolved = True
        section.parent_section = target
        section.save()

        AuditLog.log(
            action=AuditLog.Action.SECTION_UPDATED,
            target_model='Section',
            target_id=section.id,
            payload={'action': 'merged', 'target': target.name, 'students_moved': count}
        )
        
        return Response({'message': f'Merged into {target.name}. {count} students moved.'})

    @action(detail=True, methods=['post'], url_path='dissolve')
    @extend_schema(summary="Dissolve Section", tags=["Section Management"])
    def dissolve(self, request, pk=None):
        section = self.get_object()
        section.is_dissolved = True
        section.save()
        
        from apps.accounts.models import StudentProfile
        StudentProfile.objects.filter(home_section=section).update(home_section=None)
        
        AuditLog.log(
            action=AuditLog.Action.SECTION_UPDATED, 
            target_model='Section',
            target_id=section.id,
            payload={'action': 'dissolved'}
        )
        
        return Response({'message': 'Section dissolved and students unassigned.'})
        
    @action(detail=True, methods=['post'], url_path='assign-students')
    @extend_schema(summary="Assign Students", tags=["Section Management"])
    def assign_students(self, request, pk=None):
        section = self.get_object()
        student_ids = request.data.get('student_ids', [])
        
        if not student_ids:
             return Response({'error': 'No student IDs provided'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.accounts.models import StudentProfile
        profiles = StudentProfile.objects.filter(user_id__in=student_ids)
        updated = profiles.update(home_section=section)
        
        # Auto-enrollment disabled per user request
        enroll_errors = []
        msg = f'{updated} students assigned to {section.name}.'
        
        AuditLog.log(
            action=AuditLog.Action.SECTION_UPDATED,
            target_model='Section',
            target_id=section.id,
            payload={'action': 'assign_students', 'count': updated, 'student_ids': student_ids}
        )
        
        return Response({'message': msg, 'errors': enroll_errors})

    @action(detail=True, methods=['get'])
    def students(self, request, pk=None):
        """Get list of students assigned to section."""
        section = self.get_object()
        from apps.accounts.models import StudentProfile
        from apps.accounts.serializers import RegistrarStudentSerializer
        students = StudentProfile.objects.filter(home_section=section).select_related('user', 'program')
        serializer = RegistrarStudentSerializer(students, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='recommend-students')
    def recommend_students(self, request, pk=None):
        """Get recommended students for section (same program/year, no section)."""
        section = self.get_object()
        from apps.accounts.models import StudentProfile
        from apps.accounts.serializers import RegistrarStudentSerializer
        
        students = StudentProfile.objects.filter(
            program=section.program,
            year_level=section.year_level,
            home_section__isnull=True,
            user__is_active=True
        ).select_related('user', 'program')
        
        serializer = RegistrarStudentSerializer(students, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='remove-student')
    def remove_student(self, request, pk=None):
        """Remove a student from the section."""
        section = self.get_object()
        student_id = request.data.get('student_id')
        
        if not student_id:
             return Response({'error': 'Student ID required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from apps.accounts.models import StudentProfile
            profile = StudentProfile.objects.get(user_id=student_id, home_section=section)
            profile.home_section = None
            profile.save()
            
            AuditLog.log(
                action=AuditLog.Action.SECTION_UPDATED,
                target_model='Section',
                target_id=section.id,
                payload={'action': 'remove_student', 'student_id': str(student_id)}
            )
            
            return Response({'message': 'Student removed from section.'})
        except StudentProfile.DoesNotExist:
             return Response({'error': 'Student not found in this section'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'], url_path='run-freshman-queue')
    @extend_schema(
        summary="Run Freshman Queue",
        description="Assign freshmen to sections on a first-come, first-served basis",
        parameters=[
            OpenApiParameter(name='semester_id', type=uuid.UUID, location='query', required=True),
            OpenApiParameter(name='program_id', type=uuid.UUID, location='query', required=False),
        ],
        tags=["Section Management"]
    )
    def run_freshman_queue(self, request):
        semester_id = request.query_params.get('semester_id') or request.data.get('semester_id')
        program_id = request.query_params.get('program_id') or request.data.get('program_id')
        
        if not semester_id:
            return Response({'error': 'semester_id is required'}, status=400)
            
        from .services_sectioning import SectioningEngine
        count = SectioningEngine.process_freshman_queue(semester_id, program_id)
        
        return Response({
            'success': True,
            'message': f'Processed {count} freshmen.',
            'count': count
        })

    @action(detail=False, methods=['post'], url_path='run-ml-resectioning')
    @extend_schema(
        summary="Run ML Resectioning",
        description="Run ML-based sectioning for returning students",
        parameters=[
            OpenApiParameter(name='semester_id', type=uuid.UUID, location='query', required=True),
            OpenApiParameter(name='program_id', type=uuid.UUID, location='query', required=True),
            OpenApiParameter(name='year_level', type=int, location='query', required=True),
        ],
        tags=["Section Management"]
    )
    def run_ml_resectioning(self, request):
        semester_id = request.query_params.get('semester_id') or request.data.get('semester_id')
        program_id = request.query_params.get('program_id') or request.data.get('program_id')
        year_level = request.query_params.get('year_level') or request.data.get('year_level')
        
        if not all([semester_id, program_id, year_level]):
            return Response({'error': 'semester_id, program_id, and year_level are required'}, status=400)
            
        from .services_sectioning import SectioningEngine
        count = SectioningEngine.run_ml_resectioning(semester_id, program_id, int(year_level))
        
        return Response({
            'success': True,
            'message': f'Resectioned {count} students.',
            'count': count
        })

    @action(detail=False, methods=['post'], url_path='rebalance')
    @extend_schema(
        summary="Rebalance Sections",
        description="Identify and handle underfilled sections",
        parameters=[
            OpenApiParameter(name='semester_id', type=uuid.UUID, location='query', required=True),
        ],
        tags=["Section Management"]
    )
    def rebalance(self, request):
        semester_id = request.query_params.get('semester_id') or request.data.get('semester_id')
        
        if not semester_id:
            return Response({'error': 'semester_id is required'}, status=400)
            
        from .services_sectioning import SectioningEngine
        actions = SectioningEngine.rebalance_sections(semester_id)
        
        return Response({
            'success': True,
            'message': f'Rebalancing complete. {len(actions)} actions taken.',
            'actions': actions
        })


# ============================================================
# Section Subject Management
# ============================================================

@extend_schema_view(
    list=extend_schema(summary="List Section Subjects", tags=["Section Management"]),
    create=extend_schema(summary="Assign Subject to Section", tags=["Section Management"]),
    retrieve=extend_schema(summary="Get Section Subject", tags=["Section Management"]),
    update=extend_schema(summary="Update Section Subject", tags=["Section Management"]),
    partial_update=extend_schema(summary="Partial Update Section Subject", tags=["Section Management"]),
    destroy=extend_schema(summary="Remove Subject from Section", tags=["Section Management"]),
)
class SectionSubjectViewSet(viewsets.ModelViewSet):
    """Manage subjects assigned to sections."""
    queryset = SectionSubject.objects.filter(is_deleted=False)
    permission_classes = [IsRegistrarOrAdmin]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return SectionSubjectCreateSerializer
        return SectionSubjectSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        section_id = self.request.query_params.get('section')
        if section_id:
            queryset = queryset.filter(section_id=section_id)
        
        program_id = self.request.query_params.get('program')
        if program_id:
            queryset = queryset.filter(section__program_id=program_id)
            
        semester_id = self.request.query_params.get('semester')
        if semester_id:
            queryset = queryset.filter(section__semester_id=semester_id)
            
        search_query = self.request.query_params.get('search')
        if search_query:
            queryset = queryset.filter(
                Q(subject__code__icontains=search_query) |
                Q(subject__title__icontains=search_query) |
                Q(section__name__icontains=search_query)
            )
        
        return queryset.select_related('section', 'subject', 'professor').prefetch_related('schedule_slots')
    
    def perform_destroy(self, instance):
        """Soft delete."""
        instance.is_deleted = True
        instance.save()
        AuditLog.log(
            action=AuditLog.Action.SECTION_UPDATED,
            target_model='SectionSubject',
            target_id=instance.id,
            payload={'action': 'removed', 'section': instance.section.name, 'subject': instance.subject.code}
        )
