import os
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.academics.models import Curriculum, CurriculumSubject, Program

program = Program.objects.filter(code='BS_Information_Systems').first()
if program:
    curriculum = Curriculum.objects.filter(program=program).first()
    if curriculum:
        subjects = CurriculumSubject.objects.filter(curriculum=curriculum).order_by('year_level', 'semester_number', 'subject__code')
        print(f"Curriculum: {curriculum.name}")
        for s in subjects:
            print(f"Y{s.year_level} S{s.semester_number}: {s.subject.code} - {s.subject.title}")
    else:
        print("No curriculum found for BSIS")
else:
    print("No BSIS program found")
