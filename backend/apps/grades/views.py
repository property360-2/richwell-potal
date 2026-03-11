from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from apps.grades.models import Grade
from apps.grades.serializers import GradeSerializer, AdvisingSubmitSerializer, CreditingSerializer
from apps.grades.services.advising_service import AdvisingService
from apps.grades.services.grading_service import GradingService
from apps.grades.services.resolution_service import ResolutionService
from apps.students.models import Student, StudentEnrollment
from apps.terms.models import Term
from apps.academics.models import Subject
from django_filters.rest_framework import DjangoFilterBackend
from core.permissions import IsStudent, IsProgramHead, IsRegistrar, IsAdmin, IsProfessor


class AdvisingViewSet(viewsets.ModelViewSet):
    # ... (existing code remains same)
    serializer_class = GradeSerializer
    permission_classes = [IsStudent | IsProgramHead | IsAdmin]
    filter_backends = (DjangoFilterBackend,)
    filterset_fields = ['student', 'is_credited', 'term', 'advising_status']

    def get_queryset(self):
        user = self.request.user
        queryset = Grade.objects.all()
        
        if user.role == 'STUDENT':
            return queryset.filter(student__user=user)
        
        elif user.role == 'PROGRAM_HEAD':
            # PH only sees grades for students in their headed programs
            return queryset.filter(student__program__program_head=user)
            
        elif user.role == 'ADMIN':
            return queryset
            
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
            return Response({"error": "No active term found."}, status=status.HTTP_400_BAD_REQUEST)
        except StudentEnrollment.DoesNotExist:
            return Response({"error": "Student not enrolled for the active term."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='manual-advise')
    def manual_advise(self, request):
        """
        Irregular student submits manual subject selection.
        """
        serializer = AdvisingSubmitSerializer(data=request.data)
        if serializer.is_valid():
            try:
                student = self.request.user.student_profile
                active_term = Term.objects.get(is_active=True)
                
                # Ensure student is enrolled for the term
                enrollment = StudentEnrollment.objects.get(student=student, term=active_term)
                
                grades = AdvisingService.manual_advise_irregular(
                    student, 
                    active_term, 
                    serializer.validated_data['subject_ids']
                )
                return Response(GradeSerializer(grades, many=True).data, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdvisingApprovalViewSet(viewsets.ViewSet):
    permission_classes = [IsProgramHead | IsAdmin]

    @action(detail=False, methods=['post'], url_path='batch-approve-regular')
    def batch_approve_regular(self, request):
        """
        Program Head batch approves all regular student advising for their program.
        """
        active_term = Term.objects.get(is_active=True)
        # In a real scenario, we'd filter by the Program Head's specific programs.
        pending_enrollments = StudentEnrollment.objects.filter(
            term=active_term,
            advising_status='PENDING',
            is_regular=True
        )
        
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
        try:
            enrollment = StudentEnrollment.objects.get(pk=pk)
            AdvisingService.approve_advising(enrollment, request.user)
            return Response({"message": "Advising approved."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Reject an individual student enrollment.
        """
        reason = request.data.get('reason', 'No reason provided')
        try:
            enrollment = StudentEnrollment.objects.get(pk=pk)
            AdvisingService.reject_advising(enrollment, reason)
            return Response({"message": "Advising rejected."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class SubjectCreditingViewSet(viewsets.ViewSet):
    permission_classes = [IsRegistrar | IsAdmin]

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
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

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
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


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
        
        try:
            grade = Grade.objects.get(pk=grade_id)
            # Term transition rule: Can submit if within term grading period
            if timezone.now().date() > grade.term.final_grade_end:
                 return Response({"error": "Grading period for this term has ended."}, status=status.HTTP_400_BAD_REQUEST)
            
            updated_grade = self.service.submit_midterm(grade_id, value, request.user)
            return Response(GradeSerializer(updated_grade).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='submit-final')
    def submit_final(self, request, pk=None):
        grade_id = pk
        value = request.data.get('value')
        is_inc = request.data.get('is_inc', False)
        
        try:
            grade = Grade.objects.get(pk=grade_id)
            if timezone.now().date() > grade.term.final_grade_end:
                 return Response({"error": "Grading period for this term has ended."}, status=status.HTTP_400_BAD_REQUEST)
            
            # Use a mock/internal flag for INC if needed, or pass it to service
            grade._is_inc = is_inc
            updated_grade = self.service.submit_final(grade_id, value, request.user)
            return Response(GradeSerializer(updated_grade).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def finalize(self, request):
        term_id = request.data.get('term_id')
        subject_id = request.data.get('subject_id')
        section_id = request.data.get('section_id')
        
        if not all([term_id, subject_id, section_id]):
            return Response({"error": "term_id, subject_id, and section_id are required."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            from apps.sections.models import Section
            term = Term.objects.get(pk=term_id)
            subject = Subject.objects.get(pk=subject_id)
            section = Section.objects.get(pk=section_id)
            
            finalized_grades = self.service.finalize_grades(term, subject, section, request.user)
            return Response({"message": f"Finalized {finalized_grades.count()} grades."}, status=status.HTTP_200_OK)
        except Exception as e:
             return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ResolutionViewSet(viewsets.ViewSet):
    """
    Handles the multi-step INC resolution workflow.
    """
    permission_classes = [IsProfessor | IsRegistrar | IsProgramHead | IsAdmin]
    service = ResolutionService()

    @action(detail=True, methods=['post'], url_path='request-resolution')
    def request_resolution(self, request, pk=None):
        reason = request.data.get('reason')
        try:
            grade = self.service.request_resolution(pk, request.user, reason)
            return Response(GradeSerializer(grade).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='registrar-approve')
    def registrar_approve(self, request, pk=None):
        try:
            grade = self.service.registrar_approve_request(pk, request.user)
            return Response(GradeSerializer(grade).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='submit-grade')
    def submit_grade(self, request, pk=None):
        new_grade = request.data.get('new_grade')
        try:
            grade = self.service.submit_resolved_grade(pk, request.user, new_grade)
            return Response(GradeSerializer(grade).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='head-approve')
    def head_approve(self, request, pk=None):
        try:
            grade = self.service.head_approve_resolution(pk, request.user)
            return Response(GradeSerializer(grade).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='head-reject')
    def head_reject(self, request, pk=None):
        reason = request.data.get('reason')
        try:
            grade = self.service.head_reject_resolution(pk, reason)
            return Response(GradeSerializer(grade).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
