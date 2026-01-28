"""
Document Release System views.
EPIC 6: Document Release
"""

from rest_framework import views, generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone

from apps.core.permissions import IsStudent, IsRegistrar, IsAdmin
from .models import DocumentRelease, Enrollment, SubjectEnrollment
from .serializers_documents import DocumentReleaseSerializer # Updated import source

class CreateDocumentReleaseView(views.APIView):
    """
    POST: Create a new document release (Registrar).
    """
    permission_classes = [IsAuthenticated, IsRegistrar]
    
    def post(self, request):
        # We'll rely on serializer for validation
        from .serializers_documents import DocumentReleaseCreateSerializer
        serializer = DocumentReleaseCreateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            doc = serializer.save(released_by=request.user)
            return Response(DocumentReleaseSerializer(doc).data, status=201)
        return Response(serializer.errors, status=400)

class MyReleasesView(generics.ListAPIView):
    """
    GET: List documents released to the current student.
    """
    permission_classes = [IsAuthenticated, IsStudent]
    serializer_class = DocumentReleaseSerializer
    
    def get_queryset(self):
        return DocumentRelease.objects.filter(
            student=self.request.user, 
            status__in=['ACTIVE', 'REISSUED']
        ).order_by('-released_at')

class StudentDocumentsView(generics.ListAPIView):
    """
    GET: List all documents for a specific student (Registrar view).
    """
    permission_classes = [IsAuthenticated, IsRegistrar]
    serializer_class = DocumentReleaseSerializer
    
    def get_queryset(self):
        student_id = self.kwargs.get('student_id')
        return DocumentRelease.objects.filter(student_id=student_id).order_by('-released_at')

class StudentEnrollmentStatusView(views.APIView):
    """
    GET: Check student enrollment status for COR release validation.
    """
    permission_classes = [IsAuthenticated, IsRegistrar]
    
    def get(self, request, student_id):
        # Find active enrollment (ACTIVE status)
        # We look for the latest 'ACTIVE' enrollment
        enrollment = Enrollment.objects.filter(
            student_id=student_id,
            status='ACTIVE'
        ).order_by('-created_at').first()
        
        if not enrollment:
             return Response({
                 'can_release_cor': False,
                 'has_enrollment': False,
                 'message': 'Student is not officially enrolled in any semester.',
                 'semester': None
             })
             
        # Check enrolled subjects
        subjects = SubjectEnrollment.objects.filter(
            enrollment=enrollment,
            status='ENROLLED'
        ).select_related('subject')
        
        subject_count = subjects.count()
        total_units = sum(s.subject.units for s in subjects)
        
        can_release_cor = subject_count > 0
        
        return Response({
            'can_release_cor': can_release_cor,
            'has_enrollment': True,
            'message': 'Student is enrolled.' if can_release_cor else 'Student has no enrolled subjects.',
            'semester': str(enrollment.semester),
            'total_units': total_units,
            'enrolled_subjects_count': subject_count,
            'enrolled_subjects': [
                {'code': s.subject.code, 'title': s.subject.title, 'units': s.subject.units}
                for s in subjects
            ]
        })

class DocumentDetailView(generics.RetrieveAPIView):
    """
    GET: Details of a specific document release by code.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = DocumentReleaseSerializer
    lookup_field = 'document_code'
    
    def get_queryset(self):
        return DocumentRelease.objects.all()

class RevokeDocumentView(views.APIView):
    """
    POST: Revoke a document release.
    """
    permission_classes = [IsAuthenticated, IsRegistrar]
    
    def post(self, request, document_code):
        reason = request.data.get('reason')
        if not reason:
             return Response({"error": "Revocation reason is required"}, status=400)
             
        doc = get_object_or_404(DocumentRelease, document_code=document_code)
        
        if doc.status == 'REVOKED':
             return Response({"error": "Document already revoked"}, status=400)
             
        doc.status = 'REVOKED'
        doc.revoked_by = request.user
        doc.revoked_at = timezone.now()
        doc.revocation_reason = reason
        doc.save()
        
        return Response({"success": True, "message": "Document revoked"})

class ReissueDocumentView(views.APIView):
    """
    POST: Reissue a document (supersede old one).
    """
    permission_classes = [IsAuthenticated, IsRegistrar]
    
    def post(self, request, document_code):
        old_doc = get_object_or_404(DocumentRelease, document_code=document_code)
        
        # Logic to create new doc linking to old doc
        # For simplicity, we assume we just create a new one and mark old one as REISSUED
        # Typically requires new fields like 'purpose' etc.
        
        # Update old doc
        old_doc.status = 'REISSUED'
        old_doc.save()
        
        # Create new doc (simplified)
        new_doc = DocumentRelease.objects.create(
            document_code=f"DOC-{timezone.now().strftime('%Y%m%d')}-{old_doc.student.id}-{timezone.now().strftime('%H%M%S')}",
            document_type=old_doc.document_type,
            student=old_doc.student,
            released_by=request.user,
            purpose=f"Reissue of {old_doc.document_code}",
            replaces=old_doc
        )
        
        return Response(DocumentReleaseSerializer(new_doc).data)

class DownloadDocumentPDFView(views.APIView):
    """
    GET: Download PDF
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, document_code):
        # Mock PDF download
        return Response({"message": "PDF download not implemented yet (requires file storage logic)"})

class AllReleasesView(generics.ListAPIView):
    """
    GET: Audit log of all releases.
    """
    permission_classes = [IsAuthenticated, IsRegistrar]
    serializer_class = DocumentReleaseSerializer
    queryset = DocumentRelease.objects.all().order_by('-released_at')

class DocumentReleaseStatsView(views.APIView):
    """
    GET: Stats for dashboard.
    """
    permission_classes = [IsAuthenticated, IsRegistrar]
    
    def get(self, request):
        stats = DocumentRelease.objects.aggregate(
            total=Count('id'),
            active=Count('id', filter=Q(status='ACTIVE')),
            revoked=Count('id', filter=Q(status='REVOKED')),
            tor_count=Count('id', filter=Q(document_type='TOR'))
        )
        return Response({'success': True, 'data': stats})
