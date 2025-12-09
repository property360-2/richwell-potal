"""
Accounts serializers.
"""

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User, StudentProfile


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
