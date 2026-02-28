"""
Professor serializers — profile, CRUD, detail with teaching load, section-subject assignments.
"""

from rest_framework import serializers

from .serializers_programs import ProgramMinimalSerializer, SubjectMinimalSerializer


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

        email = validated_data.get('email')
        if email:
            validated_data['username'] = email

        password = validated_data.pop('password', None)
        is_generated = False
        
        if not password:
            from django.utils.crypto import get_random_string
            password = get_random_string(length=12)
            is_generated = True

        user = User.objects.create_user(
            role=User.Role.PROFESSOR,
            password=password,
            **validated_data
        )
        
        program_ids = profile_data.pop('program_ids', None)
        profile = ProfessorProfile.objects.create(user=user, **profile_data)
        if assigned_subject_ids:
            profile.assigned_subjects.set(assigned_subject_ids)
        
        if program_ids:
            profile.programs.set(program_ids)

        if is_generated:
            user.temp_password = password

        return user

    def validate(self, attrs):
        """Check for duplicate professor by name."""
        first_name = attrs.get('first_name', '').strip()
        last_name = attrs.get('last_name', '').strip()
        
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

        email = validated_data.get('email')
        if email:
            validated_data['username'] = email

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

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
