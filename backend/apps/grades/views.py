from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.grades.models import Grade
from apps.grades.serializers import GradeSerializer, AdvisingSubmitSerializer, CreditingSerializer
from apps.grades.services.advising_service import AdvisingService
from apps.students.models import Student, StudentEnrollment
from apps.terms.models import Term
from apps.academics.models import Subject
from core.permissions import IsStudent, IsProgramHead, IsRegistrar, IsAdmin


class AdvisingViewSet(viewsets.ModelViewSet):
    serializer_class = GradeSerializer
    permission_classes = [IsStudent]

    def get_queryset(self):
        return Grade.objects.filter(student__user=self.request.user)

    @action(detail=False, methods=['post'])
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

    @action(detail=False, methods=['post'])
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

    @action(detail=False, methods=['post'])
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
        
        try:
            student = Student.objects.get(pk=student_id)
            subject = Subject.objects.get(pk=subject_id)
            active_term = Term.objects.get(is_active=True)
            
            grade = AdvisingService.credit_subject(student, subject, active_term, request.user)
            return Response(GradeSerializer(grade).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
