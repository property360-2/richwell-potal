"""
Payment & Exam Permit serializers (EPIC 4).
Split from enrollment/serializers.py for maintainability.
"""

from decimal import Decimal
from rest_framework import serializers

from .models import Enrollment, Semester
from .models_payments import PaymentTransaction, ExamMonthMapping, ExamPermit


class PaymentTransactionSerializer(serializers.ModelSerializer):
    """Serializer for payment transactions."""
    
    student_name = serializers.CharField(source='enrollment.student.get_full_name', read_only=True)
    student_number = serializers.CharField(source='enrollment.student.student_number', read_only=True)
    payment_mode_display = serializers.CharField(source='get_payment_mode_display', read_only=True)
    processed_by_name = serializers.CharField(source='processed_by.get_full_name', read_only=True, allow_null=True)
    total_allocated = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = PaymentTransaction
        fields = [
            'id', 'enrollment', 'student_name', 'student_number',
            'amount', 'payment_mode', 'payment_mode_display',
            'receipt_number', 'reference_number',
            'allocated_buckets', 'total_allocated',
            'is_adjustment', 'adjustment_reason', 'original_transaction',
            'processed_by_name', 'processed_at',
            'receipt_generated', 'notes', 'created_at'
        ]
        read_only_fields = [
            'id', 'receipt_number', 'allocated_buckets', 
            'processed_at', 'receipt_generated', 'created_at'
        ]


class PaymentRecordSerializer(serializers.Serializer):
    """Serializer for recording a new payment."""
    
    enrollment_id = serializers.UUIDField(
        help_text="UUID of the enrollment to record payment for"
    )
    amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal('0.01'),
        help_text="Payment amount"
    )
    payment_mode = serializers.ChoiceField(
        choices=PaymentTransaction.PaymentMode.choices,
        help_text="Payment method"
    )
    reference_number = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
        help_text="External reference number (for online payments)"
    )
    allocations = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        allow_null=True,
        help_text='Optional manual allocations: [{"month": 1, "amount": 1000.00}]'
    )
    notes = serializers.CharField(
        max_length=500,
        required=False,
        allow_blank=True,
        help_text="Optional notes about this payment"
    )
    
    def validate_enrollment_id(self, value):
        try:
            Enrollment.objects.get(id=value)
            return value
        except Enrollment.DoesNotExist:
            raise serializers.ValidationError("Enrollment not found.")
    
    def validate_allocations(self, value):
        if not value:
            return None
        
        for allocation in value:
            if 'month' not in allocation or 'amount' not in allocation:
                raise serializers.ValidationError(
                    "Each allocation must have 'month' and 'amount' fields."
                )
            if not 1 <= allocation['month'] <= 6:
                raise serializers.ValidationError(
                    "Month must be between 1 and 6."
                )
            if float(allocation['amount']) <= 0:
                raise serializers.ValidationError(
                    "Allocation amount must be positive."
                )
        
        return value


class PaymentAdjustmentSerializer(serializers.Serializer):
    """Serializer for payment adjustments."""
    
    transaction_id = serializers.UUIDField(
        help_text="UUID of the original transaction to adjust"
    )
    adjustment_amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Adjustment amount (positive to add, negative to subtract)"
    )
    reason = serializers.CharField(
        min_length=10,
        max_length=500,
        help_text="Justification for the adjustment (required)"
    )
    
    def validate_transaction_id(self, value):
        try:
            PaymentTransaction.objects.get(id=value)
            return value
        except PaymentTransaction.DoesNotExist:
            raise serializers.ValidationError("Transaction not found.")
    
    def validate_adjustment_amount(self, value):
        if value == 0:
            raise serializers.ValidationError("Adjustment amount cannot be zero.")
        return value


class ExamMonthMappingSerializer(serializers.ModelSerializer):
    """Serializer for exam-month mappings."""
    
    semester_name = serializers.CharField(source='semester.__str__', read_only=True)
    exam_period_display = serializers.CharField(source='get_exam_period_display', read_only=True)
    
    class Meta:
        model = ExamMonthMapping
        fields = [
            'id', 'semester', 'semester_name',
            'exam_period', 'exam_period_display',
            'required_month', 'is_active', 'created_at'
        ]


class ExamMonthMappingCreateSerializer(serializers.Serializer):
    """Serializer for creating exam-month mappings."""
    
    semester_id = serializers.UUIDField(help_text="UUID of the semester")
    exam_period = serializers.ChoiceField(
        choices=ExamMonthMapping.ExamPeriod.choices,
        help_text="Exam period"
    )
    required_month = serializers.IntegerField(
        min_value=1,
        max_value=6,
        help_text="Month number (1-6) that must be paid"
    )
    
    def validate_semester_id(self, value):
        try:
            Semester.objects.get(id=value)
            return value
        except Semester.DoesNotExist:
            raise serializers.ValidationError("Semester not found.")
    
    def validate(self, data):
        existing = ExamMonthMapping.objects.filter(
            semester_id=data['semester_id'],
            exam_period=data['exam_period']
        ).exists()
        
        if existing:
            raise serializers.ValidationError(
                f"Mapping for {data['exam_period']} already exists in this semester."
            )
        
        return data


class ExamPermitSerializer(serializers.ModelSerializer):
    """Serializer for exam permits."""
    
    student_name = serializers.CharField(source='enrollment.student.get_full_name', read_only=True)
    student_number = serializers.CharField(source='enrollment.student.student_number', read_only=True)
    exam_period_display = serializers.CharField(source='get_exam_period_display', read_only=True)
    is_valid = serializers.BooleanField(read_only=True)
    printed_by_name = serializers.CharField(source='printed_by.get_full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = ExamPermit
        fields = [
            'id', 'enrollment', 'student_name', 'student_number',
            'exam_period', 'exam_period_display',
            'permit_code', 'required_month',
            'is_printed', 'printed_at', 'printed_by_name',
            'is_valid', 'created_at'
        ]


class ExamPermitStatusSerializer(serializers.Serializer):
    """Serializer for exam permit status (used in student view)."""
    
    exam_period = serializers.CharField()
    exam_period_label = serializers.CharField()
    status = serializers.ChoiceField(
        choices=['GENERATED', 'ELIGIBLE', 'LOCKED', 'NOT_CONFIGURED']
    )
    permit_code = serializers.CharField(allow_null=True)
    permit_id = serializers.CharField(allow_null=True)
    is_printed = serializers.BooleanField()
    required_month = serializers.IntegerField(allow_null=True)


class PaymentSummarySerializer(serializers.Serializer):
    """Serializer for payment summary response."""
    
    total_required = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_paid = serializers.DecimalField(max_digits=10, decimal_places=2)
    balance = serializers.DecimalField(max_digits=10, decimal_places=2)
    is_fully_paid = serializers.BooleanField()
    buckets = serializers.ListField()
    recent_transactions = serializers.ListField()
