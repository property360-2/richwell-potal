"""
Richwell Portal — Development Settings
"""

from .base import *  # noqa: F401, F403

DEBUG = True

# Use console email backend for development
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Allow all origins in development
CORS_ALLOW_ALL_ORIGINS = True
