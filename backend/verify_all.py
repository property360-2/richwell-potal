import os
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import User

emails = ['student3rdyear@richwell.edu', 'studentinc@richwell.edu', 'studentretake@richwell.edu']

for email in emails:
    user = User.objects.filter(email=email).first()
    if user and hasattr(user, 'student_profile'):
        profile = user.student_profile
        print(f"USER: {user.email}")
        print(f"  NAME: {user.get_full_name()}")
        print(f"  HOME SECTION: {profile.home_section.name if profile.home_section else 'NONE'}")
        print(f"  YEAR LEVEL: {profile.year_level}")
        print("-" * 20)
    else:
        print(f"USER: {email} | PROFILE NOT FOUND")
