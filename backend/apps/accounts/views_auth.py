"""
Authentication and profile views — login, logout, profile, password management.
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema

from .models import User
from .serializers import (
    LoginSerializer,
    UserProfileSerializer,
    UserProfileUpdateSerializer,
)
from apps.audit.models import AuditLog
from apps.core.decorators import ratelimit_method
from .validators import PasswordValidator


class LoginView(TokenObtainPairView):
    """
    User login endpoint.
    Returns access and refresh tokens.
    """
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer
    
    @extend_schema(
        summary="User Login",
        description="Authenticate user and return JWT tokens",
        tags=["Authentication"]
    )
    @ratelimit_method(key='ip', rate='5/m', method='POST')
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class LogoutView(APIView):
    """
    User logout endpoint.
    Blacklists the refresh token.
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="User Logout",
        description="Blacklist the refresh token to logout",
        tags=["Authentication"]
    )
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response(
                {"success": True, "message": "Successfully logged out"},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"success": False, "error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class ProfileView(APIView):
    """
    User profile endpoint.
    GET: Retrieve current user's profile
    PATCH: Update current user's profile
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="Get Profile",
        description="Retrieve the current user's profile information",
        tags=["Profile"],
        responses={200: UserProfileSerializer}
    )
    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response({
            "success": True,
            "data": serializer.data
        })


class UserCountView(APIView):
    """
    User count endpoint for Admin Dashboard.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role not in ['ADMIN', 'HEAD_REGISTRAR', 'REGISTRAR']:
            return Response({"error": "Unauthorized"}, status=403)
        return Response({"count": User.objects.count()})
    
    @extend_schema(
        summary="Update Profile",
        description="Update the current user's profile information",
        tags=["Profile"],
        request=UserProfileUpdateSerializer,
        responses={200: UserProfileSerializer}
    )
    def patch(self, request):
        serializer = UserProfileUpdateSerializer(
            request.user,
            data=request.data,
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            
            AuditLog.log(
                action=AuditLog.Action.USER_UPDATED,
                target_model='User',
                target_id=request.user.id,
                payload={'action': 'profile_update', 'fields': list(request.data.keys())},
                actor=request.user
            )
            
            return Response({
                "success": True,
                "data": UserProfileSerializer(request.user).data
            })
        return Response({
            "success": False,
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    """
    Change password endpoint.
    Requires current password and new password.
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="Change Password",
        description="Change the current user's password",
        tags=["Profile"]
    )
    def post(self, request):
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        
        if not current_password or not new_password:
            return Response({
                "success": False,
                "error": "Both current_password and new_password are required"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not request.user.check_password(current_password):
            return Response({
                "success": False,
                "error": "Current password is incorrect"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        is_valid, error_message = PasswordValidator.validate(new_password)
        if not is_valid:
            return Response({
                "success": False,
                "error": error_message
            }, status=status.HTTP_400_BAD_REQUEST)
        
        request.user.set_password(new_password)
        request.user.save()
        
        AuditLog.log(
            action=AuditLog.Action.USER_UPDATED,
            target_model='User',
            target_id=request.user.id,
            payload={'action': 'password_change'},
            actor=request.user
        )
        
        return Response({
            "success": True,
            "message": "Password changed successfully"
        })
