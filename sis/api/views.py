"""
REST API Views for Richwell Colleges Portal.
Handles student, cashier, and public API endpoints.
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.db import transaction, models
from django.utils import timezone
from decimal import Decimal

from sis.models import (
    Student, Enrollment, SubjectEnrollment, Subject, Section, Payment,
    PaymentMonth, ExamPermit, Grade, Program, Semester, Notification,
    AuditLog, User
)
from sis.api.serializers import (
    StudentProfileSerializer, EnrollmentSerializer, SubjectEnrollmentSerializer,
    SubjectSerializer, PaymentSerializer, ExamPermitSerializer,
    SectionSerializer, EnrollSubjectInputSerializer, TranscriptSerializer,
    NotificationSerializer, ProgramSerializer, PaymentMonthSerializer
)
from sis.services.enrollment_service import (
    add_subject_to_enrollment, drop_subject, get_enrolled_subjects,
    get_student_load, get_available_sections
)
from sis.services.payment_service import (
    allocate_payment, is_month_1_paid, get_payment_balance
)
from sis.services.grade_service import get_transcript
from sis.services.audit_service import log_action


class IsStudent(permissions.BasePermission):
    """Permission to check if user is a student."""
    def has_permission(self, request, view):
        return request.user and request.user.role == 'STUDENT'


class IsCashier(permissions.BasePermission):
    """Permission to check if user is a cashier."""
    def has_permission(self, request, view):
        return request.user and request.user.role == 'CASHIER'


class IsRegistrar(permissions.BasePermission):
    """Permission to check if user is a registrar."""
    def has_permission(self, request, view):
        return request.user and request.user.role in ['REGISTRAR', 'HEAD_REGISTRAR']


class IsAdminUser(permissions.BasePermission):
    """Permission to check if user is admin."""
    def has_permission(self, request, view):
        return request.user and request.user.role == 'ADMIN'


# ===== STUDENT API VIEWS =====

class StudentProfileViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for student profile information."""
    permission_classes = [permissions.IsAuthenticated, IsStudent]
    serializer_class = StudentProfileSerializer
    http_method_names = ['get']

    def get_queryset(self):
        """Return only the current user's student profile."""
        return Student.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current student's profile."""
        try:
            student = Student.objects.get(user=request.user)
            serializer = self.get_serializer(student)
            return Response(serializer.data)
        except Student.DoesNotExist:
            return Response(
                {'error': 'Student profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class EnrollmentViewSet(viewsets.ModelViewSet):
    """API endpoint for student enrollment information."""
    permission_classes = [permissions.IsAuthenticated, IsStudent]
    serializer_class = EnrollmentSerializer

    def get_queryset(self):
        """Return only the current student's enrollments."""
        try:
            student = Student.objects.get(user=self.request.user)
            return Enrollment.objects.filter(student=student).order_by('-semester__year', '-semester__semester')
        except Student.DoesNotExist:
            return Enrollment.objects.none()

    @action(detail=True, methods=['get'])
    def subjects(self, request, pk=None):
        """Get subjects enrolled in this enrollment."""
        enrollment = self.get_object()
        subjects = get_enrolled_subjects(enrollment)
        serializer = SubjectEnrollmentSerializer(subjects, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def available_subjects(self, request, pk=None):
        """Get available subjects for enrollment."""
        enrollment = self.get_object()

        # Verify student owns this enrollment
        if enrollment.student.user != request.user:
            raise PermissionDenied("Cannot view others' enrollments")

        available_subjects = Subject.objects.filter(
            sections__semester=enrollment.semester
        ).distinct()

        serializer = SubjectSerializer(available_subjects, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def enroll_subject(self, request, pk=None):
        """Enroll student in a subject."""
        enrollment = self.get_object()

        # Verify student owns this enrollment
        if enrollment.student.user != request.user:
            raise PermissionDenied("Cannot modify others' enrollments")

        # Validate input
        input_serializer = EnrollSubjectInputSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        try:
            with transaction.atomic():
                subject = Subject.objects.get(id=input_serializer.validated_data['subject_id'])
                section = None

                if input_serializer.validated_data.get('section_id'):
                    section = Section.objects.get(id=input_serializer.validated_data['section_id'])

                # Add subject to enrollment
                subject_enrollment = add_subject_to_enrollment(
                    enrollment=enrollment,
                    subject=subject,
                    section=section,
                    override_schedule_conflict=input_serializer.validated_data['override_schedule_conflict'],
                    override_reason=input_serializer.validated_data.get('conflict_reason', ''),
                    user=request.user,
                    ip_address=self._get_client_ip(request)
                )

                serializer = SubjectEnrollmentSerializer(subject_enrollment)
                return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Subject.DoesNotExist:
            return Response(
                {'error': 'Subject not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def drop_subject(self, request, pk=None):
        """Drop a subject from enrollment."""
        enrollment = self.get_object()

        # Verify student owns this enrollment
        if enrollment.student.user != request.user:
            raise PermissionDenied("Cannot modify others' enrollments")

        subject_enrollment_id = request.data.get('subject_enrollment_id')
        reason = request.data.get('reason', '')

        try:
            with transaction.atomic():
                subject_enrollment = SubjectEnrollment.objects.get(
                    id=subject_enrollment_id,
                    enrollment=enrollment
                )

                # Drop the subject
                drop_subject(
                    subject_enrollment=subject_enrollment,
                    reason=reason,
                    user=request.user,
                    ip_address=self._get_client_ip(request)
                )

                return Response(
                    {'message': 'Subject dropped successfully'},
                    status=status.HTTP_200_OK
                )

        except SubjectEnrollment.DoesNotExist:
            return Response(
                {'error': 'Subject enrollment not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'])
    def payment_status(self, request, pk=None):
        """Get payment status for this enrollment."""
        enrollment = self.get_object()

        if enrollment.student.user != request.user:
            raise PermissionDenied("Cannot view others' payment status")

        payment_months = PaymentMonth.objects.filter(
            enrollment=enrollment
        ).order_by('month_number')

        serializer = PaymentMonthSerializer(payment_months, many=True)

        return Response({
            'month_1_paid': is_month_1_paid(enrollment),
            'total_balance': str(get_payment_balance(enrollment)),
            'months': serializer.data
        })

    @action(detail=True, methods=['get'])
    def exam_permit(self, request, pk=None):
        """Get exam permit status for this enrollment."""
        enrollment = self.get_object()

        if enrollment.student.user != request.user:
            raise PermissionDenied("Cannot view others' exam permit")

        try:
            permit = ExamPermit.objects.get(enrollment=enrollment)
            serializer = ExamPermitSerializer(permit)
            return Response(serializer.data)
        except ExamPermit.DoesNotExist:
            return Response(
                {'error': 'Exam permit not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['get'])
    def transcript(self, request, pk=None):
        """Get student's transcript for this enrollment."""
        enrollment = self.get_object()

        if enrollment.student.user != request.user:
            raise PermissionDenied("Cannot view others' transcript")

        try:
            transcript_data = get_transcript(enrollment.student)
            serializer = TranscriptSerializer(transcript_data)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def _get_client_ip(self, request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


# ===== CASHIER API VIEWS =====

class CashierStudentSearchViewSet(viewsets.ViewSet):
    """API endpoint for cashier to search students."""
    permission_classes = [permissions.IsAuthenticated, IsCashier]

    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search for students by ID or name."""
        query = request.query_params.get('q', '')

        if not query:
            return Response(
                {'error': 'Search query required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Search by student_id or user name
        students = Student.objects.filter(
            models.Q(student_id__icontains=query) |
            models.Q(user__first_name__icontains=query) |
            models.Q(user__last_name__icontains=query)
        ).select_related('user', 'program')

        serializer = StudentProfileSerializer(students, many=True)
        return Response(serializer.data)


class CashierPaymentViewSet(viewsets.ViewSet):
    """API endpoint for cashier to manage payments."""
    permission_classes = [permissions.IsAuthenticated, IsCashier]

    @action(detail=False, methods=['post'])
    def record_payment(self, request):
        """Record a payment for a student."""
        student_id = request.data.get('student_id')
        amount = Decimal(str(request.data.get('amount', 0)))
        method = request.data.get('method')
        reference_number = request.data.get('reference_number', '')
        notes = request.data.get('notes', '')

        try:
            student = Student.objects.get(student_id=student_id)

            # Get current enrollment
            enrollment = student.enrollments.first()
            if not enrollment:
                return Response(
                    {'error': 'No active enrollment found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            with transaction.atomic():
                # Allocate payment (creates Payment record internally)
                allocation_result = allocate_payment(
                    enrollment=enrollment,
                    amount=amount,
                    method=method,
                    reference_number=reference_number,
                    user=request.user,
                    ip_address=self._get_client_ip(request)
                )

                # Get the Payment record created by allocate_payment
                payment = allocation_result['payment'] if isinstance(allocation_result, dict) else allocation_result

                # Update payment with additional fields
                payment.notes = notes
                payment.processed_by = request.user
                payment.save()

                # Log the action
                log_action(
                    user=request.user,
                    action='PAYMENT_RECORDED',
                    target_model='Payment',
                    target_id=payment.id,
                    ip_address=self._get_client_ip(request)
                )

                serializer = PaymentSerializer(payment)
                return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Student.DoesNotExist:
            return Response(
                {'error': 'Student not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def payment_methods(self, request):
        """Get list of available payment methods."""
        methods = [
            {'value': 'CASH', 'label': 'Cash'},
            {'value': 'CHECK', 'label': 'Check'},
            {'value': 'CREDIT_CARD', 'label': 'Credit Card'},
            {'value': 'BANK_TRANSFER', 'label': 'Bank Transfer'},
            {'value': 'ONLINE', 'label': 'Online Payment'}
        ]
        return Response(methods)

    def _get_client_ip(self, request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


# ===== PUBLIC API VIEWS =====

class PublicProgramViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for public to view programs."""
    permission_classes = [permissions.AllowAny]
    serializer_class = ProgramSerializer
    http_method_names = ['get']

    def get_queryset(self):
        """Return only active programs."""
        return Program.objects.filter(is_active=True)

    @action(detail=True, methods=['get'])
    def subjects(self, request, pk=None):
        """Get subjects offered in a program."""
        program = self.get_object()
        subjects = Subject.objects.filter(
            sections__subject__program=program
        ).distinct()
        serializer = SubjectSerializer(subjects, many=True)
        return Response(serializer.data)


class PublicEnrollmentViewSet(viewsets.ViewSet):
    """API endpoint for public online enrollment."""
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['post'])
    def new_student(self, request):
        """Create new student online enrollment (admissions)."""
        try:
            with transaction.atomic():
                # Create user account
                username = request.data.get('email').split('@')[0]
                user = User.objects.create_user(
                    username=username,
                    email=request.data.get('email'),
                    first_name=request.data.get('first_name'),
                    last_name=request.data.get('last_name'),
                    password=request.data.get('password'),
                    role='STUDENT'
                )

                # Create student profile
                import uuid
                from django.utils import timezone
                program = Program.objects.get(id=request.data.get('program_id'))
                student_id = f"STU-{uuid.uuid4().hex[:8].upper()}"
                student = Student.objects.create(
                    user=user,
                    student_id=student_id,
                    program=program,
                    status='ACTIVE',
                    enrollment_year=timezone.now().year
                )

                # Log the action
                log_action(
                    user=None,
                    action='USER_CREATED',
                    target_model='User',
                    target_id=user.id
                )

                serializer = StudentProfileSerializer(student)
                return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Program.DoesNotExist:
            return Response(
                {'error': 'Program not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
