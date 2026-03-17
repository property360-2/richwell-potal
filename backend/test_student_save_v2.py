import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from apps.students.models import Student

User = get_user_model()

try:
    reg_user = User.objects.get(username='registrar_e2e')
    print(f"Registrar user found: {reg_user}, role: {reg_user.role}")
    
    student = Student.objects.get(idn='E2E-2002')
    print(f"Testing save for student: {student} with audit_user={reg_user}")
    
    checklist = {
        'Form 138': {'submitted': True, 'verified': True},
        'Good Moral': {'submitted': True, 'verified': True},
        'PSA Birth Certificate': {'submitted': True, 'verified': True}
    }
    
    from apps.auditing.models import AuditLog
    initial_count = AuditLog.objects.count()
    
    # Simulate what DRF view does: update fields
    student.document_checklist = checklist
    student.save(audit_user=reg_user)
    print("Save (with audit_user) successful!")
    
    final_count = AuditLog.objects.count()
    print(f"AuditLog count changed from {initial_count} to {final_count}")
    
    if final_count > initial_count:
        latest = AuditLog.objects.latest('created_at')
        print(f"Latest audit log: {latest.action} on {latest.model_name} by {latest.user}")
        print(f"Changes: {latest.changes}")
    
except Exception as e:
    import traceback
    traceback.print_exc()
