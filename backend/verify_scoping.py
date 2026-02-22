import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import User, StudentProfile
from apps.enrollment.models import GradeResolution
from apps.academics.models import Program

def verify_scoping():
    print("--- Verification Start ---")
    
    # 1. Get Head User
    head = User.objects.get(email='head@richwell.edu')
    print(f"Testing for Head: {head.get_full_name()} (Role: {head.role})")
    
    # Check Profile
    profile = head.department_head_profile
    programs = profile.programs.all()
    program_codes = [p.code for p in programs]
    print(f"Scoped Programs: {program_codes}")
    
    # 2. Test Student Scoping (Manually mimicking ViewSet logic)
    all_students_count = StudentProfile.objects.count()
    scoped_students = StudentProfile.objects.filter(program__in=programs)
    scoped_students_count = scoped_students.count()
    
    print(f"Total Students in DB: {all_students_count}")
    print(f"Students accessible to Head: {scoped_students_count}")
    
    # Check for leakage
    other_students = StudentProfile.objects.exclude(program__in=programs)
    if other_students.exists():
        print(f"Sample Student from other program: {other_students.first().program.code}")
    else:
        print("No other students found (maybe only BSIT/BSIS seeded?)")

    # 3. Test Grade Resolution Scoping
    all_resolutions_count = GradeResolution.objects.count()
    scoped_resolutions = GradeResolution.objects.filter(
        subject_enrollment__subject__program__in=programs
    )
    scoped_resolutions_count = scoped_resolutions.count()
    
    print(f"Total Resolutions in DB: {all_resolutions_count}")
    print(f"Resolutions accessible to Head: {scoped_resolutions_count}")
    
    print("--- Verification End ---")

if __name__ == "__main__":
    verify_scoping()
