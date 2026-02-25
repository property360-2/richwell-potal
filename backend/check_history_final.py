import os
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import User
from apps.enrollment.models import Enrollment, Semester, SubjectEnrollment

emails = ['student3rdyear@richwell.edu', 'studentinc@richwell.edu']

for email in emails:
    user = User.objects.filter(email=email).first()
    if user:
        print(f"USER: {email}")
        enrolls = Enrollment.objects.filter(student=user).order_by('semester__start_date')
        for e in enrolls:
            subjects = SubjectEnrollment.objects.filter(enrollment=e)
            print(f"  SEMESTER: {e.semester} | ENROLL STATUS: {e.status} | CURRENT: {e.semester.is_current}")
            print(f"    Subjects Count: {subjects.count()}")
            # for s in subjects:
            #     print(f"      - {s.subject.code}: {s.status}")
        print("-" * 20)
