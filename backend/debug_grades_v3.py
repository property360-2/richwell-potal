
import os
import django
import sys

# Setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.grades.models import Grade
from apps.students.models import Student
from apps.terms.models import Term

try:
    student = Student.objects.get(idn='231522')
    term = Term.objects.get(is_active=True)
    grades = Grade.objects.filter(student=student, term=term)

    print(f"DEBUG_OUTPUT_START")
    print(f"Found {grades.count()} total grades for {student.idn} in {term.code}")
    for g in grades:
        print(f"SUBJ:{g.subject.code}|ADV:{g.advising_status}|GRD:{g.grade_status}|CRED:{g.is_credited}|HIST:{g.is_historical}")
    print(f"DEBUG_OUTPUT_END")
except Exception as e:
    print(f"ERROR: {e}")
