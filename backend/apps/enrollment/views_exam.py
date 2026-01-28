"""
Exam Permit views.
EPIC 4: Payments & Exam Permits
"""

from rest_framework import views, generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db.models import Prefetch

from apps.core.permissions import IsStudent, IsRegistrar, IsAdmin, IsCashier
from .models import ExamPermit, ExamMonthMapping, Enrollment, Semester
from .serializers_exam import ExamMonthMappingSerializer, ExamPermitSerializer, GeneratePermitSerializer

class ExamMonthMappingView(generics.ListCreateAPIView):
    """
    GET: List all exam mappings
    POST: Create new exam mapping (Admin/Registrar)
    """
    permission_classes = [IsAuthenticated, IsRegistrar | IsAdmin]
    serializer_class = ExamMonthMappingSerializer
    
    def get_queryset(self):
        semester_id = self.request.query_params.get('semester')
        queryset = ExamMonthMapping.objects.select_related('semester').all()
        if semester_id:
            queryset = queryset.filter(semester_id=semester_id)
        return queryset

class ExamMonthMappingDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET, PUT, DELETE exam mapping
    """
    permission_classes = [IsAuthenticated, IsRegistrar | IsAdmin]
    queryset = ExamMonthMapping.objects.all()
    serializer_class = ExamMonthMappingSerializer

class MyExamPermitsView(generics.ListAPIView):
    """
    GET: List current student's exam permits
    """
    permission_classes = [IsAuthenticated, IsStudent]
    serializer_class = ExamPermitSerializer
    
    def get_queryset(self):
        user = self.request.user
        return ExamPermit.objects.filter(
            enrollment__student=user
        ).select_related(
            'enrollment__semester', 
            'enrollment__student'
        ).order_by('-created_at')

class GenerateExamPermitView(views.APIView):
    """
    POST: Generate exam permit for specific period.
    Checks payment status before generating.
    """
    permission_classes = [IsAuthenticated, IsStudent]
    
    def post(self, request, exam_period):
        user = request.user
        
        # 1. Find active enrollment
        enrollment = Enrollment.objects.filter(
            student=user,
            semester__is_current=True,
            status='ENROLLED' # Or whatever 'active' status is used, usually ENROLLED or OFFICIALLY_ENROLLED
        ).first()
        
        # Fallback to just "latest active semester" if no current flag
        if not enrollment:
            # Try to find mostly recently created enrollment in "ENROLLED" Status
            enrollment = Enrollment.objects.filter(
                student=user,
                status='ENROLLED'
            ).order_by('-created_at').first()
            
        if not enrollment:
            return Response(
                {'error': 'No active enrollment found for current semester'}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # 2. Find mapping rule
        mapping = ExamMonthMapping.objects.filter(
            semester=enrollment.semester,
            exam_period=exam_period,
            is_active=True
        ).first()
        
        if not mapping:
            return Response(
                {'error': f'Exam period {exam_period} is not configured for this semester'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # 3. Check Payment Status
        # required_month is 1-based index. 
        # Check if the required payment bucket is fully paid.
        bucket = enrollment.payment_buckets.filter(month_number=mapping.required_month).first()
        
        if not bucket:
             return Response(
                {'error': f'Payment schedule not found for month {mapping.required_month}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if not bucket.is_fully_paid:
             return Response(
                {'error': f'Payment for Month {mapping.required_month} is required. Pending: {bucket.remaining_amount}'}, 
                status=status.HTTP_402_PAYMENT_REQUIRED
            )
            
        # 4. Generate Permit
        permit, created = ExamPermit.objects.get_or_create(
            enrollment=enrollment,
            exam_period=exam_period,
            defaults={
                'permit_code': f'EXP-{timezone.now().strftime("%Y%m%d")}-{user.id}-{exam_period}',
                'required_month': mapping.required_month
            }
        )
        
        if not created:
             # Already exists
             pass

        return Response(ExamPermitSerializer(permit).data)

class PrintExamPermitView(views.APIView):
    """
    GET: Mark permit as printed and return data for printing
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, permit_id):
        permit = get_object_or_404(ExamPermit, id=permit_id)
        
        # Security check
        if request.user.role == 'STUDENT' and permit.enrollment.student != request.user:
            return Response({'error': 'Unauthorized'}, status=403)
            
        # Update print status
        permit.is_printed = True
        if not permit.printed_at:
             permit.printed_at = timezone.now()
        permit.printed_by = request.user
        permit.save()
        
        return Response(ExamPermitSerializer(permit).data)

class ExamPermitListView(generics.ListAPIView):
    """
    GET: Admin/Cashier view of all permits
    """
    permission_classes = [IsAuthenticated, IsAdmin | IsCashier | IsRegistrar]
    serializer_class = ExamPermitSerializer
    filterset_fields = ['exam_period', 'is_printed']
    
    def get_queryset(self):
        return ExamPermit.objects.select_related(
            'enrollment__student', 'enrollment__semester'
        ).all().order_by('-created_at')
