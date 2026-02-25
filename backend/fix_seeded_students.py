import os
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import User
from apps.enrollment.models import Enrollment, Semester

emails = ['student3rdyear@richwell.edu', 'studentinc@richwell.edu']
active_semester = Semester.objects.filter(is_current=True).first()

if active_semester:
    enrolls = Enrollment.objects.filter(student__email__in=emails, semester=active_semester)
    for e in enrolls:
        e.status = 'ACTIVE' # Set to ACTIVE for the current semester
        e.save()
        print(f"Updated {e.student.email} status to ACTIVE for {active_semester}")
else:
    print("No active semester found.")
