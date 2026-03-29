"""
Richwell Portal — Accounts Views

This module provides API endpoints for user authentication, profile management, 
and staff administration. It implements JWT -based authentication with 
HTTP-only cookies for enhanced security.
"""

from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.conf import settings
from django.contrib.auth import get_user_model

from core.permissions import IsAdmin
from .serializers import (
    UserSerializer,
    LoginSerializer,
    ChangePasswordSerializer,
    StaffCreateSerializer
)
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator

User = get_user_model()

class CsrfTokenView(APIView):
    """
    Endpoint to set the CSRF cookie for the client. 
    Required for secure non-GET requests in some environments.
    """
    permission_classes = [AllowAny]
    
    @method_decorator(ensure_csrf_cookie)
    def get(self, request):
        """Sets the CSRF cookie and returns a success message."""
        return Response({"detail": "CSRF cookie set."})

from rest_framework.throttling import AnonRateThrottle

class LoginView(TokenObtainPairView):
    """
    Custom login view that issues JWT tokens and sets them as HTTP-only cookies.
    """
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]
    serializer_class = LoginSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            access_token = response.data.get('access')
            refresh_token = response.data.get('refresh')

            response.set_cookie(
                key=settings.SIMPLE_JWT['AUTH_COOKIE'],
                value=access_token,
                expires=settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'],
                secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
                httponly=settings.SIMPLE_JWT['AUTH_COOKIE_HTTP_ONLY'],
                samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
                path=settings.SIMPLE_JWT['AUTH_COOKIE_PATH'],
            )
            response.set_cookie(
                key=settings.SIMPLE_JWT['AUTH_COOKIE_REFRESH'],
                value=refresh_token,
                expires=settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'],
                secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
                httponly=settings.SIMPLE_JWT['AUTH_COOKIE_HTTP_ONLY'],
                samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
                path=settings.SIMPLE_JWT['AUTH_COOKIE_PATH'],
            )
            
            # Optionally remove tokens from response body if you want pure cookie auth
            response.data.pop('access', None)
            response.data.pop('refresh', None)
            
        return response

class TokenRefreshCookieView(TokenRefreshView):
    """
    Refreshes the access token using the refresh token stored in a cookie.
    Sets the new access token in an HTTP-only cookie.
    """
    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get(settings.SIMPLE_JWT['AUTH_COOKIE_REFRESH'])
        if refresh_token:
            request.data['refresh'] = refresh_token
        
        response = super().post(request, *args, **kwargs)
        
        if response.status_code == status.HTTP_200_OK:
            access_token = response.data.get('access')
            response.set_cookie(
                key=settings.SIMPLE_JWT['AUTH_COOKIE'],
                value=access_token,
                expires=settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'],
                secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
                httponly=settings.SIMPLE_JWT['AUTH_COOKIE_HTTP_ONLY'],
                samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
                path=settings.SIMPLE_JWT['AUTH_COOKIE_PATH'],
            )
            response.data.pop('access', None)
            response.data.pop('refresh', None)
        return response

class LogoutView(APIView):
    """
    Logs out the user by clearing the authentication cookies.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        response = Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)
        response.delete_cookie(settings.SIMPLE_JWT['AUTH_COOKIE'])
        response.delete_cookie(settings.SIMPLE_JWT['AUTH_COOKIE_REFRESH'])
        return response

class MeView(generics.RetrieveAPIView):
    """
    Returns the profile information of the currently authenticated user.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

class ChangePasswordView(generics.UpdateAPIView):
    """
    Allows authenticated users to change their own password.
    Enforces password complexity through the serializer.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ChangePasswordSerializer

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        serializer = self.get_serializer(data=request.data)

        if serializer.is_valid():
            if not user.check_password(serializer.validated_data.get("old_password")):
                return Response({"old_password": ["Wrong password."]}, status=status.HTTP_400_BAD_REQUEST)
            
            user.set_password(serializer.validated_data.get("new_password"))
            user.must_change_password = False
            user.save()
            return Response({"detail": "Password updated successfully."}, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

from core.permissions import IsAdmin, IsHeadRegistrar
from .services.user_service import UserService

class StaffManagementViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Admin/Head Registrar to manage staff accounts.
    Allows creating, updating, and resetting passwords for staff.
    """
    permission_classes = [IsAuthenticated, IsAdmin | IsHeadRegistrar]
    
    def get_queryset(self):
        user = self.request.user
        queryset = User.objects.exclude(role='STUDENT').order_by('id')
        
        if user.role == 'HEAD_REGISTRAR':
            queryset = queryset.filter(role='REGISTRAR')
            
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        return queryset

    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return StaffCreateSerializer
        return UserSerializer

    def perform_create(self, serializer):
        UserService.create_staff(serializer, self.request.user)

    def perform_update(self, serializer):
        UserService.update_staff(serializer, self.get_object(), self.request.user)

    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        """
        Resets a user's password to the default format.
        Admin can reset any non-student; Head Registrar can only reset Registrars.
        """
        user = self.get_object()
        if request.user.role == 'HEAD_REGISTRAR' and user.role != 'REGISTRAR':
            raise PermissionDenied("Head Registrars can only reset registrar accounts.")
        UserService.reset_password(user)
        return Response({"detail": "Password has been reset to the default format."}, status=status.HTTP_200_OK)
