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
from apps.auditing.models import AuditLog
from apps.auditing.middleware import get_current_ip

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
from django.contrib.auth.signals import user_logged_in, user_logged_out

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
            # SimpleJWT doesn't fire user_logged_in, so we do it manually for auditing
            user = User.objects.get(username=request.data.get('username'))
            user_logged_in.send(sender=user.__class__, request=request, user=user)

            access_token = response.data.get('access')
            refresh_token = response.data.get('refresh')
            # ... (rest of the cookie setting logic)
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
        # Fire LOGOUT signal for auditing
        user_logged_out.send(sender=request.user.__class__, request=request, user=request.user)
        
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
        """
        Processes the password change request.
        Validates the old password, applies the new one, and emits a PASSWORD_CHANGE 
        audit log so all credential changes are traceable.

        @param request - Must contain old_password and new_password fields.
        @returns {Response} - 200 on success, 400 on validation failure.
        """
        user = self.get_object()
        serializer = self.get_serializer(data=request.data)

        if serializer.is_valid():
            if not user.check_password(serializer.validated_data.get("old_password")):
                return Response({"old_password": ["Wrong password."]}, status=status.HTTP_400_BAD_REQUEST)
            
            user.set_password(serializer.validated_data.get("new_password"))
            user.must_change_password = False
            user.save()

            # AUDIT: Password changes are security-critical events and must be logged
            # explicitly since set_password + save() does not pass through AuditMixin cleanly.
            AuditLog.objects.create(
                user=request.user,
                action='PASSWORD_CHANGE',
                model_name='User',
                object_id=str(user.id),
                object_repr=user.username,
                changes={'changed_by': 'self'},
                ip_address=get_current_ip()
            )
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
        """
        Customizes staff list based on user role.
        Head Registrars can only view and manage Registrar-related accounts.
        """
        user = self.request.user
        # Exclude students and order by newest first
        queryset = User.objects.exclude(role='STUDENT').order_by('-id')

        if user.role == 'HEAD_REGISTRAR':
            # Head Registrars see themselves and Registrars
            queryset = queryset.filter(role__in=['REGISTRAR', 'HEAD_REGISTRAR'])
        
        role = self.request.query_params.get('role')
        if role:
            if role == 'ADMIN':
                # Special case for admins who might have empty role strings in DB
                from django.db.models import Q
                queryset = queryset.filter(Q(role='ADMIN') | Q(role='', is_superuser=True))
            else:
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
        Emits a PASSWORD_RESET audit log for compliance tracking.

        @param pk - Target user's primary key.
        @returns {Response} - 200 on success, 403 on permission failure.
        """
        user = self.get_object()
        if request.user.role == 'HEAD_REGISTRAR' and user.role != 'REGISTRAR':
            raise PermissionDenied("Head Registrars can only reset registrar accounts.")
        UserService.reset_password(user)

        # AUDIT: Admin-triggered password resets are critical security events.
        AuditLog.objects.create(
            user=request.user,
            action='PASSWORD_RESET',
            model_name='User',
            object_id=str(user.id),
            object_repr=user.username,
            changes={'reset_by': request.user.username, 'target_role': user.role},
            ip_address=get_current_ip()
        )
        return Response({"detail": "Password has been reset to the default format."}, status=status.HTTP_200_OK)
