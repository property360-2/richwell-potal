
import os
import django
import sys
import datetime

# Setup Django
sys.path.append('c:\\Users\\kmagh\\richwell-potal\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import User
from apps.academics.models import SectionSubject, ScheduleSlot, Section, Subject, Program
from apps.enrollment.models import Semester
from apps.academics.services import SchedulingService
from rest_framework.exceptions import ValidationError

def test_conflict_check():
    print("Starting test...")
    
    # mimic the data from the request
    ss_id = '5efae8dd-aaec-414d-a863-b59edbbda86e'
    day = 'MON'
    start_time_str = '08:00:00'
    end_time_str = '12:00:00'
    room = '301'
    
    try:
        ss = SectionSubject.objects.get(id=ss_id)
        print(f"Found SectionSubject: {ss}")
        
        professor = ss.professor
        print(f"Professor: {professor}")
        
        semester = ss.section.semester
        print(f"Semester: {semester}")
        
        # Parse times like DRF would
        start_time = datetime.datetime.strptime(start_time_str, '%H:%M:%S').time()
        end_time = datetime.datetime.strptime(end_time_str, '%H:%M:%S').time()
        print(f"Times: {start_time} - {end_time}")
        
        if professor:
            print("Checking professor conflict...")
            try:
                has_conflict, conflict = SchedulingService.check_professor_conflict(
                    professor, day, start_time, end_time, semester
                )
                print(f"Professor conflict result: {has_conflict}, {conflict}")
            except Exception as e:
                print(f"ERROR in check_professor_conflict: {e}")
                import traceback
                traceback.print_exc()
        
        if room:
            print("Checking room conflict...")
            try:
                has_conflict, conflict = SchedulingService.check_room_conflict(
                    room, day, start_time, end_time, semester
                )
                print(f"Room conflict result: {has_conflict}, {conflict}")
            except Exception as e:
                print(f"ERROR in check_room_conflict: {e}")
                import traceback
                traceback.print_exc()
                
    except SectionSubject.DoesNotExist:
        print("SectionSubject not found")
    except Exception as e:
        print(f"Top level error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_conflict_check()
