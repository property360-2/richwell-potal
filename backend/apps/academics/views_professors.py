"""
Professor and Archive views — professor management, workload, and soft-deleted item browsing.
"""

from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from apps.core.permissions import IsRegistrarOrAdmin

from .models import Program, Subject, Section, Curriculum
from .serializers import ProfessorSerializer, ProfessorDetailSerializer
from .services import ProfessorService


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
# Archive Views
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
    Read-only, no restore action via this endpoint.
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

        results.sort(key=lambda x: x['deleted_at'], reverse=True)
        
        return Response(results)
