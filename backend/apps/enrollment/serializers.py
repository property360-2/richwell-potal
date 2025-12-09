"""
Enrollment serializers.
"""

from decimal import Decimal
from rest_framework import serializers

from apps.accounts.models import User, StudentProfile
from apps.academics.models import Program, Subject

from .models import Enrollment, MonthlyPaymentBucket, EnrollmentDocument, Semester


class MonthlyPaymentBucketSerializer(serializers.ModelSerializer):
    """Serializer for payment buckets."""
    
    remaining_amount = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )
    payment_percentage = serializers.FloatField(read_only=True)
    
    class Meta:
        model = MonthlyPaymentBucket
        fields = [
            'id', 'month_number', 'required_amount', 
            'paid_amount', 'is_fully_paid',
            'remaining_amount', 'payment_percentage'
        ]


class EnrollmentDocumentSerializer(serializers.ModelSerializer):
    """Serializer for enrollment documents."""
    
    verified_by_name = serializers.CharField(
        source='verified_by.get_full_name', 
        read_only=True,
        default=None
    )
    document_type_display = serializers.CharField(
        source='get_document_type_display',
        read_only=True
    )
    
    class Meta:
        model = EnrollmentDocument
        fields = [
            'id', 'document_type', 'document_type_display', 'original_filename',
            'is_verified', 'verified_by_name', 'verified_at', 'notes', 'created_at'
        ]


class DocumentUploadSerializer(serializers.Serializer):
    """Serializer for document upload during enrollment."""
    
    document_type = serializers.ChoiceField(choices=EnrollmentDocument.DocumentType.choices)
    file = serializers.FileField()
    
    def validate_file(self, value):
        """Validate file size and type."""
        # Max 10MB
        max_size = 10 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError("File size cannot exceed 10MB.")
        
        # Allowed extensions
        allowed_extensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']
        ext = '.' + value.name.split('.')[-1].lower() if '.' in value.name else ''
        if ext not in allowed_extensions:
            raise serializers.ValidationError(
                f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"
            )
        
        return value


class EnrollmentSerializer(serializers.ModelSerializer):
    """Full enrollment serializer with related data."""
    
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    student_number = serializers.CharField(source='student.student_number', read_only=True)
    student_email = serializers.CharField(source='student.email', read_only=True)
    semester_name = serializers.CharField(source='semester.__str__', read_only=True)
    payment_buckets = MonthlyPaymentBucketSerializer(many=True, read_only=True)
    documents = EnrollmentDocumentSerializer(many=True, read_only=True)
    total_required = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_paid = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    balance = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = Enrollment
        fields = [
            'id', 'student_name', 'student_number', 'student_email',
            'semester_name', 'status', 'created_via',
            'monthly_commitment', 'first_month_paid',
            'total_required', 'total_paid', 'balance',
            'payment_buckets', 'documents', 'created_at'
        ]


class OnlineEnrollmentSerializer(serializers.Serializer):
    """Serializer for online enrollment form submission."""
    
    # Personal info
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    middle_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    suffix = serializers.CharField(max_length=20, required=False, allow_blank=True)
    birthdate = serializers.DateField()
    address = serializers.CharField()
    contact_number = serializers.CharField(max_length=20)
    
    # Academic info
    program_id = serializers.UUIDField()
    
    # Payment info
    monthly_commitment = serializers.DecimalField(
        max_digits=10, 
        decimal_places=2,
        min_value=Decimal('1.00')
    )
    
    # Transferee fields (optional)
    is_transferee = serializers.BooleanField(default=False)
    previous_school = serializers.CharField(max_length=255, required=False, allow_blank=True)
    previous_course = serializers.CharField(max_length=255, required=False, allow_blank=True)
    
    # Password (optional - system will generate if not provided)
    password = serializers.CharField(min_length=8, required=False, write_only=True)
    
    def validate_email(self, value):
        """Check that email is not already in use."""
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()
    
    def validate_program_id(self, value):
        """Check that program exists and is active."""
        try:
            program = Program.objects.get(id=value, is_active=True, is_deleted=False)
            return value
        except Program.DoesNotExist:
            raise serializers.ValidationError("Invalid or inactive program selected.")
    
    def validate(self, data):
        """Validate transferee fields if is_transferee is True."""
        if data.get('is_transferee'):
            if not data.get('previous_school'):
                raise serializers.ValidationError({
                    'previous_school': 'Previous school is required for transferees.'
                })
            if not data.get('previous_course'):
                raise serializers.ValidationError({
                    'previous_course': 'Previous course is required for transferees.'
                })
        return data


class TransfereeCreateSerializer(serializers.Serializer):
    """Serializer for registrar-created transferee accounts."""
    
    # Personal info
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    middle_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    suffix = serializers.CharField(max_length=20, required=False, allow_blank=True)
    birthdate = serializers.DateField()
    address = serializers.CharField()
    contact_number = serializers.CharField(max_length=20)
    
    # Academic info
    program_id = serializers.UUIDField()
    year_level = serializers.IntegerField(min_value=1, max_value=5)
    
    # Transferee info
    previous_school = serializers.CharField(max_length=255)
    previous_course = serializers.CharField(max_length=255)
    
    # Payment info
    monthly_commitment = serializers.DecimalField(max_digits=10, decimal_places=2)
    
    def validate_email(self, value):
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()
    
    def validate_program_id(self, value):
        try:
            Program.objects.get(id=value, is_active=True, is_deleted=False)
            return value
        except Program.DoesNotExist:
            raise serializers.ValidationError("Invalid or inactive program selected.")


class CreditedSubjectSerializer(serializers.Serializer):
    """Serializer for crediting a subject from previous school."""
    
    subject_id = serializers.UUIDField(help_text="Subject ID from the curriculum to credit")
    original_subject_code = serializers.CharField(max_length=50, help_text="Original subject code from previous school")
    original_grade = serializers.DecimalField(
        max_digits=3, 
        decimal_places=2, 
        required=False,
        help_text="Original grade (optional, e.g., 1.5)"
    )
    count_in_gpa = serializers.BooleanField(
        default=False,
        help_text="Whether to include in GPA calculation"
    )
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate_subject_id(self, value):
        try:
            Subject.objects.get(id=value, is_deleted=False)
            return value
        except Subject.DoesNotExist:
            raise serializers.ValidationError("Subject not found in curriculum.")


class BulkCreditSerializer(serializers.Serializer):
    """Serializer for bulk crediting multiple subjects."""
    
    credits = CreditedSubjectSerializer(many=True)
    
    def validate_credits(self, value):
        if not value:
            raise serializers.ValidationError("At least one credit is required.")
        return value
