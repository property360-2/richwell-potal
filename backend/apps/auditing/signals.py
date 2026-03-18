from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.signals import user_logged_in, user_logged_out, user_login_failed
from .models import AuditLog

@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    AuditLog.objects.create(
        user=user,
        action='LOGIN',
        model_name='User',
        object_id=str(user.id),
        object_repr=user.username,
        ip_address=get_client_ip(request)
    )

@receiver(user_logged_out)
def log_user_logout(sender, request, user, **kwargs):
    if user:
        AuditLog.objects.create(
            user=user,
            action='LOGOUT',
            model_name='User',
            object_id=str(user.id),
            object_repr=user.username,
            ip_address=get_client_ip(request)
        )

@receiver(user_login_failed)
def log_user_login_failed(sender, credentials, request, **kwargs):
    AuditLog.objects.create(
        user=None,
        action='LOGIN_FAILED',
        model_name='User',
        object_id='N/A',
        object_repr=credentials.get('username', 'unknown'),
        ip_address=get_client_ip(request),
        changes={'username_attempted': credentials.get('username')}
    )

def get_client_ip(request):
    if not request:
        return None
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip
