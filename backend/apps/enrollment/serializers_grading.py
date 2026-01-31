"""
Grading serializers for professor grade management.
EPIC 5: Grade Management
"""

from decimal import Decimal
from rest_framework import serializers
from django.utils import timezone

from .models import SubjectEnrollment, GradeHistory


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
    current_grade = serializers.DecimalField(
        source='grade', 
        max_digits=3, 
        decimal_places=2, 
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
    """
    Serializer for submitting a single grade.
    """
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
    """
    Serializer for submitting multiple grades at once.
    """
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
    """
    Serializer for grade change history.
    """
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
    """
    Response serializer for grade submission.
    """
    success = serializers.BooleanField()
    subject_enrollment_id = serializers.UUIDField()
    grade = serializers.DecimalField(max_digits=3, decimal_places=2, allow_null=True)
    status = serializers.CharField()
    grade_history_id = serializers.UUIDField(allow_null=True)
    message = serializers.CharField()
