"""
Program, Subject, and Room serializers — read + create/update.
"""

from django.db.models import Q
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from .models import Room, Program, Subject, CurriculumSubject


class ProgramMinimalSerializer(serializers.ModelSerializer):
    """Minimal program serializer for nested use."""
    class Meta:
        model = Program
        fields = ['id', 'code', 'name']


class SubjectMinimalSerializer(serializers.ModelSerializer):
    """Minimal subject serializer for nested use."""
    class Meta:
        model = Subject
        fields = ['id', 'code', 'title', 'units', 'is_global']


class SubjectSerializer(serializers.ModelSerializer):
    """Full subject serializer with prerequisites."""
    program_code = serializers.CharField(source='program.code', read_only=True)
    program_codes = serializers.SerializerMethodField()
    program_ids = serializers.SerializerMethodField()
    curriculum_codes = serializers.SerializerMethodField()
    curriculum_list = serializers.SerializerMethodField()
    prerequisites = SubjectMinimalSerializer(many=True, read_only=True)

    def get_program_codes(self, obj):
        """Get all program codes this subject belongs to"""
        return list(obj.programs.values_list('code', flat=True))

    def get_program_ids(self, obj):
        """Get all program IDs this subject belongs to"""
        return [str(pid) for pid in obj.programs.values_list('id', flat=True)]

    def get_curriculum_codes(self, obj):
        """Get all curriculum codes this subject belongs to"""
        return list(CurriculumSubject.objects.filter(subject=obj, is_deleted=False).values_list('curriculum__code', flat=True).distinct())

    def get_curriculum_list(self, obj):
        """Get list of curriculum objects (id, code) this subject belongs to"""
        return list(CurriculumSubject.objects.filter(subject=obj, is_deleted=False)
                    .values_list('curriculum__id', 'curriculum__code')
                    .distinct())

    class Meta:
        model = Subject
        fields = [
            'id', 'code', 'title', 'description', 'units',
            'is_major', 'year_level', 'semester_number', 'classification', 'classification_display',
            'allow_multiple_sections', 'program_code', 'program_codes', 'program_ids',
            'curriculum_codes', 'curriculum_list', 'prerequisites', 'inc_expiry_months', 'syllabus', 'is_global'
        ]


class ProgramSerializer(serializers.ModelSerializer):
    """Program serializer."""
    total_subjects = serializers.IntegerField(read_only=True)
    total_units = serializers.IntegerField(read_only=True)
    total_curricula = serializers.IntegerField(read_only=True)

    class Meta:
        model = Program
        fields = [
            'id', 'code', 'name', 'description', 
            'duration_years', 'is_active',
            'total_subjects', 'total_units', 'total_curricula'
        ]


class ProgramWithSubjectsSerializer(serializers.ModelSerializer):
    """Program serializer with full subject list."""
    subjects = serializers.SerializerMethodField()

    class Meta:
        model = Program
        fields = [
            'id', 'code', 'name', 'description', 
            'duration_years', 'is_active', 'subjects'
        ]

    def get_subjects(self, obj):
        """Get all subjects relevant to this program (Primary, Multi-program, Global, or assigned via Curriculum)."""
        subjects = Subject.objects.filter(
            Q(program=obj) |
            Q(programs=obj) |
            Q(curriculum_assignments__curriculum__program=obj) |
            Q(is_global=True),
            is_deleted=False
        ).distinct()
        return SubjectSerializer(subjects, many=True).data


class RoomSerializer(serializers.ModelSerializer):
    """Serializer for rooms."""
    class Meta:
        model = Room
        fields = ['id', 'name', 'capacity', 'room_type', 'is_active']


# ============================================================
# Program & Subject Create/Update Serializers
# ============================================================

class ProgramCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating programs."""
    code = serializers.CharField(
        validators=[
            UniqueValidator(
                queryset=Program.all_objects.all(),
                message="A program with this code already exists (even if deleted)."
            )
        ]
    )

    class Meta:
        model = Program
        fields = ['code', 'name', 'description', 'duration_years', 'is_active']

    def validate_code(self, value):
        """Ensure code is uppercase."""
        return value.upper()


class SubjectCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating subjects."""

    prerequisite_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        write_only=True,
        help_text='List of prerequisite subject UUIDs'
    )

    program_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        write_only=True,
        help_text='Additional program UUIDs (primary program auto-included)'
    )

    class Meta:
        model = Subject
        fields = [
            'program', 'code', 'title', 'description', 'units',
            'is_major', 'year_level', 'semester_number', 'classification',
            'allow_multiple_sections', 'prerequisite_ids', 'program_ids',
            'syllabus', 'is_global'
        ]

    def validate_code(self, value):
        """Ensure code is uppercase."""
        return value.upper()

    def validate(self, attrs):
        """Validate prerequisites exist in ALL subject's programs"""
        prerequisite_ids = attrs.pop('prerequisite_ids', [])
        program = attrs.get('program')
        program_ids = attrs.pop('program_ids', [])

        if prerequisite_ids:
            all_program_ids = {program.id if hasattr(program, 'id') else program}
            all_program_ids.update(program_ids)

            prereqs = Subject.objects.filter(id__in=prerequisite_ids)
            for prereq in prereqs:
                prereq_program_ids = set(prereq.programs.values_list('id', flat=True))
                missing_programs = all_program_ids - prereq_program_ids
                if missing_programs:
                    missing_codes = Program.objects.filter(id__in=missing_programs).values_list('code', flat=True)
                    raise serializers.ValidationError({
                        'prerequisite_ids':
                            f'Prerequisite {prereq.code} must exist in all programs: {", ".join(missing_codes)}'
                    })

            attrs['_prerequisites'] = prereqs

        attrs['_program_ids'] = program_ids
        return attrs

    def create(self, validated_data):
        program_ids = validated_data.pop('_program_ids', [])
        prerequisites = validated_data.pop('_prerequisites', [])

        subject = Subject.objects.create(**validated_data)
        subject.programs.add(subject.program)

        if program_ids:
            additional_programs = Program.objects.filter(id__in=program_ids)
            subject.programs.add(*additional_programs)

        if prerequisites:
            subject.prerequisites.set(prerequisites)

        return subject

    def update(self, instance, validated_data):
        program_ids = validated_data.pop('_program_ids', None)
        prerequisites = validated_data.pop('_prerequisites', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if program_ids is not None:
            instance.programs.clear()
            instance.programs.add(instance.program)
            additional_programs = Program.objects.filter(id__in=program_ids)
            instance.programs.add(*additional_programs)

        if prerequisites is not None:
            instance.prerequisites.set(prerequisites)

        return instance


class PrerequisiteSerializer(serializers.Serializer):
    """Serializer for adding/removing prerequisites."""
    
    prerequisite_id = serializers.UUIDField(required=True)
    
    def validate_prerequisite_id(self, value):
        """Ensure the prerequisite exists."""
        if not Subject.objects.filter(id=value, is_deleted=False).exists():
            raise serializers.ValidationError('Subject not found')
        return value
