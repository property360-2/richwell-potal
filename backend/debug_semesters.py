
import os
import django
import sys

# Setup Django
sys.path.append('c:\\Users\\kmagh\\richwell-potal\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.enrollment.models import Semester

def list_semesters():
    semesters = Semester.objects.all().order_by('-academic_year', '-start_date')
    for s in semesters:
        print(f"{s.name} {s.academic_year} (Current: {s.is_current})")

if __name__ == '__main__':
    list_semesters()
