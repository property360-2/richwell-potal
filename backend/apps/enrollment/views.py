"""
Enrollment views - Admissions and enrollment endpoints.
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView, CreateAPIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.conf import settings
from django.utils import timezone
from django.db import transaction
from drf_spectacular.utils import extend_schema

from apps.core.permissions import IsRegistrar, IsAdmissionStaff
from apps.core.exceptions import EnrollmentLinkDisabledError, NotFoundError
from apps.academics.models import Program, Subject
from apps.academics.serializers import ProgramSerializer
from apps.audit.models import AuditLog

from .models import (
    Enrollment, EnrollmentDocument, SubjectEnrollment, CreditSource
)
from .serializers import (
    OnlineEnrollmentSerializer,
    EnrollmentSerializer,
    EnrollmentDocumentSerializer,
    TransfereeCreateSerializer,
    DocumentUploadSerializer,
    BulkCreditSerializer
)
from .services import EnrollmentService


class EnrollmentStatusView(APIView):
    """
    Check if online enrollment is currently open.
    Public endpoint.
    """
    permission_classes = [AllowAny]
    
    @extend_schema(
        summary="Enrollment Status",
        description="Check if online enrollment is currently open",
        tags=["Admissions"]
    )
    def get(self, request):
        enrollment_enabled = settings.SYSTEM_CONFIG.get('ENROLLMENT_LINK_ENABLED', False)
        return Response({
            "success": True,
            "data": {
                "enrollment_link_enabled": enrollment_enabled
            }
        })


class PublicProgramListView(ListAPIView):
    """
    List available programs for enrollment.
    Public endpoint.
    """
    permission_classes = [AllowAny]
    queryset = Program.objects.filter(is_active=True, is_deleted=False)
    serializer_class = ProgramSerializer
    
    @extend_schema(
        summary="Available Programs",
        description="List all programs available for enrollment",
        tags=["Admissions"]
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class OnlineEnrollmentView(APIView):
    """
    Online enrollment form submission.
    Creates user account, student profile, enrollment, and payment buckets.
    """
    permission_classes = [AllowAny]
    
    @extend_schema(
        summary="Submit Online Enrollment",
        description="Submit online enrollment form. Creates user account and enrollment record.",
        tags=["Admissions"],
        request=OnlineEnrollmentSerializer,
        responses={201: EnrollmentSerializer}
    )
    def post(self, request):
        # Check if enrollment is enabled
        if not settings.SYSTEM_CONFIG.get('ENROLLMENT_LINK_ENABLED', False):
            raise EnrollmentLinkDisabledError()
        
        serializer = OnlineEnrollmentSerializer(data=request.data)
        if serializer.is_valid():
            service = EnrollmentService()
            enrollment = service.create_online_enrollment(serializer.validated_data)
            
            return Response({
                "success": True,
                "message": "Enrollment successful! Please check your email for login credentials.",
                "data": EnrollmentSerializer(enrollment).data
            }, status=status.HTTP_201_CREATED)
        
        return Response({
            "success": False,
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class DocumentUploadView(APIView):
    """
    Upload documents for an enrollment.
    Used by students to upload required documents after enrollment.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    @extend_schema(
        summary="Upload Document",
        description="Upload a document for an enrollment",
        tags=["Documents"],
        request=DocumentUploadSerializer
    )
    def post(self, request, enrollment_id):
        try:
            # Get enrollment (verify ownership or staff access)
            if request.user.role == 'STUDENT':
                enrollment = Enrollment.objects.get(
                    id=enrollment_id, 
                    student=request.user
                )
            else:
                enrollment = Enrollment.objects.get(id=enrollment_id)
        except Enrollment.DoesNotExist:
            raise NotFoundError("Enrollment not found")
        
        serializer = DocumentUploadSerializer(data=request.data)
        if serializer.is_valid():
            uploaded_file = serializer.validated_data['file']
            
            document = EnrollmentDocument.objects.create(
                enrollment=enrollment,
                document_type=serializer.validated_data['document_type'],
                file=uploaded_file,
                original_filename=uploaded_file.name
            )
            
            # Log to audit
            AuditLog.log(
                action=AuditLog.Action.DOCUMENT_VERIFIED,  # Using closest action type
                target_model='EnrollmentDocument',
                target_id=document.id,
                payload={
                    'document_type': document.document_type,
                    'filename': document.original_filename,
                    'enrollment_id': str(enrollment.id)
                }
            )
            
            return Response({
                "success": True,
                "message": "Document uploaded successfully",
                "data": EnrollmentDocumentSerializer(document).data
            }, status=status.HTTP_201_CREATED)
        
        return Response({
            "success": False,
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class TransfereeCreateView(APIView):
    """
    Create a transferee account (registrar only).
    """
    permission_classes = [IsAuthenticated, IsRegistrar]
    
    @extend_schema(
        summary="Create Transferee",
        description="Create a new transferee student account (registrar only)",
        tags=["Registrar"],
        request=TransfereeCreateSerializer,
        responses={201: EnrollmentSerializer}
    )
    def post(self, request):
        serializer = TransfereeCreateSerializer(data=request.data)
        if serializer.is_valid():
            service = EnrollmentService()
            enrollment = service.create_transferee_enrollment(
                registrar=request.user,
                data=serializer.validated_data
            )
            
            return Response({
                "success": True,
                "message": "Transferee account created successfully",
                "data": EnrollmentSerializer(enrollment).data
            }, status=status.HTTP_201_CREATED)
        
        return Response({
            "success": False,
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class TransfereeCreditView(APIView):
    """
    Add credited subjects for a transferee.
    """
    permission_classes = [IsAuthenticated, IsRegistrar]
    
    @extend_schema(
        summary="Add Transferee Credits",
        description="Add credited subjects from previous school for a transferee",
        tags=["Registrar"],
        request=BulkCreditSerializer
    )
    @transaction.atomic
    def post(self, request, pk):
        try:
            enrollment = Enrollment.objects.select_related(
                'student__student_profile'
            ).get(id=pk)
        except Enrollment.DoesNotExist:
            raise NotFoundError("Enrollment not found")
        
        # Verify student is a transferee
        if not hasattr(enrollment.student, 'student_profile') or \
           not enrollment.student.student_profile.is_transferee:
            return Response({
                "success": False,
                "error": "Student is not a transferee"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = BulkCreditSerializer(data=request.data)
        if serializer.is_valid():
            created_credits = []
            
            for credit_data in serializer.validated_data['credits']:
                subject = Subject.objects.get(id=credit_data['subject_id'])
                
                # Check if already credited
                existing = SubjectEnrollment.objects.filter(
                    enrollment=enrollment,
                    subject=subject
                ).first()
                
                if existing:
                    continue  # Skip if already credited
                
                # Create SubjectEnrollment with CREDITED status
                subject_enrollment = SubjectEnrollment.objects.create(
                    enrollment=enrollment,
                    subject=subject,
                    section=None,  # No section for credits
                    status=SubjectEnrollment.Status.CREDITED,
                    count_in_gpa=credit_data.get('count_in_gpa', False)
                )
                
                # Create CreditSource record
                CreditSource.objects.create(
                    subject_enrollment=subject_enrollment,
                    original_school=enrollment.student.student_profile.previous_school,
                    original_subject_code=credit_data['original_subject_code'],
                    original_grade=credit_data.get('original_grade'),
                    notes=credit_data.get('notes', ''),
                    credited_by=request.user
                )
                
                created_credits.append({
                    'subject_code': subject.code,
                    'subject_title': subject.title,
                    'units': subject.units
                })
            
            # Log to audit
            AuditLog.log(
                action=AuditLog.Action.CREDIT_ASSIGNED,
                target_model='Enrollment',
                target_id=enrollment.id,
                payload={
                    'credits': created_credits,
                    'registrar': request.user.email
                }
            )
            
            return Response({
                "success": True,
                "message": f"{len(created_credits)} credits assigned successfully",
                "data": {
                    "credits_assigned": created_credits,
                    "total_credited_units": sum(c['units'] for c in created_credits)
                }
            }, status=status.HTTP_201_CREATED)
        
        return Response({
            "success": False,
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class ApplicantListView(ListAPIView):
    """
    List recent applicants for the admission dashboard.
    """
    permission_classes = [IsAuthenticated, IsAdmissionStaff | IsRegistrar]
    serializer_class = EnrollmentSerializer
    
    @extend_schema(
        summary="List Applicants",
        description="List recent enrollment applications",
        tags=["Admissions"]
    )
    def get_queryset(self):
        queryset = Enrollment.objects.select_related(
            'student', 'semester'
        ).prefetch_related(
            'documents', 'payment_buckets'
        ).order_by('-created_at')
        
        # Filter by status if provided
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by created_via if provided
        created_via = self.request.query_params.get('created_via')
        if created_via:
            queryset = queryset.filter(created_via=created_via)
        
        return queryset[:100]  # Limit to 100 records


class DocumentVerifyView(APIView):
    """
    Verify an enrollment document.
    """
    permission_classes = [IsAuthenticated, IsAdmissionStaff | IsRegistrar]
    
    @extend_schema(
        summary="Verify Document",
        description="Mark an enrollment document as verified",
        tags=["Admissions"]
    )
    def patch(self, request, pk):
        try:
            document = EnrollmentDocument.objects.get(pk=pk)
        except EnrollmentDocument.DoesNotExist:
            raise NotFoundError("Document not found")
        
        document.is_verified = True
        document.verified_by = request.user
        document.verified_at = timezone.now()
        document.notes = request.data.get('notes', document.notes)
        document.save()
        
        # Log to audit
        AuditLog.log(
            action=AuditLog.Action.DOCUMENT_VERIFIED,
            target_model='EnrollmentDocument',
            target_id=document.id,
            payload={
                'document_type': document.document_type,
                'enrollment_id': str(document.enrollment.id)
            }
        )
        
        return Response({
            "success": True,
            "data": EnrollmentDocumentSerializer(document).data
        })


class EnrollmentDetailView(APIView):
    """
    Get enrollment details for the current user.
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="Get My Enrollment",
        description="Get the current user's enrollment details",
        tags=["Enrollment"]
    )
    def get(self, request):
        if request.user.role != 'STUDENT':
            return Response({
                "success": False,
                "error": "Only students can access this endpoint"
            }, status=status.HTTP_403_FORBIDDEN)
        
        enrollment = Enrollment.objects.filter(
            student=request.user
        ).select_related(
            'semester'
        ).prefetch_related(
            'payment_buckets', 'documents', 'subject_enrollments__subject'
        ).order_by('-created_at').first()
        
        if not enrollment:
            raise NotFoundError("No enrollment found")
        
        return Response({
            "success": True,
            "data": EnrollmentSerializer(enrollment).data
        })


# ============================================================
# Subject Enrollment Views (EPIC 3)
# ============================================================

from .serializers import (
    SubjectEnrollmentSerializer,
    RecommendedSubjectSerializer,
    AvailableSubjectSerializer,
    EnrollSubjectRequestSerializer,
    RegistrarOverrideSerializer
)
from .services import SubjectEnrollmentService


class RecommendedSubjectsView(APIView):
    """
    Get recommended subjects for the current student.
    Based on year level and curriculum.
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="Get Recommended Subjects",
        description="Get subjects recommended for the student's current year and semester",
        tags=["Subject Enrollment"]
    )
    def get(self, request):
        if request.user.role != 'STUDENT':
            return Response({
                "success": False,
                "error": "Only students can access this endpoint"
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get current semester
        from .models import Semester
        semester = Semester.objects.filter(is_current=True).first()
        if not semester:
            raise NotFoundError("No active semester found")
        
        service = SubjectEnrollmentService()
        recommended = service.get_recommended_subjects(request.user, semester)
        
        serializer = RecommendedSubjectSerializer(
            recommended, 
            many=True,
            context={
                'service': service,
                'student': request.user,
                'semester': semester
            }
        )
        
        # Get current enrollment stats
        current_units = service.get_current_enrolled_units(request.user, semester)
        max_units = service.max_units
        
        return Response({
            "success": True,
            "data": {
                "recommended_subjects": serializer.data,
                "current_units": current_units,
                "max_units": max_units,
                "remaining_units": max_units - current_units
            }
        })


class AvailableSubjectsView(APIView):
    """
    Get all available subjects for the current student.
    Includes subjects outside the recommended year/semester.
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="Get Available Subjects",
        description="Get all subjects the student can enroll in (with sections)",
        tags=["Subject Enrollment"]
    )
    def get(self, request):
        if request.user.role != 'STUDENT':
            return Response({
                "success": False,
                "error": "Only students can access this endpoint"
            }, status=status.HTTP_403_FORBIDDEN)
        
        from .models import Semester
        semester = Semester.objects.filter(is_current=True).first()
        if not semester:
            raise NotFoundError("No active semester found")
        
        service = SubjectEnrollmentService()
        available = service.get_available_subjects(request.user, semester)
        
        serializer = AvailableSubjectSerializer(
            available,
            many=True,
            context={
                'service': service,
                'student': request.user,
                'semester': semester
            }
        )
        
        return Response({
            "success": True,
            "data": {
                "available_subjects": serializer.data,
                "total_available": len(serializer.data)
            }
        })


class MySubjectEnrollmentsView(APIView):
    """
    Get current student's subject enrollments.
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="Get My Subject Enrollments",
        description="Get the student's current subject enrollments for the active semester",
        tags=["Subject Enrollment"]
    )
    def get(self, request):
        if request.user.role != 'STUDENT':
            return Response({
                "success": False,
                "error": "Only students can access this endpoint"
            }, status=status.HTTP_403_FORBIDDEN)
        
        from .models import Semester
        semester = Semester.objects.filter(is_current=True).first()
        if not semester:
            raise NotFoundError("No active semester found")
        
        enrollment = Enrollment.objects.filter(
            student=request.user,
            semester=semester
        ).first()
        
        if not enrollment:
            raise NotFoundError("No enrollment found for current semester")
        
        subject_enrollments = SubjectEnrollment.objects.filter(
            enrollment=enrollment
        ).select_related('subject', 'section').order_by('-created_at')
        
        serializer = SubjectEnrollmentSerializer(subject_enrollments, many=True)
        
        # Calculate total units
        enrolled_units = sum(
            se.subject.units for se in subject_enrollments 
            if se.status == SubjectEnrollment.Status.ENROLLED
        )
        
        return Response({
            "success": True,
            "data": {
                "subject_enrollments": serializer.data,
                "enrolled_units": enrolled_units,
                "semester": str(semester)
            }
        })


class EnrollSubjectView(APIView):
    """
    Enroll in a subject.
    Validates prerequisites, unit cap, payment status, and schedule conflicts.
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="Enroll in Subject",
        description="Enroll the student in a subject with full validation",
        tags=["Subject Enrollment"],
        request=EnrollSubjectRequestSerializer
    )
    @transaction.atomic
    def post(self, request):
        if request.user.role != 'STUDENT':
            return Response({
                "success": False,
                "error": "Only students can access this endpoint"
            }, status=status.HTTP_403_FORBIDDEN)
        
        serializer = EnrollSubjectRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "success": False,
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        from .models import Semester
        from apps.academics.models import Subject, Section
        
        semester = Semester.objects.filter(is_current=True).first()
        if not semester:
            raise NotFoundError("No active semester found")
        
        # Get current enrollment
        enrollment = Enrollment.objects.filter(
            student=request.user,
            semester=semester
        ).first()
        
        if not enrollment:
            raise NotFoundError("No enrollment found for current semester")
        
        # Get subject and section
        subject = Subject.objects.get(id=serializer.validated_data['subject_id'])
        section = Section.objects.get(id=serializer.validated_data['section_id'])
        
        # Enroll via service (handles all validation)
        service = SubjectEnrollmentService()
        subject_enrollment = service.enroll_in_subject(
            student=request.user,
            enrollment=enrollment,
            subject=subject,
            section=section
        )
        
        return Response({
            "success": True,
            "message": f"Successfully enrolled in {subject.code}",
            "data": SubjectEnrollmentSerializer(subject_enrollment).data
        }, status=status.HTTP_201_CREATED)


class DropSubjectView(APIView):
    """
    Drop a subject enrollment.
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="Drop Subject",
        description="Drop a subject enrollment (changes status to DROPPED)",
        tags=["Subject Enrollment"]
    )
    @transaction.atomic
    def post(self, request, pk):
        if request.user.role != 'STUDENT':
            return Response({
                "success": False,
                "error": "Only students can access this endpoint"
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            subject_enrollment = SubjectEnrollment.objects.select_related(
                'enrollment', 'subject', 'section'
            ).get(
                id=pk,
                enrollment__student=request.user,
                status=SubjectEnrollment.Status.ENROLLED
            )
        except SubjectEnrollment.DoesNotExist:
            raise NotFoundError("Subject enrollment not found or already dropped")
        
        service = SubjectEnrollmentService()
        subject_enrollment = service.drop_subject(subject_enrollment, request.user)
        
        return Response({
            "success": True,
            "message": f"Successfully dropped {subject_enrollment.subject.code}",
            "data": SubjectEnrollmentSerializer(subject_enrollment).data
        })


class RegistrarOverrideEnrollmentView(APIView):
    """
    Registrar override enrollment.
    Bypasses all validation rules with justification.
    """
    permission_classes = [IsAuthenticated, IsRegistrar]
    
    @extend_schema(
        summary="Override Enrollment",
        description="Registrar override to enroll a student bypassing validation rules",
        tags=["Registrar"],
        request=RegistrarOverrideSerializer
    )
    @transaction.atomic
    def post(self, request, enrollment_id):
        serializer = RegistrarOverrideSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "success": False,
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        from apps.accounts.models import User
        from apps.academics.models import Subject, Section
        
        # Get enrollment
        try:
            enrollment = Enrollment.objects.get(id=enrollment_id)
        except Enrollment.DoesNotExist:
            raise NotFoundError("Enrollment not found")
        
        # Get entities
        try:
            student = User.objects.get(id=serializer.validated_data['student_id'])
            subject = Subject.objects.get(id=serializer.validated_data['subject_id'])
            section = Section.objects.get(id=serializer.validated_data['section_id'])
        except (User.DoesNotExist, Subject.DoesNotExist, Section.DoesNotExist) as e:
            raise NotFoundError(str(e))
        
        # Verify enrollment belongs to student
        if enrollment.student_id != student.id:
            return Response({
                "success": False,
                "error": "Enrollment does not belong to specified student"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        service = SubjectEnrollmentService()
        subject_enrollment = service.registrar_override_enroll(
            registrar=request.user,
            student=student,
            enrollment=enrollment,
            subject=subject,
            section=section,
            override_reason=serializer.validated_data['override_reason']
        )
        
        return Response({
            "success": True,
            "message": f"Override enrollment successful for {subject.code}",
            "data": SubjectEnrollmentSerializer(subject_enrollment).data
        }, status=status.HTTP_201_CREATED)


# ============================================================
# Payment & Exam Permit Views (EPIC 4)
# ============================================================

from .models import PaymentTransaction, ExamMonthMapping, ExamPermit
from .serializers import (
    PaymentTransactionSerializer,
    PaymentRecordSerializer,
    PaymentAdjustmentSerializer,
    ExamMonthMappingSerializer,
    ExamMonthMappingCreateSerializer,
    ExamPermitSerializer,
    ExamPermitStatusSerializer,
    PaymentSummarySerializer
)
from .services import PaymentService, ExamPermitService
from apps.core.permissions import IsCashier


class PaymentRecordView(APIView):
    """
    Record a new payment (cashier only).
    """
    permission_classes = [IsAuthenticated, IsCashier | IsRegistrar]
    
    @extend_schema(
        summary="Record Payment",
        description="Record a new payment for a student enrollment",
        tags=["Payments"],
        request=PaymentRecordSerializer,
        responses={201: PaymentTransactionSerializer}
    )
    @transaction.atomic
    def post(self, request):
        serializer = PaymentRecordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "success": False,
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        enrollment = Enrollment.objects.get(id=data['enrollment_id'])
        
        from decimal import Decimal
        payment = PaymentService.record_payment(
            enrollment=enrollment,
            amount=Decimal(str(data['amount'])),
            payment_mode=data['payment_mode'],
            cashier=request.user,
            reference_number=data.get('reference_number', ''),
            allocations=data.get('allocations'),
            notes=data.get('notes', '')
        )
        
        return Response({
            "success": True,
            "message": f"Payment of ₱{payment.amount} recorded successfully",
            "data": PaymentTransactionSerializer(payment).data
        }, status=status.HTTP_201_CREATED)


class PaymentAdjustmentView(APIView):
    """
    Create a payment adjustment (cashier only).
    """
    permission_classes = [IsAuthenticated, IsCashier | IsRegistrar]
    
    @extend_schema(
        summary="Adjust Payment",
        description="Create an adjustment for an existing payment",
        tags=["Payments"],
        request=PaymentAdjustmentSerializer,
        responses={201: PaymentTransactionSerializer}
    )
    @transaction.atomic
    def post(self, request):
        serializer = PaymentAdjustmentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "success": False,
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        original = PaymentTransaction.objects.get(id=data['transaction_id'])
        
        from decimal import Decimal
        adjustment = PaymentService.create_adjustment(
            original_transaction=original,
            adjustment_amount=Decimal(str(data['adjustment_amount'])),
            reason=data['reason'],
            cashier=request.user
        )
        
        return Response({
            "success": True,
            "message": "Adjustment recorded successfully",
            "data": PaymentTransactionSerializer(adjustment).data
        }, status=status.HTTP_201_CREATED)


class StudentPaymentHistoryView(APIView):
    """
    Get payment history for a specific student (cashier/registrar).
    """
    permission_classes = [IsAuthenticated, IsCashier | IsRegistrar]
    
    @extend_schema(
        summary="Get Student Payments",
        description="Get payment history for a specific enrollment",
        tags=["Payments"]
    )
    def get(self, request, enrollment_id):
        try:
            enrollment = Enrollment.objects.get(id=enrollment_id)
        except Enrollment.DoesNotExist:
            raise NotFoundError("Enrollment not found")
        
        summary = PaymentService.get_payment_summary(enrollment)
        
        return Response({
            "success": True,
            "data": summary
        })


class MyPaymentsView(APIView):
    """
    Get current student's payment history.
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="Get My Payments",
        description="Get the current student's payment history",
        tags=["Payments"]
    )
    def get(self, request):
        if request.user.role != 'STUDENT':
            return Response({
                "success": False,
                "error": "Only students can access this endpoint"
            }, status=status.HTTP_403_FORBIDDEN)
        
        from .models import Semester
        semester = Semester.objects.filter(is_current=True).first()
        if not semester:
            raise NotFoundError("No active semester found")
        
        enrollment = Enrollment.objects.filter(
            student=request.user,
            semester=semester
        ).first()
        
        if not enrollment:
            raise NotFoundError("No enrollment found for current semester")
        
        summary = PaymentService.get_payment_summary(enrollment)
        
        return Response({
            "success": True,
            "data": summary
        })


class PaymentTransactionListView(ListAPIView):
    """
    List all payment transactions (admin/registrar).
    """
    permission_classes = [IsAuthenticated, IsRegistrar]
    serializer_class = PaymentTransactionSerializer
    
    @extend_schema(
        summary="List Transactions",
        description="List all payment transactions with filters",
        tags=["Payments"]
    )
    def get_queryset(self):
        queryset = PaymentTransaction.objects.select_related(
            'enrollment__student', 'processed_by'
        ).order_by('-processed_at')
        
        # Filter by date range
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if date_from:
            queryset = queryset.filter(processed_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(processed_at__date__lte=date_to)
        
        # Filter by payment mode
        payment_mode = self.request.query_params.get('payment_mode')
        if payment_mode:
            queryset = queryset.filter(payment_mode=payment_mode)
        
        # Filter adjustments
        is_adjustment = self.request.query_params.get('is_adjustment')
        if is_adjustment is not None:
            queryset = queryset.filter(is_adjustment=is_adjustment.lower() == 'true')
        
        return queryset[:100]


class ExamMonthMappingView(APIView):
    """
    Manage exam-month mappings (admin/registrar).
    """
    permission_classes = [IsAuthenticated, IsRegistrar]
    
    @extend_schema(
        summary="List Exam Mappings",
        description="List all exam-month mappings for a semester",
        tags=["Exam Permits"]
    )
    def get(self, request):
        from .models import Semester
        
        semester_id = request.query_params.get('semester_id')
        if semester_id:
            mappings = ExamMonthMapping.objects.filter(semester_id=semester_id)
        else:
            # Default to current semester
            semester = Semester.objects.filter(is_current=True).first()
            if semester:
                mappings = ExamMonthMapping.objects.filter(semester=semester)
            else:
                mappings = ExamMonthMapping.objects.none()
        
        serializer = ExamMonthMappingSerializer(mappings, many=True)
        
        return Response({
            "success": True,
            "data": serializer.data
        })
    
    @extend_schema(
        summary="Create Exam Mapping",
        description="Create a new exam-month mapping",
        tags=["Exam Permits"],
        request=ExamMonthMappingCreateSerializer,
        responses={201: ExamMonthMappingSerializer}
    )
    @transaction.atomic
    def post(self, request):
        serializer = ExamMonthMappingCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "success": False,
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        from .models import Semester
        
        data = serializer.validated_data
        semester = Semester.objects.get(id=data['semester_id'])
        
        mapping = ExamMonthMapping.objects.create(
            semester=semester,
            exam_period=data['exam_period'],
            required_month=data['required_month']
        )
        
        return Response({
            "success": True,
            "message": f"{mapping.get_exam_period_display()} mapped to Month {mapping.required_month}",
            "data": ExamMonthMappingSerializer(mapping).data
        }, status=status.HTTP_201_CREATED)


class ExamMonthMappingDetailView(APIView):
    """
    Update or delete an exam-month mapping.
    """
    permission_classes = [IsAuthenticated, IsRegistrar]
    
    @extend_schema(
        summary="Update Exam Mapping",
        description="Update an exam-month mapping",
        tags=["Exam Permits"]
    )
    @transaction.atomic
    def patch(self, request, pk):
        try:
            mapping = ExamMonthMapping.objects.get(id=pk)
        except ExamMonthMapping.DoesNotExist:
            raise NotFoundError("Mapping not found")
        
        if 'required_month' in request.data:
            mapping.required_month = request.data['required_month']
        if 'is_active' in request.data:
            mapping.is_active = request.data['is_active']
        
        mapping.save()
        
        return Response({
            "success": True,
            "data": ExamMonthMappingSerializer(mapping).data
        })
    
    @extend_schema(
        summary="Delete Exam Mapping",
        description="Delete an exam-month mapping",
        tags=["Exam Permits"]
    )
    @transaction.atomic
    def delete(self, request, pk):
        try:
            mapping = ExamMonthMapping.objects.get(id=pk)
        except ExamMonthMapping.DoesNotExist:
            raise NotFoundError("Mapping not found")
        
        mapping.delete()
        
        return Response({
            "success": True,
            "message": "Mapping deleted"
        }, status=status.HTTP_204_NO_CONTENT)


class MyExamPermitsView(APIView):
    """
    Get current student's exam permits.
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="Get My Exam Permits",
        description="Get the current student's exam permit status for all periods",
        tags=["Exam Permits"]
    )
    def get(self, request):
        if request.user.role != 'STUDENT':
            return Response({
                "success": False,
                "error": "Only students can access this endpoint"
            }, status=status.HTTP_403_FORBIDDEN)
        
        from .models import Semester
        semester = Semester.objects.filter(is_current=True).first()
        if not semester:
            raise NotFoundError("No active semester found")
        
        enrollment = Enrollment.objects.filter(
            student=request.user,
            semester=semester
        ).first()
        
        if not enrollment:
            raise NotFoundError("No enrollment found for current semester")
        
        permits = ExamPermitService.get_student_permits(enrollment)
        
        return Response({
            "success": True,
            "data": {
                "permits": permits,
                "semester": str(semester)
            }
        })


class GenerateExamPermitView(APIView):
    """
    Generate an exam permit (checks eligibility first).
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="Generate Exam Permit",
        description="Generate an exam permit for a specific exam period",
        tags=["Exam Permits"],
        responses={201: ExamPermitSerializer}
    )
    @transaction.atomic
    def post(self, request, exam_period):
        if request.user.role != 'STUDENT':
            return Response({
                "success": False,
                "error": "Only students can access this endpoint"
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Validate exam_period
        valid_periods = [choice[0] for choice in ExamMonthMapping.ExamPeriod.choices]
        if exam_period not in valid_periods:
            return Response({
                "success": False,
                "error": f"Invalid exam period. Valid values: {', '.join(valid_periods)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        from .models import Semester
        semester = Semester.objects.filter(is_current=True).first()
        if not semester:
            raise NotFoundError("No active semester found")
        
        enrollment = Enrollment.objects.filter(
            student=request.user,
            semester=semester
        ).first()
        
        if not enrollment:
            raise NotFoundError("No enrollment found for current semester")
        
        # Check eligibility
        is_eligible, reason = ExamPermitService.check_permit_eligibility(
            enrollment, exam_period
        )
        
        if not is_eligible and reason != "Permit already generated":
            return Response({
                "success": False,
                "error": reason
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Generate permit
        permit = ExamPermitService.generate_permit(enrollment, exam_period)
        
        return Response({
            "success": True,
            "message": f"Exam permit generated for {permit.get_exam_period_display()}",
            "data": ExamPermitSerializer(permit).data
        }, status=status.HTTP_201_CREATED)


class PrintExamPermitView(APIView):
    """
    Mark an exam permit as printed.
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="Mark Permit Printed",
        description="Mark an exam permit as printed and record who printed it",
        tags=["Exam Permits"],
        responses={200: ExamPermitSerializer}
    )
    @transaction.atomic
    def post(self, request, permit_id):
        try:
            permit = ExamPermit.objects.get(id=permit_id)
        except ExamPermit.DoesNotExist:
            raise NotFoundError("Permit not found")
        
        # Verify ownership if student
        if request.user.role == 'STUDENT' and permit.enrollment.student_id != request.user.id:
            return Response({
                "success": False,
                "error": "You can only print your own permits"
            }, status=status.HTTP_403_FORBIDDEN)
        
        permit = ExamPermitService.mark_as_printed(permit, request.user)
        
        return Response({
            "success": True,
            "message": "Permit marked as printed",
            "data": ExamPermitSerializer(permit).data
        })


class ExamPermitListView(ListAPIView):
    """
    List all exam permits (registrar/admin).
    """
    permission_classes = [IsAuthenticated, IsRegistrar]
    serializer_class = ExamPermitSerializer
    
    @extend_schema(
        summary="List All Permits",
        description="List all exam permits with filters",
        tags=["Exam Permits"]
    )
    def get_queryset(self):
        queryset = ExamPermit.objects.select_related(
            'enrollment__student', 'printed_by'
        ).order_by('-created_at')
        
        # Filter by semester
        semester_id = self.request.query_params.get('semester_id')
        if semester_id:
            queryset = queryset.filter(enrollment__semester_id=semester_id)
        
        # Filter by exam period
        exam_period = self.request.query_params.get('exam_period')
        if exam_period:
            queryset = queryset.filter(exam_period=exam_period)
        
        # Filter by printed status
        is_printed = self.request.query_params.get('is_printed')
        if is_printed is not None:
            queryset = queryset.filter(is_printed=is_printed.lower() == 'true')
        
        return queryset[:100]


# ============================================================
# Grade Management Views (EPIC 5)
# ============================================================

from .models import GradeHistory, SemesterGPA
from .serializers import (
    GradeHistorySerializer,
    SemesterGPASerializer,
    GradeSubmitSerializer,
    GradeOverrideSerializer,
    SubjectEnrollmentSerializer,
    INCReportSerializer,
    UpdateStandingSerializer
)
from .services import GradeService, INCAutomationService
from apps.core.permissions import IsProfessor


class ProfessorSectionsView(APIView):
    """
    Get sections where the current professor teaches.
    """
    permission_classes = [IsAuthenticated, IsProfessor]
    
    @extend_schema(
        summary="Get My Sections",
        description="Get sections where the current professor teaches",
        tags=["Grades"]
    )
    def get(self, request):
        from apps.academics.models import SectionSubject, Section
        
        # Get sections where professor is assigned
        section_subjects = SectionSubject.objects.filter(
            professor=request.user,
            is_deleted=False
        ).select_related('section', 'subject', 'section__semester')
        
        # Group by section
        sections_dict = {}
        for ss in section_subjects:
            section = ss.section
            if section.id not in sections_dict:
                sections_dict[section.id] = {
                    'section_id': str(section.id),
                    'section_name': section.name,
                    'semester': str(section.semester),
                    'semester_id': str(section.semester.id),
                    'subjects': []
                }
            
            sections_dict[section.id]['subjects'].append({
                'subject_id': str(ss.subject.id),
                'subject_code': ss.subject.code,
                'subject_title': ss.subject.title,
                'units': ss.subject.units
            })
        
        return Response({
            "success": True,
            "data": list(sections_dict.values())
        })


class SectionStudentsView(APIView):
    """
    Get students in a section with their grades.
    """
    permission_classes = [IsAuthenticated, IsProfessor | IsRegistrar]
    
    @extend_schema(
        summary="Get Section Students",
        description="Get students in a section with grades for a specific subject",
        tags=["Grades"]
    )
    def get(self, request, section_id, subject_id):
        from apps.academics.models import Section, Subject, SectionSubject
        
        try:
            section = Section.objects.get(id=section_id)
            subject = Subject.objects.get(id=subject_id)
        except (Section.DoesNotExist, Subject.DoesNotExist):
            raise NotFoundError("Section or subject not found")
        
        # Verify professor is assigned (if professor)
        if request.user.role == 'PROFESSOR':
            is_assigned = SectionSubject.objects.filter(
                section=section,
                subject=subject,
                professor=request.user
            ).exists()
            
            if not is_assigned:
                return Response({
                    "success": False,
                    "error": "You are not assigned to teach this subject in this section"
                }, status=status.HTTP_403_FORBIDDEN)
        
        # Get student enrollments
        enrollments = SubjectEnrollment.objects.filter(
            section=section,
            subject=subject
        ).select_related('enrollment__student').order_by('enrollment__student__last_name')
        
        students = []
        for se in enrollments:
            students.append({
                'subject_enrollment_id': str(se.id),
                'student_number': se.enrollment.student.student_number,
                'student_name': se.enrollment.student.get_full_name(),
                'grade': str(se.grade) if se.grade else None,
                'status': se.status,
                'status_display': se.get_status_display(),
                'is_finalized': se.is_finalized,
                'finalized_at': se.finalized_at.isoformat() if se.finalized_at else None
            })
        
        return Response({
            "success": True,
            "data": {
                'section': section.name,
                'subject_code': subject.code,
                'subject_title': subject.title,
                'students': students,
                'total_students': len(students)
            }
        })


class SubmitGradeView(APIView):
    """
    Submit or update a grade (professor only).
    """
    permission_classes = [IsAuthenticated, IsProfessor]
    
    @extend_schema(
        summary="Submit Grade",
        description="Submit or update a grade for a student",
        tags=["Grades"],
        request=GradeSubmitSerializer,
        responses={200: SubjectEnrollmentSerializer}
    )
    @transaction.atomic
    def post(self, request):
        serializer = GradeSubmitSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "success": False,
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        
        try:
            subject_enrollment = SubjectEnrollment.objects.get(
                id=data['subject_enrollment_id']
            )
        except SubjectEnrollment.DoesNotExist:
            raise NotFoundError("Subject enrollment not found")
        
        try:
            updated = GradeService.submit_grade(
                subject_enrollment=subject_enrollment,
                grade=data.get('grade'),
                professor=request.user,
                is_inc=data.get('is_inc', False),
                change_reason=data.get('change_reason', '')
            )
        except ValueError as e:
            return Response({
                "success": False,
                "error": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            "success": True,
            "message": "Grade submitted successfully",
            "data": SubjectEnrollmentSerializer(updated).data
        })


class FinalizeSectionGradesView(APIView):
    """
    Finalize all grades for a section (registrar only).
    """
    permission_classes = [IsAuthenticated, IsRegistrar]
    
    @extend_schema(
        summary="Finalize Section Grades",
        description="Finalize all grades for a section",
        tags=["Grades"]
    )
    @transaction.atomic
    def post(self, request, section_id):
        from apps.academics.models import Section
        
        try:
            section = Section.objects.get(id=section_id)
        except Section.DoesNotExist:
            raise NotFoundError("Section not found")
        
        finalized = GradeService.finalize_section_grades(
            section=section,
            registrar=request.user
        )
        
        return Response({
            "success": True,
            "message": f"Finalized {len(finalized)} grades",
            "data": {
                'section': section.name,
                'finalized_count': len(finalized)
            }
        })


class OverrideGradeView(APIView):
    """
    Override a grade (registrar only).
    """
    permission_classes = [IsAuthenticated, IsRegistrar]
    
    @extend_schema(
        summary="Override Grade",
        description="Override a grade (even if finalized)",
        tags=["Grades"],
        request=GradeOverrideSerializer,
        responses={200: SubjectEnrollmentSerializer}
    )
    @transaction.atomic
    def post(self, request):
        serializer = GradeOverrideSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "success": False,
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        
        try:
            subject_enrollment = SubjectEnrollment.objects.get(
                id=data['subject_enrollment_id']
            )
        except SubjectEnrollment.DoesNotExist:
            raise NotFoundError("Subject enrollment not found")
        
        try:
            updated = GradeService.override_grade(
                subject_enrollment=subject_enrollment,
                new_grade=data['new_grade'],
                registrar=request.user,
                reason=data['reason']
            )
        except ValueError as e:
            return Response({
                "success": False,
                "error": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            "success": True,
            "message": "Grade overridden successfully",
            "data": SubjectEnrollmentSerializer(updated).data
        })


class GradeHistoryView(APIView):
    """
    Get grade change history for a subject enrollment.
    """
    permission_classes = [IsAuthenticated, IsProfessor | IsRegistrar]
    
    @extend_schema(
        summary="Get Grade History",
        description="Get the history of grade changes for a subject enrollment",
        tags=["Grades"]
    )
    def get(self, request, subject_enrollment_id):
        try:
            subject_enrollment = SubjectEnrollment.objects.get(
                id=subject_enrollment_id
            )
        except SubjectEnrollment.DoesNotExist:
            raise NotFoundError("Subject enrollment not found")
        
        history = GradeHistory.objects.filter(
            subject_enrollment=subject_enrollment
        ).order_by('-created_at')
        
        serializer = GradeHistorySerializer(history, many=True)
        
        return Response({
            "success": True,
            "data": {
                'subject_code': subject_enrollment.subject.code,
                'student_name': subject_enrollment.enrollment.student.get_full_name(),
                'history': serializer.data
            }
        })


class MyGradesView(APIView):
    """
    Get current student's grades.
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="Get My Grades",
        description="Get the current student's grades for the current semester",
        tags=["Grades"]
    )
    def get(self, request):
        if request.user.role != 'STUDENT':
            return Response({
                "success": False,
                "error": "Only students can access this endpoint"
            }, status=status.HTTP_403_FORBIDDEN)
        
        semester = Semester.objects.filter(is_current=True).first()
        if not semester:
            raise NotFoundError("No active semester found")
        
        enrollment = Enrollment.objects.filter(
            student=request.user,
            semester=semester
        ).first()
        
        if not enrollment:
            raise NotFoundError("No enrollment found for current semester")
        
        # Get subject enrollments with grades
        from apps.academics.models import SectionSubject
        
        subject_enrollments = SubjectEnrollment.objects.filter(
            enrollment=enrollment
        ).select_related('subject', 'section')
        
        grades = []
        for se in subject_enrollments:
            # Get professor name
            professor_name = None
            if se.section:
                ss = SectionSubject.objects.filter(
                    section=se.section,
                    subject=se.subject
                ).select_related('professor').first()
                if ss and ss.professor:
                    professor_name = ss.professor.get_full_name()
            
            grades.append({
                'subject_code': se.subject.code,
                'subject_title': se.subject.title,
                'units': se.subject.units,
                'grade': str(se.grade) if se.grade else None,
                'status': se.status,
                'status_display': se.get_status_display(),
                'is_finalized': se.is_finalized,
                'professor_name': professor_name or 'TBA'
            })
        
        # Get GPA if available
        gpa_record = getattr(enrollment, 'gpa_record', None)
        
        return Response({
            "success": True,
            "data": {
                'semester': str(semester),
                'grades': grades,
                'gpa': str(gpa_record.gpa) if gpa_record else None,
                'total_units': gpa_record.total_units if gpa_record else 0,
                'is_finalized': gpa_record.is_finalized if gpa_record else False
            }
        })


class MyTranscriptView(APIView):
    """
    Get student's full academic transcript.
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="Get My Transcript",
        description="Get the current student's full academic transcript",
        tags=["Grades"]
    )
    def get(self, request):
        if request.user.role != 'STUDENT':
            return Response({
                "success": False,
                "error": "Only students can access this endpoint"
            }, status=status.HTTP_403_FORBIDDEN)
        
        transcript = GradeService.get_student_transcript(request.user)
        
        return Response({
            "success": True,
            "data": transcript
        })


class INCReportView(APIView):
    """
    Get INC status report (registrar only).
    """
    permission_classes = [IsAuthenticated, IsRegistrar]
    
    @extend_schema(
        summary="Get INC Report",
        description="Get report of all INCs and their expiry status",
        tags=["Grades"]
    )
    def get(self, request):
        days_ahead = int(request.query_params.get('days_ahead', 30))
        
        # Get expiring INCs
        expiring = INCAutomationService.get_expiring_incs(days_ahead)
        
        # Get all current INCs
        all_incs = SubjectEnrollment.objects.filter(
            status=SubjectEnrollment.Status.INC
        ).select_related('subject', 'enrollment__student').count()
        
        return Response({
            "success": True,
            "data": {
                'total_incs': all_incs,
                'expiring_within_days': days_ahead,
                'expiring_count': len(expiring),
                'expiring_incs': expiring
            }
        })


class ProcessExpiredINCsView(APIView):
    """
    Manually trigger INC expiry processing (admin only).
    """
    permission_classes = [IsAuthenticated, IsRegistrar]
    
    @extend_schema(
        summary="Process Expired INCs",
        description="Convert all expired INCs to FAILED",
        tags=["Grades"]
    )
    @transaction.atomic
    def post(self, request):
        converted = INCAutomationService.process_all_expired_incs()
        
        converted_data = []
        for se in converted:
            converted_data.append({
                'subject_code': se.subject.code,
                'student_number': se.enrollment.student.student_number,
                'student_name': se.enrollment.student.get_full_name()
            })
        
        return Response({
            "success": True,
            "message": f"Converted {len(converted)} INCs to FAILED",
            "data": {
                'converted_count': len(converted),
                'converted': converted_data
            }
        })


class UpdateAcademicStandingView(APIView):
    """
    Update a student's academic standing (registrar only).
    """
    permission_classes = [IsAuthenticated, IsRegistrar]
    
    @extend_schema(
        summary="Update Academic Standing",
        description="Update a student's academic standing",
        tags=["Grades"],
        request=UpdateStandingSerializer
    )
    @transaction.atomic
    def patch(self, request, student_id):
        serializer = UpdateStandingSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "success": False,
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            student = User.objects.get(id=student_id, role='STUDENT')
        except User.DoesNotExist:
            raise NotFoundError("Student not found")
        
        profile = getattr(student, 'student_profile', None)
        if not profile:
            raise NotFoundError("Student profile not found")
        
        profile.academic_standing = serializer.validated_data['academic_standing']
        profile.save()
        
        return Response({
            "success": True,
            "message": "Academic standing updated",
            "data": {
                'student_number': student.student_number,
                'student_name': student.get_full_name(),
                'academic_standing': profile.academic_standing
            }
        })


class SectionFinalizationListView(APIView):
    """
    List sections pending grade finalization (registrar only).
    """
    permission_classes = [IsAuthenticated, IsRegistrar]
    
    @extend_schema(
        summary="List Sections for Finalization",
        description="Get sections with unfinalized grades",
        tags=["Grades"]
    )
    def get(self, request):
        from apps.academics.models import Section
        
        semester_id = request.query_params.get('semester_id')
        
        if semester_id:
            semester = Semester.objects.filter(id=semester_id).first()
        else:
            semester = Semester.objects.filter(is_current=True).first()
        
        if not semester:
            raise NotFoundError("No semester found")
        
        # Get sections with unfinalized grades
        sections = Section.objects.filter(
            semester=semester,
            is_deleted=False
        ).order_by('name')
        
        section_data = []
        for section in sections:
            # Count finalized vs unfinalized
            total = SubjectEnrollment.objects.filter(section=section).count()
            finalized = SubjectEnrollment.objects.filter(
                section=section,
                is_finalized=True
            ).count()
            unfinalized = total - finalized
            
            if total > 0:
                section_data.append({
                    'section_id': str(section.id),
                    'section_name': section.name,
                    'total_enrollments': total,
                    'finalized': finalized,
                    'unfinalized': unfinalized,
                    'is_complete': unfinalized == 0
                })
        
        return Response({
            "success": True,
            "data": {
                'semester': str(semester),
                'sections': section_data
            }
        })


# ============================================================
# Document Release Views (EPIC 6)
# ============================================================

from .models import DocumentRelease
from .serializers import (
    DocumentReleaseSerializer,
    CreateDocumentReleaseSerializer,
    RevokeDocumentSerializer,
    ReissueDocumentSerializer,
    DocumentReleaseLogSerializer,
    DocumentReleaseStatsSerializer
)
from .services import DocumentReleaseService
from apps.core.permissions import IsHeadRegistrar


class CreateDocumentReleaseView(APIView):
    """
    Create a new document release (registrar only).
    """
    permission_classes = [IsAuthenticated, IsRegistrar]
    
    @extend_schema(
        summary="Create Document Release",
        description="Create a new official document release for a student",
        tags=["Documents"],
        request=CreateDocumentReleaseSerializer,
        responses={201: DocumentReleaseSerializer}
    )
    @transaction.atomic
    def post(self, request):
        serializer = CreateDocumentReleaseSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "success": False,
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        
        # Get student
        try:
            student = User.objects.get(
                id=data['student_id'],
                role='STUDENT'
            )
        except User.DoesNotExist:
            raise NotFoundError("Student not found")
        
        try:
            release = DocumentReleaseService.create_release(
                student=student,
                document_type=data['document_type'],
                released_by=request.user,
                purpose=data.get('purpose', ''),
                copies=data.get('copies_released', 1),
                notes=data.get('notes', '')
            )
        except ValueError as e:
            return Response({
                "success": False,
                "error": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            "success": True,
            "message": "Document released successfully",
            "data": DocumentReleaseSerializer(release).data
        }, status=status.HTTP_201_CREATED)


class MyReleasesView(APIView):
    """
    Get documents released by the current registrar.
    """
    permission_classes = [IsAuthenticated, IsRegistrar]
    
    @extend_schema(
        summary="Get My Releases",
        description="Get document releases created by current registrar",
        tags=["Documents"]
    )
    def get(self, request):
        logs = DocumentReleaseService.get_release_logs(
            registrar=request.user,
            limit=100
        )
        
        return Response({
            "success": True,
            "data": logs
        })


class AllReleasesView(APIView):
    """
    Get all document releases (head-registrar only).
    """
    permission_classes = [IsAuthenticated, IsHeadRegistrar]
    
    @extend_schema(
        summary="Get All Releases",
        description="Get all document releases (head-registrar audit view)",
        tags=["Documents"]
    )
    def get(self, request):
        # Parse filters
        document_type = request.query_params.get('document_type')
        status_filter = request.query_params.get('status')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        
        logs = DocumentReleaseService.get_release_logs(
            registrar=None,  # All registrars
            document_type=document_type,
            status=status_filter,
            date_from=date_from,
            date_to=date_to,
            limit=200
        )
        
        return Response({
            "success": True,
            "data": logs
        })


class StudentDocumentsView(APIView):
    """
    Get all documents for a student.
    """
    permission_classes = [IsAuthenticated, IsRegistrar]
    
    @extend_schema(
        summary="Get Student Documents",
        description="Get all documents released for a student",
        tags=["Documents"]
    )
    def get(self, request, student_id):
        try:
            student = User.objects.get(id=student_id, role='STUDENT')
        except User.DoesNotExist:
            raise NotFoundError("Student not found")
        
        documents = DocumentReleaseService.get_student_documents(student)
        
        return Response({
            "success": True,
            "data": {
                'student_number': student.student_number,
                'student_name': student.get_full_name(),
                'documents': documents
            }
        })


class DocumentDetailView(APIView):
    """
    Get document details by code.
    """
    permission_classes = [IsAuthenticated, IsRegistrar]
    
    @extend_schema(
        summary="Get Document Details",
        description="Get details of a specific document release",
        tags=["Documents"]
    )
    def get(self, request, document_code):
        try:
            release = DocumentRelease.objects.select_related(
                'student', 'released_by', 'revoked_by', 'replaces'
            ).get(document_code=document_code)
        except DocumentRelease.DoesNotExist:
            raise NotFoundError("Document not found")
        
        # Log document access
        from apps.audit.models import AuditLog
        AuditLog.log(
            action=AuditLog.Action.DOCUMENT_ACCESSED,
            target_model='DocumentRelease',
            target_id=release.id,
            actor=request.user,
            payload={
                'document_code': document_code,
                'document_type': release.document_type
            }
        )
        
        return Response({
            "success": True,
            "data": DocumentReleaseSerializer(release).data
        })


class RevokeDocumentView(APIView):
    """
    Revoke an active document.
    """
    permission_classes = [IsAuthenticated, IsRegistrar]
    
    @extend_schema(
        summary="Revoke Document",
        description="Revoke an active document release",
        tags=["Documents"],
        request=RevokeDocumentSerializer,
        responses={200: DocumentReleaseSerializer}
    )
    @transaction.atomic
    def post(self, request, document_code):
        serializer = RevokeDocumentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "success": False,
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            release = DocumentRelease.objects.get(document_code=document_code)
        except DocumentRelease.DoesNotExist:
            raise NotFoundError("Document not found")
        
        try:
            updated = DocumentReleaseService.revoke_document(
                document_release=release,
                revoked_by=request.user,
                reason=serializer.validated_data['reason']
            )
        except ValueError as e:
            return Response({
                "success": False,
                "error": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            "success": True,
            "message": "Document revoked successfully",
            "data": DocumentReleaseSerializer(updated).data
        })


class ReissueDocumentView(APIView):
    """
    Reissue a revoked document.
    """
    permission_classes = [IsAuthenticated, IsRegistrar]
    
    @extend_schema(
        summary="Reissue Document",
        description="Reissue a revoked document (creates new record)",
        tags=["Documents"],
        request=ReissueDocumentSerializer,
        responses={201: DocumentReleaseSerializer}
    )
    @transaction.atomic
    def post(self, request, document_code):
        serializer = ReissueDocumentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "success": False,
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            release = DocumentRelease.objects.get(document_code=document_code)
        except DocumentRelease.DoesNotExist:
            raise NotFoundError("Document not found")
        
        try:
            new_release = DocumentReleaseService.reissue_document(
                document_release=release,
                reissued_by=request.user,
                purpose=serializer.validated_data.get('purpose', ''),
                notes=serializer.validated_data.get('notes', '')
            )
        except ValueError as e:
            return Response({
                "success": False,
                "error": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            "success": True,
            "message": "Document reissued successfully",
            "data": DocumentReleaseSerializer(new_release).data
        }, status=status.HTTP_201_CREATED)


class DocumentReleaseStatsView(APIView):
    """
    Get document release statistics.
    """
    permission_classes = [IsAuthenticated, IsHeadRegistrar]
    
    @extend_schema(
        summary="Get Release Statistics",
        description="Get document release statistics (head-registrar only)",
        tags=["Documents"]
    )
    def get(self, request):
        stats = DocumentReleaseService.get_release_stats()
        
        return Response({
            "success": True,
            "data": stats
        })


class DownloadDocumentPDFView(APIView):
    """
    Download a document release as PDF.
    """
    permission_classes = [IsAuthenticated, IsRegistrar]
    
    @extend_schema(
        summary="Download Document PDF",
        description="Generate and download PDF for a document release",
        tags=["Documents"]
    )
    def get(self, request, document_code):
        from django.http import HttpResponse
        from .pdf_generator import DocumentPDFGenerator
        from .services import GradeService
        
        try:
            release = DocumentRelease.objects.select_related(
                'student', 'student__student_profile__program'
            ).get(document_code=document_code)
        except DocumentRelease.DoesNotExist:
            raise NotFoundError("Document not found")
        
        # Only allow PDF for active documents
        if release.status != DocumentRelease.Status.ACTIVE:
            return Response({
                "success": False,
                "error": "Cannot generate PDF for revoked or superseded documents"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get student info
        student = release.student
        profile = getattr(student, 'student_profile', None)
        program_name = profile.program.name if profile and profile.program else 'N/A'
        year_level = profile.year_level if profile else 1
        
        # Generate PDF based on document type
        generator = DocumentPDFGenerator()
        pdf_bytes = None
        
        if release.document_type == 'GOOD_MORAL':
            pdf_bytes = generator.generate_good_moral(
                student_name=student.get_full_name(),
                student_number=student.student_number,
                program=program_name,
                document_code=release.document_code,
                purpose=release.purpose
            )
        
        elif release.document_type == 'ENROLLMENT_CERT':
            # Get current semester
            current_semester = Semester.objects.filter(is_current=True).first()
            semester_name = str(current_semester) if current_semester else 'Current Semester'
            academic_year = current_semester.academic_year if current_semester else 'N/A'
            
            pdf_bytes = generator.generate_enrollment_certificate(
                student_name=student.get_full_name(),
                student_number=student.student_number,
                program=program_name,
                year_level=year_level,
                semester=semester_name.split(' ')[0] + ' Semester',  # "1st Semester" etc
                academic_year=academic_year,
                document_code=release.document_code,
                purpose=release.purpose
            )
        
        elif release.document_type == 'TOR':
            # Get transcript data
            transcript = GradeService.get_student_transcript(student)
            
            pdf_bytes = generator.generate_transcript(
                student_name=student.get_full_name(),
                student_number=student.student_number,
                program=program_name,
                semesters=transcript.get('semesters', []),
                cumulative_gpa=transcript.get('cumulative_gpa', 'N/A'),
                document_code=release.document_code
            )
        
        else:
            # Generic certificate for other types
            pdf_bytes = generator.generate_generic_certificate(
                document_type=release.get_document_type_display(),
                student_name=student.get_full_name(),
                student_number=student.student_number,
                program=program_name,
                document_code=release.document_code,
                purpose=release.purpose
            )
        
        # Log PDF generation
        from apps.audit.models import AuditLog
        AuditLog.log(
            action=AuditLog.Action.DOCUMENT_ACCESSED,
            target_model='DocumentRelease',
            target_id=release.id,
            actor=request.user,
            payload={
                'document_code': document_code,
                'document_type': release.document_type,
                'action': 'PDF_GENERATED'
            }
        )
        
        # Return PDF response
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        filename = f"{release.document_code}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        return response
