"""
Seed BSIS subjects for Year 1 Semester 1
Run with: python manage.py shell < seed_bsis_subjects.py
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.academics.models import Program, Subject, Section, SectionSubject
from apps.enrollment.models import Semester

# Get BSIS program
bsis = Program.objects.filter(code='BSIS').first()
if not bsis:
    print("BSIS program not found!")
    exit()

print(f"Found program: {bsis.code} - {bsis.name}")

# Get current semester
semester = Semester.objects.filter(is_current=True).first()
if not semester:
    # Fallback if no current semester, though debug showed one exists
    print("No current semester found!")
    exit()
print(f"Using semester: {semester}")

# Define Year 1 Semester 1 subjects for BSIS
subjects_data = [
    {"code": "GE001", "title": "Understanding the Self", "units": 3, "year_level": 1, "semester_number": 1},
    {"code": "GE002", "title": "Readings in Philippine History", "units": 3, "year_level": 1, "semester_number": 1},
    {"code": "GE003", "title": "The Contemporary World", "units": 3, "year_level": 1, "semester_number": 1},
    {"code": "GE004", "title": "Mathematics in the Modern World", "units": 3, "year_level": 1, "semester_number": 1},
    {"code": "IS101", "title": "Introduction to Computing", "units": 3, "year_level": 1, "semester_number": 1},
    {"code": "IS102", "title": "Computer Programming 1", "units": 3, "year_level": 1, "semester_number": 1},
    {"code": "PE001", "title": "Physical Education 1", "units": 2, "year_level": 1, "semester_number": 1},
    {"code": "NSTP1", "title": "NSTP 1", "units": 3, "year_level": 1, "semester_number": 1},
]

# Create subjects
created_subjects = []
for subj_data in subjects_data:
    subject, created = Subject.objects.get_or_create(
        code=subj_data['code'],
        program=bsis,
        defaults={
            'title': subj_data['title'],
            'units': subj_data['units'],
            'year_level': subj_data['year_level'],
            'semester_number': subj_data['semester_number'],
        }
    )
    status = "Created" if created else "Updated" 
    # Ensure year/sem are correct even if exists
    subject.year_level = subj_data['year_level']
    subject.semester_number = subj_data['semester_number']
    subject.save()
    
    print(f"  {status}: {subject.code} - {subject.title}")
    created_subjects.append(subject)

# Create a section for BSIS Year 1
section, sec_created = Section.objects.get_or_create(
    name="BSIS-1A",
    program=bsis,
    year_level=1,
    semester=semester,
    defaults={
        'capacity': 40
    }
)
print(f"\n{'Created' if sec_created else 'Found'} section: {section.name}")

# Link subjects to section
for subject in created_subjects:
    ss, ss_created = SectionSubject.objects.get_or_create(
        section=section,
        subject=subject
    )
    if ss_created:
        print(f"  Linked: {subject.code} to {section.name}")
    else:
        print(f"  Already linked: {subject.code}")

print("\n✅ Done! BSIS Year 1 Semester 1 subjects are ready.")
print(f"Total BSIS subjects: {Subject.objects.filter(program=bsis).count()}")
print(f"Total BSIS sections: {Section.objects.filter(program=bsis, semester=semester).count()}")
