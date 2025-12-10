"""
Academics serializers.
"""

from rest_framework import serializers

from .models import Program, Subject, Section, SectionSubject, ScheduleSlot, CurriculumVersion


class SubjectMinimalSerializer(serializers.ModelSerializer):
    """Minimal subject serializer for nested use."""
    
    class Meta:
        model = Subject
        fields = ['id', 'code', 'title', 'units']


class SubjectSerializer(serializers.ModelSerializer):
    """Full subject serializer with prerequisites."""
    
    program_code = serializers.CharField(source='program.code', read_only=True)
    prerequisites = SubjectMinimalSerializer(many=True, read_only=True)
    inc_expiry_months = serializers.IntegerField(source='get_inc_expiry_months', read_only=True)
    
    class Meta:
        model = Subject
        fields = [
            'id', 'code', 'title', 'description', 'units',
            'is_major', 'year_level', 'semester_number',
            'allow_multiple_sections', 'program_code',
            'prerequisites', 'inc_expiry_months'
        ]


class ProgramSerializer(serializers.ModelSerializer):
    """Program serializer."""
    
    total_subjects = serializers.IntegerField(read_only=True)
    total_units = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Program
        fields = [
            'id', 'code', 'name', 'description', 
            'duration_years', 'is_active',
            'total_subjects', 'total_units'
        ]


class ProgramWithSubjectsSerializer(serializers.ModelSerializer):
    """Program serializer with full subject list."""
    
    subjects = SubjectSerializer(many=True, read_only=True)
    
    class Meta:
        model = Program
        fields = [
            'id', 'code', 'name', 'description', 
            'duration_years', 'is_active', 'subjects'
        ]


# ============================================================
# EPIC 2 - Curriculum CRUD Serializers
# ============================================================

class ProgramCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating programs."""
    
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
    
    class Meta:
        model = Subject
        fields = [
            'program', 'code', 'title', 'description', 'units',
            'is_major', 'year_level', 'semester_number',
            'allow_multiple_sections', 'prerequisite_ids'
        ]
    
    def validate_code(self, value):
        """Ensure code is uppercase."""
        return value.upper()
    
    def validate(self, attrs):
        """Validate prerequisites belong to same program."""
        prerequisite_ids = attrs.pop('prerequisite_ids', [])
        program = attrs.get('program')
        
        if prerequisite_ids:
            prereqs = Subject.objects.filter(id__in=prerequisite_ids, program=program)
            if prereqs.count() != len(prerequisite_ids):
                raise serializers.ValidationError({
                    'prerequisite_ids': 'All prerequisites must belong to the same program'
                })
            attrs['_prerequisites'] = prereqs
        
        return attrs
    
    def create(self, validated_data):
        prerequisites = validated_data.pop('_prerequisites', [])
        subject = Subject.objects.create(**validated_data)
        if prerequisites:
            subject.prerequisites.set(prerequisites)
        return subject
    
    def update(self, instance, validated_data):
        prerequisites = validated_data.pop('_prerequisites', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
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


# ============================================================
# EPIC 2 - Section & Scheduling Serializers
# ============================================================

class ScheduleSlotSerializer(serializers.ModelSerializer):
    """Serializer for schedule slots."""
    
    day_display = serializers.CharField(source='get_day_display', read_only=True)
    
    class Meta:
        model = ScheduleSlot
        fields = [
            'id', 'section_subject', 'day', 'day_display',
            'start_time', 'end_time', 'room'
        ]
        read_only_fields = ['id']
    
    def validate(self, attrs):
        """Validate time range."""
        start_time = attrs.get('start_time')
        end_time = attrs.get('end_time')
        
        if start_time and end_time and start_time >= end_time:
            raise serializers.ValidationError({
                'end_time': 'End time must be after start time'
            })
        
        return attrs


class ScheduleSlotCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating schedule slots with conflict checking."""
    
    override_conflict = serializers.BooleanField(
        default=False,
        write_only=True,
        help_text='Set to true to override conflicts (registrar only)'
    )
    override_reason = serializers.CharField(
        required=False,
        write_only=True,
        help_text='Reason for overriding conflict'
    )
    
    class Meta:
        model = ScheduleSlot
        fields = [
            'section_subject', 'day', 'start_time', 'end_time', 'room',
            'override_conflict', 'override_reason'
        ]
    
    def validate(self, attrs):
        """Validate time range and check for conflicts."""
        from .services import SchedulingService
        
        start_time = attrs.get('start_time')
        end_time = attrs.get('end_time')
        override = attrs.pop('override_conflict', False)
        override_reason = attrs.pop('override_reason', '')
        
        if start_time >= end_time:
            raise serializers.ValidationError({
                'end_time': 'End time must be after start time'
            })
        
        section_subject = attrs.get('section_subject')
        day = attrs.get('day')
        room = attrs.get('room')
        semester = section_subject.section.semester
        professor = section_subject.professor
        
        # Check professor conflict
        if professor:
            has_conflict, conflict = SchedulingService.check_professor_conflict(
                professor, day, start_time, end_time, semester
            )
            if has_conflict and not override:
                raise serializers.ValidationError({
                    'professor': f'Professor has a schedule conflict: {conflict}'
                })
            elif has_conflict and override:
                attrs['_override_reason'] = override_reason
        
        # Check room conflict (warning only)
        if room:
            has_conflict, conflict = SchedulingService.check_room_conflict(
                room, day, start_time, end_time, semester
            )
            if has_conflict:
                attrs['_room_conflict'] = str(conflict)
        
        return attrs


class SectionSubjectSerializer(serializers.ModelSerializer):
    """Serializer for section subjects with schedule."""
    
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    subject_title = serializers.CharField(source='subject.title', read_only=True)
    professor_name = serializers.SerializerMethodField()
    schedule_slots = ScheduleSlotSerializer(many=True, read_only=True)
    
    class Meta:
        model = SectionSubject
        fields = [
            'id', 'section', 'subject', 'subject_code', 'subject_title',
            'professor', 'professor_name', 'is_tba', 'schedule_slots'
        ]
        read_only_fields = ['id']
    
    def get_professor_name(self, obj):
        if obj.professor:
            return obj.professor.get_full_name()
        return 'TBA'


class SectionSubjectCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating section subjects."""
    
    class Meta:
        model = SectionSubject
        fields = ['section', 'subject', 'professor', 'is_tba']
    
    def validate(self, attrs):
        """Ensure subject belongs to section's program."""
        section = attrs.get('section')
        subject = attrs.get('subject')
        
        if subject.program != section.program:
            raise serializers.ValidationError({
                'subject': 'Subject must belong to the section\'s program'
            })
        
        return attrs


class SectionSerializer(serializers.ModelSerializer):
    """Serializer for sections."""
    
    program_code = serializers.CharField(source='program.code', read_only=True)
    semester_display = serializers.StringRelatedField(source='semester', read_only=True)
    enrolled_count = serializers.IntegerField(read_only=True)
    available_slots = serializers.IntegerField(read_only=True)
    section_subjects = SectionSubjectSerializer(many=True, read_only=True)
    
    class Meta:
        model = Section
        fields = [
            'id', 'name', 'program', 'program_code', 'semester', 'semester_display',
            'year_level', 'capacity', 'enrolled_count', 'available_slots',
            'section_subjects'
        ]
        read_only_fields = ['id', 'enrolled_count', 'available_slots']


class SectionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating sections."""
    
    class Meta:
        model = Section
        fields = ['name', 'program', 'semester', 'year_level', 'capacity']


# ============================================================
# EPIC 2 - Curriculum Versioning Serializers
# ============================================================

class CurriculumVersionSerializer(serializers.ModelSerializer):
    """Serializer for curriculum versions."""
    
    program_code = serializers.CharField(source='program.code', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = CurriculumVersion
        fields = [
            'id', 'program', 'program_code', 'semester', 'version_number',
            'subjects_snapshot', 'is_active', 'created_by', 'created_by_name',
            'notes', 'created_at'
        ]
        read_only_fields = ['id', 'version_number', 'subjects_snapshot', 'created_at']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name()
        return 'System'


class CurriculumVersionCreateSerializer(serializers.Serializer):
    """Serializer for creating curriculum snapshots."""
    
    semester_id = serializers.UUIDField(required=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate_semester_id(self, value):
        from apps.enrollment.models import Semester
        if not Semester.objects.filter(id=value).exists():
            raise serializers.ValidationError('Semester not found')
        return value

