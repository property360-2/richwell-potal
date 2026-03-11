from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    headed_programs = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'is_active', 'headed_programs', 'is_superuser']
        read_only_fields = ['id', 'role', 'is_active', 'is_superuser']

    def get_headed_programs(self, obj):
        return [
            {'id': p.id, 'code': p.code, 'name': p.name} 
            for p in obj.headed_programs.all()
        ]

    def get_role(self, obj):
        # Default superusers without a specific role to ADMIN
        if not obj.role and obj.is_superuser:
            return 'ADMIN'
        return obj.role

class LoginSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Default superusers without a specific role to ADMIN
        token['role'] = user.role if user.role or not user.is_superuser else 'ADMIN'
        token['username'] = user.username
        return token

    def validate(self, attrs):
        # Trim whitespace from username to avoid common copy-paste issues
        if 'username' in attrs:
            attrs['username'] = attrs['username'].strip()
        
        try:
            data = super().validate(attrs)
            data['user'] = UserSerializer(self.user).data
            return data
        except serializers.ValidationError as e:
            # Re-raise standard SimpleJWT 401 but ensure it's not due to formatting
            raise e

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)
    confirm_password = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "New passwords do not match."})
        return attrs

class StaffCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'is_active']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            role=validated_data['role']
        )
        # initial password is set by the view manually depending on role and employee_id/idn
        return user
