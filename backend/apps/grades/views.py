from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.utils import timezone
from django.db.models import F, Exists, OuterRef
from apps.grades.models import Grade
from apps.grades.serializers import GradeSerializer, AdvisingSubmitSerializer, CreditingSerializer
from apps.grades.services.advising_service import AdvisingService
from apps.grades.services.grading_service import GradingService
from apps.grades.services.resolution_service import ResolutionService
from apps.students.models import Student, StudentEnrollment
from apps.terms.models import Term
from apps.academics.models import Subject
from django.core.exceptions import ObjectDoesNotExist
from django_filters.rest_framework import DjangoFilterBackend
from core.permissions import IsStudent, IsProgramHead, IsRegistrar, IsAdmin, IsProfessor


import django_filters

class GradeFilter(django_filters.FilterSet):
    grade_status__in = django_filters.BaseInFilter(field_name='grade_status', lookup_expr='in')
    finalized_at__isnull = django_filters.BooleanFilter(field_name='finalized_at', lookup_expr='isnull')
    resolution_requested_at__isnull = django_filters.BooleanFilter(field_name='resolution_requested_at', lookup_expr='isnull')
    resolution_approved_at__isnull = django_filters.BooleanFilter(field_name='resolution_approved_at', lookup_expr='isnull')

    class Meta:
        model = Grade
        fields = {
            'student': ['exact'],
            'is_credited': ['exact'],
            'term': ['exact'],
            'advising_status': ['exact'],
            'grade_status': ['exact'],
            'resolution_status': ['exact'],
        }

class AdvisingViewSet(viewsets.ModelViewSet):
    """
    Grades & Advising management.

    GET /api/grades/advising/         - List all grades/advising (Filtered by Role)
    POST /api/grades/advising/auto-advise/ - Auto-select subjects (Regular Students)
    POST /api/grades/advising/manual-advise/ - Manual selection (Irregular Students)

    Permissions: IsStudent | IsProgramHead | IsRegistrar | IsAdmin | IsProfessor
    """
    serializer_class = GradeSerializer
    filterset_class = GradeFilter

    def get_queryset(self):
        user = self.request.user
        queryset = Grade.objects.all()
        
        if user.role == 'STUDENT':
            return queryset.filter(student__user=user)
        
        elif user.role == 'PROGRAM_HEAD':
            # PH only sees grades for students in their headed programs
            return queryset.filter(student__program__program_head=user)
            
        elif user.role in ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR']:
            return queryset
            
        elif user.role == 'PROFESSOR':
            from apps.scheduling.models import Schedule
            matching_schedules = Schedule.objects.filter(
                term=OuterRef('term'),
                section=OuterRef('section'),
                subject=OuterRef('subject'),
                professor__user=user
            )
            return queryset.filter(Exists(matching_schedules))
            
        return queryset.none()


    @action(detail=False, methods=['post'], url_path='auto-advise')
    def auto_advise(self, request):
        """
        Student requests auto-advising for the active term.
        """
        try:
            student = self.request.user.student_profile
            active_term = Term.objects.get(is_active=True)
            
            # Ensure student is enrolled for the term
            enrollment = StudentEnrollment.objects.get(student=student, term=active_term)
            
            grades = AdvisingService.auto_advise_regular(student, active_term)
            serializer = GradeSerializer(grades, many=True)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Term.DoesNotExist:
            raise ValidationError({'detail': 'No active term found.'})
        except StudentEnrollment.DoesNotExist:
            raise ValidationError({'detail': 'Student not enrolled for the active term.'})

    @action(detail=False, methods=['post'], url_path='manual-advise')
    def manual_advise(self, request):
        """
        Irregular student submits manual subject selection.
        """
        serializer = AdvisingSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            student = self.request.user.student_profile
            active_term = Term.objects.get(is_active=True)
            StudentEnrollment.objects.get(student=student, term=active_term)
        except Term.DoesNotExist as exc:
            raise ValidationError({'detail': 'No active term found.'}) from exc
        except StudentEnrollment.DoesNotExist as exc:
            raise ValidationError({'detail': 'Student not enrolled for the active term.'}) from exc
        
        grades = AdvisingService.manual_advise_irregular(
            student, 
            active_term, 
            serializer.validated_data['subject_ids']
        )
        return Response(GradeSerializer(grades, many=True).data, status=status.HTTP_201_CREATED)


class AdvisingApprovalViewSet(viewsets.ViewSet):
    permission_classes = [IsProgramHead | IsRegistrar | IsAdmin]

    @action(detail=False, methods=['post'], url_path='batch-approve-regular')
    def batch_approve_regular(self, request):
        """
        Program Head batch approves all regular student advising for their program.
        """
        try:
            active_term = Term.objects.get(is_active=True)
        except Term.DoesNotExist as exc:
            raise ValidationError({'detail': 'No active term found.'}) from exc
        pending_enrollments = StudentEnrollment.objects.filter(
            term=active_term,
            advising_status='PENDING',
            is_regular=True
        )
        if request.user.role == 'PROGRAM_HEAD':
            pending_enrollments = pending_enrollments.filter(student__program__program_head=request.user)
        
        count = 0
        for enrollment in pending_enrollments:
            AdvisingService.approve_advising(enrollment, request.user)
            count += 1
            
        return Response({"message": f"Successfully approved {count} regular students."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        Approve an individual student enrollment.
        """
        enrollment = StudentEnrollment.objects.get(pk=pk)
        if request.user.role == 'PROGRAM_HEAD' and enrollment.student.program.program_head_id != request.user.id:
            raise PermissionDenied("You do not manage this student's program.")
        AdvisingService.approve_advising(enrollment, request.user)
        return Response({"message": "Advising approved."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Reject an individual student enrollment.
        """
        reason = request.data.get('reason', 'No reason provided')
        enrollment = StudentEnrollment.objects.get(pk=pk)
        if request.user.role == 'PROGRAM_HEAD' and enrollment.student.program.program_head_id != request.user.id:
            raise PermissionDenied("You do not manage this student's program.")
        AdvisingService.reject_advising(enrollment, reason)
        return Response({"message": "Advising rejected."}, status=status.HTTP_200_OK)


class SubjectCreditingViewSet(viewsets.ViewSet):
    permission_classes = [IsRegistrar | IsAdmin]

    @staticmethod
    def _raise_crediting_error(exc):
        if isinstance(exc, ObjectDoesNotExist):
            raise ValidationError({'detail': 'Referenced student, subject, or active term was not found.'}) from exc
        raise ValidationError({'detail': 'Unable to complete the crediting request.'}) from exc

    @action(detail=False, methods=['post'])
    def credit(self, request):
        """
        Registrar credits a subject for a student.
        """
        student_id = request.data.get('student_id')
        subject_id = request.data.get('subject_id')
        final_grade = request.data.get('final_grade')
        
        try:
            student = Student.objects.get(pk=student_id)
            subject = Subject.objects.get(pk=subject_id)
            active_term = Term.objects.get(is_active=True)
            
            grade = AdvisingService.credit_subject(
                student, subject, active_term, request.user, final_grade
            )
            return Response(GradeSerializer(grade).data, status=status.HTTP_201_CREATED)
        except Exception as exc:
            self._raise_crediting_error(exc)

    @action(detail=False, methods=['post'])
    def uncredit(self, request):
        """
        Registrar removes a credited subject.
        """
        student_id = request.data.get('student_id')
        subject_id = request.data.get('subject_id')
        
        try:
            student = Student.objects.get(pk=student_id)
            subject = Subject.objects.get(pk=subject_id)
            active_term = Term.objects.get(is_active=True)
            
            AdvisingService.uncredit_subject(student, subject, active_term)
            return Response({"status": "Credit removed"}, status=status.HTTP_200_OK)
        except Exception as exc:
            self._raise_crediting_error(exc)

    @action(detail=False, methods=['post'], url_path='bulk-historical-encode')
    def bulk_historical_encode(self, request):
        """
        Registrar encodes TOR for legacy students.
        """
        student_id = request.data.get('student_id')
        credit_data = request.data.get('credit_data', []) # List of {subject_id, final_grade}
        source = request.data.get('source')
        
        try:
            student = Student.objects.get(pk=student_id)
            active_term = Term.objects.get(is_active=True)
            
            results = AdvisingService.bulk_historical_encoding(
                student, active_term, credit_data, request.user, source=source
            )
            return Response({
                "message": f"Encoded {len(results)} historical records.",
                "student_id": student.idn
            }, status=status.HTTP_201_CREATED)
        except Exception as exc:
            self._raise_crediting_error(exc)


class GradeSubmissionViewSet(viewsets.ViewSet):
    """
    Handles midterm/final grade submission by Professors and finalization by Registrar.
    """
    permission_classes = [IsProfessor | IsRegistrar | IsAdmin]
    service = GradingService()

    @action(detail=True, methods=['post'], url_path='submit-midterm')
    def submit_midterm(self, request, pk=None):
        grade_id = pk
        value = request.data.get('value')
        is_inc = request.data.get('is_inc', False)
        override = request.data.get('override_grading_window', False)
        
        updated_grade = self.service.submit_midterm(grade_id, value, request.user, is_inc=is_inc, override_window=override)
        return Response(GradeSerializer(updated_grade).data)

    @action(detail=True, methods=['post'], url_path='submit-final')
    def submit_final(self, request, pk=None):
        grade_id = pk
        value = request.data.get('value')
        is_inc = request.data.get('is_inc', False)
        override = request.data.get('override_grading_window', False)
        
        grade = Grade.objects.get(pk=grade_id)
        grade._is_inc = is_inc
        updated_grade = self.service.submit_final(grade_id, value, request.user, override_window=override)
        return Response(GradeSerializer(updated_grade).data)

    @action(detail=False, methods=['get'])
    def roster(self, request):
        """
        Returns the student list and their grades for a section + subject.
        """
        section_id = request.query_params.get('section_id')
        subject_id = request.query_params.get('subject_id')
        
        if not all([section_id, subject_id]):
            return Response({"error": "section_id and subject_id are required."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Security: Only show if professor is assigned to this section/subject
        if request.user.role == 'PROFESSOR':
            from apps.scheduling.models import Schedule
            is_assigned = Schedule.objects.filter(
                term__is_active=True,
                professor=request.user.professor_profile,
                section_id=section_id,
                subject_id=subject_id
            ).exists()
            if not is_assigned:
                return Response({"error": "You are not assigned to this section/subject load."}, status=status.HTTP_403_FORBIDDEN)

        grades = Grade.objects.filter(
            section_id=section_id,
            subject_id=subject_id
        ).select_related('student__user').order_by('student__user__last_name')
        
        return Response(GradeSerializer(grades, many=True).data)

    @action(detail=False, methods=['post'], url_path='finalize-section')
    def finalize_section(self, request):
        term_id = request.data.get('term_id')
        subject_id = request.data.get('subject_id')
        section_id = request.data.get('section_id')
        
        if not all([term_id, subject_id, section_id]):
            return Response({"error": "term_id, subject_id, and section_id are required."}, status=status.HTTP_400_BAD_REQUEST)
            
        from apps.sections.models import Section
        term = Term.objects.get(pk=term_id)
        subject = Subject.objects.get(pk=subject_id)
        section = Section.objects.get(pk=section_id)
        
        finalized_grades = self.service.finalize_section_grades(term, subject, section, request.user)
        return Response({"message": f"Finalized {finalized_grades.count()} grades."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='finalize-term')
    def finalize_term(self, request):
        """
        Registrar level global lock for an entire term.
        """
        term_id = request.data.get('term_id')
        if not term_id:
            return Response({"error": "term_id is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        term = Term.objects.get(pk=term_id)
        count = self.service.finalize_term_grades(term, request.user)
        return Response({"message": f"Global lock applied. Finalized {count} grades."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='close-grading-period')
    def close_grading_period(self, request):
        """
        Auto-INC logic for unsubmitted grades.
        """
        term_id = request.data.get('term_id')
        period_type = request.data.get('period_type') # 'MIDTERM' or 'FINAL'
        
        if not all([term_id, period_type]):
            return Response({"error": "term_id and period_type are required."}, status=status.HTTP_400_BAD_REQUEST)
            
        term = Term.objects.get(pk=term_id)
        count = self.service.mark_unsubmitted_as_inc(term, period_type, request.user)
        return Response({"message": f"Grading period closed. {count} unsubmitted grades marked as INC."}, status=status.HTTP_200_OK)


class ResolutionViewSet(viewsets.ViewSet):
    """
    Handles the multi-step INC resolution workflow.
    """
    permission_classes = [IsProfessor | IsRegistrar | IsProgramHead | IsAdmin]
    service = ResolutionService()

    @action(detail=True, methods=['post'], url_path='request-resolution')
    def request_resolution(self, request, pk=None):
        reason = request.data.get('reason')
        grade = self.service.request_resolution(pk, request.user, reason)
        return Response(GradeSerializer(grade).data)

    @action(detail=True, methods=['post'], url_path='registrar-approve')
    def registrar_approve(self, request, pk=None):
        grade = self.service.registrar_approve_request(pk, request.user)
        return Response(GradeSerializer(grade).data)

    @action(detail=True, methods=['post'], url_path='registrar-reject')
    def registrar_reject(self, request, pk=None):
        reason = request.data.get('reason')
        grade = self.service.registrar_reject_request(pk, request.user, reason)
        return Response(GradeSerializer(grade).data)

    @action(detail=True, methods=['post'], url_path='submit-grade')
    def submit_grade(self, request, pk=None):
        new_grade = request.data.get('new_grade')
        grade = self.service.submit_resolved_grade(pk, request.user, new_grade)
        return Response(GradeSerializer(grade).data)

    @action(detail=True, methods=['post'], url_path='head-approve')
    def head_approve(self, request, pk=None):
        grade = self.service.head_approve_resolution(pk, request.user)
        return Response(GradeSerializer(grade).data)

    @action(detail=True, methods=['post'], url_path='head-reject')
    def head_reject(self, request, pk=None):
        reason = request.data.get('reason')
        grade = self.service.head_reject_resolution(pk, request.user, reason)
        return Response(GradeSerializer(grade).data)
    @action(detail=True, methods=['post'], url_path='registrar-finalize')
    def registrar_finalize(self, request, pk=None):
        grade = self.service.registrar_finalize_resolution(pk, request.user)
        return Response(GradeSerializer(grade).data)
