"""
Academics views - Program and Subject endpoints.
"""

from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from drf_spectacular.utils import extend_schema, extend_schema_view

from .models import Program, Subject
from .serializers import ProgramSerializer, SubjectSerializer


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
