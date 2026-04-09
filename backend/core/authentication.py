"""
Richwell Portal — Core Authentication

This module defines custom authentication mechanisms for the portal, 
specifically focusing on cookie-based JWT authentication for enhanced security.
"""

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework.exceptions import AuthenticationFailed
from django.conf import settings

class JWTCookieAuthentication(JWTAuthentication):
    """
    Custom authentication class that reads the access token from an httpOnly cookie.
    Allows for seamless authentication between frontend and backend without 
    manual header management.
    """
    def authenticate(self, request):
        """
        Attempts to authenticate the request using either traditional headers or 
        secure httpOnly cookies.
        """
        header = self.get_header(request)
        if header is None:
            # If no header, try to get token from cookie
            raw_token = request.COOKIES.get(settings.SIMPLE_JWT['AUTH_COOKIE']) or None
        else:
            raw_token = self.get_raw_token(header)

        if raw_token is None:
            return None

        try:
            validated_token = self.get_validated_token(raw_token)
            return self.get_user(validated_token), validated_token
        except (InvalidToken, TokenError, AuthenticationFailed):
            return None
