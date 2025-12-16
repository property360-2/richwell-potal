
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.academics.models import Section, Program
from apps.enrollment.models import Semester
from apps.academics.serializers import SectionCreateSerializer

print("="*50)
print("DIAGNOSIS: Checking Semesters and Sections")
print("="*50)

# 1. Check Semesters
semesters = Semester.objects.all()
print(f"Total Semesters: {semesters.count()}")
for s in semesters:
    print(f"- {s.name} (Active/Current: {s.is_current}) ID: {s.id}")

if not semesters.exists():
    print("CRITICAL: No semesters found!")
    exit(1)

# 2. Check Programs
bsis = Program.objects.filter(code='BSIS').first()
if not bsis:
    print("CRITICAL: BSIS Program not found!")
    exit(1)
print(f"Using Program: {bsis.code} ({bsis.id})")

# 3. Simulate Create Section
print("\nAttempting to create section 'TestSection101'")
current_sem = semesters.filter(is_current=True).first() or semesters.first()
print(f"Target Semester: {current_sem.name} ({current_sem.id})")

data = {
    'name': 'TestSection101',
    'program': bsis.id,
    'semester': current_sem.id,
    'year_level': 1,
    'capacity': 40
}

serializer = SectionCreateSerializer(data=data)
if serializer.is_valid():
    print("✅ Validation Successful")
    # Clean up if exists
    if Section.objects.filter(name='TestSection101', semester=current_sem).exists():
        print("Section already exists (from previous run), deleting...")
        Section.objects.filter(name='TestSection101', semester=current_sem).delete()
    
    # Save
    section = serializer.save()
    print(f"✅ Created Section: {section.name} (ID: {section.id})")
else:
    print("❌ Validation Failed")
    print(serializer.errors)
