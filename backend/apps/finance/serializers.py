from rest_framework import serializers
from .models import Payment

class PaymentSerializer(serializers.ModelSerializer):
    student_idn = serializers.CharField(source='student.idn', read_only=True)
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    processed_by_name = serializers.CharField(source='processed_by.get_full_name', read_only=True)
    entry_type_display = serializers.CharField(source='get_entry_type_display', read_only=True)

    month = serializers.IntegerField(required=False, allow_null=True)
    class Meta:
        model = Payment
        fields = [
            'id', 'student', 'student_idn', 'student_name', 
            'term', 'month', 'amount', 'entry_type', 'entry_type_display',
            'is_promissory', 'notes', 'reference_number', 'processed_by', 'processed_by_name', 
            'created_at'
        ]
        read_only_fields = ['processed_by', 'created_at']

    def validate_amount(self, value):
        if value < 0:
            # Only allow negative if entry_type is ADJUSTMENT (but entry_type might not be in validated_data yet)
            # Actually, the test fails because it's a PAYMENT (default).
            if self.initial_data.get('entry_type') != 'ADJUSTMENT' and value < 0:
                raise serializers.ValidationError("Amount must be positive for payments.")
        return value

class PermitStatusSerializer(serializers.Serializer):
    status = serializers.CharField()
    is_allowed = serializers.BooleanField()

class StudentPermitsSerializer(serializers.Serializer):
    enrollment = PermitStatusSerializer()
    chapter_test = PermitStatusSerializer()
    prelim = PermitStatusSerializer()
    midterm = PermitStatusSerializer()
    pre_final = PermitStatusSerializer()
    final = PermitStatusSerializer()
