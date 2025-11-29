"""
REST API Serializers for Richwell Colleges Portal.
Handles serialization/deserialization of API request/response data.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from decimal import Decimal

from sis.models import (
    User, Student, Program, Semester, Subject, Section, Enrollment,
    SubjectEnrollment, Payment, PaymentMonth, Grade, ExamPermit,
    ScheduleSlot, AuditLog, Notification, TransferCredit
)

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model."""
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'role', 'phone_number']
        read_only_fields = ['id']

    def get_full_name(self, obj):
        return obj.get_full_name()


class StudentProfileSerializer(serializers.ModelSerializer):
    """Serializer for Student profile information."""
    user = UserSerializer(read_only=True)
    program_name = serializers.CharField(source='program.name', read_only=True)
    gpa_display = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = ['id', 'user', 'student_id', 'program', 'program_name', 'status', 'gpa', 'gpa_display']
        read_only_fields = ['id', 'gpa']

    def get_gpa_display(self, obj):
        """Format GPA to 2 decimal places."""
        return f"{obj.gpa:.2f}" if obj.gpa else "N/A"


class ProgramSerializer(serializers.ModelSerializer):
    """Serializer for Program model."""

    class Meta:
        model = Program
        fields = ['id', 'name', 'code', 'description', 'duration_years', 'total_units_required', 'is_active']
        read_only_fields = ['id']


class SemesterSerializer(serializers.ModelSerializer):
    """Serializer for Semester model."""
    semester_display = serializers.CharField(source='get_semester_display', read_only=True)

    class Meta:
        model = Semester
        fields = ['id', 'year', 'semester', 'semester_display', 'start_date', 'end_date', 'enrollment_start', 'enrollment_end', 'is_active']
        read_only_fields = ['id']


class SubjectSerializer(serializers.ModelSerializer):
    """Serializer for Subject model."""
    prerequisites_list = serializers.SerializerMethodField()
    subject_type_display = serializers.CharField(source='get_subject_type_display', read_only=True)

    class Meta:
        model = Subject
        fields = ['id', 'code', 'name', 'description', 'units', 'subject_type', 'subject_type_display', 'prerequisites_list']
        read_only_fields = ['id']

    def get_prerequisites_list(self, obj):
        """Get list of prerequisite subject codes."""
        return list(obj.prerequisites.values_list('code', flat=True))


class ScheduleSlotSerializer(serializers.ModelSerializer):
    """Serializer for ScheduleSlot model."""
    day_display = serializers.CharField(source='get_day_display', read_only=True)

    class Meta:
        model = ScheduleSlot
        fields = ['id', 'day', 'day_display', 'start_time', 'end_time']
        read_only_fields = ['id']


class SectionSerializer(serializers.ModelSerializer):
    """Serializer for Section model."""
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    professor_name = serializers.CharField(source='professor.get_full_name', read_only=True)
    schedule_slots = ScheduleSlotSerializer(many=True, read_only=True)
    available_slots = serializers.SerializerMethodField()

    class Meta:
        model = Section
        fields = ['id', 'code', 'subject', 'subject_code', 'subject_name', 'capacity', 'current_enrollment', 'available_slots', 'professor', 'professor_name', 'schedule_slots']
        read_only_fields = ['id', 'current_enrollment']

    def get_available_slots(self, obj):
        """Calculate available slots."""
        return max(0, obj.capacity - obj.current_enrollment)


class PaymentMonthSerializer(serializers.ModelSerializer):
    """Serializer for PaymentMonth model."""
    remaining_balance = serializers.SerializerMethodField()

    class Meta:
        model = PaymentMonth
        fields = ['id', 'month_number', 'amount_due', 'amount_paid', 'remaining_balance', 'is_paid', 'due_date']
        read_only_fields = ['id']

    def get_remaining_balance(self, obj):
        """Calculate remaining balance."""
        balance = obj.amount_due - obj.amount_paid
        return max(Decimal('0.00'), balance)


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer for Payment model."""
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)

    class Meta:
        model = Payment
        fields = ['id', 'enrollment', 'student_name', 'amount', 'payment_method', 'payment_method_display', 'reference_number', 'notes', 'payment_date', 'status']
        read_only_fields = ['id', 'payment_date', 'status', 'created_at']

    def validate_amount(self, value):
        """Ensure payment amount is positive."""
        if value <= 0:
            raise serializers.ValidationError("Payment amount must be greater than 0")
        return value


class EnrollmentSerializer(serializers.ModelSerializer):
    """Serializer for Enrollment model."""
    student = StudentProfileSerializer(read_only=True)
    semester = SemesterSerializer(read_only=True)
    current_load = serializers.SerializerMethodField()
    payment_balance = serializers.SerializerMethodField()
    month_1_paid = serializers.SerializerMethodField()

    class Meta:
        model = Enrollment
        fields = ['id', 'student', 'semester', 'current_load', 'payment_balance', 'month_1_paid', 'created_at', 'is_confirmed']
        read_only_fields = ['id', 'created_at']

    def get_current_load(self, obj):
        """Get student's current unit load."""
        from sis.services.enrollment_service import get_student_load
        return get_student_load(obj)

    def get_payment_balance(self, obj):
        """Get student's outstanding payment balance."""
        from sis.services.payment_service import get_payment_balance
        return str(get_payment_balance(obj))

    def get_month_1_paid(self, obj):
        """Check if Month 1 is paid."""
        from sis.services.payment_service import is_month_1_paid
        return is_month_1_paid(obj)


class GradeSerializer(serializers.ModelSerializer):
    """Serializer for Grade model."""
    grade_point = serializers.SerializerMethodField()
    grade_display = serializers.SerializerMethodField()

    class Meta:
        model = Grade
        fields = ['id', 'subject_enrollment', 'grade', 'grade_display', 'grade_point', 'is_finalized', 'submitted_at', 'finalized_at']
        read_only_fields = ['id', 'submitted_at', 'finalized_at']

    def get_grade_display(self, obj):
        """Get human-readable grade display."""
        if obj.grade == 'INC':
            return 'Incomplete'
        return obj.get_grade_display() if hasattr(obj, 'get_grade_display') else obj.grade

    def get_grade_point(self, obj):
        """Get numeric grade point for the letter grade."""
        grade_points = {
            'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'C': 2.0,
            'D': 1.0, 'F': 0.0, 'INC': 0.0
        }
        return grade_points.get(obj.grade, 0.0)


class SubjectEnrollmentSerializer(serializers.ModelSerializer):
    """Serializer for SubjectEnrollment model."""
    subject = SubjectSerializer(read_only=True)
    section = SectionSerializer(read_only=True)
    grade_data = GradeSerializer(source='grade_set.first', read_only=True)
    subject_status_display = serializers.CharField(source='get_subject_status_display', read_only=True)
    enrollment_status_display = serializers.CharField(source='get_enrollment_status_display', read_only=True)

    class Meta:
        model = SubjectEnrollment
        fields = ['id', 'subject', 'section', 'enrollment_status', 'enrollment_status_display', 'grade_status', 'subject_status', 'subject_status_display', 'grade_data', 'created_at']
        read_only_fields = ['id', 'subject_status', 'created_at']

    def validate_subject(self, value):
        """Validate subject exists."""
        if not value:
            raise serializers.ValidationError("Subject is required")
        return value


class EnrollSubjectInputSerializer(serializers.Serializer):
    """Serializer for enrolling in a subject (input)."""
    subject_id = serializers.IntegerField()
    section_id = serializers.IntegerField(required=False, allow_null=True)
    override_schedule_conflict = serializers.BooleanField(default=False)
    conflict_reason = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        """Validate enrollment request."""
        # Check if subject exists
        try:
            Subject.objects.get(id=data['subject_id'])
        except Subject.DoesNotExist:
            raise serializers.ValidationError({'subject_id': 'Subject not found'})

        # Check if section exists (if provided)
        if data.get('section_id'):
            try:
                Section.objects.get(id=data['section_id'])
            except Section.DoesNotExist:
                raise serializers.ValidationError({'section_id': 'Section not found'})

        # If overriding conflict, reason is required
        if data['override_schedule_conflict'] and not data.get('conflict_reason'):
            raise serializers.ValidationError({'conflict_reason': 'Reason required when overriding schedule conflict'})

        return data


class ExamPermitSerializer(serializers.ModelSerializer):
    """Serializer for ExamPermit model."""
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = ExamPermit
        fields = ['id', 'enrollment', 'status', 'status_display', 'issued_date', 'expiry_date', 'created_at']
        read_only_fields = ['id', 'created_at']


class TransferCreditSerializer(serializers.ModelSerializer):
    """Serializer for TransferCredit model."""
    subject_name = serializers.CharField(source='subject.name', read_only=True)

    class Meta:
        model = TransferCredit
        fields = ['id', 'student', 'subject', 'subject_name', 'source_institution', 'source_grade', 'units_transferred', 'is_credited']
        read_only_fields = ['id']


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for Notification model."""
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)

    class Meta:
        model = Notification
        fields = ['id', 'user', 'notification_type', 'notification_type_display', 'title', 'message', 'is_read', 'related_model', 'related_id', 'created_at']
        read_only_fields = ['id', 'created_at']


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for AuditLog model."""
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = AuditLog
        fields = ['id', 'actor', 'action', 'action_display', 'target_model', 'target_id', 'payload', 'ip_address', 'created_at']
        read_only_fields = ['id', 'created_at']


class TranscriptSerializer(serializers.Serializer):
    """Serializer for student transcript (combined data)."""
    student = StudentProfileSerializer()
    semester = SemesterSerializer()
    subject_enrollments = SubjectEnrollmentSerializer(many=True)
    gpa = serializers.DecimalField(max_digits=3, decimal_places=2)
    cumulative_gpa = serializers.DecimalField(max_digits=3, decimal_places=2)
