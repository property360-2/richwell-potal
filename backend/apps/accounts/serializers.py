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
        
        # Check if student account has been rejected
        if self.user.role == 'STUDENT':
            from apps.enrollment.models import Enrollment
            latest_enrollment = Enrollment.objects.filter(
                student=self.user
            ).order_by('-created_at').first()
            
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
        }
        
        return data


class StudentProfileSerializer(serializers.ModelSerializer):
    """Serializer for StudentProfile."""
    
    program_name = serializers.CharField(source='program.name', read_only=True)
    program_code = serializers.CharField(source='program.code', read_only=True)
    
    class Meta:
        model = StudentProfile
        fields = [
            'id', 'year_level', 'status', 'middle_name', 'suffix',
            'birthdate', 'address', 'contact_number',
            'is_transferee', 'previous_school', 'previous_course',
            'program_name', 'program_code'
        ]
        read_only_fields = ['id', 'status', 'is_transferee']


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for User profile."""
    
    student_profile = StudentProfileSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'role',
            'student_number', 'student_profile', 'created_at'
        ]
        read_only_fields = ['id', 'email', 'role', 'student_number', 'created_at']


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
