import os
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.academics.models import Section, Program
from apps.enrollment.models import Semester

active_semester = Semester.objects.filter(is_current=True).first()
program = Program.objects.filter(code='BS_Information_Systems').first()

if active_semester and program:
    sections = Section.objects.filter(semester=active_semester, program=program)
    print(f"Sections for {program.code} in {active_semester}:")
    for s in sections:
        print(f"ID: {s.id} | NAME: {s.name} | YEAR: {s.year_level}")
else:
    print("Active semester or Program not found.")
