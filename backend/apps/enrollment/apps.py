"""
Enrollment app configuration.
"""

from django.apps import AppConfig


class EnrollmentConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.enrollment'
    verbose_name = 'Enrollment Management'
    
    def ready(self):
        # Import signals when app is ready
        from apps.enrollment import signals  # noqa
