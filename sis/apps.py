from django.apps import AppConfig


class SisConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'sis'
    verbose_name = 'Student Information System'

    def ready(self):
        """Initialize app - register signal handlers"""
        import sis.signals  # noqa
