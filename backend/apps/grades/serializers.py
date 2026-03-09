from rest_framework import serializers
from apps.grades.models import Grade
from apps.academics.serializers import SubjectSerializer


class GradeSerializer(serializers.ModelSerializer):
    subject_details = SubjectSerializer(source='subject', read_only=True)
    grade_status_display = serializers.CharField(source='get_grade_status_display', read_only=True)
    advising_status_display = serializers.CharField(source='get_advising_status_display', read_only=True)
    
    class Meta:
        model = Grade
        fields = [
            'id', 'student', 'subject', 'subject_details', 'term', 'section',
            'advising_status', 'advising_status_display',
            'grade_status', 'grade_status_display',
            'midterm_grade', 'final_grade',
            'is_credited', 'is_retake', 'rejection_reason', 'inc_deadline',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']



class AdvisingSubmitSerializer(serializers.Serializer):
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


class CreditingSerializer(serializers.Serializer):
    subject_id = serializers.IntegerField()
