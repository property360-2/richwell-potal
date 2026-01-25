
import os
import django
import sys
import json

# Setup Django
sys.path.append('c:\\Users\\kmagh\\richwell-potal\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import User
from apps.enrollment.models import Semester
from apps.academics.services import SchedulingService

def debug_response():
    # 1. Get the user likely logged in
    email = "professor1@richwell.edu.ph"
    prof = User.objects.filter(email=email).first()
    if not prof:
        print(f"User {email} not found! Trying to find Maria...")
        prof = User.objects.filter(first_name__icontains='Maria').first()
    
    if not prof:
        print("No professor found.")
        return

    print(f"Checking schedule for: {prof.get_full_name()} (ID: {prof.id})")
    print(f"Email: {prof.email}")

    # 2. Get active semester
    sem = Semester.objects.filter(is_current=True).first()
    print(f"Active Semester: {sem.name} {sem.academic_year} (ID: {sem.id})")

    # 3. Simulate Service Call
    schedule = SchedulingService.get_professor_schedule(prof, sem)
    
    # 4. Print JSON-like output (first 2 items)
    print(f"\nSchedule Count: {len(schedule)}")
    print(json.dumps(schedule[:2], indent=2, default=str))

if __name__ == '__main__':
    debug_response()
