import os
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import User
from apps.enrollment.models import Enrollment, Semester

emails = ['student3rdyear@richwell.edu', 'studentinc@richwell.edu']
users = User.objects.filter(email__in=emails)
active_semester = Semester.objects.filter(is_current=True).first()

if not users.exists():
    print("NO_USERS_FOUND")
else:
    for u in users:
        print(f"EMAIL: {u.email}")
        print(f"STUDENT_NUMBER: {u.student_number}")
        
        enrolls = Enrollment.objects.filter(student=u)
        for e in enrolls:
            print(f"  SEMESTER: {e.semester.name} {e.semester.academic_year} | STATUS: {e.status} | CURRENT: {e.semester.is_current}")
        
        print("-" * 20)
