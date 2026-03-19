from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from .models import Payment
from .serializers import PaymentSerializer, StudentPermitsSerializer
from .services.payment_service import PaymentService
from core.permissions import IsAdminOrCashier

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'adjust']:
            from core.permissions import IsCashier
            return [IsCashier()]
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return super().get_permissions()

    def _assert_read_access(self):
        role = getattr(self.request.user, 'role', None)
        if role in ('STUDENT', 'CASHIER', 'ADMIN') or self.request.user.is_superuser:
            return
        raise PermissionDenied("You do not have permission to access finance records.")
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'STUDENT':
            return self.queryset.filter(student__user=user)
        if user.role in ('CASHIER', 'ADMIN') or user.is_superuser:
            return self.queryset
        return self.queryset.none()

    def list(self, request, *args, **kwargs):
        self._assert_read_access()
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        self._assert_read_access()
        return super().retrieve(request, *args, **kwargs)

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
            notes=data.get('notes')
        )

    @action(detail=False, methods=['GET'], url_path='next-payment')
    def next_payment(self, request):
        student_id = request.query_params.get('student_id')
        term_id = request.query_params.get('term_id')
        
        if not student_id or not term_id:
            return Response({'detail': 'student_id and term_id are required.'}, 
                            status=status.HTTP_400_BAD_REQUEST)
        
        from apps.students.models import Student
        student = get_object_or_404(Student, id=student_id)
        
        data = PaymentService.get_next_payment_info(student, term_id)
        return Response(data)

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
        if not IsAdminOrCashier().has_permission(request, self):
            raise PermissionDenied("Only cashier and admin users can check permit status for arbitrary students.")

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
