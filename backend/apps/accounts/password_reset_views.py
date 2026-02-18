"""
Password reset views for forgot password functionality.
"""

import secrets
from datetime import timedelta

from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework import status

from apps.core.api_responses import success_response, error_response
from .models import User, PasswordResetToken


class RequestPasswordResetView(APIView):
    """
    Request a password reset email.
    Sends an email with a reset link to the user's email address.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        
        if not email:
            return error_response('Email is required', status_code=status.HTTP_400_BAD_REQUEST)
        
        # Check if user exists
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Don't reveal if email exists or not for security
            return success_response(
                message='If your email is registered, you will receive a password reset link shortly.'
            )
        
        # Generate unique token
        token = secrets.token_urlsafe(32)
        
        # Create reset token (expires in 1 hour)
        reset_token = PasswordResetToken.objects.create(
            user=user,
            token=token,
            expires_at=timezone.now() + timedelta(hours=1)
        )
        
        # Build reset URL
        frontend_url = settings.FRONTEND_URL if hasattr(settings, 'FRONTEND_URL') else 'http://localhost:3000'
        reset_url = f"{frontend_url}/auth/reset-password?token={token}"
        
        # Send email
        subject = 'Richwell Colleges - Password Reset Request'
        message = f"""
Hello {user.get_full_name()},

You requested to reset your password for your Richwell Colleges Portal account.

Click the link below to reset your password:
{reset_url}

This link will expire in 1 hour.

If you did not request this reset, please ignore this email.

Best regards,
Richwell Colleges Portal Team
        """.strip()
        
        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@richwellcolleges.edu.ph',
                [email],
                fail_silently=False,
            )
        except Exception as e:
            # Log error but don't reveal it to user
            print(f"Error sending reset email: {e}")
        
        return success_response(
            message='If your email is registered, you will receive a password reset link shortly.'
        )


class ValidateResetTokenView(APIView):
    """
    Validate if a reset token is valid and not expired.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        token = request.data.get('token')
        
        if not token:
            return error_response('Token is required', status_code=status.HTTP_400_BAD_REQUEST)
        
        try:
            reset_token = PasswordResetToken.objects.get(token=token)
            
            if reset_token.is_valid():
                return success_response(
                    data={'valid': True, 'email': reset_token.user.email},
                    message='Token is valid'
                )
            else:
                if reset_token.used:
                    return error_response('This reset link has already been used', status_code=status.HTTP_400_BAD_REQUEST)
                else:
                    return error_response('This reset link has expired', status_code=status.HTTP_400_BAD_REQUEST)
        
        except PasswordResetToken.DoesNotExist:
            return error_response('Invalid reset link', status_code=status.HTTP_400_BAD_REQUEST)


class ResetPasswordView(APIView):
    """
    Reset password using a valid token.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        token = request.data.get('token')
        new_password = request.data.get('new_password')
        
        if not token or not new_password:
            return error_response('Token and new password are required', status_code=status.HTTP_400_BAD_REQUEST)
        
        # Validate password strength
        if len(new_password) < 8:
            return error_response('Password must be at least 8 characters long', status_code=status.HTTP_400_BAD_REQUEST)
        
        try:
            reset_token = PasswordResetToken.objects.get(token=token)
            
            if not reset_token.is_valid():
                if reset_token.used:
                    return error_response('This reset link has already been used', status_code=status.HTTP_400_BAD_REQUEST)
                else:
                    return error_response('This reset link has expired', status_code=status.HTTP_400_BAD_REQUEST)
            
            # Reset password
            user = reset_token.user
            user.set_password(new_password)
            user.save()
            
            # Mark token as used
            reset_token.mark_as_used()
            
            return success_response(
                message='Password reset successful. You can now log in with your new password.'
            )
        
        except PasswordResetToken.DoesNotExist:
            return error_response('Invalid reset link', status_code=status.HTTP_400_BAD_REQUEST)
