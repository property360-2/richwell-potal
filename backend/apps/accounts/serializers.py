from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    headed_programs = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'is_active', 'headed_programs']
        read_only_fields = ['id', 'role', 'is_active']

    def get_headed_programs(self, obj):
        return [
            {'id': p.id, 'code': p.code, 'name': p.name} 
            for p in obj.headed_programs.all()
        ]



class LoginSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['username'] = user.username
        return token

    def validate(self, attrs):
        # Trim whitespace from username to avoid common copy-paste issues
        if 'username' in attrs:
            attrs['username'] = attrs['username'].strip()
        
        print(f"DEBUG: Login attempt for username: {attrs.get('username')}")
            
        try:
            data = super().validate(attrs)
            print(f"DEBUG: Login success for: {self.user.username}")
            data['user'] = UserSerializer(self.user).data
            return data
        except serializers.ValidationError as e:
            print(f"DEBUG: Login failed: {e}")
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
