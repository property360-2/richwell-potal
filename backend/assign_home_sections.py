import os
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import User, StudentProfile
from apps.academics.models import Section, Program
from apps.enrollment.models import Semester

def run():
    print("🚀 Assigning home sections to demo students...")
    
    active_semester = Semester.objects.filter(is_current=True).first()
    program = Program.objects.filter(code='BS_Information_Systems').first()
    
    if not active_semester or not program:
        print("Error: Active semester or Program not found")
        return

    # Find the 3rd Year section for BSIS
    section = Section.objects.filter(semester=active_semester, program=program, year_level=3, name__contains='3A').first()
    
    if not section:
        print("Error: BSIS 3rd Year Section (3A) not found")
        return

    print(f"Assigning students to section: {section.name}")

    emails = ['student3rdyear@richwell.edu', 'studentinc@richwell.edu']
    
    for email in emails:
        user = User.objects.filter(email=email).first()
        if user and hasattr(user, 'student_profile'):
            profile = user.student_profile
            profile.home_section = section
            # Also ensure year level is 3
            profile.year_level = 3
            profile.save()
            print(f"  - Assigned {user.email} to {section.name} (Year {profile.year_level})")
        else:
            print(f"  - Skipping {email} (User or Profile not found)")

    print("✅ Home sections assigned!")

if __name__ == "__main__":
    run()
