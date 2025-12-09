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
