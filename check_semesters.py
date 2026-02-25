
import os
import django
import sys

sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.enrollment.models import Semester
from apps.academics.models import Section, SectionSubject

print("Semesters:")
for sem in Semester.objects.all():
    print(f"ID: {sem.id} | Name: {sem.name} | Current: {sem.is_current} | Enrollment Open: {sem.is_enrollment_open} | Status: {sem.status}")

print("\nSections in current semester:")
active_sem = Semester.objects.filter(is_current=True).first()
if active_sem:
    sections = Section.objects.filter(semester=active_sem)
    for sec in sections:
        ss_count = SectionSubject.objects.filter(section=sec).count()
        print(f"Section: {sec.name} | Subjects: {ss_count}")
else:
    print("No active semester.")
