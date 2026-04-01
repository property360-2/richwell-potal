from rest_framework import serializers
from apps.grades.models import Grade, CreditingRequest, CreditingRequestItem
from apps.academics.serializers import SubjectSerializer


class GradeSerializer(serializers.ModelSerializer):
    """
    Serializer for the Grade model.
    Provides detailed information about a student's grade, including subject and section details.
    """
    subject_details = SubjectSerializer(source='subject', read_only=True)
    grade_status_display = serializers.CharField(source='get_grade_status_display', read_only=True)
    advising_status_display = serializers.CharField(source='get_advising_status_display', read_only=True)
    
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    student_idn = serializers.CharField(source='student.idn', read_only=True)
    
    section_details = serializers.SerializerMethodField()
    professor_name = serializers.SerializerMethodField()
    resolution_requested_by_name = serializers.SerializerMethodField()
    resolution_approved_by_name = serializers.SerializerMethodField()
    term_details = serializers.SerializerMethodField()
    remaining_days = serializers.SerializerMethodField()

    def get_section_details(self, obj):
        if not obj.section:
            return None
        from apps.sections.serializers import SectionSerializer
        return SectionSerializer(obj.section).data

    def get_professor_name(self, obj):
        if not obj.section or not obj.subject or not obj.term:
            return "TBA"
        
        from apps.scheduling.models import Schedule
        # Try to find a schedule for this section, subject, and term
        schedule = Schedule.objects.filter(
            section=obj.section,
            subject=obj.subject,
            term=obj.term
        ).first()
        
        if schedule and schedule.professor:
            return schedule.professor.user.get_full_name()
        return "TBA"
    
    def get_resolution_requested_by_name(self, obj):
        return obj.resolution_requested_by.get_full_name() if obj.resolution_requested_by else None

    def get_resolution_approved_by_name(self, obj):
        return obj.resolution_approved_by.get_full_name() if obj.resolution_approved_by else None
    
    def get_term_details(self, obj):
        if not obj.term:
            return None
        return {
            "id": obj.term.id,
            "code": obj.term.code,
            "name": str(obj.term)
        }

    def get_remaining_days(self, obj):
        if not obj.inc_deadline:
            return None
        from django.utils import timezone
        now = timezone.now().date()
        diff = obj.inc_deadline - now
        return max(0, diff.days)
    
    class Meta:
        model = Grade
        fields = [
            'id', 'student', 'student_name', 'student_idn', 
            'subject', 'subject_details', 'term', 'section', 'section_details',
            'professor_name', 'term_details', 'remaining_days',
            'advising_status', 'advising_status_display',
            'grade_status', 'grade_status_display',
            'midterm_grade', 'final_grade',
            'resolution_status', 'resolution_new_grade', 'resolution_reason',
            'resolution_requested_by_name', 'resolution_approved_by_name',
            'is_credited', 'is_retake', 'rejection_reason', 'inc_deadline',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AdvisingSubmitSerializer(serializers.Serializer):
    """
    Serializer for submitting subjects for advising.
    """
    subject_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True
    )

    def validate_subject_ids(self, value):
        from apps.academics.models import Subject
        if not value:
            raise serializers.ValidationError("At least one subject must be selected.")
        
        subjects = Subject.objects.filter(id__in=value)
        if len(subjects) != len(value):
            raise serializers.ValidationError("One or more subject IDs are invalid.")
            
        return value


class CreditingRequestItemSerializer(serializers.ModelSerializer):
    """
    Serializer for individual items within a crediting request.
    """
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    subject_title = serializers.CharField(source='subject.title', read_only=True)
    units = serializers.IntegerField(source='subject.units', read_only=True)

    class Meta:
        model = CreditingRequestItem
        fields = ['id', 'subject', 'subject_code', 'subject_title', 'units', 'final_grade']


class CreditingRequestSerializer(serializers.ModelSerializer):
    """
    Serializer for the CreditingRequest model.
    Handles bulk crediting requests for transferee students.
    """
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    student_idn = serializers.CharField(source='student.idn', read_only=True)
    requested_by_name = serializers.CharField(source='requested_by.get_full_name', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True)
    items = CreditingRequestItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = CreditingRequest
        fields = [
            'id', 'student', 'student_name', 'student_idn', 'term',
            'requested_by', 'requested_by_name', 'reviewed_by', 'reviewed_by_name',
            'status', 'rejection_reason', 'comment', 'created_at', 'updated_at', 'items'
        ]


class BulkCreditingSubmitSerializer(serializers.Serializer):
    """
    Serializer for submitting a bulk crediting request.
    """
    term_id = serializers.IntegerField(required=False)
    items = serializers.ListField(
        child=serializers.DictField()
    )
