"""
Promissory Note views — cashier and registrar endpoints.
Handles CRUD and payment tracking for promissory notes.
"""

from decimal import Decimal
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework import status, serializers
from django.utils import timezone

from apps.enrollment.models_payments import PromissoryNote
from apps.enrollment.models import Enrollment
from apps.enrollment.services.promissory_service import PromissoryNoteService


# ============================================================
# Serializers (co-located for simplicity)
# ============================================================


class PromissoryNoteSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(
        source='enrollment.student.get_full_name', read_only=True
    )
    student_number = serializers.CharField(
        source='enrollment.student.student_number', read_only=True
    )
    remaining_balance = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )
    is_overdue = serializers.BooleanField(read_only=True)
    payment_percentage = serializers.DecimalField(
        max_digits=5, decimal_places=2, read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display', read_only=True
    )
    created_by_name = serializers.CharField(
        source='created_by.get_full_name', read_only=True, allow_null=True
    )
    approved_by_name = serializers.CharField(
        source='approved_by.get_full_name', read_only=True, allow_null=True
    )

    class Meta:
        model = PromissoryNote
        fields = [
            'id', 'enrollment', 'student_name', 'student_number',
            'reference_code', 'total_amount', 'amount_paid',
            'remaining_balance', 'payment_percentage',
            'covered_months', 'due_date', 'status', 'status_display',
            'is_overdue', 'reason', 'terms',
            'guarantor_name', 'guarantor_contact', 'guarantor_relationship',
            'created_by', 'created_by_name', 'created_at',
            'approved_by', 'approved_by_name', 'approved_at',
            'fulfilled_at', 'defaulted_at',
        ]
        read_only_fields = [
            'id', 'reference_code', 'amount_paid', 'status',
            'created_by', 'approved_by', 'approved_at',
            'fulfilled_at', 'defaulted_at', 'created_at',
        ]


class CreatePromissoryNoteSerializer(serializers.Serializer):
    enrollment_id = serializers.UUIDField()
    total_amount = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=Decimal('0.01')
    )
    due_date = serializers.DateField()
    reason = serializers.CharField(max_length=500)
    covered_months = serializers.ListField(
        child=serializers.IntegerField(min_value=1, max_value=6),
        min_length=1
    )
    terms = serializers.CharField(required=False, allow_blank=True, default='')
    guarantor_name = serializers.CharField(required=False, allow_blank=True, default='')
    guarantor_contact = serializers.CharField(required=False, allow_blank=True, default='')
    guarantor_relationship = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_due_date(self, value):
        if value <= timezone.now().date():
            raise serializers.ValidationError('Due date must be in the future')
        return value

    def validate_enrollment_id(self, value):
        try:
            Enrollment.objects.get(id=value)
        except Enrollment.DoesNotExist:
            raise serializers.ValidationError('Enrollment not found')
        return value


class RecordPaymentSerializer(serializers.Serializer):
    amount = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=Decimal('0.01')
    )


# ============================================================
# ViewSet
# ============================================================


class PromissoryNoteViewSet(ModelViewSet):
    """
    ViewSet for promissory notes.

    Actions:
      GET    /promissory-notes/               — list all (filtered by role)
      POST   /promissory-notes/               — create new note (cashier/registrar)
      GET    /promissory-notes/{id}/           — detail
      POST   /promissory-notes/{id}/record_payment/  — record payment
      POST   /promissory-notes/{id}/mark_defaulted/  — mark as defaulted
      POST   /promissory-notes/{id}/cancel/          — cancel note
      GET    /promissory-notes/overdue/               — list overdue notes
      GET    /promissory-notes/student/{enrollment_id}/ — notes for a student
    """
    queryset = PromissoryNote.objects.all().select_related(
        'enrollment__student',
        'created_by',
        'approved_by',
    )
    serializer_class = PromissoryNoteSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        if user.role == 'STUDENT':
            return self.queryset.filter(enrollment__student=user)
        elif user.role in ['CASHIER', 'REGISTRAR', 'HEAD_REGISTRAR', 'ADMIN']:
            return self.queryset.all()
        return self.queryset.none()

    def create(self, request, *args, **kwargs):
        """Create a new promissory note."""
        user = request.user
        if user.role not in ['CASHIER', 'REGISTRAR', 'HEAD_REGISTRAR', 'ADMIN']:
            return Response(
                {'error': 'Only cashier or registrar can create promissory notes'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = CreatePromissoryNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        enrollment = Enrollment.objects.get(id=data['enrollment_id'])

        result = PromissoryNoteService.create_promissory_note(
            enrollment=enrollment,
            total_amount=data['total_amount'],
            due_date=data['due_date'],
            reason=data['reason'],
            covered_months=data['covered_months'],
            created_by=user,
            terms=data.get('terms', ''),
            guarantor_name=data.get('guarantor_name', ''),
            guarantor_contact=data.get('guarantor_contact', ''),
            guarantor_relationship=data.get('guarantor_relationship', ''),
        )

        if not result['success']:
            return Response({'detail': result['error']}, status=status.HTTP_400_BAD_REQUEST)

        return Response(result, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def record_payment(self, request, pk=None):
        """Record a payment against a promissory note."""
        note = self.get_object()
        user = request.user

        if user.role not in ['CASHIER', 'REGISTRAR', 'HEAD_REGISTRAR', 'ADMIN']:
            return Response(
                {'error': 'Only cashier or registrar can record payments'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = RecordPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = PromissoryNoteService.record_payment(
            note, serializer.validated_data['amount'], user
        )

        if not result['success']:
            return Response({'detail': result['error']}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)

    @action(detail=True, methods=['post'])
    def mark_defaulted(self, request, pk=None):
        """Mark a promissory note as defaulted."""
        note = self.get_object()
        if request.user.role not in ['CASHIER', 'REGISTRAR', 'HEAD_REGISTRAR', 'ADMIN']:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        result = PromissoryNoteService.mark_defaulted(note, request.user)
        if not result['success']:
            return Response({'detail': result['error']}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a promissory note."""
        note = self.get_object()
        if request.user.role not in ['CASHIER', 'REGISTRAR', 'HEAD_REGISTRAR', 'ADMIN']:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        reason = request.data.get('reason', '')
        result = PromissoryNoteService.cancel_note(note, request.user, reason)
        if not result['success']:
            return Response({'detail': result['error']}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)

    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """List overdue promissory notes."""
        today = timezone.now().date()
        overdue = self.get_queryset().filter(
            status__in=[PromissoryNote.Status.ACTIVE, PromissoryNote.Status.PARTIALLY_PAID],
            due_date__lt=today,
        )
        serializer = self.get_serializer(overdue, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='student/(?P<enrollment_id>[^/.]+)')
    def by_student(self, request, enrollment_id=None):
        """List promissory notes for a specific student enrollment."""
        notes = self.get_queryset().filter(enrollment_id=enrollment_id)
        serializer = self.get_serializer(notes, many=True)
        return Response(serializer.data)
