"""
Richwell Portal — Academics Views

This module provides API endpoints for managing academic entities like 
Programs, Curriculums, and Subjects using Django Rest Framework.
It delegates complex business logic to the services module.
"""

import json
from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticatedOrReadOnly

from .models import Program, CurriculumVersion, Subject, SubjectPrerequisite
from .serializers import (
    ProgramSerializer, 
    CurriculumVersionSerializer, 
    SubjectSerializer,
    SubjectPrerequisiteSerializer
)
from .services import process_bulk_subjects_csv

class ProgramViewSet(viewsets.ModelViewSet):
    """
    Handles standard CRUD operations for Program instances.
    """
    queryset = Program.objects.all()
    serializer_class = ProgramSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        """
        Retrieves the list of active programs.
        @returns {Response}
        """
        queryset = super().get_queryset()
        is_active = self.request.query_params.get('is_active')
        if is_active:
            queryset = queryset.filter(is_active=(is_active.lower() == 'true'))
        return queryset

class CurriculumVersionViewSet(viewsets.ModelViewSet):
    """
    Handles CRUD for specific versions of a Program's curriculum.
    """
    queryset = CurriculumVersion.objects.all()
    serializer_class = CurriculumVersionSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        """
        Filters configurations based on program and active status.
        @returns {Response}
        """
        queryset = super().get_queryset()
        program_id = self.request.query_params.get('program')
        is_active = self.request.query_params.get('is_active')
        
        if program_id:
            queryset = queryset.filter(program_id=program_id)
        if is_active:
            queryset = queryset.filter(is_active=(is_active.lower() == 'true'))
        return queryset

class SubjectViewSet(viewsets.ModelViewSet):
    """
    Core ViewSet for Subject management, including a custom bulk_upload action.
    """
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        """
        Filters subjects by curriculum, year level, and semester.
        @returns {Response}
        """
        queryset = super().get_queryset()
        curr_id = self.request.query_params.get('curriculum')
        year_level = self.request.query_params.get('year_level')
        semester = self.request.query_params.get('semester')
        
        if curr_id:
            queryset = queryset.filter(curriculum_id=curr_id)
        if year_level:
            queryset = queryset.filter(year_level=year_level)
        if semester:
            queryset = queryset.filter(semester=semester)
            
        return queryset.order_by('year_level', 'semester', 'code')

    @action(detail=False, methods=['POST'], url_path='bulk-upload')
    def bulk_upload(self, request):
        """
        Custom endpoint for bulk processing subjects from a CSV file.
        Uses atomic transactions for data integrity.
        
        @param {Request} request - DRF request containing the uploaded 'file'.
        @returns {Response} - Summary of the bulk operations or error report.
        """
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response(
                {"error": "No file uploaded"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            with transaction.atomic():
                # Extract audit context
                audit_user = request.user if request.user.is_authenticated else None
                audit_ip = request.META.get('REMOTE_ADDR')
                
                result = process_bulk_subjects_csv(
                    file_obj, 
                    audit_user=audit_user, 
                    audit_ip=audit_ip
                )
                
            return Response({
                "message": "Bulk upload completed successfully",
                "counts": {
                    "programs": result['programs_created'],
                    "curriculums": result['curriculums_created'],
                    "subjects": result['subjects_processed'],
                },
                "errors": result['errors']
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {"error": f"Internal critical failure: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['GET'], url_path='locations', permission_classes=[AllowAny])
    def locations(self, request):
        """
        Returns a static mapping of school locations for the frontend.
        @returns {Response}
        """
        data = {
            "BALAGTAS": ["Balagtas A", "Balagtas B", "Balagtas C"],
            "BOCAUE": ["Bocaue A", "Bocaue B", "Bocaue C"],
            "PANDI": ["Pandi A", "Pandi B", "Pandi C"],
            "PLACIDEL": ["Plaridel A", "Plaridel B", "Plaridel C"]
        }
        return Response(data)

class SubjectPrerequisiteViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Subject Prerequisites.
    Handles listing and retrieving prerequisites for specific subjects.
    """
    queryset = SubjectPrerequisite.objects.all()
    serializer_class = SubjectPrerequisiteSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        """
        Filters prerequisites by a specific subject.
        @returns {Response}
        """
        queryset = super().get_queryset()
        subject_id = self.request.query_params.get('subject')
        
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)
            
        return queryset
