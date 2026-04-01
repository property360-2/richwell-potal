from apps.auditing.models import AuditLog
from apps.accounts.models import User
import json

def run():
    print("--- Summary ---")
    print(f"Total AuditLogs: {AuditLog.objects.count()}")
    print(f"Total Users: {User.objects.count()}")
    
    registrars = User.objects.filter(role__in=[User.RoleChoices.REGISTRAR, User.RoleChoices.HEAD_REGISTRAR])
    print(f"Registrar Role Users: {[u.username for u in registrars]}")
    
    print("\n--- AuditLog Samples ---")
    logs = AuditLog.objects.all().order_by('-id')[:15]
    for log in logs:
        username = log.user.username if log.user else "None"
        role = log.user.role if log.user else "N/A"
        print(f"ID: {log.id} | User: {username} | Role: {role} | Action: {log.action} | Model: {log.model_name}")

if __name__ == "__main__":
    run()
