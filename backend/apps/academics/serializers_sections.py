"""
Section and Scheduling serializers — schedule slots, section subjects, sections.
"""

from rest_framework import serializers

from .models import Program, Section, SectionSubject, ScheduleSlot, Curriculum


# ============================================================
# Schedule Slot Serializers
# ============================================================

class ScheduleSlotSerializer(serializers.ModelSerializer):
    """Serializer for schedule slots."""
    
    day_display = serializers.CharField(source='get_day_display', read_only=True)
    professor_name = serializers.CharField(source='professor.get_full_name', read_only=True)
    section = serializers.CharField(source='section_subject.section.name', read_only=True)
    subject_code = serializers.CharField(source='section_subject.subject.code', read_only=True)
    subject_title = serializers.CharField(source='section_subject.subject.title', read_only=True)
    subject_id = serializers.UUIDField(source='section_subject.subject.id', read_only=True)
    
    class Meta:
        model = ScheduleSlot
        fields = [
            'id', 'section_subject', 'day', 'day_display',
            'start_time', 'end_time', 'room', 'professor', 'professor_name',
            'section', 'subject_code', 'subject_title', 'subject_id', 'color'
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
            'section_subject', 'day', 'start_time', 'end_time', 'room', 'professor',
            'override_conflict', 'override_reason', 'color'
        ]
    
    def validate_section_subject(self, value):
        """Validate that section_subject exists and is not deleted."""
        if not value:
            raise serializers.ValidationError("Section subject assignment is required")
        
        if value.is_deleted:
            raise serializers.ValidationError("This section subject assignment has been deleted")
        
        return value
    
    def validate(self, attrs):
        """Validate time range and check for conflicts."""
        from .services import SchedulingService
        
        instance = getattr(self, 'instance', None)
        
        start_time = attrs.get('start_time') or (instance.start_time if instance else None)
        end_time = attrs.get('end_time') or (instance.end_time if instance else None)
        override = attrs.pop('override_conflict', False)
        override_reason = attrs.pop('override_reason', '')
        
        # Validate time range
        if start_time and end_time and start_time >= end_time:
            raise serializers.ValidationError({
                'end_time': 'End time must be after start time'
            })
        
        # Validate required fields
        section_subject = attrs.get('section_subject') or (instance.section_subject if instance else None)
        if not section_subject:
            raise serializers.ValidationError({
                'section_subject': 'Section subject assignment is required'
            })
        
        day = attrs.get('day') or (instance.day if instance else None)
        if not day:
            raise serializers.ValidationError({
                'day': 'Day is required'
            })
        
        # Handle room explicitly
        if 'room' in attrs:
            room = attrs.get('room')
        else:
            room = instance.room if instance else None
            
        semester = section_subject.section.semester
        
        # Priority: explicit slot professor -> section_subject.professor
        prof_attr = attrs.get('professor')
        if prof_attr is not None:
            professor = prof_attr
        elif instance and 'professor' not in attrs:
            professor = instance.professor
        else:
            professor = None
            
        # Fallback to section subject professor
        if not professor:
            professor = section_subject.professor
        
        # Exclude current slot from conflict check if updating
        exclude_id = instance.id if instance else None

        # Check professor conflict
        if professor:
            has_conflict, conflict = SchedulingService.check_professor_conflict(
                professor, day, start_time, end_time, semester, exclude_slot_id=exclude_id
            )
            if has_conflict and not override:
                conflict_msg = f'Professor {professor.get_full_name()} is already scheduled: {conflict}'
                raise serializers.ValidationError({
                    'professor': conflict_msg,
                    'conflict_details': {
                        'type': 'professor',
                        'resource': professor.get_full_name(),
                        'conflict': str(conflict)
                    }
                })
            elif has_conflict and override:
                attrs['_override_reason'] = override_reason
                
            # Check professional warnings
            warnings = SchedulingService.check_professor_warnings(
                professor, day, start_time, end_time, semester
            )
            if warnings and not override:
                raise serializers.ValidationError({
                    'professor': warnings[0],
                    'warning_type': 'workload'
                })
        
        # Check room conflict
        if room:
            has_conflict, conflict = SchedulingService.check_room_conflict(
                room, day, start_time, end_time, semester, exclude_slot_id=exclude_id
            )
            if has_conflict and not override:
                conflict_msg = f'Room {room} is already occupied: {conflict}'
                raise serializers.ValidationError({
                    'room': conflict_msg,
                    'conflict_details': {
                        'type': 'room',
                        'resource': room,
                        'conflict': str(conflict)
                    }
                })
            elif has_conflict and override:
                attrs['_room_conflict'] = str(conflict)
                attrs['_override_reason'] = override_reason
        
        return attrs


# ============================================================
# Section Subject Serializers
# ============================================================

class SectionSubjectSerializer(serializers.ModelSerializer):
    """Serializer for section subjects with schedule and multiple professors."""

    subject_code = serializers.CharField(source='subject.code', read_only=True)
    subject_title = serializers.CharField(source='subject.title', read_only=True)
    subject_units = serializers.IntegerField(source='subject.units', read_only=True)
    subject_type = serializers.CharField(source='subject.subject_type', read_only=True)
    section_name = serializers.CharField(source='section.name', read_only=True)
    enrolled_count = serializers.IntegerField(source='section.enrolled_count', read_only=True)
    capacity = serializers.IntegerField(source='section.capacity', read_only=True)
    professors = serializers.SerializerMethodField()
    schedule_slots = ScheduleSlotSerializer(many=True, read_only=True)

    class Meta:
        model = SectionSubject
        fields = [
            'id', 'section', 'section_name', 'enrolled_count', 'capacity',
            'subject', 'subject_code', 'subject_title',
            'subject_units', 'subject_type',
            'professors', 'is_tba', 'schedule_slots'
        ]
        read_only_fields = ['id']

    def get_professors(self, obj):
        """Get all professors assigned to this section-subject."""
        from apps.academics.models import SectionSubjectProfessor

        assignments = SectionSubjectProfessor.objects.filter(
            section_subject=obj, is_deleted=False
        ).select_related('professor').order_by('-is_primary')

        return [{
            'id': str(a.professor.id),
            'name': a.professor.get_full_name(),
            'email': a.professor.email,
            'is_primary': a.is_primary
        } for a in assignments]


class SectionSubjectCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating section subjects."""
    
    class Meta:
        model = SectionSubject
        fields = ['section', 'subject', 'professor', 'is_tba']
    
    def validate(self, attrs):
        """Ensure subject belongs to section's program."""
        section = attrs.get('section')
        subject = attrs.get('subject')

        if not subject.programs.filter(id=section.program.id).exists():
            raise serializers.ValidationError({
                'subject': f'Subject must belong to program {section.program.code}'
            })

        return attrs

    def update(self, instance, validated_data):
        """Update section subject, syncing professor assignment."""
        professor = validated_data.get('professor')
        
        if 'professor' in validated_data:
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()
            
            from apps.academics.models import SectionSubjectProfessor
            
            if professor:
                SectionSubjectProfessor.objects.filter(
                    section_subject=instance,
                    is_primary=True
                ).update(is_primary=False)
                
                SectionSubjectProfessor.objects.update_or_create(
                    section_subject=instance,
                    professor=professor,
                    defaults={'is_primary': True, 'is_deleted': False}
                )
            else:
                SectionSubjectProfessor.objects.filter(
                    section_subject=instance
                ).update(is_primary=False)
                
        else:
            return super().update(instance, validated_data)
            
        return instance


# ============================================================
# Section Serializers
# ============================================================

class SectionSerializer(serializers.ModelSerializer):
    """Serializer for sections."""
    
    program_code = serializers.CharField(source='program.code', read_only=True)
    semester_display = serializers.StringRelatedField(source='semester', read_only=True)
    enrolled_count = serializers.IntegerField(read_only=True)
    available_slots = serializers.IntegerField(read_only=True)
    curriculum_display = serializers.StringRelatedField(source='curriculum', read_only=True)
    section_subjects = SectionSubjectSerializer(many=True, read_only=True)
    
    class Meta:
        model = Section
        fields = [
            'id', 'name', 'program', 'program_code', 'semester', 'semester_display',
            'curriculum', 'curriculum_display',
            'year_level', 'capacity', 'enrolled_count', 'available_slots',
            'section_subjects', 'is_dissolved', 'parent_section'
        ]
        read_only_fields = ['id', 'enrolled_count', 'available_slots']


class SectionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating sections."""
    
    subject_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        write_only=True
    )

    class Meta:
        model = Section
        fields = ['name', 'program', 'semester', 'curriculum', 'year_level', 'capacity', 'subject_ids']


class BulkSectionCreateSerializer(serializers.Serializer):
    """Serializer for bulk creating sections."""
    
    program = serializers.UUIDField(required=True)
    year_level = serializers.IntegerField(min_value=1, max_value=5, required=True)
    curriculum = serializers.UUIDField(required=True)
    semester = serializers.UUIDField(required=True)
    capacity = serializers.IntegerField(min_value=1, default=40)
    section_names = serializers.ListField(
        child=serializers.CharField(max_length=50),
        min_length=1,
        required=True
    )

    def validate(self, attrs):
        if not Program.objects.filter(id=attrs['program'], is_deleted=False).exists():
            raise serializers.ValidationError({'program': 'Program not found'})
        
        if not Curriculum.objects.filter(id=attrs['curriculum'], is_deleted=False).exists():
            raise serializers.ValidationError({'curriculum': 'Curriculum not found'})
        
        from apps.enrollment.models import Semester
        if not Semester.objects.filter(id=attrs['semester'], is_deleted=False).exists():
            raise serializers.ValidationError({'semester': 'Semester not found'})
            
        return attrs
