import os
import django
import sys
from django.db.models import Count

# Set up Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.auditing.models import AuditLog

def run():
    print("--- Total Audit Logs ---")
    print(AuditLog.objects.count())

    print("\n--- Logs by User ---")
    user_counts = AuditLog.objects.values('user__username').annotate(total=Count('id')).order_by('-total')
    for item in user_counts:
        user = item['user__username'] if item['user__username'] else "None (Anonymous)"
        print(f"User: {user:20} | Total: {item['total']}")

    print("\n--- Logs by Model ---")
    model_counts = AuditLog.objects.values('model_name').annotate(total=Count('id')).order_by('-total')[:15]
    for item in model_counts:
        print(f"Model: {item['model_name']:20} | Total: {item['total']}")

if __name__ == "__main__":
    run()
