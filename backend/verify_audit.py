import os
import django
import sys

# Set up Django environment
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.auditing.models import AuditLog
from apps.accounts.models import User
from apps.auditing.middleware import _audit_context

def verify():
    print("--- Audit Verification ---")
    
    # Get a test user (e.g., the first one)
    target_user = User.objects.first()
    actor_user = User.objects.last()
    
    if not target_user or not actor_user:
        print("Error: Need at least two users for verification.")
        return

    print(f"Actor: {actor_user.username}")
    print(f"Target: {target_user.username}")

    # 1. Simulate Middleware setting the context
    _audit_context.user = actor_user
    _audit_context.ip = '1.2.3.4'
    
    print("\nUpdating user with context set...")
    target_user.first_name = target_user.first_name + "_" # Force a change
    target_user.save()
    
    # Check latest log
    latest_log = AuditLog.objects.all().order_by('-id').first()
    print(f"Latest Log ID: {latest_log.id}")
    print(f"Log User: {latest_log.user.username if latest_log.user else 'None'}")
    print(f"Log IP: {latest_log.ip_address}")
    
    if latest_log.user == actor_user:
        print("✅ SUCCESS: Log correctly attributed to actor!")
    else:
        print("❌ FAILURE: Log user mismatch.")

    # 2. Cleanup context
    _audit_context.user = None
    _audit_context.ip = None

if __name__ == "__main__":
    verify()
