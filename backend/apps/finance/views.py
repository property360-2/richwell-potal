from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Payment
from .serializers import PaymentSerializer, StudentPermitsSerializer
from .services.payment_service import PaymentService

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'adjust']:
            from core.permissions import IsCashier
            return [IsCashier()]
        return super().get_permissions()
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'STUDENT':
            return self.queryset.filter(student__user=user)
        # Cashiers/Admin see all
        return self.queryset

    def perform_create(self, serializer):
        # We delegate the core logic to the service for validation
        data = serializer.validated_data
        PaymentService.record_payment(
            student=data['student'],
            term=data['term'],
            month=data['month'],
            amount=data['amount'],
            is_promissory=data.get('is_promissory', False),
            processed_by=self.request.user,
            remarks=data.get('remarks')
        )

    @action(detail=False, methods=['POST'])
    def adjust(self, request):
        """
        Record a negative adjustment for correction.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        
        adjustment = PaymentService.record_adjustment(
            student=data['student'],
            term=data['term'],
            month=data['month'],
            amount=data['amount'],
            processed_by=request.user,
            remarks=data.get('remarks')
        )
        return Response(self.get_serializer(adjustment).data, status=status.HTTP_201_CREATED)

    # Disable Update/Delete for Append-Only record-keeping
    def update(self, request, *args, **kwargs):
        return Response({'detail': 'Method not allowed for append-only finance records.'}, 
                        status=status.HTTP_405_METHOD_NOT_ALLOWED)
    
    def partial_update(self, request, *args, **kwargs):
        return Response({'detail': 'Method not allowed for append-only finance records.'}, 
                        status=status.HTTP_405_METHOD_NOT_ALLOWED)
    
    def destroy(self, request, *args, **kwargs):
        return Response({'detail': 'Method not allowed for append-only finance records.'}, 
                        status=status.HTTP_405_METHOD_NOT_ALLOWED)

class PermitViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['GET'])
    def status(self, request):
        student_id = request.query_params.get('student_id')
        term_id = request.query_params.get('term_id')
        
        if not student_id or not term_id:
            return Response({'detail': 'student_id and term_id are required.'}, 
                            status=status.HTTP_400_BAD_REQUEST)
        
        from apps.students.models import Student
        student = get_object_or_404(Student, id=student_id)
        
        status_data = PaymentService.get_permit_status(student, term_id)
        return Response(status_data)

    @action(detail=False, methods=['GET'], url_path='my-permits')
    def my_permits(self, request):
        if request.user.role != 'STUDENT':
            return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        term_id = request.query_params.get('term_id')
        if not term_id:
            return Response({'detail': 'term_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        status_data = PaymentService.get_permit_status(request.user.student_profile, term_id)
        return Response(status_data)
