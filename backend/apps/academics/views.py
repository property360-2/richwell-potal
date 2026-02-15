"""
Academics views - Program, Subject, Section, and Scheduling endpoints.
EPIC 2: Curriculum, Subjects & Section Scheduling
"""

import uuid
from django.db import transaction, models
from django.db.models import Q
from rest_framework import generics, viewsets, status, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import action
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from apps.core.permissions import IsRegistrar, IsAdmin, IsRegistrarOrAdmin
from apps.audit.models import AuditLog

from .models import Room, Program, Subject, Section, SectionSubject, ScheduleSlot, CurriculumVersion, Curriculum, CurriculumSubject
from .serializers import (
    ProgramSerializer, ProgramCreateSerializer, ProgramWithSubjectsSerializer,
    SubjectSerializer, SubjectCreateSerializer, PrerequisiteSerializer,
    SectionSerializer, SectionCreateSerializer, BulkSectionCreateSerializer,
    SectionSubjectSerializer, SectionSubjectCreateSerializer,
    ScheduleSlotSerializer, ScheduleSlotCreateSerializer,
    CurriculumVersionSerializer, CurriculumVersionCreateSerializer,
    CurriculumSerializer, CurriculumCreateSerializer, CurriculumSubjectSerializer,
    AssignSubjectsSerializer, CurriculumStructureSerializer,
    ProfessorSerializer, ProfessorDetailSerializer, RoomSerializer
)
from .services import CurriculumService, SchedulingService, ProfessorService


# ============================================================
# EPIC 1 - Public Views (unchanged)
# ============================================================

@extend_schema_view(
    get=extend_schema(
        summary="List Programs",
        description="Get a list of all active academic programs",
        tags=["Academics"]
    )
)
class ProgramListView(generics.ListAPIView):
    """List all active programs."""
    queryset = Program.objects.filter(is_active=True, is_deleted=False)
    serializer_class = ProgramSerializer
    permission_classes = [AllowAny]


@extend_schema_view(
    get=extend_schema(
        summary="Program Details",
        description="Get details of a specific program",
        tags=["Academics"]
    )
)
class ProgramDetailView(generics.RetrieveAPIView):
    """Get program details."""
    queryset = Program.objects.filter(is_active=True, is_deleted=False)
    serializer_class = ProgramSerializer
    permission_classes = [AllowAny]


@extend_schema_view(
    get=extend_schema(
        summary="List Subjects",
        description="Get a list of subjects for a program",
        tags=["Academics"]
    )
)
class SubjectListView(generics.ListAPIView):
    """List all subjects."""
    queryset = Subject.objects.filter(is_deleted=False)
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        program_id = self.request.query_params.get('program')
        if program_id:
            queryset = queryset.filter(program_id=program_id)
        return queryset


@extend_schema_view(
    get=extend_schema(
        summary="Subject Details",
        description="Get details of a specific subject including prerequisites",
        tags=["Academics"]
    )
)
class SubjectDetailView(generics.RetrieveAPIView):
    """Get subject details."""
    queryset = Subject.objects.filter(is_deleted=False)
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated]


# ============================================================
# EPIC 2 - Program CRUD (Registrar/Admin)
# ============================================================

@extend_schema_view(
    list=extend_schema(summary="List Programs", tags=["Curriculum Management"]),
    create=extend_schema(summary="Create Program", tags=["Curriculum Management"]),
    retrieve=extend_schema(summary="Get Program", tags=["Curriculum Management"]),
    update=extend_schema(summary="Update Program", tags=["Curriculum Management"]),
    partial_update=extend_schema(summary="Partial Update Program", tags=["Curriculum Management"]),
    destroy=extend_schema(summary="Delete Program", tags=["Curriculum Management"]),
)
class ProgramViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for academic programs.
    Only registrars and admins can manage programs.
    """
    queryset = Program.objects.filter(is_deleted=False)
    permission_classes = [IsRegistrarOrAdmin]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ProgramCreateSerializer
        if self.action == 'retrieve':
            return ProgramWithSubjectsSerializer
        return ProgramSerializer
    
    def perform_destroy(self, instance):
        """Soft delete."""
        instance.is_deleted = True
        instance.is_active = False
        instance.save()

    @action(detail=False, methods=['get'], url_path='check-duplicate')
    def check_duplicate(self, request):
        """Check if a program with the given code already exists (including deleted)."""
        code = request.query_params.get('code', '').strip().upper()
        
        if not code:
            return Response({'error': 'Code is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Check all_objects because DB unique constraint includes soft-deleted records
        from .models import Program
        exists = Program.all_objects.filter(code=code).exists()
        return Response({'duplicate': exists})
    
    @action(detail=True, methods=['post'], url_path='snapshot')
    @extend_schema(
        summary="Create Curriculum Snapshot",
        description="Create a version snapshot of the program's curriculum",
        request=CurriculumVersionCreateSerializer,
        responses={201: CurriculumVersionSerializer},
        tags=["Curriculum Management"]
    )
    def snapshot(self, request, pk=None):
        """Create a curriculum version snapshot."""
        program = self.get_object()
        serializer = CurriculumVersionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        from apps.enrollment.models import Semester
        semester = Semester.objects.get(id=serializer.validated_data['semester_id'])
        notes = serializer.validated_data.get('notes', '')
        
        version = CurriculumVersion.create_snapshot(
            program=program,
            semester=semester,
            user=request.user,
            notes=notes
        )
        
        # Audit log
        AuditLog.log(
            action=AuditLog.Action.CURRICULUM_VERSION_CREATED,
            target_model='CurriculumVersion',
            target_id=version.id,
            payload={'program': program.code, 'version': version.version_number}
        )
        
        return Response(
            CurriculumVersionSerializer(version).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['get'], url_path='versions')
    @extend_schema(
        summary="List Curriculum Versions",
        description="List all curriculum versions for this program",
        responses={200: CurriculumVersionSerializer(many=True)},
        tags=["Curriculum Management"]
    )
    def versions(self, request, pk=None):
        """List curriculum versions for a program."""
        program = self.get_object()
        versions = CurriculumVersion.objects.filter(
            program=program,
            is_deleted=False
        ).order_by('-created_at')
        
        return Response(CurriculumVersionSerializer(versions, many=True).data)


# ============================================================
# EPIC 2 - Subject CRUD (Registrar/Admin)
# ============================================================

@extend_schema_view(
    list=extend_schema(summary="List Subjects", tags=["Curriculum Management"]),
    create=extend_schema(summary="Create Subject", tags=["Curriculum Management"]),
    retrieve=extend_schema(summary="Get Subject", tags=["Curriculum Management"]),
    update=extend_schema(summary="Update Subject", tags=["Curriculum Management"]),
    partial_update=extend_schema(summary="Partial Update Subject", tags=["Curriculum Management"]),
    destroy=extend_schema(summary="Delete Subject", tags=["Curriculum Management"]),
)
class SubjectViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for subjects with prerequisite management.
    """
    queryset = Subject.objects.filter(is_deleted=False)
    permission_classes = [IsRegistrarOrAdmin]
    pagination_class = None
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return SubjectCreateSerializer
        return SubjectSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        program_id = self.request.query_params.get('program')
        search_query = self.request.query_params.get('search')
        year_level = self.request.query_params.get('year_level')
        semester_number = self.request.query_params.get('semester_number')

        if program_id:
            # Filter by subjects that include this program (multi-program support)
            # OR subjects that are assigned to a curriculum of this program
            # OR subjects that are marked as global
            queryset = queryset.filter(
                Q(program_id=program_id) |
                Q(programs__id=program_id) | 
                Q(curriculum_assignments__curriculum__program_id=program_id) |
                Q(is_global=True)
            ).distinct()
        
        if year_level:
            queryset = queryset.filter(year_level=year_level)
            
        if semester_number:
            queryset = queryset.filter(semester_number=semester_number)
        
        if search_query:
            queryset = queryset.filter(
                Q(code__icontains=search_query) |
                Q(title__icontains=search_query)
            )

        return queryset.select_related('program').prefetch_related('programs', 'prerequisites')
    
    def perform_destroy(self, instance):
        """Soft delete."""
        instance.is_deleted = True
        instance.save()
    
    @action(detail=True, methods=['get'], url_path='prerequisite-tree')
    @extend_schema(
        summary="Get Prerequisite Tree",
        description="Get the full prerequisite tree for a subject",
        tags=["Curriculum Management"]
    )
    def prerequisite_tree(self, request, pk=None):
        """Get prerequisite tree visualization."""
        subject = self.get_object()
        tree = CurriculumService.get_prerequisite_tree(subject)
        return Response(tree)
    
    @action(detail=True, methods=['post'], url_path='prerequisites')
    @extend_schema(
        summary="Add Prerequisite",
        description="Add a prerequisite to a subject (with circular check)",
        request=PrerequisiteSerializer,
        tags=["Curriculum Management"]
    )
    def add_prerequisite(self, request, pk=None):
        """Add a prerequisite to a subject."""
        subject = self.get_object()
        serializer = PrerequisiteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        prereq = Subject.objects.get(id=serializer.validated_data['prerequisite_id'])
        
        success, error = CurriculumService.add_prerequisite(subject, prereq)
        
        if not success:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'message': f'Prerequisite {prereq.code} added to {subject.code}',
            'prerequisites': [p.code for p in subject.prerequisites.all()]
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['delete'], url_path='prerequisites/(?P<prereq_id>[^/.]+)')
    @extend_schema(
        summary="Remove Prerequisite",
        description="Remove a prerequisite from a subject",
        tags=["Curriculum Management"]
    )
    def remove_prerequisite(self, request, pk=None, prereq_id=None):
        """Remove a prerequisite from a subject."""
        subject = self.get_object()
        
        try:
            prereq = Subject.objects.get(id=prereq_id)
        except Subject.DoesNotExist:
            return Response({'error': 'Prerequisite not found'}, status=status.HTTP_404_NOT_FOUND)
        
        success, error = CurriculumService.remove_prerequisite(subject, prereq)
        
        if not success:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'message': f'Prerequisite {prereq.code} removed from {subject.code}',
            'prerequisites': [p.code for p in subject.prerequisites.all()]
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='check-duplicate')
    def check_duplicate(self, request):
        """Check if subject code already exists."""
        code = request.query_params.get('code')
        if not code:
            return Response({'error': 'Code parameter required'}, status=status.HTTP_400_BAD_REQUEST)
        
        duplicate = Subject.objects.filter(code__iexact=code, is_deleted=False).exists()
        return Response({'duplicate': duplicate})


class RoomViewSet(viewsets.ModelViewSet):
    """
    CRUD for rooms.
    """
    queryset = Room.objects.filter(is_active=True)
    serializer_class = RoomSerializer
    permission_classes = [IsRegistrarOrAdmin]

    def get_queryset(self):
        queryset = Room.objects.all()
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        return queryset

    @action(detail=False, methods=['get'])
    def availability(self, request):
        """
        Check availability of all rooms for a specific time and day.
        """
        from datetime import time
        
        day = request.query_params.get('day')
        start_time_str = request.query_params.get('start_time')
        end_time_str = request.query_params.get('end_time')
        semester_id = request.query_params.get('semester_id')

        if not all([day, start_time_str, end_time_str, semester_id]):
            return Response({'error': 'Missing parameters'}, status=400)

        try:
            # Handle formats like "HH:MM" or "HH:MM:SS"
            if len(start_time_str) > 5: start_time_str = start_time_str[:5]
            if len(end_time_str) > 5: end_time_str = end_time_str[:5]
            
            start = time.fromisoformat(start_time_str)
            end = time.fromisoformat(end_time_str)
        except ValueError:
            return Response({'error': 'Invalid time format. Use HH:MM'}, status=400)

        # Get busy rooms for this specific time slot
        # Map room names to their current occupant for better UI feedback
        occupied_slots = ScheduleSlot.objects.filter(
            section_subject__section__semester_id=semester_id,
            day=day,
            is_deleted=False,
            # OVERLAP LOGIC: StartA < EndB AND EndA > StartB
            start_time__lt=end,
            end_time__gt=start
        ).select_related('section_subject__section', 'section_subject__subject')
        
        occupancy_map = {}
        for slot in occupied_slots:
            if slot.room:
                key = slot.room.strip().lower()
                occupancy_map[key] = f"{slot.section_subject.subject.code} ({slot.section_subject.section.name})"

        rooms = Room.objects.filter(is_active=True, is_deleted=False)
        data = []
        for room in rooms:
            current_name = room.name.strip().lower()
            occupant = occupancy_map.get(current_name)
            
            data.append({
                'id': str(room.id),
                'name': room.name,
                'capacity': room.capacity,
                'room_type': room.room_type,
                'is_available': occupant is None,
                'occupied_by': occupant
            })

        return Response(data)


# ============================================================
# EPIC 2 - Section Management
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
    """
    Full CRUD for sections.
    """
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
        
        # Filter by semester
        semester_id = self.request.query_params.get('semester')
        if semester_id:
            try:
                uuid.UUID(semester_id)
                queryset = queryset.filter(semester_id=semester_id)
            except (ValueError, TypeError):
                # If not a valid UUID (like 'undefined'), return empty or ignore
                queryset = queryset.none()
        
        # Filter by program
        program_id = self.request.query_params.get('program')
        if program_id:
            try:
                uuid.UUID(program_id)
                queryset = queryset.filter(program_id=program_id)
            except (ValueError, TypeError):
                pass

        # Filter by year level
        year_level = self.request.query_params.get('year_level')
        if year_level:
            queryset = queryset.filter(year_level=year_level)

        # Search by name
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
        
        # Use Service Logic
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


    @action(detail=True, methods=['get'], url_path='detailed-view')
    @extend_schema(summary="Get Section Detailed View", tags=["Section Management"])
    def detailed_view(self, request, pk=None):
        """Returns details of a section including semester-aware subjects and qualified professors."""
        section = self.get_object()
        from apps.academics.models import CurriculumSubject, SectionSubject, Curriculum
        
        # Get subjects that SHOULD be in this section based on curriculum
        # Fallback: if section has no curriculum, use the active one for the program
        target_curriculum = section.curriculum
        if not target_curriculum:
            target_curriculum = Curriculum.objects.filter(
                program=section.program,
                is_active=True
            ).first()

        semester = section.semester
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
        
        # Get current section subjects (already assigned)
        assigned_subjects = SectionSubject.objects.filter(
            section=section,
            is_deleted=False
        )
        
        assigned_map = {str(ss.subject.id): ss for ss in assigned_subjects}
        subject_data = []
        for cs in curriculum_subjects:
            subj = cs.subject
            assigned_ss = assigned_map.get(str(subj.id))
            
            # Get qualified professors for this subject
            qualified_professors = subj.qualified_professors.filter(
                is_active=True,
                user__is_active=True
            ).select_related('user')
            
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
            
            item = {
                'subject_id': str(subj.id),
                'code': subj.code,
                'title': subj.title,
                'units': subj.units,
                'semester_tag': f"{semester_number}{'st' if semester_number==1 else 'nd' if semester_number==2 else 'rd'} Sem",
                'is_assigned': assigned_ss is not None,
                'section_subject_id': str(assigned_ss.id) if assigned_ss else None,
                'assigned_professors': assigned_professors,
                'qualified_professors': prof_list
            }
            subject_data.append(item)
            
        return Response({
            'section': SectionSerializer(section).data,
            'subjects': subject_data,
            'semester_info': {
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

        # Find active sections
        active_names = set(Section.objects.filter(
            semester=semester,
            name__in=names,
            is_deleted=False
        ).values_list('name', flat=True))

        # Find deleted sections
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

        # Move students
        from apps.accounts.models import StudentProfile
        students = StudentProfile.objects.filter(home_section=section)
        count = students.count()
        students.update(home_section=target)
        
        # Mark dissolved
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
        
        # Unassign students
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
        
        # Auto-enroll in section subjects
        # This mirrors the "Regular Student" flow where assignment = enrollment
        from apps.enrollment.services import SubjectEnrollmentService
        service = SubjectEnrollmentService()
        
        enroll_errors = []
        for profile in profiles:
            try:
                service.enroll_student_in_section_subjects(profile.user, section)
            except Exception as e:
                enroll_errors.append(f"Student {profile.user.email}: {str(e)}")
        
        msg = f'{updated} students assigned to {section.name}.'
        if enroll_errors:
            msg += f" {len(enroll_errors)} enrollment errors."
        
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
            
            # Note: We don't automatically drop subjects as they might have been enrolled manually?
            # Requirement says "remove them from the section". 
            # Usually strict sectioning implies dropping section subjects too, but let's keep it safe.
            
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
# EPIC 2 - Section Subject Management
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
    """
    Manage subjects assigned to sections.
    """
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
        
        return queryset.select_related('section', 'subject', 'professor').prefetch_related('schedule_slots')
    
    def perform_destroy(self, instance):
        """Soft delete."""
        instance.is_deleted = True
        instance.save()


# ============================================================
# EPIC 2 - Schedule Slot Management
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
    """
    Manage schedule slots with conflict detection.
    """
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
        
        # Log override if applicable
        if hasattr(serializer.validated_data, '_override_reason'):
            AuditLog.log(
                action=AuditLog.Action.SCHEDULE_CONFLICT_OVERRIDE,
                target_model='ScheduleSlot',
                target_id=slot.id,
                payload={'reason': serializer.validated_data['_override_reason']}
            )
    
    def perform_destroy(self, instance):
        """Soft delete."""
        instance.is_deleted = True
        instance.save()


# ============================================================
# EPIC 2 - Conflict Checking Endpoints
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
        
        from datetime import time
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
        
        from datetime import time
        start = time.fromisoformat(start_time[:5])
        end = time.fromisoformat(end_time[:5])
        
        has_conflict, conflict = SchedulingService.check_room_conflict(
            room, day, start, end, semester, exclude_slot_id=exclude_slot
        )
        
        return Response({
            'has_conflict': has_conflict,
            'conflict': str(conflict) if conflict else None,
            'is_warning': True  # Room conflicts are warnings, not hard blocks
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
            
        from datetime import time
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
        from datetime import time
        
        check_type = request.query_params.get('type') # 'rooms' or 'times'
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
            
            # Optional: list of all possible rooms to check against
            # If not provided, it will use all rooms currently in DB
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
            
            # Format times for easier frontend use
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
        from apps.enrollment.models import Semester
        
        try:
            professor = User.objects.get(id=professor_id, role='PROFESSOR')
            semester = Semester.objects.get(id=semester_id)
        except (User.DoesNotExist, Semester.DoesNotExist):
            return Response(
                {'error': 'Professor or semester not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        schedule = SchedulingService.get_professor_schedule(professor, semester)
        
        # Also fetch all assigned sections (including TBA)
        from .models import SectionSubject
        from apps.enrollment.models import SubjectEnrollment
        assigned_subjects = SectionSubject.objects.filter(
            professor=professor,
            section__semester=semester,
            is_deleted=False
        ).select_related('section', 'subject').prefetch_related('schedule_slots')
        
        assigned_sections = []
        for assignment in assigned_subjects:
            # Format schedule string
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


# ============================================================
# EPIC 2 - Curriculum Version Views
# ============================================================

class CurriculumVersionDetailView(generics.RetrieveAPIView):
    """Get curriculum version details."""
    queryset = CurriculumVersion.objects.filter(is_deleted=False)
    serializer_class = CurriculumVersionSerializer
    permission_classes = [IsAuthenticated]


# ============================================================
# EPIC 7 - Curriculum Management Views
# ============================================================

@extend_schema_view(
    list=extend_schema(
        summary="List Curricula",
        description="Get all curricula with optional filtering by program",
        tags=["Curricula"]
    ),
    retrieve=extend_schema(
        summary="Get Curriculum",
        description="Get details of a specific curriculum",
        tags=["Curricula"]
    ),
    create=extend_schema(
        summary="Create Curriculum",
        description="Create a new curriculum version for a program",
        tags=["Curricula"]
    ),
    update=extend_schema(
        summary="Update Curriculum",
        description="Update curriculum details",
        tags=["Curricula"]
    ),
    partial_update=extend_schema(
        summary="Partial Update Curriculum",
        description="Partially update curriculum details",
        tags=["Curricula"]
    ),
    destroy=extend_schema(
        summary="Delete Curriculum",
        description="Soft delete a curriculum (students on it remain unaffected)",
        tags=["Curricula"]
    )
)
class CurriculumViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing curricula.

    Registrars can create, view, update, and manage curriculum versions.
    Each curriculum is a version of a program's course structure.
    """
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]

    def get_queryset(self):
        queryset = Curriculum.objects.filter(is_deleted=False).select_related('program')

        # Filter by program if specified
        program_id = self.request.query_params.get('program')
        if program_id:
            queryset = queryset.filter(program_id=program_id)

        # Filter by active status if specified
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        return queryset.order_by('-effective_year', 'code')

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return CurriculumCreateSerializer
        return CurriculumSerializer

    def perform_create(self, serializer):
        curriculum = serializer.save()

        # Log audit trail
        AuditLog.log(
            action='CREATE_CURRICULUM',
            target_model='Curriculum',
            target_id=curriculum.id,
            actor=self.request.user,
            payload={
                'curriculum_code': curriculum.code,
                'program': curriculum.program.code
            }
        )

    def perform_update(self, serializer):
        curriculum = serializer.save()

        # Log audit trail
        AuditLog.log(
            action='UPDATE_CURRICULUM',
            target_model='Curriculum',
            target_id=curriculum.id,
            actor=self.request.user,
            payload={
                'curriculum_code': curriculum.code,
                'changes': serializer.validated_data
            }
        )

    def perform_destroy(self, instance):
        # Soft delete
        instance.is_deleted = True
        instance.save()

        # Log audit trail
        AuditLog.log(
            action='DELETE_CURRICULUM',
            target_model='Curriculum',
            target_id=instance.id,
            actor=self.request.user,
            payload={
                'curriculum_code': instance.code,
                'program': instance.program.code
            }
        )

    @extend_schema(
        summary="Get Curriculum Structure",
        description="Get curriculum structure grouped by year and semester",
        tags=["Curricula"],
        responses={200: CurriculumStructureSerializer}
    )
    @action(detail=True, methods=['get'])
    def structure(self, request, pk=None):
        """
        Get curriculum structure grouped by year and semester.

        Returns:
        {
            "curriculum": {...},
            "structure": {
                "1": {
                    "1": [subjects...],
                    "2": [subjects...],
                    "3": [subjects...]
                },
                "2": {...},
                ...
            }
        }
        """
        curriculum = self.get_object()

        assignments = CurriculumSubject.objects.filter(
            curriculum=curriculum,
            is_deleted=False
        ).select_related('subject', 'semester').prefetch_related('subject__prerequisites').order_by(
            'year_level', 'semester_number', 'subject__code'
        )

        # Group by year then semester
        structure = {}
        for assignment in assignments:
            year = str(assignment.year_level)
            sem = str(assignment.semester_number)

            if year not in structure:
                structure[year] = {}
            if sem not in structure[year]:
                structure[year][sem] = []

            subject_data = {
                'id': str(assignment.subject.id),
                'code': assignment.subject.code,
                'title': assignment.subject.title,
                'units': assignment.subject.units,
                'is_required': assignment.is_required,
                'is_major': assignment.subject.is_major,
                'prerequisites': [
                    {'code': p.code, 'title': p.title}
                    for p in assignment.subject.prerequisites.all()
                ]
            }

            # Add semester binding information if available
            if assignment.semester:
                subject_data['semester_name'] = f"{assignment.semester.name} {assignment.semester.academic_year}"
                subject_data['semester_dates'] = {
                    'start_date': assignment.semester.start_date,
                    'end_date': assignment.semester.end_date,
                    'enrollment_start': assignment.semester.enrollment_start_date,
                    'enrollment_end': assignment.semester.enrollment_end_date
                }
            else:
                subject_data['semester_name'] = None
                subject_data['semester_dates'] = None

            structure[year][sem].append(subject_data)

        return Response({
            'curriculum': CurriculumSerializer(curriculum).data,
            'structure': structure
        })

    @extend_schema(
        summary="Assign Subjects to Curriculum",
        description="Bulk assign subjects to curriculum year/semester slots",
        tags=["Curricula"],
        request=AssignSubjectsSerializer,
        responses={200: {'type': 'object'}}
    )
    @action(detail=True, methods=['post'])
    def assign_subjects(self, request, pk=None):
        """
        Bulk assign subjects to curriculum year/semester slots.

        Request body:
        {
            "assignments": [
                {
                    "subject_id": "uuid",
                    "year_level": 1,
                    "semester_number": 1,
                    "is_required": true
                },
                ...
            ]
        }
        """
        curriculum = self.get_object()
        serializer = AssignSubjectsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        assignments = serializer.validated_data['assignments']
        created_count = 0
        updated_count = 0
        errors = []

        for assignment in assignments:
            try:
                subject = Subject.objects.get(
                    id=assignment['subject_id'],
                    is_deleted=False
                )

                # Check subject belongs to curriculum's program or is global
                if not subject.is_global and subject.program_id != curriculum.program.id:
                    errors.append({
                        'subject_id': str(assignment['subject_id']),
                        'error': f"Subject {subject.code} does not belong to program {curriculum.program.code}"
                    })
                    continue

                # Prepare defaults
                defaults = {
                    'year_level': assignment['year_level'],
                    'semester_number': assignment['semester_number'],
                    'is_required': assignment['is_required'],
                    'is_deleted': False
                }

                # Add semester binding if provided
                if 'semester_id' in assignment and assignment['semester_id']:
                    from apps.enrollment.models import Semester
                    try:
                        semester = Semester.objects.get(id=assignment['semester_id'], is_deleted=False)
                        defaults['semester'] = semester
                    except Semester.DoesNotExist:
                        errors.append({
                            'subject_id': str(assignment['subject_id']),
                            'error': 'Semester not found'
                        })
                        continue

                # Create or update assignment
                obj, created = CurriculumSubject.objects.update_or_create(
                    curriculum=curriculum,
                    subject=subject,
                    defaults=defaults
                )

                if created:
                    created_count += 1
                else:
                    updated_count += 1

            except Subject.DoesNotExist:
                errors.append({
                    'subject_id': str(assignment['subject_id']),
                    'error': 'Subject not found'
                })

        # Log audit trail
        AuditLog.log(
            action='ASSIGN_SUBJECTS_TO_CURRICULUM',
            target_model='Curriculum',
            target_id=curriculum.id,
            actor=request.user,
            payload={
                'curriculum_code': curriculum.code,
                'created': created_count,
                'updated': updated_count,
                'errors_count': len(errors)
            }
        )

        return Response({
            'success': True,
            'created': created_count,
            'updated': updated_count,
            'errors': errors
        })

    @extend_schema(
        summary="Remove Subject from Curriculum",
        description="Remove a subject assignment from curriculum",
        tags=["Curricula"]
    )
    @action(detail=True, methods=['delete'], url_path='subjects/(?P<subject_id>[^/.]+)')
    def remove_subject(self, request, pk=None, subject_id=None):
        """Remove a subject from curriculum."""
        curriculum = self.get_object()

        try:
            assignment = CurriculumSubject.objects.get(
                curriculum=curriculum,
                subject_id=subject_id,
                is_deleted=False
            )

            # Soft delete
            assignment.is_deleted = True
            assignment.save()

            # Log audit trail
            AuditLog.log(
                action='REMOVE_SUBJECT_FROM_CURRICULUM',
                target_model='Curriculum',
                target_id=curriculum.id,
                actor=request.user,
                payload={
                    'curriculum_code': curriculum.code,
                    'subject_code': assignment.subject.code
                }
            )

            return Response({
                'success': True,
                'message': f'Subject {assignment.subject.code} removed from curriculum'
            })

        except CurriculumSubject.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Subject not found in curriculum'
            }, status=status.HTTP_404_NOT_FOUND)

    @extend_schema(
        summary="Validate Curriculum",
        description="Validate curriculum completeness and get statistics",
        tags=["Curricula"]
    )
    @action(detail=True, methods=['get'])
    def validate(self, request, pk=None):
        """Validate curriculum completeness and structure."""
        curriculum = self.get_object()

        is_valid, errors = CurriculumService.validate_curriculum_completeness(curriculum)
        stats = CurriculumService.get_curriculum_statistics(curriculum)

        return Response({
            'is_valid': is_valid,
            'errors': errors,
            'statistics': stats
        })


# ============================================================
# Professor Management Views
# ============================================================

@extend_schema_view(
    list=extend_schema(summary="List Professors", tags=["Professor Management"]),
    retrieve=extend_schema(summary="Get Professor Details", tags=["Professor Management"]),
)
class ProfessorViewSet(viewsets.ModelViewSet):
    """ViewSet for professor management."""
    permission_classes = [IsRegistrarOrAdmin]

    def get_queryset(self):
        from apps.accounts.models import User
        from django.db.models import Q
        
        queryset = User.objects.filter(role='PROFESSOR', is_active=True)
        search = self.request.query_params.get('search')
        
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search) |
                Q(professor_profile__specialization__icontains=search) |
                Q(professor_profile__assigned_subjects__code__icontains=search) |
                Q(professor_profile__assigned_subjects__title__icontains=search)
            ).distinct()
            
        return queryset.order_by('last_name', 'first_name')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProfessorDetailSerializer
        return ProfessorSerializer

    @action(detail=False, methods=['get'], url_path='check-duplicate')
    def check_duplicate(self, request):
        """Check if a professor with the given name already exists."""
        first_name = request.query_params.get('first_name', '').strip()
        last_name = request.query_params.get('last_name', '').strip()
        
        email = request.query_params.get('email', '').strip()

        from apps.accounts.models import User

        if email:
            exists = User.objects.filter(email__iexact=email).exists()
            return Response({'duplicate': exists, 'type': 'email'})

        if not first_name or not last_name:
            return Response({'error': 'First name and last name, or email are required'}, status=status.HTTP_400_BAD_REQUEST)
            
        exists = User.objects.filter(
            role='PROFESSOR',
            first_name__iexact=first_name,
            last_name__iexact=last_name
        ).exists()
        
        return Response({'duplicate': exists, 'type': 'name'})

    @action(detail=True, methods=['get'], url_path='workload')
    def workload(self, request, pk=None):
        """Get professor workload analytics for a semester."""
        professor = self.get_object()
        from apps.enrollment.models import Semester

        semester_id = request.query_params.get('semester')
        semester = (Semester.objects.get(id=semester_id) if semester_id
                   else Semester.objects.filter(is_current=True).first())

        if not semester:
            return Response({'error': 'No active semester'}, status=status.HTTP_400_BAD_REQUEST)

        workload = ProfessorService.get_workload(professor, semester)

        return Response({
            'professor_id': str(professor.id),
            'professor_name': professor.get_full_name(),
            'semester_id': str(semester.id),
            'semester_name': str(semester),
            **workload
        })


# ============================================================
# ARCHIVE VIEWS
# ============================================================

@extend_schema_view(
    list=extend_schema(
        summary="List Archived Items",
        description="Search and filter soft-deleted items (programs, subjects, sections, curricula)",
        tags=["Archives"],
        parameters=[
            OpenApiParameter(name='type', description='Type of archive (programs, subjects, sections, curricula)', required=True, type=str),
            OpenApiParameter(name='search', description='Search term', required=False, type=str),
        ]
    )
)
class ArchiveViewSet(viewsets.ViewSet):
    """
    Viewset for viewing soft-deleted items.
    Read-only, no restore action via this endpoint (restore is usually done via specific item restore endpoints if allowed).
    """
    permission_classes = [IsRegistrarOrAdmin]

    def list(self, request):
        archive_type = request.query_params.get('type')
        search = request.query_params.get('search', '').lower()
        
        results = []

        if archive_type == 'programs':
            qs = Program.objects.filter(is_deleted=True)
            if search:
                qs = qs.filter(Q(name__icontains=search) | Q(code__icontains=search))
            results = [{
                'id': str(obj.id),
                'title': f"{obj.code} - {obj.name}",
                'type': 'Program',
                'deleted_at': obj.updated_at,
                'description': obj.description or 'No description',
                'meta': {'code': obj.code}
            } for obj in qs]

        elif archive_type == 'subjects':
            qs = Subject.objects.filter(is_deleted=True)
            if search:
                qs = qs.filter(Q(title__icontains=search) | Q(code__icontains=search))
            results = [{
                'id': str(obj.id),
                'title': f"{obj.code} - {obj.title}",
                'type': 'Subject',
                'deleted_at': obj.updated_at,
                'description': f"{obj.units} Units",
                'meta': {'code': obj.code}
            } for obj in qs]

        elif archive_type == 'sections':
            qs = Section.objects.filter(is_deleted=True)
            if search:
                qs = qs.filter(name__icontains=search)
            results = [{
                'id': str(obj.id),
                'title': obj.name,
                'type': 'Section',
                'deleted_at': obj.updated_at,
                'description': f"Year {obj.year_level}, {obj.capacity} Students",
                'meta': {'program': str(obj.program_id)}
            } for obj in qs]

        elif archive_type == 'curricula':
            qs = Curriculum.objects.filter(is_deleted=True)
            if search:
                qs = qs.filter(program__code__icontains=search)
            results = [{
                'id': str(obj.id),
                'title': f"Curriculum for {obj.program.code}",
                'type': 'Curriculum',
                'deleted_at': obj.updated_at,
                'description': f"Effective {obj.effective_year}",
                'meta': {'version': obj.version}
            } for obj in qs]

        elif archive_type == 'professors':
            from apps.accounts.models import User
            # Treat inactive professors as "archived"
            qs = User.objects.filter(role='PROFESSOR', is_active=False)
            if search:
                qs = qs.filter(
                    Q(first_name__icontains=search) | 
                    Q(last_name__icontains=search) | 
                    Q(email__icontains=search)
                )
            results = [{
                'id': str(obj.id),
                'title': obj.get_full_name(),
                'type': 'Professor',
                'deleted_at': obj.updated_at,
                'description': obj.email,
                'meta': {'role': obj.role}
            } for obj in qs]
            
        else:
            return Response({'error': 'Invalid type. Choose programs, subjects, sections, curricula, or professors'}, status=400)

        # Sort by deleted_at desc
        results.sort(key=lambda x: x['deleted_at'], reverse=True)
        
        return Response(results)
