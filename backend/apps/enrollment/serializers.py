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
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = EnrollmentDocument
        fields = [
            'id', 'document_type', 'document_type_display', 'original_filename',
            'file_url', 'is_verified', 'verified_by_name', 'verified_at', 'notes', 'created_at'
        ]
    
    def get_file_url(self, obj):
        """Get the absolute URL for the file."""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


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
    school_email = serializers.CharField(source='student.username', read_only=True)  # Auto-generated login email
    contact_number = serializers.SerializerMethodField()
    semester_name = serializers.CharField(source='semester.__str__', read_only=True)
    program_code = serializers.SerializerMethodField()
    payment_buckets = MonthlyPaymentBucketSerializer(many=True, read_only=True)
    documents = EnrollmentDocumentSerializer(many=True, read_only=True)
    total_required = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_paid = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    balance = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Enrollment
        fields = [
            'id', 'student_name', 'student_number', 'student_email', 'school_email',
            'contact_number', 'semester_name', 'program_code', 'status', 'created_via',
            'monthly_commitment', 'first_month_paid',
            'total_required', 'total_paid', 'balance',
            'payment_buckets', 'documents', 'created_at'
        ]

    def get_contact_number(self, obj):
        """Get contact number from student profile."""
        try:
            return obj.student.student_profile.contact_number
        except:
            return None

    def get_program_code(self, obj):
        """Get program code from student profile."""
        try:
            return obj.student.student_profile.program.code
        except:
            return None


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


# ============================================================
# Grade & GPA Serializers (EPIC 5)
# ============================================================

from .models import GradeHistory, SemesterGPA


class GradeHistorySerializer(serializers.ModelSerializer):
    """Serializer for grade history entries."""
    
    changed_by_name = serializers.CharField(source='changed_by.get_full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = GradeHistory
        fields = [
            'id', 'previous_grade', 'new_grade',
            'previous_status', 'new_status',
            'changed_by_name', 'change_reason',
            'is_system_action', 'is_finalization',
            'created_at'
        ]


class SemesterGPASerializer(serializers.ModelSerializer):
    """Serializer for semester GPA records."""
    
    semester_name = serializers.CharField(source='enrollment.semester.__str__', read_only=True)
    student_name = serializers.CharField(source='enrollment.student.get_full_name', read_only=True)
    
    class Meta:
        model = SemesterGPA
        fields = [
            'id', 'enrollment', 'semester_name', 'student_name',
            'gpa', 'total_units', 'total_grade_points',
            'subjects_included', 'calculated_at', 'is_finalized'
        ]


class GradeSubmitSerializer(serializers.Serializer):
    """Serializer for professor grade submission."""
    
    subject_enrollment_id = serializers.UUIDField(
        help_text="UUID of the subject enrollment to grade"
    )
    grade = serializers.DecimalField(
        max_digits=3,
        decimal_places=2,
        required=False,
        allow_null=True,
        help_text="Grade value (1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 5.0)"
    )
    is_inc = serializers.BooleanField(
        default=False,
        help_text="Mark as Incomplete (INC) instead of numeric grade"
    )
    change_reason = serializers.CharField(
        max_length=500,
        required=False,
        allow_blank=True,
        help_text="Optional reason for the grade change"
    )
    
    def validate(self, data):
        if not data.get('is_inc') and data.get('grade') is None:
            raise serializers.ValidationError(
                "Either 'grade' or 'is_inc' must be provided"
            )
        return data


class GradeOverrideSerializer(serializers.Serializer):
    """Serializer for registrar grade override."""
    
    subject_enrollment_id = serializers.UUIDField(
        help_text="UUID of the subject enrollment to override"
    )
    new_grade = serializers.DecimalField(
        max_digits=3,
        decimal_places=2,
        help_text="New grade value"
    )
    reason = serializers.CharField(
        min_length=10,
        max_length=500,
        help_text="Required justification for the override"
    )


class SectionGradeListSerializer(serializers.Serializer):
    """Serializer for listing students with grades in a section."""
    
    subject_enrollment_id = serializers.UUIDField()
    student_number = serializers.CharField()
    student_name = serializers.CharField()
    grade = serializers.DecimalField(max_digits=3, decimal_places=2, allow_null=True)
    status = serializers.CharField()
    status_display = serializers.CharField()
    is_finalized = serializers.BooleanField()
    finalized_at = serializers.DateTimeField(allow_null=True)


class MyGradesSerializer(serializers.Serializer):
    """Serializer for student's own grades view."""
    
    subject_code = serializers.CharField()
    subject_title = serializers.CharField()
    units = serializers.IntegerField()
    grade = serializers.DecimalField(max_digits=3, decimal_places=2, allow_null=True)
    status = serializers.CharField()
    status_display = serializers.CharField()
    is_finalized = serializers.BooleanField()
    professor_name = serializers.CharField(allow_null=True)


class TranscriptSerializer(serializers.Serializer):
    """Serializer for academic transcript."""
    
    semesters = serializers.ListField()
    cumulative_gpa = serializers.CharField()
    cumulative_units = serializers.IntegerField()


class INCReportSerializer(serializers.Serializer):
    """Serializer for INC status report."""
    
    enrollment_id = serializers.CharField()
    subject_code = serializers.CharField()
    subject_title = serializers.CharField()
    student_number = serializers.CharField()
    student_name = serializers.CharField()
    is_major = serializers.BooleanField()
    inc_marked_at = serializers.CharField()
    expires_at = serializers.CharField()
    days_remaining = serializers.IntegerField()


class UpdateStandingSerializer(serializers.Serializer):
    """Serializer for updating academic standing."""
    
    academic_standing = serializers.CharField(
        max_length=100,
        help_text="Academic standing (e.g., Good Standing, Dean's List, Probation)"
    )


# ============================================================
# Document Release Serializers (EPIC 6)
# ============================================================

from .models import DocumentRelease


class DocumentReleaseSerializer(serializers.ModelSerializer):
    """Serializer for document release records."""
    
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    student_number = serializers.CharField(source='student.student_number', read_only=True)
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    released_by_name = serializers.CharField(source='released_by.get_full_name', read_only=True)
    revoked_by_name = serializers.CharField(source='revoked_by.get_full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = DocumentRelease
        fields = [
            'id', 'document_code', 'document_type', 'document_type_display',
            'student', 'student_number', 'student_name',
            'released_by', 'released_by_name', 'released_at',
            'status', 'status_display',
            'revoked_by', 'revoked_by_name', 'revoked_at', 'revocation_reason',
            'replaces', 'purpose', 'copies_released', 'notes',
            'created_at'
        ]
        read_only_fields = [
            'id', 'document_code', 'released_by', 'released_at',
            'revoked_by', 'revoked_at', 'status', 'replaces', 'created_at'
        ]


class CreateDocumentReleaseSerializer(serializers.Serializer):
    """Serializer for creating a document release."""
    
    student_id = serializers.UUIDField(
        help_text="UUID of the student receiving the document"
    )
    document_type = serializers.ChoiceField(
        choices=DocumentRelease.DocumentType.choices,
        help_text="Type of document to release"
    )
    purpose = serializers.CharField(
        max_length=500,
        required=False,
        allow_blank=True,
        help_text="Purpose of the document request"
    )
    copies_released = serializers.IntegerField(
        default=1,
        min_value=1,
        max_value=10,
        help_text="Number of copies released"
    )
    notes = serializers.CharField(
        max_length=1000,
        required=False,
        allow_blank=True,
        help_text="Internal notes"
    )


class RevokeDocumentSerializer(serializers.Serializer):
    """Serializer for revoking a document."""
    
    reason = serializers.CharField(
        min_length=10,
        max_length=500,
        help_text="Reason for revocation (required)"
    )


class ReissueDocumentSerializer(serializers.Serializer):
    """Serializer for reissuing a document."""
    
    purpose = serializers.CharField(
        max_length=500,
        required=False,
        allow_blank=True,
        help_text="New purpose (optional, defaults to original)"
    )
    notes = serializers.CharField(
        max_length=1000,
        required=False,
        allow_blank=True,
        help_text="Notes for the reissue"
    )


class DocumentReleaseLogSerializer(serializers.Serializer):
    """Serializer for document release logs."""
    
    id = serializers.UUIDField()
    document_code = serializers.CharField()
    document_type = serializers.CharField()
    document_type_display = serializers.CharField()
    status = serializers.CharField()
    student_number = serializers.CharField()
    student_name = serializers.CharField()
    released_by = serializers.CharField()
    released_at = serializers.DateTimeField()
    revoked_by = serializers.CharField(allow_null=True)
    revoked_at = serializers.DateTimeField(allow_null=True)
    revocation_reason = serializers.CharField(allow_blank=True)
    copies_released = serializers.IntegerField()


class DocumentReleaseStatsSerializer(serializers.Serializer):
    """Serializer for document release statistics."""
    
    total_released = serializers.IntegerField()
    active = serializers.IntegerField()
    revoked = serializers.IntegerField()
    reissued = serializers.IntegerField()
    by_document_type = serializers.DictField()
