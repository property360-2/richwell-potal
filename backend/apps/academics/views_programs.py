"""
Program, Subject, and Room views — public listing + registrar/admin CRUD.
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

from .models import Room, Program, Subject, CurriculumVersion
from .serializers import (
    ProgramSerializer, ProgramCreateSerializer, ProgramWithSubjectsSerializer,
    SubjectSerializer, SubjectCreateSerializer, PrerequisiteSerializer,
    CurriculumVersionSerializer, CurriculumVersionCreateSerializer,
    RoomSerializer
)
from .services import CurriculumService, SchedulingService


# ============================================================
# Public Views
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
# Program CRUD (Registrar/Admin)
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
    
    def perform_create(self, serializer):
        program = serializer.save()
        AuditLog.log(
            action=AuditLog.Action.PROGRAM_CREATED,
            target_model='Program',
            target_id=program.id,
            payload={'code': program.code, 'name': program.name}
        )

    def perform_update(self, serializer):
        program = serializer.save()
        AuditLog.log(
            action=AuditLog.Action.PROGRAM_UPDATED,
            target_model='Program',
            target_id=program.id,
            payload={'code': program.code, 'changes': serializer.validated_data}
        )

    def perform_destroy(self, instance):
        """Soft delete."""
        instance.is_deleted = True
        instance.is_active = False
        instance.save()
        AuditLog.log(
            action=AuditLog.Action.PROGRAM_DELETED,
            target_model='Program',
            target_id=instance.id,
            payload={'code': instance.code, 'name': instance.name}
        )

    @action(detail=False, methods=['get'], url_path='check-duplicate')
    def check_duplicate(self, request):
        """Check if a program with the given code already exists (including deleted)."""
        code = request.query_params.get('code', '').strip().upper()
        
        if not code:
            return Response({'error': 'Code is required'}, status=status.HTTP_400_BAD_REQUEST)
            
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
# Subject CRUD (Registrar/Admin)
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
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['code', 'title', 'units', 'created_at']
    ordering = ['code']
    
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
        is_global = self.request.query_params.get('is_global')
        is_major = self.request.query_params.get('is_major')
        units = self.request.query_params.get('units')

        if program_id:
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

        if is_global is not None:
            queryset = queryset.filter(is_global=is_global.lower() == 'true')

        if is_major is not None:
            queryset = queryset.filter(is_major=is_major.lower() == 'true')

        if units:
            queryset = queryset.filter(units=units)

        return queryset.select_related('program').prefetch_related('programs', 'prerequisites')
    
    def perform_create(self, serializer):
        subject = serializer.save()
        AuditLog.log(
            action=AuditLog.Action.SUBJECT_CREATED,
            target_model='Subject',
            target_id=subject.id,
            payload={'code': subject.code, 'title': subject.title}
        )

    def perform_update(self, serializer):
        subject = serializer.save()
        AuditLog.log(
            action=AuditLog.Action.SUBJECT_UPDATED,
            target_model='Subject',
            target_id=subject.id,
            payload={'code': subject.code, 'changes': serializer.validated_data}
        )

    def perform_destroy(self, instance):
        """Soft delete."""
        instance.is_deleted = True
        instance.save()
        AuditLog.log(
            action=AuditLog.Action.SUBJECT_DELETED,
            target_model='Subject',
            target_id=instance.id,
            payload={'code': instance.code, 'title': instance.title}
        )
    
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


# ============================================================
# Room CRUD
# ============================================================

class RoomViewSet(viewsets.ModelViewSet):
    """CRUD for rooms."""
    queryset = Room.objects.filter(is_active=True)
    serializer_class = RoomSerializer
    permission_classes = [IsRegistrarOrAdmin]

    def perform_create(self, serializer):
        room = serializer.save()
        AuditLog.log(
            action=AuditLog.Action.RECORD_CREATED,
            target_model='Room',
            target_id=room.id,
            payload={'name': room.name, 'type': room.room_type}
        )

    def perform_update(self, serializer):
        room = serializer.save()
        AuditLog.log(
            action=AuditLog.Action.RECORD_UPDATED,
            target_model='Room',
            target_id=room.id,
            payload={'name': room.name, 'changes': serializer.validated_data}
        )

    def perform_destroy(self, instance):
        """Soft delete."""
        instance.is_deleted = True
        instance.save()
        AuditLog.log(
            action=AuditLog.Action.RECORD_DELETED,
            target_model='Room',
            target_id=instance.id,
            payload={'name': instance.name}
        )

    def get_queryset(self):
        queryset = Room.objects.all()
        
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(name__icontains=search)
            
        room_type = self.request.query_params.get('room_type')
        if room_type:
            queryset = queryset.filter(room_type=room_type)
            
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
            
        return queryset.order_by('name')

    @action(detail=True, methods=['get'])
    def schedule(self, request, pk=None):
        """Returns the weekly schedule for a specific room."""
        from apps.enrollment.models import Semester
        from .services import SchedulingService
        
        room = self.get_object()
        semester = Semester.objects.filter(is_current=True).first()
        
        if not semester:
            return Response([])
            
        schedule = SchedulingService.get_room_schedule(room.name, semester)
        return Response(schedule)

    @action(detail=False, methods=['get'])
    def availability(self, request):
        """Check availability of all rooms for a specific time and day."""
        from datetime import time
        from .models import ScheduleSlot
        
        day = request.query_params.get('day')
        start_time_str = request.query_params.get('start_time')
        end_time_str = request.query_params.get('end_time')
        semester_id = request.query_params.get('semester_id')

        if not all([day, start_time_str, end_time_str, semester_id]):
            return Response({'error': 'Missing parameters'}, status=400)

        try:
            if len(start_time_str) > 5: start_time_str = start_time_str[:5]
            if len(end_time_str) > 5: end_time_str = end_time_str[:5]
            
            start = time.fromisoformat(start_time_str)
            end = time.fromisoformat(end_time_str)
        except ValueError:
            return Response({'error': 'Invalid time format. Use HH:MM'}, status=400)

        occupied_slots = ScheduleSlot.objects.filter(
            section_subject__section__semester_id=semester_id,
            day=day,
            is_deleted=False,
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
