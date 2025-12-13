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


# ============================================================
# Subject Enrollment Serializers (EPIC 3)
# ============================================================

class SubjectEnrollmentSerializer(serializers.ModelSerializer):
    """Serializer for displaying subject enrollments."""
    
    from apps.enrollment.models import SubjectEnrollment
    
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    subject_title = serializers.CharField(source='subject.title', read_only=True)
    units = serializers.IntegerField(source='subject.units', read_only=True)
    section_name = serializers.CharField(source='section.name', read_only=True, allow_null=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    # Schedule info
    schedule = serializers.SerializerMethodField()
    professor_name = serializers.SerializerMethodField()
    
    class Meta:
        from apps.enrollment.models import SubjectEnrollment
        model = SubjectEnrollment
        fields = [
            'id', 'subject_code', 'subject_title', 'units',
            'section_name', 'status', 'status_display',
            'grade', 'is_irregular', 'count_in_gpa',
            'schedule', 'professor_name', 'created_at'
        ]
    
    def get_schedule(self, obj):
        """Get schedule slots for the section."""
        if not obj.section:
            return []
        
        from apps.academics.models import SectionSubject
        
        section_subject = SectionSubject.objects.filter(
            section=obj.section,
            subject=obj.subject
        ).first()
        
        if not section_subject:
            return []
        
        slots = []
        for slot in section_subject.schedule_slots.filter(is_deleted=False):
            slots.append({
                'day': slot.get_day_display(),
                'start_time': slot.start_time.strftime('%H:%M'),
                'end_time': slot.end_time.strftime('%H:%M'),
                'room': slot.room
            })
        return slots
    
    def get_professor_name(self, obj):
        """Get professor name for this subject section."""
        if not obj.section:
            return None
        
        from apps.academics.models import SectionSubject
        
        section_subject = SectionSubject.objects.filter(
            section=obj.section,
            subject=obj.subject
        ).select_related('professor').first()
        
        if section_subject and section_subject.professor:
            return section_subject.professor.get_full_name()
        return 'TBA'


class RecommendedSubjectSerializer(serializers.Serializer):
    """Serializer for recommended subjects list."""
    
    id = serializers.UUIDField()
    code = serializers.CharField()
    title = serializers.CharField()
    units = serializers.IntegerField()
    is_major = serializers.BooleanField()
    year_level = serializers.IntegerField()
    semester_number = serializers.IntegerField()
    prerequisites = serializers.SerializerMethodField()
    prerequisites_met = serializers.SerializerMethodField()
    available_sections = serializers.SerializerMethodField()
    
    def get_prerequisites(self, obj):
        return list(obj.prerequisites.values_list('code', flat=True))
    
    def get_prerequisites_met(self, obj):
        """Check if prerequisites are met for current student."""
        service = self.context.get('service')
        student = self.context.get('student')
        if not service or not student:
            return True
        
        met, _ = service.check_prerequisites(student, obj)
        return met
    
    def get_available_sections(self, obj):
        """Get sections available for this subject in current semester."""
        semester = self.context.get('semester')
        if not semester:
            return []
        
        from apps.academics.models import SectionSubject
        
        section_subjects = SectionSubject.objects.filter(
            subject=obj,
            section__semester=semester,
            is_deleted=False
        ).select_related('section', 'professor')
        
        sections = []
        for ss in section_subjects:
            slots = []
            for slot in ss.schedule_slots.filter(is_deleted=False):
                slots.append({
                    'day': slot.get_day_display(),
                    'start_time': slot.start_time.strftime('%H:%M'),
                    'end_time': slot.end_time.strftime('%H:%M'),
                    'room': slot.room
                })
            
            sections.append({
                'section_id': str(ss.section.id),
                'section_name': ss.section.name,
                'professor': ss.professor.get_full_name() if ss.professor else 'TBA',
                'available_slots': ss.section.available_slots,
                'schedule': slots
            })
        
        return sections


class AvailableSubjectSerializer(RecommendedSubjectSerializer):
    """Serializer for all available subjects (extends recommended)."""
    
    # Inherits all fields from RecommendedSubjectSerializer
    missing_prerequisites = serializers.SerializerMethodField()
    
    def get_missing_prerequisites(self, obj):
        """Get list of missing prerequisite codes."""
        service = self.context.get('service')
        student = self.context.get('student')
        if not service or not student:
            return []
        
        _, missing = service.check_prerequisites(student, obj)
        return missing


class EnrollSubjectRequestSerializer(serializers.Serializer):
    """Serializer for subject enrollment request."""
    
    subject_id = serializers.UUIDField(
        help_text="UUID of the subject to enroll in"
    )
    section_id = serializers.UUIDField(
        help_text="UUID of the section to enroll in"
    )
    
    def validate_subject_id(self, value):
        from apps.academics.models import Subject
        try:
            Subject.objects.get(id=value, is_deleted=False)
            return value
        except Subject.DoesNotExist:
            raise serializers.ValidationError("Subject not found.")
    
    def validate_section_id(self, value):
        from apps.academics.models import Section
        try:
            Section.objects.get(id=value, is_deleted=False)
            return value
        except Section.DoesNotExist:
            raise serializers.ValidationError("Section not found.")


class RegistrarOverrideSerializer(serializers.Serializer):
    """Serializer for registrar override enrollment."""
    
    student_id = serializers.UUIDField(
        help_text="UUID of the student to enroll"
    )
    subject_id = serializers.UUIDField(
        help_text="UUID of the subject"
    )
    section_id = serializers.UUIDField(
        help_text="UUID of the section"
    )
    override_reason = serializers.CharField(
        max_length=500,
        help_text="Justification for overriding enrollment rules"
    )
    
    def validate_override_reason(self, value):
        if len(value.strip()) < 10:
            raise serializers.ValidationError(
                "Override reason must be at least 10 characters."
            )
        return value.strip()


# ============================================================
# Payment & Exam Permit Serializers (EPIC 4)
# ============================================================

from .models import PaymentTransaction, ExamMonthMapping, ExamPermit


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
        # Check for duplicate mapping
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

