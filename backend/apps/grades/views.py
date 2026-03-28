"""
Richwell Portal — Grades & Advising Views

This module manages student academic performance via class rosters, 
grade submissions, and INC resolution workflows. It also handles 
the advising and crediting process for new and irregular students.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.db.models import Count, Q, F, Exists, OuterRef
import django_filters

from core.permissions import IsStudent, IsProgramHead, IsRegistrar, IsAdmin, IsProfessor
from apps.grades.models import Grade
from apps.grades.serializers import GradeSerializer, AdvisingSubmitSerializer
from apps.students.serializers import StudentEnrollmentSerializer
from apps.grades.services.advising_service import AdvisingService
from apps.grades.services.grading_service import GradingService
from apps.grades.services.resolution_service import ResolutionService
from apps.students.models import Student, StudentEnrollment
from apps.terms.models import Term
from apps.academics.models import Subject

class GradeFilter(django_filters.FilterSet):
    """
    Filter set for Grade records.
    """
    grade_status__in = django_filters.BaseInFilter(field_name='grade_status', lookup_expr='in')
    class Meta:
        model = Grade
        fields = {'student':['exact'], 'is_credited':['exact'], 'term':['exact'], 'advising_status':['exact']}

class AdvisingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing student advising and subject selection.
    Handles auto-advising for regular students and manual selection for irregular ones.
    """
    serializer_class = GradeSerializer
    filterset_class = GradeFilter

    def get_queryset(self):
        user = self.request.user
        queryset = Grade.objects.all()
        if user.role == 'STUDENT': return queryset.filter(student__user=user)
        if user.role == 'PROGRAM_HEAD': return queryset.filter(student__program__program_head=user)
        if user.role in ('ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR'): return queryset
        if user.role == 'PROFESSOR':
            from apps.scheduling.models import Schedule
            matching = Schedule.objects.filter(term=OuterRef('term'), section=OuterRef('section'), subject=OuterRef('subject'), professor__user=user)
            return queryset.filter(Exists(matching))
        return queryset.none()

    @action(detail=False, methods=['post'], url_path='auto-advise')
    def auto_advise(self, request):
        student = request.user.student_profile
        active_term = Term.objects.filter(is_active=True).first()
        if not active_term: raise ValidationError({'detail': 'No active term.'})
        enrollment = StudentEnrollment.objects.filter(student=student, term=active_term).first()
        if not enrollment: raise ValidationError({'detail': 'Not enrolled for active term.'})
        grades = AdvisingService.auto_advise_regular(student, active_term)
        return Response(GradeSerializer(grades, many=True).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='manual-advise')
    def manual_advise(self, request):
        serializer = AdvisingSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        student, active_term = request.user.student_profile, Term.objects.filter(is_active=True).first()
        if not active_term: raise ValidationError({'detail': 'No active term.'})
        grades = AdvisingService.manual_advise_irregular(student, active_term, serializer.validated_data['subject_ids'])
        return Response(GradeSerializer(grades, many=True).data, status=status.HTTP_201_CREATED)

class AdvisingApprovalViewSet(viewsets.ModelViewSet):
    """
    ViewSet for administrative approval of student advising.
    Allows Program Heads and Registrars to review and finalize subject selections.
    """
    queryset = StudentEnrollment.objects.all()
    serializer_class = StudentEnrollmentSerializer
    permission_classes = [IsProgramHead | IsRegistrar | IsAdmin]

    def get_queryset(self):
        """
        Filters pending advising requests based on the user's role and assigned program.
        """
        user = self.request.user
        queryset = StudentEnrollment.objects.filter(advising_status='PENDING')
        
        if user.role == 'PROGRAM_HEAD':
            return queryset.filter(student__program__program_head=user)
        return queryset

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        Finalizes a student's advising, transitioning them to officially enrolled in their subjects.
        """
        enrollment = self.get_object()
        AdvisingService.approve_advising(enrollment, request.user)
        return Response({"status": "Advising approved and student enrolled."})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Rejects a student's advising request with a mandatory reason.
        """
        reason = request.data.get('reason')
        if not reason:
            raise ValidationError({"reason": "A reason for rejection is required."})
            
        enrollment = self.get_object()
        AdvisingService.reject_advising(enrollment, reason)
        return Response({"status": "Advising rejected."})

class SubjectCreditingViewSet(viewsets.ViewSet):
    """
    Helper ViewSet for Registrar to credit subjects manually.
    Handles crediting of external subjects and historical encoding for TOR.
    """
    permission_classes = [IsRegistrar | IsAdmin]

    @action(detail=False, methods=['post'])
    def credit(self, request):
        student, subject = Student.objects.get(pk=request.data.get('student_id')), Subject.objects.get(pk=request.data.get('subject_id'))
        active_term = Term.objects.get(is_active=True)
        grade = AdvisingService.credit_subject(student, subject, active_term, request.user, request.data.get('final_grade'))
        return Response(GradeSerializer(grade).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='bulk-historical-encode')
    def bulk_historical_encode(self, request):
        student, active_term = Student.objects.get(pk=request.data.get('student_id')), Term.objects.get(is_active=True)
        AdvisingService.bulk_historical_encoding(student, active_term, request.data.get('credit_data', []), request.user)
        return Response({"message": "Encoded successfully"}, status=status.HTTP_201_CREATED)

class GradeSubmissionViewSet(viewsets.ViewSet):
    """
    ViewSet for Professor grade submissions.
    Handles midterm/final grade submission and section-wide finalization.
    """
    permission_classes = [IsProfessor | IsRegistrar | IsAdmin]
    service = GradingService()

    @action(detail=True, methods=['post'], url_path='submit-midterm')
    def submit_midterm(self, request, pk=None):
        updated = self.service.submit_midterm(pk, request.data.get('value'), request.user, is_inc=request.data.get('is_inc', False))
        return Response(GradeSerializer(updated).data)

    @action(detail=True, methods=['post'], url_path='submit-final')
    def submit_final(self, request, pk=None):
        updated = self.service.submit_final(pk, request.data.get('value'), request.user)
        return Response(GradeSerializer(updated).data)

    @action(detail=False, methods=['get'])
    def roster(self, request):
        section_id, subject_id = request.query_params.get('section_id'), request.query_params.get('subject_id')
        grades = Grade.objects.filter(section_id=section_id, subject_id=subject_id).select_related('student__user').order_by('student__user__last_name')
        return Response(GradeSerializer(grades, many=True).data)

    @action(detail=False, methods=['post'], url_path='finalize-section')
    def finalize_section(self, request):
        from apps.sections.models import Section
        term, subject, section = Term.objects.get(pk=request.data.get('term_id')), Subject.objects.get(pk=request.data.get('subject_id')), Section.objects.get(pk=request.data.get('section_id'))
        self.service.finalize_section_grades(term, subject, section, request.user)
        return Response({"status": "Finalized"})

class ResolutionViewSet(viewsets.ViewSet):
    """
    Workflow ViewSet for resolving INC (Incomplete) grades.
    Handles a multi-step workflow from request to final Registrar finalization.
    """
    permission_classes = [IsProfessor | IsRegistrar | IsProgramHead | IsAdmin]
    service = ResolutionService()

    @action(detail=True, methods=['post'], url_path='request-resolution')
    def request_resolution(self, request, pk=None):
        return Response(GradeSerializer(self.service.request_resolution(pk, request.user, request.data.get('reason'))).data)

    @action(detail=True, methods=['post'], url_path='registrar-approve')
    def registrar_approve(self, request, pk=None):
        return Response(GradeSerializer(self.service.registrar_approve_request(pk, request.user)).data)

    @action(detail=True, methods=['post'], url_path='submit-grade')
    def submit_grade(self, request, pk=None):
        return Response(GradeSerializer(self.service.submit_resolved_grade(pk, request.user, request.data.get('new_grade'))).data)

    @action(detail=True, methods=['post'], url_path='registrar-finalize')
    def registrar_finalize(self, request, pk=None):
        return Response(GradeSerializer(self.service.registrar_finalize_resolution(pk, request.user)).data)
