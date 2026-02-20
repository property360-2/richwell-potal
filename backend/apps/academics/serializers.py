"""
Academics serializers.
"""

from django.db.models import Q
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from .models import Room, Program, Subject, Section, SectionSubject, ScheduleSlot, CurriculumVersion, Curriculum, CurriculumSubject


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
    inc_expiry_months = serializers.IntegerField(source='get_inc_expiry_months', read_only=True)

    classification_display = serializers.CharField(source='get_classification_display', read_only=True)

    def get_program_codes(self, obj):
        """Get all program codes this subject belongs to"""
        return [p.code for p in obj.programs.all()]

    def get_program_ids(self, obj):
        """Get all program IDs this subject belongs to"""
        return [str(p.id) for p in obj.programs.all()]

    def get_curriculum_codes(self, obj):
        """Get all curriculum codes this subject belongs to"""
        return list(obj.curriculum_assignments.filter(is_deleted=False).values_list('curriculum__code', flat=True).distinct())

    def get_curriculum_list(self, obj):
        """Get list of curriculum objects (id, code) this subject belongs to"""
        return list(obj.curriculum_assignments.filter(is_deleted=False).values('curriculum_id', 'curriculum__code').distinct())

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
        """Get all subjects relevant to this program (Primary, Multi-program, Global, or assigned via Curriculum)"""
        subjects = Subject.objects.filter(is_deleted=False).filter(
            Q(program=obj) |
            Q(programs=obj) |
            Q(curriculum_assignments__curriculum__program=obj, curriculum_assignments__is_deleted=False) |
            Q(is_global=True)
        ).distinct()
        return SubjectSerializer(subjects, many=True).data


class RoomSerializer(serializers.ModelSerializer):
    """Serializer for rooms."""
    
    class Meta:
        model = Room
        fields = ['id', 'name', 'capacity', 'room_type', 'is_active']


# ============================================================
# EPIC 2 - Curriculum CRUD Serializers
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
            # Collect all programs (primary + additional)
            all_program_ids = {program.id if hasattr(program, 'id') else program}
            all_program_ids.update(program_ids)

            # Check each prerequisite exists in ALL programs
            prereqs = Subject.objects.filter(id__in=prerequisite_ids)
            for prereq in prereqs:
                prereq_program_ids = set(prereq.programs.values_list('id', flat=True))

                # Check if prerequisite exists in all subject's programs
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

        # Add primary program
        subject.programs.add(subject.program)

        # Add additional programs
        if program_ids:
            additional_programs = Program.objects.filter(id__in=program_ids)
            subject.programs.add(*additional_programs)

        # Add prerequisites
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
            # Clear and reset programs
            instance.programs.clear()
            instance.programs.add(instance.program)  # Always include primary

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


# ============================================================
# EPIC 2 - Section & Scheduling Serializers
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
        
        # Handle room explicitly: if 'room' is in attrs, use it (could be empty string/None for clearing).
        # If not in attrs, use instance.room.
        if 'room' in attrs:
            room = attrs.get('room')
        else:
            room = instance.room if instance else None
            
        semester = section_subject.section.semester
        
        # Priority: explicit slot professor -> section_subject.professor
        prof_attr = attrs.get('professor')
        if prof_attr is not None: # Explicitly set in request
            professor = prof_attr
        elif instance and 'professor' not in attrs: # Not in request, use instance
            professor = instance.professor
        else:
            professor = None
            
        # Fallback to section subject professor
        if not professor:
            professor = section_subject.professor
        
        # Exclude current slot from conflict check if updating
        exclude_id = instance.id if instance else None

        # Check professor conflict with detailed error message
        if professor:
            has_conflict, conflict = SchedulingService.check_professor_conflict(
                professor, day, start_time, end_time, semester, exclude_slot_id=exclude_id
            )
            if has_conflict and not override:
                # Enhanced error message with more details
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
        
        # Check room conflict with detailed error message
        if room:
            has_conflict, conflict = SchedulingService.check_room_conflict(
                room, day, start_time, end_time, semester, exclude_slot_id=exclude_id
            )
            if has_conflict and not override:
                # Enhanced error message with more details
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


class SectionSubjectSerializer(serializers.ModelSerializer):
    """Serializer for section subjects with schedule and multiple professors."""

    subject_code = serializers.CharField(source='subject.code', read_only=True)
    subject_title = serializers.CharField(source='subject.title', read_only=True)
    subject_units = serializers.IntegerField(source='subject.units', read_only=True)
    subject_type = serializers.CharField(source='subject.subject_type', read_only=True)
    section_name = serializers.CharField(source='section.name', read_only=True)
    enrolled_count = serializers.IntegerField(source='section.enrolled_count', read_only=True)
    capacity = serializers.IntegerField(source='section.capacity', read_only=True)
    professors = serializers.SerializerMethodField()  # CHANGED: multiple professors
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

        # Check if subject belongs to ANY of section's programs (multi-program support)
        if not subject.programs.filter(id=section.program.id).exists():
            raise serializers.ValidationError({
                'subject': f'Subject must belong to program {section.program.code}'
            })

        return attrs

    def update(self, instance, validated_data):
        """Update section subject, syncing professor assignment."""
        professor = validated_data.get('professor')
        
        # Check if professor is being updated (present in validated_data)
        if 'professor' in validated_data:
            # Update standard fields
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()
            
            from apps.academics.models import SectionSubjectProfessor
            
            if professor:
                # Update: Ensure this professor is primary
                # 1. Unset other primaries
                SectionSubjectProfessor.objects.filter(
                    section_subject=instance,
                    is_primary=True
                ).update(is_primary=False)
                
                # 2. Set/Create new primary
                SectionSubjectProfessor.objects.update_or_create(
                    section_subject=instance,
                    professor=professor,
                    defaults={'is_primary': True, 'is_deleted': False}
                )
            else:
                # Professor removed (set to None)
                # Option: Clear all assignments or just primary?
                # Let's clear primary flag for safety, or leave as history?
                # For now, let's not delete rows, just ensure no one is primary if that's the logic
                # But UI shows "TBA", so maybe just un-primary everything
                SectionSubjectProfessor.objects.filter(
                    section_subject=instance
                ).update(is_primary=False)
                
        else:
            # Just updating other fields
            return super().update(instance, validated_data)
            
        return instance


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
        # Validate existence of objects
        if not Program.objects.filter(id=attrs['program'], is_deleted=False).exists():
            raise serializers.ValidationError({'program': 'Program not found'})
        
        if not Curriculum.objects.filter(id=attrs['curriculum'], is_deleted=False).exists():
            raise serializers.ValidationError({'curriculum': 'Curriculum not found'})
        
        from apps.enrollment.models import Semester
        if not Semester.objects.filter(id=attrs['semester'], is_deleted=False).exists():
            raise serializers.ValidationError({'semester': 'Semester not found'})
            
        return attrs


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


# ============================================================
# Curriculum Serializers (EPIC 7)
# ============================================================

class CurriculumSerializer(serializers.ModelSerializer):
    """Serializer for Curriculum with program details."""

    program_code = serializers.CharField(source='program.code', read_only=True)
    program_name = serializers.CharField(source='program.name', read_only=True)
    total_subjects = serializers.IntegerField(read_only=True)
    total_units = serializers.IntegerField(read_only=True)

    class Meta:
        model = Curriculum
        fields = [
            'id', 'program', 'program_code', 'program_name',
            'code', 'name', 'description', 'effective_year',
            'is_active', 'total_subjects', 'total_units',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class CurriculumCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating curricula."""

    copy_from = serializers.UUIDField(required=False, write_only=True, allow_null=True)

    class Meta:
        model = Curriculum
        fields = ['program', 'code', 'name', 'description', 'effective_year', 'is_active', 'copy_from']

    def validate(self, data):
        # Check for duplicate code within program
        program = data.get('program')
        code = data.get('code')

        # If updating, exclude current instance
        queryset = Curriculum.objects.filter(
            program=program,
            code=code,
            is_deleted=False
        )
        if self.instance:
            queryset = queryset.exclude(id=self.instance.id)

        if queryset.exists():
            raise serializers.ValidationError(
                {"code": "Curriculum code already exists for this program"}
            )

        return data


class CurriculumSubjectSerializer(serializers.ModelSerializer):
    """Serializer for CurriculumSubject with subject details."""

    subject_code = serializers.CharField(source='subject.code', read_only=True)
    subject_title = serializers.CharField(source='subject.title', read_only=True)
    subject_units = serializers.IntegerField(source='subject.units', read_only=True)
    prerequisites = serializers.SerializerMethodField()
    semester_name = serializers.SerializerMethodField()
    semester_dates = serializers.SerializerMethodField()

    class Meta:
        model = CurriculumSubject
        fields = [
            'id', 'curriculum', 'subject', 'subject_code', 'subject_title', 'subject_units',
            'year_level', 'semester_number', 'semester', 'semester_name', 'semester_dates',
            'is_required', 'prerequisites'
        ]

    def get_prerequisites(self, obj):
        """Return list of prerequisite subject codes and titles."""
        return [
            {
                'code': prereq.code,
                'title': prereq.title
            }
            for prereq in obj.subject.prerequisites.all()
        ]

    def get_semester_name(self, obj):
        """Return the name of the bound semester if any."""
        if obj.semester:
            return f"{obj.semester.name} {obj.semester.academic_year}"
        return None

    def get_semester_dates(self, obj):
        """Return the dates of the bound semester if any."""
        if obj.semester:
            return {
                'start_date': obj.semester.start_date,
                'end_date': obj.semester.end_date,
                'enrollment_start': obj.semester.enrollment_start_date,
                'enrollment_end': obj.semester.enrollment_end_date
            }
        return None


class CurriculumSubjectAssignmentSerializer(serializers.Serializer):
    """Serializer for assigning subjects to curriculum."""

    subject_id = serializers.UUIDField()
    year_level = serializers.IntegerField(min_value=1, max_value=5)
    semester_number = serializers.IntegerField(min_value=1, max_value=3)
    semester_id = serializers.UUIDField(required=False, allow_null=True)
    is_required = serializers.BooleanField(default=True)


class AssignSubjectsSerializer(serializers.Serializer):
    """Serializer for bulk assigning subjects to curriculum."""

    assignments = CurriculumSubjectAssignmentSerializer(many=True)

    def validate_assignments(self, value):
        if not value:
            raise serializers.ValidationError("At least one subject assignment is required")
        return value


class CurriculumStructureSerializer(serializers.Serializer):
    """Serializer for curriculum structure response."""

    curriculum = CurriculumSerializer()
    structure = serializers.DictField()


class ProfessorProfileSerializer(serializers.ModelSerializer):
    """Serializer for professor profile details."""
    assigned_subjects = SubjectMinimalSerializer(many=True, read_only=True)
    assigned_subject_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False
    )
    programs = ProgramMinimalSerializer(many=True, read_only=True)
    program_codes = serializers.SerializerMethodField()
    program_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False
    )

    class Meta:
        from apps.accounts.models import ProfessorProfile
        model = ProfessorProfile
        fields = [
            'department', 'office_location', 'specialization',
            'max_teaching_hours', 'assigned_subjects', 'assigned_subject_ids',
            'programs', 'program_codes', 'program_ids',
            'is_active'
        ]

    def get_program_codes(self, obj):
        return list(obj.programs.values_list('code', flat=True))

class ProfessorSerializer(serializers.ModelSerializer):
    """Basic serializer for professor listing and creation."""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    profile = ProfessorProfileSerializer(source='professor_profile', required=False)

    temp_password = serializers.CharField(read_only=True)

    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=True)

    class Meta:
        from apps.accounts.models import User
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'full_name', 'is_active', 'profile', 'temp_password', 'password']
        extra_kwargs = {
            'password': {'write_only': True, 'required': False}
        }

    def create(self, validated_data):
        from apps.accounts.models import User, ProfessorProfile
        profile_data = validated_data.pop('professor_profile', {})
        assigned_subject_ids = profile_data.pop('assigned_subject_ids', [])

        # Ensure username is set to email to avoid duplicate empty username errors
        email = validated_data.get('email')
        if email:
            validated_data['username'] = email

        # Password logic
        password = validated_data.pop('password', None)
        is_generated = False
        
        if not password:
            from django.utils.crypto import get_random_string
            password = get_random_string(length=12)
            is_generated = True

        # Create user
        user = User.objects.create_user(
            role=User.Role.PROFESSOR,
            password=password,
            **validated_data
        )
        
        # Create profile
        program_ids = profile_data.pop('program_ids', None)
        profile = ProfessorProfile.objects.create(user=user, **profile_data)
        if assigned_subject_ids:
            profile.assigned_subjects.set(assigned_subject_ids)
        
        if program_ids:
            profile.programs.set(program_ids)

        # Attach temp_password so it's included in the response ONLY if generated
        if is_generated:
            user.temp_password = password

        return user

    def validate(self, attrs):
        """Check for duplicate professor by name."""
        first_name = attrs.get('first_name', '').strip()
        last_name = attrs.get('last_name', '').strip()
        
        # Only check on create (when instance is None)
        if hasattr(self, 'instance') and self.instance is None: 
            from apps.accounts.models import User
            if User.objects.filter(
                role='PROFESSOR',
                first_name__iexact=first_name,
                last_name__iexact=last_name
            ).exists():
                raise serializers.ValidationError(
                    "A professor with this name already exists."
                )
        return attrs

    def update(self, instance, validated_data):
        from apps.accounts.models import ProfessorProfile
        profile_data = validated_data.pop('professor_profile', {})
        assigned_subject_ids = profile_data.pop('assigned_subject_ids', None)

        # Sync username if email changes
        email = validated_data.get('email')
        if email:
            validated_data['username'] = email

        # Update User fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update or create Profile
        profile, created = ProfessorProfile.objects.get_or_create(user=instance)
        program_ids = profile_data.pop('program_ids', None)
        for attr, value in profile_data.items():
            setattr(profile, attr, value)
        
        if assigned_subject_ids is not None:
            profile.assigned_subjects.set(assigned_subject_ids)
            
        if program_ids is not None:
            profile.programs.set(program_ids)

        profile.save()

        return instance


class ProfessorDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for professor with teaching load."""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    profile = ProfessorProfileSerializer(source='professor_profile', read_only=True)
    teaching_load = serializers.SerializerMethodField()
    weekly_schedule = serializers.SerializerMethodField()

    class Meta:
        from apps.accounts.models import User
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'full_name',
                  'is_active', 'profile', 'teaching_load', 'weekly_schedule']

    def get_teaching_load(self, obj):
        from apps.academics.services import ProfessorService
        from apps.enrollment.models import Semester

        semester = Semester.objects.filter(is_current=True).first()
        return ProfessorService.get_workload(obj, semester) if semester else {}

    def get_weekly_schedule(self, obj):
        from apps.academics.services import SchedulingService
        from apps.enrollment.models import Semester

        semester = Semester.objects.filter(is_current=True).first()
        return SchedulingService.get_professor_schedule(obj, semester) if semester else []


class SectionSubjectProfessorSerializer(serializers.ModelSerializer):
    """Serializer for professor assignments to section-subjects."""
    professor_name = serializers.CharField(source='professor.get_full_name', read_only=True)
    professor_email = serializers.CharField(source='professor.email', read_only=True)

    class Meta:
        from apps.academics.models import SectionSubjectProfessor
        model = SectionSubjectProfessor
        fields = ['id', 'section_subject', 'professor', 'professor_name',
                  'professor_email', 'is_primary']

