import os
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.enrollment.models import Semester

sems = Semester.objects.all().order_by('-academic_year', '-name')
for s in sems:
    print(f"ID: {s.id} | NAME: {s.name} | ACAD_YEAR: {s.academic_year} | CURRENT: {s.is_current}")
