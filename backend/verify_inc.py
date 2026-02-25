import os
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import User
from apps.enrollment.models import SubjectEnrollment

user = User.objects.get(email='studentinc@richwell.edu')
se = SubjectEnrollment.objects.filter(enrollment__student=user, status='INC').first()

if se:
    print(f"Subject: {se.subject.code}")
    print(f"Grade: {se.grade}")
    print(f"Status: {se.status}")
    print(f"INC Marked At: {se.inc_marked_at}")
    print(f"Retake Eligibility Date: {se.retake_eligibility_date}")
else:
    print("No INC found for studentinc")
