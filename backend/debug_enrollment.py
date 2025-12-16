"""Debug script to check why subjects don't appear in student enrollment page"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.academics.models import Section, Subject, SectionSubject, Program
from apps.enrollment.models import Semester
from apps.accounts.models import User, StudentProfile

print("=" * 50)
print("DEBUG: Subject Enrollment Issue")
print("=" * 50)

# 1. Check current semester
semester = Semester.objects.filter(is_current=True).first()
print(f"\n1. Current semester: {semester}")

# 2. Check BSIS subjects
bsis = Program.objects.filter(code='BSIS').first()
if bsis:
    subjects = Subject.objects.filter(program=bsis)
    print(f"\n2. BSIS subjects ({subjects.count()}):")
    for s in subjects[:5]:
        print(f"   {s.code} - Year {s.year_level} Sem {s.semester_number}")
else:
    print("\n2. BSIS program not found!")

# 3. Check sections for BSIS
sections = Section.objects.filter(program=bsis) if bsis else Section.objects.none()
print(f"\n3. BSIS sections ({sections.count()}):")
for sec in sections[:5]:
    print(f"   {sec.name} - Year {sec.year_level}, Semester: {sec.semester}")

# 4. Check section-subject links
ss_count = SectionSubject.objects.filter(section__program=bsis).count() if bsis else 0
print(f"\n4. SectionSubject links for BSIS: {ss_count}")

# 5. Check a BSIS student
bsis_students = User.objects.filter(role='STUDENT')
print(f"\n5. Total students: {bsis_students.count()}")
for student in bsis_students[:3]:
    try:
        profile = StudentProfile.objects.get(user=student)
        prog = profile.program.code if profile.program else 'None'
        print(f"   {student.first_name} - Program: {prog}, Year: {profile.year_level}")
    except:
        print(f"   {student.first_name} - No profile")

print("\n" + "=" * 50)
print("DIAGNOSIS:")
if not semester:
    print("❌ No current semester set!")
elif sections.count() == 0:
    print("❌ No sections exist for BSIS!")
elif ss_count == 0:
    print("❌ No subjects linked to sections!")
else:
    print("✓ Setup looks OK. Check student year level matches subject year level")
