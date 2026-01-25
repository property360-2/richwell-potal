
import os
import django
import sys

sys.path.append('c:\\Users\\kmagh\\richwell-potal\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import User
from apps.academics.models import SectionSubject, ScheduleSlot, SectionSubjectProfessor
from apps.enrollment.models import Semester
from apps.academics.services import SchedulingService

def full_debug():
    # Get Maria Garcia
    maria = User.objects.filter(email='prof.garcia@richwell.edu.ph').first()
    if not maria:
        maria = User.objects.filter(first_name__icontains='Maria', last_name__icontains='Garcia').first()
    
    if not maria:
        print("ERROR: Maria Garcia not found!")
        return
    
    print(f"=== PROFESSOR: {maria.get_full_name()} ===")
    print(f"Email: {maria.email}")
    print(f"ID: {maria.id}")
    
    # Active semester
    sem = Semester.objects.filter(is_current=True).first()
    print(f"\n=== ACTIVE SEMESTER ===")
    print(f"{sem.name} {sem.academic_year} (ID: {sem.id})")
    
    # Direct assignments (legacy field)
    print(f"\n=== DIRECT ASSIGNMENTS (SectionSubject.professor) ===")
    direct = SectionSubject.objects.filter(professor=maria, is_deleted=False)
    print(f"Count: {direct.count()}")
    for ss in direct[:5]:
        print(f"  - {ss.subject.code} in {ss.section.name} (Sem: {ss.section.semester.id})")
        matches_active = ss.section.semester.id == sem.id
        print(f"    Matches active semester: {matches_active}")
    
    # Junction table assignments
    print(f"\n=== JUNCTION TABLE (SectionSubjectProfessor) ===")
    junction = SectionSubjectProfessor.objects.filter(professor=maria, is_deleted=False)
    print(f"Count: {junction.count()}")
    for ssp in junction[:5]:
        ss = ssp.section_subject
        print(f"  - {ss.subject.code} in {ss.section.name} (Sem: {ss.section.semester.id})")
    
    # Schedule slots for direct assignments
    print(f"\n=== SCHEDULE SLOTS FOR DIRECT ASSIGNMENTS ===")
    for ss in direct[:3]:
        slots = ScheduleSlot.objects.filter(section_subject=ss, is_deleted=False)
        print(f"{ss.subject.code}: {slots.count()} slots")
        for slot in slots:
            print(f"  - {slot.day} {slot.start_time}-{slot.end_time} Room {slot.room}")
    
    # Call the service
    print(f"\n=== SERVICE OUTPUT (get_professor_schedule) ===")
    result = SchedulingService.get_professor_schedule(maria, sem)
    print(f"Result count: {len(result)}")
    for item in result[:3]:
        print(f"  - {item}")

if __name__ == '__main__':
    full_debug()
