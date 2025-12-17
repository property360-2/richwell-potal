"""Script to add test subjects for all programs"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.academics.models import Program, Subject

# Common GE subjects that will be shared
ge_subjects = [
    ('GE101', 'Understanding the Self', 3, 1, 1),
    ('GE102', 'Readings in Philippine History', 3, 1, 1),
    ('GE103', 'Mathematics in the Modern World', 3, 1, 1),
    ('GE104', 'Purposive Communication', 3, 1, 1),
    ('GE105', 'Art Appreciation', 3, 1, 2),
    ('GE106', 'Science Technology and Society', 3, 1, 2),
    ('PE101', 'Physical Education 1', 2, 1, 1),
    ('PE102', 'Physical Education 2', 2, 1, 2),
    ('NSTP101', 'National Service Training Program 1', 3, 1, 1),
    ('NSTP102', 'National Service Training Program 2', 3, 1, 2),
]

# BSED specific subjects
bsed_subjects = [
    ('EDUC101', 'The Child and Adolescent Learners', 3, 1, 1),
    ('EDUC102', 'The Teaching Profession', 3, 1, 1),
    ('EDUC103', 'Facilitating Learner-Centered Teaching', 3, 1, 2),
    ('EDUC104', 'Assessment in Learning 1', 3, 1, 2),
]

# Get all programs
programs = Program.objects.all()

for program in programs:
    print(f"\nAdding subjects for {program.code}...")
    
    # Add GE subjects
    for code, title, units, year, sem in ge_subjects:
        subj_code = f"{code}-{program.code}"  # Make unique per program
        s, created = Subject.objects.get_or_create(
            code=subj_code, program=program,
            defaults={'title': title, 'units': units, 'year_level': year, 'semester_number': sem}
        )
        print(f"  {subj_code}: {'Created' if created else 'Exists'}")
    
    # Add BSED-specific if BSED
    if program.code == 'BSED':
        for code, title, units, year, sem in bsed_subjects:
            s, created = Subject.objects.get_or_create(
                code=code, program=program,
                defaults={'title': title, 'units': units, 'year_level': year, 'semester_number': sem}
            )
            print(f"  {code}: {'Created' if created else 'Exists'}")

print("\nDone! Subjects added for all programs.")
