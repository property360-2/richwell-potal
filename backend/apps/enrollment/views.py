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
