"""
Grading serializers for professor grade management and grade/GPA display.
EPIC 5: Grade Management

Contains both professor-facing grading serializers (used by views_grading.py)
and general grade/GPA serializers (extracted from serializers.py).
"""

from decimal import Decimal
from rest_framework import serializers
from django.utils import timezone

from .models import SubjectEnrollment, GradeHistory
from .models_grading import SemesterGPA, GradeResolution


# ============================================================
# Professor Grading Serializers (used by views_grading.py)
# ============================================================

class GradeableStudentSerializer(serializers.Serializer):
    """
    Serializer for displaying students that a professor can grade.
    Read-only, used for listing students in grade entry interface.
    """
    subject_enrollment_id = serializers.UUIDField(source='id')
    student_id = serializers.UUIDField(source='enrollment.student.id')
    student_number = serializers.CharField(source='enrollment.student.student_number')
    full_name = serializers.SerializerMethodField()
    email = serializers.EmailField(source='enrollment.student.email')
    
    # Subject info
    subject_id = serializers.UUIDField(source='subject.id')
    subject_code = serializers.CharField(source='subject.code')
    subject_title = serializers.CharField(source='subject.title')
    units = serializers.IntegerField(source='subject.units')
    
    # Section info
    section_id = serializers.UUIDField(source='section.id', allow_null=True)
    section_name = serializers.CharField(source='section.name', allow_null=True)
    
    # Grade info
    current_grade = serializers.CharField(
        source='grade', 
        allow_null=True
    )
    current_status = serializers.CharField(source='status')
    enrollment_type = serializers.CharField()
    is_finalized = serializers.BooleanField()
    is_resolution_allowed = serializers.BooleanField()
    has_retake = serializers.SerializerMethodField()
    current_remarks = serializers.CharField(source='remarks')
    retake_eligibility_date = serializers.DateTimeField(allow_null=True)
    semester_name = serializers.CharField(source='enrollment.semester.name', read_only=True)

    def get_has_retake(self, obj):
        return obj.retakes.exists()
    
    def get_full_name(self, obj):
        student = obj.enrollment.student
        return f"{student.last_name}, {student.first_name}"


class GradeSubmissionSerializer(serializers.Serializer):
    """Serializer for submitting a single grade."""
    subject_enrollment_id = serializers.UUIDField()
    grade = serializers.DecimalField(
        max_digits=3, 
        decimal_places=2, 
        min_value=Decimal('1.00'),
        max_value=Decimal('5.00'),
        allow_null=True,
        required=False
    )
    status = serializers.ChoiceField(
        choices=['PASSED', 'FAILED', 'INC', 'DROPPED'],
        required=False
    )
    remarks = serializers.CharField(
        max_length=500, 
        allow_blank=True, 
        required=False
    )
    
    def validate(self, data):
        """
        Validate grade and status combination.
        - If grade is provided, auto-determine status if not given
        - Remarks are optional for INC
        """
        grade = data.get('grade')
        status = data.get('status')
        remarks = data.get('remarks', '')
        
        # If grade provided without status, auto-calculate
        if grade is not None and status is None:
            if grade <= Decimal('3.00'):
                data['status'] = 'PASSED'
            else:
                data['status'] = 'FAILED'
        
        # If status is INC, grade should be null
        if status == 'INC':
            data['grade'] = None
        
        # If status is DROPPED, grade should be null
        if status == 'DROPPED':
            data['grade'] = None
        
        # Validate grade matches status
        if grade is not None and status:
            if status == 'PASSED' and grade > Decimal('3.00'):
                raise serializers.ValidationError({
                    'grade': 'Grade must be 3.0 or lower for PASSED status'
                })
            if status == 'FAILED' and grade <= Decimal('3.00'):
                raise serializers.ValidationError({
                    'grade': 'Grade must be greater than 3.0 for FAILED status'
                })
        
        return data


class BulkGradeSubmissionSerializer(serializers.Serializer):
    """Serializer for submitting multiple grades at once."""
    grades = GradeSubmissionSerializer(many=True)
    
    def validate_grades(self, grades):
        if not grades:
            raise serializers.ValidationError('At least one grade submission is required')
        
        # Check for duplicates
        ids = [g['subject_enrollment_id'] for g in grades]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError('Duplicate subject_enrollment_id found')
        
        return grades


class GradeHistorySerializer(serializers.ModelSerializer):
    """Serializer for grade change history."""
    changed_by_name = serializers.SerializerMethodField()
    student_name = serializers.SerializerMethodField()
    subject_code = serializers.CharField(source='subject_enrollment.subject.code')
    
    class Meta:
        model = GradeHistory
        fields = [
            'id',
            'subject_enrollment',
            'student_name',
            'subject_code',
            'previous_grade',
            'new_grade',
            'previous_status',
            'new_status',
            'changed_by',
            'changed_by_name',
            'change_reason',
            'is_system_action',
            'is_finalization',
            'created_at'
        ]
    
    def get_changed_by_name(self, obj):
        if obj.changed_by:
            return obj.changed_by.get_full_name()
        return 'System'
    
    def get_student_name(self, obj):
        student = obj.subject_enrollment.enrollment.student
        return f"{student.last_name}, {student.first_name}"


class GradeSubmissionResponseSerializer(serializers.Serializer):
    """Response serializer for grade submission."""
    success = serializers.BooleanField()
    subject_enrollment_id = serializers.UUIDField()
    grade = serializers.DecimalField(max_digits=3, decimal_places=2, allow_null=True)
    status = serializers.CharField()
    grade_history_id = serializers.UUIDField(allow_null=True)
    message = serializers.CharField()


# ============================================================
# Grade & GPA Display Serializers (extracted from serializers.py)
# ============================================================

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
    """Serializer for professor grade submission (alternate form)."""
    
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


class GradeResolutionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='subject_enrollment.enrollment.student.get_full_name', read_only=True)
    student_number = serializers.CharField(source='subject_enrollment.enrollment.student.student_number', read_only=True)
    subject_code = serializers.CharField(source='subject_enrollment.subject.code', read_only=True)
    subject_title = serializers.CharField(source='subject_enrollment.subject.title', read_only=True)
    
    # Step tracking
    requested_by_name = serializers.CharField(source='requested_by.get_full_name', read_only=True)
    reviewed_by_head_name = serializers.CharField(source='reviewed_by_head.get_full_name', read_only=True, allow_null=True)
    reviewed_by_registrar_name = serializers.CharField(source='reviewed_by_registrar.get_full_name', read_only=True, allow_null=True)
    grade_input_by_name = serializers.CharField(source='grade_input_by.get_full_name', read_only=True, allow_null=True)
    current_step_number = serializers.IntegerField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = GradeResolution
        fields = [
            'id', 'subject_enrollment', 'student_name', 'student_number', 
            'subject_code', 'subject_title',
            'current_grade', 'proposed_grade', 
            'current_status', 'proposed_status',
            'reason', 'status', 'status_display', 'current_step_number',
            'submitted_by_dean',
            # Step 1
            'requested_by', 'requested_by_name', 'created_at',
            # Step 2
            'reviewed_by_registrar', 'reviewed_by_registrar_name', 
            'registrar_notes', 'registrar_action_at',
            # Step 3
            'grade_input_by', 'grade_input_by_name', 
            'grade_input_at', 'grade_input_comment',
            # Step 4
            'reviewed_by_head', 'reviewed_by_head_name', 
            'head_notes', 'head_action_at',
            # Step 5
            'registrar_final_at',
        ]
        read_only_fields = [
            'id', 'current_grade', 'current_status', 'status', 'created_at',
            'requested_by', 'reviewed_by_head', 'reviewed_by_registrar',
            'grade_input_by', 'grade_input_at',
            'head_action_at', 'registrar_action_at', 'registrar_final_at',
            'current_step_number', 'status_display',
        ]
        extra_kwargs = {
            'subject_enrollment': {'write_only': True}
        }


class GradeInputSerializer(serializers.Serializer):
    """Serializer for Step 3: Professor/Dean inputs grade into a resolution."""
    proposed_grade = serializers.DecimalField(
        max_digits=3,
        decimal_places=2,
        min_value=Decimal('1.00'),
        max_value=Decimal('5.00'),
        help_text='Grade value to assign'
    )
    proposed_status = serializers.ChoiceField(
        choices=['PASSED', 'FAILED'],
        help_text='Resulting status'
    )
    comment = serializers.CharField(
        max_length=500,
        required=False,
        allow_blank=True,
        help_text='Optional comment'
    )

    def validate(self, data):
        grade = data.get('proposed_grade')
        status = data.get('proposed_status')
        if grade is not None and status:
            if status == 'PASSED' and grade > Decimal('3.00'):
                raise serializers.ValidationError({
                    'proposed_grade': 'Grade must be 3.0 or lower for PASSED status'
                })
            if status == 'FAILED' and grade <= Decimal('3.00'):
                raise serializers.ValidationError({
                    'proposed_grade': 'Grade must be greater than 3.0 for FAILED status'
                })
        return data

