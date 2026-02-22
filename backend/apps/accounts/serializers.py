"""
Accounts serializers.
"""

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User, StudentProfile, PermissionCategory, Permission, UserPermission


class LoginSerializer(TokenObtainPairSerializer):
    """Custom login serializer with additional user data in response."""
    
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Add custom claims
        token['email'] = user.email
        token['role'] = user.role
        token['full_name'] = user.get_full_name()
        
        return token
    
    def validate(self, attrs):
        data = super().validate(attrs)
        from apps.enrollment.models import Enrollment
        
        # Get latest enrollment once for both checks
        latest_enrollment = Enrollment.objects.filter(
            student=self.user
        ).order_by('-created_at').first()
        
        # Check if student account has been rejected
        if self.user.role == 'STUDENT':
            if latest_enrollment and latest_enrollment.status == 'REJECTED':
                raise serializers.ValidationError({
                    'detail': 'Your application has been rejected. Please contact the Admissions Office for more information.'
                })
        
        # Add user info to response
        data['user'] = {
            'id': str(self.user.id),
            'email': self.user.email,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'role': self.user.role,
            'student_number': self.user.student_number,
            'enrollment_status': latest_enrollment.status if latest_enrollment else None,
        }
        
        return data


class StudentProfileSerializer(serializers.ModelSerializer):
    """Serializer for StudentProfile."""
    
    program_name = serializers.CharField(source='program.name', read_only=True)
    program_code = serializers.CharField(source='program.code', read_only=True)
    curriculum_name = serializers.CharField(source='curriculum.name', read_only=True)
    curriculum_code = serializers.CharField(source='curriculum.code', read_only=True)
    home_section_name = serializers.CharField(source='home_section.name', read_only=True, allow_null=True)
    
    class Meta:
        model = StudentProfile
        fields = [
            'id', 'year_level', 'status', 'middle_name', 'suffix',
            'birthdate', 'address', 'contact_number',
            'is_transferee', 'is_past_student', 'previous_school', 'previous_course',
            'is_irregular', 'overload_approved',
            'program_name', 'program_code', 'curriculum_name', 'curriculum_code',
            'home_section_name'
        ]
        read_only_fields = ['id', 'status', 'is_transferee', 'is_past_student']



class ProfessorProfileSerializer(serializers.ModelSerializer):
    """Serializer for ProfessorProfile."""
    
    assigned_subjects = serializers.SerializerMethodField()
    
    class Meta:
        from .models import ProfessorProfile
        model = ProfessorProfile
        fields = [
            'department', 'specialization', 'office_location', 
            'max_teaching_hours', 'assigned_subjects', 'is_active'
        ]

    def get_assigned_subjects(self, obj):
        return [{'id': str(s.id), 'code': s.code, 'title': s.title} for s in obj.assigned_subjects.all()]


class DepartmentHeadProfileSerializer(serializers.ModelSerializer):
    """Serializer for DepartmentHeadProfile."""
    
    program_details = serializers.SerializerMethodField()
    
    class Meta:
        from .models import DepartmentHeadProfile
        model = DepartmentHeadProfile
        fields = ['programs', 'program_details', 'is_active']

    def get_program_details(self, obj):
        return [{'id': str(p.id), 'code': p.code, 'name': p.name} for p in obj.programs.all()]


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for User profile."""
    
    student_profile = StudentProfileSerializer(read_only=True)
    professor_profile = ProfessorProfileSerializer(read_only=True)
    department_head_profile = DepartmentHeadProfileSerializer(read_only=True)
    
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    effective_permissions = serializers.SerializerMethodField()
    permission_scopes = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name', 'role',
            'student_number', 'student_profile', 'professor_profile', 'department_head_profile',
            'created_at', 'effective_permissions', 'permission_scopes'
        ]
        read_only_fields = ['id', 'email', 'role', 'student_number', 'created_at']

    def get_effective_permissions(self, obj):
        return [p.code for p in obj.get_effective_permissions()]

    def get_permission_scopes(self, obj):
        # Only return scopes for granted custom permissions
        perms = UserPermission.objects.filter(user=obj, granted=True)
        return {p.permission.code: p.scope for p in perms if p.scope}


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating User profile."""

    class Meta:
        model = User
        fields = ['first_name', 'last_name']


class PermissionSerializer(serializers.ModelSerializer):
    """Serializer for Permission."""

    class Meta:
        model = Permission
        fields = ['id', 'code', 'name', 'description', 'default_for_roles']
        read_only_fields = ['id']


class PermissionCategorySerializer(serializers.ModelSerializer):
    """Serializer for PermissionCategory with nested permissions."""

    permissions = PermissionSerializer(many=True, read_only=True)

    class Meta:
        model = PermissionCategory
        fields = ['id', 'code', 'name', 'description', 'icon', 'order', 'permissions']
        read_only_fields = ['id']


class UserWithPermissionsSerializer(serializers.ModelSerializer):
    """Serializer for User with permission count."""

    full_name = serializers.CharField(source='get_full_name', read_only=True)
    permission_count = serializers.SerializerMethodField()

    def get_permission_count(self, obj):
        """Get count of effective permissions for this user."""
        return obj.get_effective_permissions().count()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'student_number', 'is_active', 'permission_count',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class UserPermissionDetailSerializer(serializers.Serializer):
    """Serializer for detailed permission info with user's current status."""

    code = serializers.CharField()
    name = serializers.CharField()
    description = serializers.CharField()
    has_permission = serializers.BooleanField()
    source = serializers.CharField()  # 'custom_grant', 'custom_revoke', 'role_default', or 'none'
    can_toggle = serializers.BooleanField()


class PermissionCategoryDetailSerializer(serializers.Serializer):
    """Serializer for permission category with user's permission status."""
    
    code = serializers.CharField()
    name = serializers.CharField()
    icon = serializers.CharField()
    permissions = UserPermissionDetailSerializer(many=True)


class RegistrarStudentSerializer(serializers.ModelSerializer):
    """Flattened serializer for Registrar Student Table."""
    user_id = serializers.UUIDField(source='user.id', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    student_number = serializers.CharField(source='user.student_number', read_only=True)
    
    program_code = serializers.CharField(source='program.code', read_only=True)
    curriculum_code = serializers.CharField(source='curriculum.code', read_only=True, allow_null=True)
    home_section_name = serializers.CharField(source='home_section.name', read_only=True, allow_null=True)
    
    class Meta:
        model = StudentProfile
        fields = [
            'id', 'user_id', 'student_number', 'first_name', 'last_name', 'email',
            'program_code', 'curriculum_code', 'year_level', 'status', 
            'academic_status', 'home_section_name', 'is_transferee', 'is_past_student'
        ]

class CreditSubjectSerializer(serializers.Serializer):
    subject_id = serializers.UUIDField()
    grade = serializers.CharField(max_length=10, required=False)

class StudentManualCreateSerializer(serializers.ModelSerializer):
    """Serializer for Manual Student Creation."""
    email = serializers.EmailField(write_only=True)
    first_name = serializers.CharField(write_only=True)
    last_name = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True, required=False)
    student_number = serializers.CharField(write_only=True, required=False)
    birthdate = serializers.DateField(write_only=True, required=False)
    
    middle_name = serializers.CharField(required=False, allow_blank=True)
    suffix = serializers.CharField(required=False, allow_blank=True)
    previous_course = serializers.CharField(required=False, allow_blank=True)
    
    # Allow sending program code (e.g. 'BSIT') instead of ID
    from apps.academics.models import Program
    program = serializers.PrimaryKeyRelatedField(
        queryset=Program.objects.all()
    )
    
    # Curriculum is auto-assigned by service if not provided
    from apps.academics.models import Curriculum
    curriculum = serializers.PrimaryKeyRelatedField(
        queryset=Curriculum.objects.all(),
        required=False
    )
    
    year_level = serializers.IntegerField(required=False, default=1)
    
    address = serializers.CharField(required=False, allow_blank=True)
    contact_number = serializers.CharField(required=False, allow_blank=True)
    
    credited_subjects = CreditSubjectSerializer(many=True, required=False)
    
    class Meta:
        model = StudentProfile
        fields = [
            'email', 'first_name', 'last_name', 'middle_name', 'suffix', 'password', 'student_number', 
            'birthdate', 'address', 'contact_number',
            'program', 'curriculum', 'year_level', 'status', 'is_transferee', 'is_past_student',
            'previous_school', 'previous_course', 'credited_subjects'
        ]

class StudentDetailSerializer(RegistrarStudentSerializer):
    """Detailed view for Modal including academic history."""
    birthdate = serializers.DateField(read_only=True)
    address = serializers.CharField(read_only=True)
    contact_number = serializers.CharField(read_only=True)
    previous_school = serializers.CharField(read_only=True)
    
    academic_history = serializers.SerializerMethodField()
    grade_resolutions = serializers.SerializerMethodField() # Added for EPIC 5 tab
    program_id = serializers.UUIDField(source='program.id', read_only=True)
    current_enrollment_semester_id = serializers.SerializerMethodField()
    current_enrollment_id = serializers.SerializerMethodField()
    current_enrollment = serializers.SerializerMethodField()
    
    class Meta(RegistrarStudentSerializer.Meta):
        fields = RegistrarStudentSerializer.Meta.fields + [
            'birthdate', 'address', 'contact_number', 'previous_school',
            'academic_history', 'current_enrollment', 'current_enrollment_id',
            'program_id', 'current_enrollment_semester_id', 'grade_resolutions'
        ]

    def get_current_enrollment_semester_id(self, obj):
        from apps.enrollment.models import Enrollment, Semester
        current_sem = Semester.objects.filter(is_current=True).first()
        if not current_sem: return None
        return current_sem.id

    def get_current_enrollment_id(self, obj):
        from apps.enrollment.models import Enrollment, Semester
        current_sem = Semester.objects.filter(is_current=True).first()
        if not current_sem: return None
        enrollment = Enrollment.objects.filter(student=obj.user, semester=current_sem).first()
        return enrollment.id if enrollment else None
        
    def get_academic_history(self, obj):
        from apps.enrollment.models import SubjectEnrollment
        # Filter for completed or credited subjects
        enrollments = SubjectEnrollment.objects.filter(
            enrollment__student=obj.user
        ).select_related('subject', 'enrollment__semester').order_by('enrollment__semester__start_date')
        
        history = []
        for se in enrollments:
             history.append({
                 'subject_code': se.subject.code,
                 'subject_title': se.subject.title,
                 'grade': se.grade,
                 'status': se.status,
                 'units': se.subject.units,
                 'semester': se.enrollment.semester.name
             })
        return history

    def get_grade_resolutions(self, obj):
        from apps.enrollment.models import GradeResolution
        from apps.enrollment.serializers import GradeResolutionSerializer
        
        resolutions = GradeResolution.objects.filter(
            subject_enrollment__enrollment__student=obj.user
        ).select_related(
            'subject_enrollment__subject',
            'requested_by'
        ).order_by('-created_at')
        
        return GradeResolutionSerializer(resolutions, many=True).data

    def get_current_enrollment(self, obj):
         from apps.enrollment.models import SubjectEnrollment, Semester
         current_sem = Semester.objects.filter(is_current=True).first()
         if not current_sem: return []
         
         enrollments = SubjectEnrollment.objects.filter(
            enrollment__student=obj.user,
            enrollment__semester=current_sem
         ).select_related('subject', 'section')
         
         return [{
             'subject_code': e.subject.code,
             'subject_title': e.subject.title,
             'section': e.section.name if e.section else 'TBA',
             'status': e.status,
             'units': e.subject.units
         } for e in enrollments]


class HigherUserSerializer(serializers.ModelSerializer):
    """Serializer for managing higher level users (Registrar, Professor, etc.)."""
    password = serializers.CharField(write_only=True, required=False)
    programs = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False,
        help_text="Required for DEPARTMENT_HEAD role"
    )
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'role', 
            'is_active', 'password', 'programs', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        programs_data = validated_data.pop('programs', None)
        role = validated_data.get('role')
        
        user = User.objects.create_user(**validated_data)
        if password:
            user.set_password(password)
            user.save()

        # Handle Department Head Profile
        if role == User.Role.DEPARTMENT_HEAD:
            from .models import DepartmentHeadProfile
            from apps.academics.models import Program
            
            profile = DepartmentHeadProfile.objects.create(user=user)
            if programs_data:
                programs = Program.objects.filter(id__in=programs_data)
                profile.programs.set(programs)
        
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        programs_data = validated_data.pop('programs', None)
        role = validated_data.get('role', instance.role)
        
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save()

        # Handle Department Head Profile updates
        if role == User.Role.DEPARTMENT_HEAD:
            from .models import DepartmentHeadProfile
            from apps.academics.models import Program
            
            profile, _ = DepartmentHeadProfile.objects.get_or_create(user=user)
            if programs_data is not None:
                programs = Program.objects.filter(id__in=programs_data)
                profile.programs.set(programs)
        
        return user
