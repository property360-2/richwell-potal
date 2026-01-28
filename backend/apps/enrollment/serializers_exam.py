"""
Exam Permit serializers.
EPIC 4: Payments & Exam Permits
"""

from rest_framework import serializers
from .models import ExamPermit, ExamMonthMapping, Semester

class ExamMonthMappingSerializer(serializers.ModelSerializer):
    semester_name = serializers.CharField(source='semester.name', read_only=True)
    semester_academic_year = serializers.CharField(source='semester.academic_year', read_only=True)
    exam_period_display = serializers.CharField(source='get_exam_period_display', read_only=True)
    
    class Meta:
        model = ExamMonthMapping
        fields = [
            'id', 'semester', 'semester_name', 'semester_academic_year',
            'exam_period', 'exam_period_display', 'required_month', 'is_active',
            'created_at', 'updated_at'
        ]

class ExamPermitSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='enrollment.student.get_full_name', read_only=True)
    student_number = serializers.CharField(source='enrollment.student.student_number', read_only=True)
    exam_period_display = serializers.CharField(source='get_exam_period_display', read_only=True)
    is_valid = serializers.BooleanField(read_only=True)
    academic_year = serializers.CharField(source='enrollment.semester.academic_year', read_only=True)
    semester_name = serializers.CharField(source='enrollment.semester.name', read_only=True)
    
    class Meta:
        model = ExamPermit
        fields = [
            'id', 'enrollment', 'student_name', 'student_number',
            'exam_period', 'exam_period_display', 'permit_code',
            'required_month', 'is_printed', 'printed_at', 'is_valid',
            'academic_year', 'semester_name', 'created_at'
        ]
        read_only_fields = ['permit_code', 'is_printed', 'printed_at']

class GeneratePermitSerializer(serializers.Serializer):
    exam_period = serializers.ChoiceField(choices=ExamMonthMapping.ExamPeriod.choices)
    
