
import os
import django
import sys

# Setup Django
sys.path.append('c:\\Users\\kmagh\\richwell-potal\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import User
from apps.academics.models import SectionSubject, ScheduleSlot, Section
from apps.enrollment.models import Semester
from apps.academics.services import SchedulingService

def debug_schedule():
    print("DEBUGGING PROFESSOR SCHEDULE")
    
    # 1. Find Maria Garcia
    prof = User.objects.filter(first_name__icontains='Maria', last_name__icontains='Garcia').first()
    if not prof:
        prof = User.objects.filter(role='PROFESSOR').first()
        print(f"Maria Garcia not found, using first professor: {prof}")
    else:
        print(f"Found Professor: {prof.get_full_name()} (ID: {prof.id})")

    # 2. Get Active Semester
    active_semester = Semester.objects.filter(is_current=True).first()
    print(f"Active Semester: {active_semester} (ID: {active_semester.id})")
    
    # 3. Check SectionSubjects assigned to her
    print("\nChecking Direct Assignments (Legacy Field):")
    direct_ss = SectionSubject.objects.filter(professor=prof, is_deleted=False)
    for ss in direct_ss:
        print(f" - {ss.subject.code} in {ss.section.name} (Sem: {ss.section.semester})")
        if ss.section.semester != active_semester:
            print(f"   WARNING: Section semester {ss.section.semester} != Active {active_semester}")

    # 4. Check Schedule Slots for these
    print("\nChecking Slots:")
    for ss in direct_ss:
        slots = ScheduleSlot.objects.filter(section_subject=ss, is_deleted=False)
        print(f" - {ss.subject.code}: {slots.count()} slots")
        for slot in slots:
            print(f"   > {slot.day} {slot.start_time}-{slot.end_time}")

    # 5. Run Service Method
    print("\nRunning SchedulingService.get_professor_schedule:")
    schedule = SchedulingService.get_professor_schedule(prof, active_semester)
    print(f"Result count: {len(schedule)}")
    for item in schedule:
        print(f" - {item}")

if __name__ == '__main__':
    debug_schedule()
