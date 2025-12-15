"""
Academics views - Program, Subject, Section, and Scheduling endpoints.
EPIC 2: Curriculum, Subjects & Section Scheduling
"""

from rest_framework import generics, viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import action
from drf_spectacular.utils import extend_schema, extend_schema_view

from apps.core.permissions import IsRegistrar, IsAdmin, IsRegistrarOrAdmin
from apps.audit.models import AuditLog

from .models import Program, Subject, Section, SectionSubject, ScheduleSlot, CurriculumVersion
from .serializers import (
    ProgramSerializer, ProgramCreateSerializer, ProgramWithSubjectsSerializer,
    SubjectSerializer, SubjectCreateSerializer, PrerequisiteSerializer,
    SectionSerializer, SectionCreateSerializer,
    SectionSubjectSerializer, SectionSubjectCreateSerializer,
    ScheduleSlotSerializer, ScheduleSlotCreateSerializer,
    CurriculumVersionSerializer, CurriculumVersionCreateSerializer
)
from .services import CurriculumService, SchedulingService


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
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return SubjectCreateSerializer
        return SubjectSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        program_id = self.request.query_params.get('program')
        if program_id:
            queryset = queryset.filter(program_id=program_id)
        return queryset.select_related('program').prefetch_related('prerequisites')
    
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
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return SectionCreateSerializer
        return SectionSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by semester
        semester_id = self.request.query_params.get('semester')
        if semester_id:
            queryset = queryset.filter(semester_id=semester_id)
        
        # Filter by program
        program_id = self.request.query_params.get('program')
        if program_id:
            queryset = queryset.filter(program_id=program_id)
        
        return queryset.select_related('program', 'semester').prefetch_related(
            'section_subjects__subject',
            'section_subjects__professor',
            'section_subjects__schedule_slots'
        )
    
    def perform_create(self, serializer):
        section = serializer.save()
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
        if self.action == 'create':
            return ScheduleSlotCreateSerializer
        return ScheduleSlotSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        section_subject_id = self.request.query_params.get('section_subject')
        if section_subject_id:
            queryset = queryset.filter(section_subject_id=section_subject_id)
        
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
        start = time.fromisoformat(start_time)
        end = time.fromisoformat(end_time)
        
        has_conflict, conflict = SchedulingService.check_professor_conflict(
            professor, day, start, end, semester
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
        start = time.fromisoformat(start_time)
        end = time.fromisoformat(end_time)
        
        has_conflict, conflict = SchedulingService.check_room_conflict(
            room, day, start, end, semester
        )
        
        return Response({
            'has_conflict': has_conflict,
            'conflict': str(conflict) if conflict else None,
            'is_warning': True  # Room conflicts are warnings, not hard blocks
        })


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
        
        return Response({
            'professor': professor.get_full_name(),
            'semester': str(semester),
            'schedule': schedule
        })


# ============================================================
# EPIC 2 - Curriculum Version Views
# ============================================================

class CurriculumVersionDetailView(generics.RetrieveAPIView):
    """Get curriculum version details."""
    queryset = CurriculumVersion.objects.filter(is_deleted=False)
    serializer_class = CurriculumVersionSerializer
    permission_classes = [IsAuthenticated]

