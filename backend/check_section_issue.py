import sys
import os
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import User, StudentProfile
from apps.enrollment.models import Enrollment, Semester
from apps.academics.models import Section, Program

try:
    u = User.objects.filter(email='test@gmail.com').first()
    if not u:
        print("User not found.")
        sys.exit(0)
        
    prof = u.student_profile
    print(f"Student: {u.get_full_name()} ({u.email})")
    print(f"Program: {prof.program.code}")
    print(f"Year Level: {prof.year_level}")
    
    current_sem = Semester.objects.filter(is_current=True).first()
    print(f"\nCurrent Active Semester: {current_sem.name} ({current_sem.academic_year})")
    
    sections = Section.objects.filter(program=prof.program, year_level=prof.year_level)
    print(f"\nFound {sections.count()} sections for {prof.program.code} Year {prof.year_level}:")
    for s in sections:
        print(f" - Section: {s.name}")
        print(f"   Semester: {s.semester.name} ({s.semester.academic_year})")
        print(f"   Dissolved: {s.is_dissolved}")
        print(f"   Capacity: {s.enrolled_count}/{s.capacity}")
        
    print("\nStudent's Recent Enrollment:")
    e = Enrollment.objects.filter(student=u).order_by('-created_at').first()
    if e:
         print(f" - Semester ID for enrollment: {e.semester.id}")
         print(f"   Semester Info: {e.semester.name} ({e.semester.academic_year})")
         if getattr(e.semester, 'is_current', False):
             print("   This enrollment IS for the system's current active semester.")
         else:
             print("   This enrollment IS NOT for the system's current active semester.")
    else:
         print(" - None found")
         
except Exception as e:
    print(f"Error: {e}")
