"""
Richwell Portal — Grading ViewSets

This module manages the submission and finalization of student grades 
 by professors and administrative staff. It includes midterm and final 
 grade handling and class roster management.
"""

from rest_framework import viewsets, status, exceptions as drf_exceptions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.core import exceptions as django_exceptions

from apps.auditing.mixins import AuditMixin
from core.utils import map_django_error

from core.permissions import IsProfessor, IsRegistrar, IsAdmin
from apps.grades.models import Grade
from apps.grades.serializers import GradeSerializer
from apps.grades.services.grading_service import GradingService
from apps.terms.models import Term
from apps.academics.models import Subject

class GradeSubmissionViewSet(AuditMixin, viewsets.GenericViewSet):
    """
    ViewSet for Professor grade submissions.
    Handles midterm/final grade submission and section-wide finalization.
    """
    queryset = Grade.objects.all()
    serializer_class = GradeSerializer
    permission_classes = [IsProfessor | IsRegistrar | IsAdmin]
    service = GradingService()

    @action(detail=True, methods=['post'], url_path='submit-midterm')
    def submit_midterm(self, request, pk=None):
        """
        Processes the submission of a midterm grade.
        """
        try:
            updated = self.service.submit_midterm(
                pk, request.data.get('value'), request.user, 
                is_inc=request.data.get('is_inc', False)
            )
            self.audit_action(
                request,
                action="GRADE_SUBMIT_MIDTERM",
                resource=f"Grade:{updated.id}",
                description=f"Professor submitted midterm grade for {updated.subject.code}.",
                metadata={"value": request.data.get('value')}
            )
            return Response(GradeSerializer(updated).data)
        except (django_exceptions.ValidationError, ValueError) as e:
            raise map_django_error(e)

    @action(detail=True, methods=['post'], url_path='submit-final')
    def submit_final(self, request, pk=None):
        """
        Processes the final grade submission.
        """
        try:
            updated = self.service.submit_final(pk, request.data.get('value'), request.user)
            self.audit_action(
                request,
                action="GRADE_SUBMIT_FINAL",
                resource=f"Grade:{updated.id}",
                description=f"Professor submitted final grade for {updated.subject.code}.",
                metadata={"value": request.data.get('value')}
            )
            return Response(GradeSerializer(updated).data)
        except (django_exceptions.ValidationError, ValueError) as e:
            raise map_django_error(e)

    @action(detail=False, methods=['get'])
    def roster(self, request):
        """
        Returns the class roster for a specific section and subject.
        """
        section_id = request.query_params.get('section_id')
        subject_id = request.query_params.get('subject_id')
        search_term = request.query_params.get('search')

        queryset = Grade.objects.filter(
            section_id=section_id, 
            subject_id=subject_id
        ).select_related('student__user').order_by('student__user__last_name')

        if search_term:
            queryset = queryset.filter(
                Q(student__user__first_name__icontains=search_term) |
                Q(student__user__last_name__icontains=search_term) |
                Q(student__idn__icontains=search_term)
            )

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = GradeSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = GradeSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='finalize-section')
    def finalize_section(self, request):
        """
        Finalizes all grades for a specific class section, locking them.
        """
        from apps.sections.models import Section
        term = Term.objects.get(pk=request.data.get('term_id'))
        subject = Subject.objects.get(pk=request.data.get('subject_id'))
        section = Section.objects.get(pk=request.data.get('section_id'))
        
        try:
            self.service.finalize_section_grades(term, subject, section, request.user)
            self.audit_action(
                request,
                action="GRADE_FINALIZE_SECTION",
                resource=f"Section:{section.id}",
                description=f"Finalized grades for {subject.code} in {section.name}."
            )
            return Response({"status": "Finalized"})
        except (django_exceptions.ValidationError, ValueError) as e:
            raise map_django_error(e)
