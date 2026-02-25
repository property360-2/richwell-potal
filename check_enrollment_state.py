
import os
import django
import sys

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import User, StudentProfile
from apps.academics.models import Section, SectionSubject, Subject
from apps.enrollment.models import Semester, Enrollment

print("Checking enrollment state...")

profiles = StudentProfile.objects.filter(home_section__name='BS_Information_Systems-1A')
for profile in profiles:
    user = profile.user
    print(f"Student: {user.get_full_name()} ({user.student_number})")
    print(f"Section: {profile.home_section.name if profile.home_section else 'NONE'}")
    print(f"Year Level: {profile.year_level}")
    print(f"Program: {profile.program.code if profile.program else 'NONE'}")
    
    active_semester = Semester.objects.filter(is_current=True).first()
    print(f"Active Semester: {active_semester.name if active_semester else 'NONE'}")
    
    if active_semester and profile.home_section:
        # Check subjects in home section
        ss_count = SectionSubject.objects.filter(section=profile.home_section).count()
        print(f"Subjects in {profile.home_section.name}: {ss_count}")
        
        subjects = SectionSubject.objects.filter(section=profile.home_section)
        for ss in subjects:
            print(f"  - {ss.subject.code}: {ss.subject.title}")
    
    print("-" * 20)

if not profiles.exists():
    print("No student found in section BS_Information_Systems-1A")
    # Let's see all sections in current semester
    active_semester = Semester.objects.filter(is_current=True).first()
    if active_semester:
        sections = Section.objects.filter(semester=active_semester)
        print(f"Sections in {active_semester.name}:")
        for sec in sections:
            print(f"  - {sec.name} (Program: {sec.program.code})")
    else:
        print("No active semester found.")
