import os
import sys
import django
import json

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import User
from apps.accounts.serializers import UserProfileSerializer
from apps.enrollment.models import Enrollment, Semester

emails = ['student3rdyear@richwell.edu', 'studentinc@richwell.edu']
active_semester = Semester.objects.filter(is_current=True).first()

for email in emails:
    user = User.objects.filter(email=email).first()
    if user:
        # User profile
        serializer = UserProfileSerializer(user)
        print(f"USER: {email}")
        print(f"SERIALIZED DATA: {json.dumps(serializer.data['student_number'])}")
        
        # Enrollment Status
        enrollment = Enrollment.objects.filter(student=user, semester=active_semester).first()
        print(f"ENROLLMENT STATUS: {enrollment.status if enrollment else 'NONE'}")
        print("-" * 20)
