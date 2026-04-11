"""
Richwell Portal — Crediting ViewSets

This module handles subject crediting, including bulk crediting requests 
from students/registrars and manual encoding of external or historical subjects.
"""

from rest_framework import viewsets, status, exceptions as drf_exceptions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core import exceptions as django_exceptions

from core.utils import map_django_error
from apps.auditing.mixins import AuditMixin
from core.permissions import IsRegistrar, IsAdmin, IsProgramHead, IsProgramHeadOfStudent
from apps.grades.models import CreditingRequest, Grade
from apps.grades.serializers import (
    CreditingRequestSerializer, BulkCreditingSubmitSerializer, GradeSerializer
)
from apps.grades.services.advising_service import AdvisingService
from apps.students.models import Student
from apps.academics.models import Subject
from apps.terms.models import Term

class CreditingRequestViewSet(AuditMixin, viewsets.ModelViewSet):
    """
    Manages the lifecycle of bulk crediting requests.
    - Registrar: Create, List, Retrieve
    - Program Head: List, Retrieve, Approve, Reject
    """
    queryset = CreditingRequest.objects.all().select_related(
        'student', 'term', 'requested_by', 'reviewed_by'
    ).prefetch_related('items__subject')
    serializer_class = CreditingRequestSerializer
    permission_classes = [IsRegistrar | IsProgramHead | IsAdmin]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        
        status_filter = self.request.query_params.get('status')
        if status_filter: qs = qs.filter(status=status_filter)
            
        student_id = self.request.query_params.get('student_id')
        if student_id: qs = qs.filter(student_id=student_id)
            
        if user.role == 'PROGRAM_HEAD':
            return qs.filter(student__program__program_head=user)
        return qs

    @action(detail=False, methods=['post'], permission_classes=[IsRegistrar | IsAdmin])
    def submit_bulk(self, request):
        """
        Submits a bulk crediting request for a student.
        """
        serializer = BulkCreditingSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        student_id = request.data.get('student_id')
        term_id = serializer.validated_data.get('term_id')
        items = serializer.validated_data['items']
        
        student = Student.objects.get(id=student_id)
        term = Term.objects.get(id=term_id) if term_id else Term.objects.get(is_active=True)
        
        try:
            crediting_request = AdvisingService.submit_bulk_crediting_request(
                student=student, 
                term=term, 
                user=request.user, 
                items_data=items
            )
            return Response(CreditingRequestSerializer(crediting_request).data, status=status.HTTP_201_CREATED)
        except django_exceptions.ValidationError as e:
            raise map_django_error(e)

    @action(detail=True, methods=['post'], permission_classes=[IsProgramHeadOfStudent])
    def approve(self, request, pk=None):
        """
        Approves a crediting request.
        """
        comment = request.data.get('comment', "")
        try:
            crediting_request = AdvisingService.approve_crediting_request(
                request_id=pk, 
                user=request.user, 
                comment=comment
            )
            self.audit_action(
                request,
                action="CREDITING_APPROVE",
                resource=f"CreditingRequest:{crediting_request.id}",
                description=f"Approved crediting for student {crediting_request.student.idn}",
                metadata={"student_id": crediting_request.student.id, "comment": comment}
            )
            return Response(CreditingRequestSerializer(crediting_request).data)
        except django_exceptions.ValidationError as e:
            raise map_django_error(e)

    @action(detail=True, methods=['post'], permission_classes=[IsProgramHeadOfStudent])
    def reject(self, request, pk=None):
        """
        Rejects a crediting request.
        """
        reason = request.data.get('reason')
        if not reason: raise drf_exceptions.ValidationError({"reason": "A reason for rejection is required."})
        try:
            crediting_request = AdvisingService.reject_crediting_request(
                request_id=pk, 
                user=request.user, 
                reason=reason
            )
            self.audit_action(
                request,
                action="CREDITING_REJECT",
                resource=f"CreditingRequest:{crediting_request.id}",
                description=f"Rejected crediting for student {crediting_request.student.idn}",
                metadata={"student_id": crediting_request.student.id, "reason": reason}
            )
            return Response(CreditingRequestSerializer(crediting_request).data)
        except django_exceptions.ValidationError as e:
            raise map_django_error(e)

class SubjectCreditingViewSet(AuditMixin, viewsets.ViewSet):
    """
    Helper ViewSet for Registrar to credit subjects manually.
    Handles crediting of external subjects and historical encoding for TOR.
    """
    permission_classes = [IsRegistrar | IsAdmin]

    @action(detail=False, methods=['post'])
    def credit(self, request):
        """
        Manually credits a single subject for a student.
        """
        student = Student.objects.get(pk=request.data.get('student_id'))
        subject = Subject.objects.get(pk=request.data.get('subject_id'))
        active_term = Term.objects.get(is_active=True)
        try:
            grade = AdvisingService.credit_subject(
                student, subject, active_term, request.user, request.data.get('final_grade')
            )
            self.audit_action(
                request,
                action="CREDITING_MANUAL",
                resource=f"Grade:{grade.id}",
                description=f"Manually credited {subject.code} for student {student.idn}.",
                metadata={"final_grade": request.data.get('final_grade')}
            )
            return Response(GradeSerializer(grade).data, status=status.HTTP_201_CREATED)
        except (django_exceptions.ValidationError, ValueError) as e:
            raise map_django_error(e)

    @action(detail=False, methods=['post'], url_path='bulk-historical-encode')
    def bulk_historical_encode(self, request):
        """
        Encodes multiple historical subjects for a student in one operation.
        """
        student, active_term = Student.objects.get(pk=request.data.get('student_id')), Term.objects.get(is_active=True)
        try:
            AdvisingService.bulk_historical_encoding(
                student, active_term, request.data.get('credit_data', []), request.user
            )
            self.audit_action(
                request,
                action="CREDITING_BULK_HISTORICAL",
                resource=f"Student:{student.id}",
                description=f"Bulk encoded historical grades for student {student.idn}."
            )
            return Response({"message": "Encoded successfully"}, status=status.HTTP_201_CREATED)
        except (django_exceptions.ValidationError, ValueError) as e:
            raise map_django_error(e)
