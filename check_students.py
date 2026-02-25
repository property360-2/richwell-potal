import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import User
from apps.enrollment.models import Enrollment

emails = ['student3rdyear@richwell.edu', 'studentinc@richwell.edu']
users = User.objects.filter(email__in=emails)

if not users.exists():
    print("NO_USERS_FOUND")
else:
    for u in users:
        enroll = Enrollment.objects.filter(student=u).first()
        print(f"EMAIL: {u.email}")
        print(f"ID: {u.student_number}")
        print(f"ROLE: {u.role}")
        print(f"ENROLL_STATUS: {enroll.status if enroll else 'NONE'}")
        print("-" * 20)
