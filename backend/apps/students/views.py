"""
Richwell Portal — Student Views

Provides API endpoints for student management, application workflows, 
and enrollment tracking. Delegating complex logic to services.py.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.db.models import Count, Q, F

from core.permissions import IsAdmission, IsAdmissionOrRegistrar, IsStudentRecordsStaff
from .models import Student, StudentEnrollment
from .serializers import (
    StudentApplicationSerializer,
    StudentEnrollmentSelfSerializer,
    StudentEnrollmentSerializer,
    StudentRecordSerializer,
    StudentSelfSerializer,
)
from .filters import StudentFilter
from .services import (
    apply_student,
    admit_student_application,
    enroll_student_for_term,
    manual_add_student_record,
    toggle_student_regularity,
    get_student_schedule,
)

class StudentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Student lifecycle: application, approval, and detail tracking.
    """
    queryset = Student.objects.all()
    filterset_class = StudentFilter
    search_fields = ['user__first_name', 'user__last_name', 'user__email', 'idn']

    def get_queryset(self):
        user = self.request.user
        qs = Student.objects.all().order_by('-updated_at')
        if not user.is_authenticated: return Student.objects.none()
        if user.role == 'STUDENT': return qs.filter(user=user)
        return qs

    def get_serializer_class(self):
        if self.request.user.is_authenticated and self.request.user.role == 'STUDENT':
            return StudentSelfSerializer
        return StudentRecordSerializer

    def get_permissions(self):
        if self.action in ['apply', 'check_email', 'check_idn']: return [permissions.AllowAny()]
        if self.action in ['update', 'partial_update', 'destroy', 'approve', 'unlock_advising', 'toggle_regularity', 'manual_add']:
            return [IsAdmissionOrRegistrar()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['post'], url_path='apply')
    def apply(self, request):
        """
        Public endpoint for prospective students to submit their initial application.
        Creates a new user and student profile in 'APPLICANT' status.
        """
        serializer = StudentApplicationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        student = apply_student(serializer.validated_data)
        return Response(StudentSelfSerializer(student).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='check-email', permission_classes=[permissions.AllowAny])
    def check_email(self, request):
        """
        Checks if a given email is already taken by an existing user.
        Used for inline validation during student application.
        """
        email = request.query_params.get('email')
        if not email:
            return Response({'error': 'Email parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        exists = User.objects.filter(email__iexact=email).exists()
        return Response({'exists': exists})

    @action(detail=False, methods=['get'], url_path='check-idn', permission_classes=[permissions.AllowAny])
    def check_idn(self, request):
        """
        Checks if a given student IDN is already assigned to a student record.
        """
        idn = request.query_params.get('idn')
        if not idn:
            return Response({'error': 'IDN parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        exists = Student.objects.filter(idn=idn).exists()
        return Response({'exists': exists})

    @action(detail=True, methods=['post'], permission_classes=[IsAdmissionOrRegistrar])
    def admit(self, request, pk=None):
        """
        Admits a student's application. Generates their official IDN, 
        sets their monthly commitment, and creates their login credentials.
        """
        student = self.get_object()
        monthly = request.data.get('monthly_commitment')
        if not monthly: raise ValidationError({'monthly_commitment': ['Required.']})
        
        credentials = admit_student_application(student, monthly, request.user)
        return Response({'student': StudentRecordSerializer(student).data, 'credentials': credentials})

    @action(detail=True, methods=['post'], url_path='unlock-advising')
    def unlock_advising(self, request, pk=None):
        """
        Manually allows a student to proceed to the advising/subject selection stage.
        Typically done after the Registrar verifies physical documents.
        """
        student = self.get_object()
        student.is_advising_unlocked = True
        student.save(audit_user=request.user)
        return Response({'status': 'Advising process unlocked'})

    @action(detail=True, methods=['post'], url_path='toggle-regularity')
    def toggle_regularity(self, request, pk=None):
        """
        Toggles whether a student is considered 'Regular' for the current term.
        Affects automatic subject suggestions during advising.
        """
        is_regular = request.data.get('is_regular', True)
        enrollment, val = toggle_student_regularity(pk, is_regular)
        return Response({'status': 'Regularity status updated', 'is_regular': val})

    @action(detail=True, methods=['post'], url_path='returning-student')
    def returning_student(self, request, pk=None):
        """
        Processes a returning student's enrollment for a new term.
        Can be called by staff or the student themselves.
        """
        student = self.get_object()
        if not (request.user.role in ('ADMIN', 'ADMISSION', 'REGISTRAR') or request.user == student.user):
            raise PermissionDenied("Unauthorized.")
        
        monthly = request.data.get('monthly_commitment')
        # Only require monthly if staff is enrolling
        if not monthly and request.user.role in ('ADMIN', 'ADMISSION', 'REGISTRAR'):
            raise ValidationError({'monthly_commitment': ['Required.']})
        
        enrollment = enroll_student_for_term(student, monthly, request.user)
        return Response({'message': 'Ok', 'enrollment': StudentEnrollmentSerializer(enrollment).data})

    @action(detail=True, methods=['post'], url_path='confirm-graduation',
            permission_classes=[IsAdmissionOrRegistrar])
    def confirm_graduation(self, request, pk=None):
        """
        Officially confirms a student's graduation after the Registrar verifies eligibility.

        Runs a live graduation eligibility check via ReportService before transitioning
        the student's status to GRADUATED. Blocked if the student is not yet eligible.
        Creates an audit log entry (RELEASE action) and notifies the student.

        Args:
            pk (int): Primary key of the Student to confirm.

        Returns:
            200 OK: { status, student_id, idn }
            400 Bad Request: if the student is not yet academically eligible.
        """
        from apps.reports.services.report_service import ReportService
        from apps.auditing.models import AuditLog
        from apps.auditing.middleware import get_current_ip
        from apps.notifications.services.notification_service import NotificationService
        from apps.notifications.models import Notification

        student = self.get_object()

        # Guard: run eligibility check before making any changes
        result = ReportService.graduation_check(student.id)
        if not result['is_eligible']:
            raise ValidationError(
                "This student has not yet completed all curriculum requirements "
                "and is not eligible for graduation."
            )

        # Transition to GRADUATED
        student.status = 'GRADUATED'
        student.save(audit_user=request.user)

        # Manual audit log — graduation confirmation is a significant administrative act
        AuditLog.objects.create(
            user=request.user,
            action='RELEASE',
            model_name='Student',
            object_id=str(student.id),
            object_repr=f"Graduation Confirmed | {student.idn} | {student.user.get_full_name()}",
            changes={
                'status': {'old': 'ENROLLED', 'new': 'GRADUATED'},
                'confirmed_by': request.user.username,
            },
            ip_address=get_current_ip()
        )

        # Notify the student
        NotificationService.notify(
            recipient=student.user,
            notification_type=Notification.NotificationType.GENERAL,
            title="🎓 Congratulations! Your Graduation is Confirmed",
            message=(
                "Your academic record has been reviewed and your graduation has been "
                "officially confirmed by the Registrar. Congratulations on completing "
                f"your program at Richwell Colleges!"
            ),
            link_url="/student/grades"
        )

        return Response({
            "status": "Graduation confirmed. Student is now marked as GRADUATED.",
            "student_id": student.id,
            "idn": student.idn,
        })

    @action(detail=False, methods=['post'], url_path='manual-add')
    def manual_add(self, request):
        """
        Allows staff to manually create a student record without going 
        through the public application pipeline.
        """
        student, is_regular = manual_add_student_record(request.data, request.user)
        return Response({'student': StudentRecordSerializer(student).data, 'is_regular': is_regular}, status=status.HTTP_201_CREATED)


class StudentEnrollmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for tracking term-specific Student Enrollment records.
    """
    queryset = StudentEnrollment.objects.all()
    serializer_class = StudentEnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['advising_status', 'is_regular']

    def get_serializer_class(self):
        if self.request.user.role == 'STUDENT': return StudentEnrollmentSelfSerializer
        return StudentEnrollmentSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'STUDENT': return StudentEnrollment.objects.filter(student__user=user)
        if user.role == 'PROGRAM_HEAD':
            return StudentEnrollment.objects.filter(student__program__program_head=user).annotate(
                subject_count=Count('student__grades', filter=Q(student__grades__term=F('term')), distinct=True)
            ).filter(subject_count__gt=0).distinct()
        return StudentEnrollment.objects.all()

    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        Returns the enrollment record for the currently authenticated student 
        for a specific term.
        """
        term_id = request.query_params.get('term')
        if not term_id: return Response({"error": "Term ID is required"}, status=status.HTTP_400_BAD_REQUEST)
        enrollment = self.get_queryset().filter(term_id=term_id).first()
        return Response(self.get_serializer(enrollment).data if enrollment else None)

    @action(detail=False, methods=['get'])
    def schedule(self, request):
        """
        Computes and returns the class schedule for the authenticated student 
        in a specific term.
        """
        term_id = request.query_params.get('term')
        if not term_id: return Response({"error": "Term ID required"}, status=status.HTTP_400_BAD_REQUEST)
        if request.user.role != 'STUDENT': return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        
        data = get_student_schedule(request.user.student_profile, term_id)
        return Response(data)
