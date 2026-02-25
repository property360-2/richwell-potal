import os
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import User
from apps.enrollment.models import Enrollment, Semester, SubjectEnrollment

emails = ['student3rdyear@richwell.edu', 'studentinc@richwell.edu']
active_semester = Semester.objects.filter(is_current=True).first()

for email in emails:
    user = User.objects.filter(email=email).first()
    if user:
        enroll = Enrollment.objects.filter(student=user, semester=active_semester).first()
        if enroll:
            subjects = SubjectEnrollment.objects.filter(enrollment=enroll)
            print(f"USER: {email}")
            print(f"ENROLL STATUS: {enroll.status}")
            for s in subjects:
                print(f"  SUBJECT: {s.subject.code} | STATUS: {s.status}")
        else:
            print(f"USER: {email} | NO ENROLLMENT FOR ACTIVE SEMESTER")
        print("-" * 20)
