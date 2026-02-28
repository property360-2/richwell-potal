"""
Curriculum serializers — versioning, CRUD, subject assignment, structure.
"""

from rest_framework import serializers

from .models import Curriculum, CurriculumVersion, CurriculumSubject


# ============================================================
# Curriculum Version Serializers
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
# Curriculum CRUD Serializers (EPIC 7)
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
        program = data.get('program')
        code = data.get('code')

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
            {'code': prereq.code, 'title': prereq.title}
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
