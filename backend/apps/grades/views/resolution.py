"""
Richwell Portal — Grade Resolution ViewSets

This module manages the workflow for resolving Incomplete (INC) grades. 
It supports a multi-step approval process involving Professors, 
Program Heads, and the Registrar.
"""

from rest_framework import viewsets, status, exceptions as drf_exceptions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core import exceptions as django_exceptions

from apps.auditing.mixins import AuditMixin
from core.utils import map_django_error
from core.permissions import IsProfessor, IsRegistrar, IsProgramHead, IsAdmin, IsProgramHeadOfStudent
from apps.grades.models import Grade
from apps.grades.serializers import GradeSerializer
from apps.grades.services.resolution_service import ResolutionService

class ResolutionViewSet(AuditMixin, viewsets.GenericViewSet):
    """
    Workflow ViewSet for resolving INC (Incomplete) grades.
    Handles a multi-step workflow from request to final Registrar finalization.
    """
    queryset = Grade.objects.all()
    serializer_class = GradeSerializer
    permission_classes = [IsProfessor | IsRegistrar | IsProgramHead | IsAdmin]
    service = ResolutionService()

    @action(detail=True, methods=['post'], url_path='request-resolution')
    def request_resolution(self, request, pk=None):
        """
        Initiates a resolution request for an INC grade.
        """
        obj = self.get_object()
        try:
            grade = self.service.request_resolution(obj.id, request.user, request.data.get('reason'))
            self.audit_action(
                request,
                action="GRADE_RESOLUTION_REQUEST",
                resource=f"Grade:{grade.id}",
                description=f"Requested resolution for INC grade in {grade.subject.code}.",
                metadata={"reason": request.data.get('reason')}
            )
            return Response(GradeSerializer(grade).data)
        except (django_exceptions.ValidationError, ValueError) as e:
            raise map_django_error(e)

    @action(detail=True, methods=['post'], url_path='registrar-approve')
    def registrar_approve(self, request, pk=None):
        """
        Approves the resolution request from the Registrar's side.
        """
        obj = self.get_object()
        try:
            grade = self.service.registrar_approve_request(obj.id, request.user)
            self.audit_action(
                request,
                action="GRADE_RESOLUTION_REGISTRAR_APPROVE",
                resource=f"Grade:{grade.id}",
                description=f"Registrar approved resolution request for {grade.subject.code}."
            )
            return Response(GradeSerializer(grade).data)
        except (django_exceptions.ValidationError, ValueError) as e:
            raise map_django_error(e)

    @action(detail=True, methods=['post'], url_path='registrar-reject')
    def registrar_reject(self, request, pk=None):
        """
        Rejects the resolution request from the Registrar's side.
        """
        reason = request.data.get('reason')
        if not reason: raise drf_exceptions.ValidationError({"reason": "A reason for rejection is required."})
        obj = self.get_object()
        try:
            grade = self.service.registrar_reject_request(obj.id, request.user, reason)
            self.audit_action(
                request,
                action="GRADE_RESOLUTION_REGISTRAR_REJECT",
                resource=f"Grade:{grade.id}",
                description=f"Registrar rejected resolution request for {grade.subject.code}.",
                metadata={"reason": reason}
            )
            return Response(GradeSerializer(grade).data)
        except (django_exceptions.ValidationError, ValueError) as e:
            raise map_django_error(e)

    @action(detail=True, methods=['post'], url_path='submit-grade')
    def submit_grade(self, request, pk=None):
        """
        Allows the professor to submit the alternative grade for the INC resolution.
        """
        obj = self.get_object()
        try:
            grade = self.service.submit_resolved_grade(obj.id, request.user, request.data.get('new_grade'))
            self.audit_action(
                request,
                action="GRADE_RESOLUTION_SUBMIT",
                resource=f"Grade:{grade.id}",
                description=f"Professor submitted resolved grade {request.data.get('new_grade')} for {grade.subject.code}."
            )
            return Response(GradeSerializer(grade).data)
        except (django_exceptions.ValidationError, ValueError) as e:
            raise map_django_error(e)

    @action(detail=True, methods=['post'], url_path='head-approve', permission_classes=[IsProgramHeadOfStudent | IsAdmin])
    def head_approve(self, request, pk=None):
        """
        Approves the resolution from the Program Head's side.
        """
        obj = self.get_object()
        try:
            grade = self.service.head_approve_resolution(obj.id, request.user)
            self.audit_action(
                request,
                action="GRADE_RESOLUTION_HEAD_APPROVE",
                resource=f"Grade:{grade.id}",
                description=f"Program Head approved resolved grade for {grade.subject.code}."
            )
            return Response(GradeSerializer(grade).data)
        except (django_exceptions.ValidationError, ValueError) as e:
            raise map_django_error(e)

    @action(detail=True, methods=['post'], url_path='head-reject', permission_classes=[IsProgramHeadOfStudent | IsAdmin])
    def head_reject(self, request, pk=None):
        """
        Rejects the resolution from the Program Head's side.
        """
        reason = request.data.get('reason')
        if not reason: raise drf_exceptions.ValidationError({"reason": "A reason for rejection is required."})
        obj = self.get_object()
        try:
            grade = self.service.head_reject_resolution(obj.id, request.user, reason)
            self.audit_action(
                request,
                action="GRADE_RESOLUTION_HEAD_REJECT",
                resource=f"Grade:{grade.id}",
                description=f"Program Head rejected resolved grade for {grade.subject.code}.",
                metadata={"reason": reason}
            )
            return Response(GradeSerializer(grade).data)
        except (django_exceptions.ValidationError, ValueError) as e:
            raise map_django_error(e)

    @action(detail=True, methods=['post'], url_path='registrar-finalize')
    def registrar_finalize(self, request, pk=None):
        """
        Final step in the resolution workflow: official update of the record.
        """
        obj = self.get_object()
        try:
            grade = self.service.registrar_finalize_resolution(obj.id, request.user)
            self.audit_action(
                request,
                action="GRADE_RESOLUTION_FINALIZE",
                resource=f"Grade:{grade.id}",
                description=f"Registrar finalized resolved grade for {grade.subject.code}."
            )
            return Response(GradeSerializer(grade).data)
        except (django_exceptions.ValidationError, ValueError) as e:
            raise map_django_error(e)
