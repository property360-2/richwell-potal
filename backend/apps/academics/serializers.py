from rest_framework import serializers
from .models import Program, CurriculumVersion, Subject, SubjectPrerequisite

class SubjectPrerequisiteSerializer(serializers.ModelSerializer):
    prerequisite_subject_code = serializers.CharField(source='prerequisite_subject.code', read_only=True)
    prerequisite_type_display = serializers.CharField(source='get_prerequisite_type_display', read_only=True)

    class Meta:
        model = SubjectPrerequisite
        fields = [
            'id', 'subject', 'prerequisite_type', 'prerequisite_type_display', 
            'prerequisite_subject', 'prerequisite_subject_code', 
            'standing_year', 'description'
        ]

class SubjectSerializer(serializers.ModelSerializer):
    prerequisites = SubjectPrerequisiteSerializer(many=True, read_only=True)
    curriculum_name = serializers.CharField(source='curriculum.version_name', read_only=True)
    program_code = serializers.CharField(source='curriculum.program.code', read_only=True)

    class Meta:
        model = Subject
        fields = [
            'id', 'curriculum', 'curriculum_name', 'program_code', 'code', 'description', 
            'year_level', 'semester', 'lec_units', 'lab_units', 'total_units', 
            'hrs_per_week', 'is_major', 'is_practicum', 'prerequisites'
        ]

class CurriculumVersionSerializer(serializers.ModelSerializer):
    program_code = serializers.CharField(source='program.code', read_only=True)
    subject_count = serializers.IntegerField(source='subjects.count', read_only=True)

    class Meta:
        model = CurriculumVersion
        fields = ['id', 'program', 'program_code', 'version_name', 'is_active', 'subject_count', 'created_at']

class ProgramSerializer(serializers.ModelSerializer):
    program_head_name = serializers.CharField(source='program_head.get_full_name', read_only=True)
    active_curriculum_id = serializers.SerializerMethodField()

    class Meta:
        model = Program
        fields = [
            'id', 'code', 'name', 'effective_year', 'has_summer', 
            'program_head', 'program_head_name', 'is_active', 'active_curriculum_id'
        ]
        
    def get_active_curriculum_id(self, obj):
        active = obj.curriculum_versions.filter(is_active=True).first()
        return active.id if active else None
