
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.students.models import Student, StudentEnrollment

def check_regularity(idn):
    try:
        s = Student.objects.filter(idn=idn).first()
        if not s:
            print(f"Student with IDN {idn} not found.")
            return
            
        print(f"Student: {s.user.get_full_name()} ({s.idn})")
        e = StudentEnrollment.objects.filter(student=s).order_by('-enrollment_date').first()
        
        if not e:
            print("No enrollment found for this student.")
            return
            
        print(f"Term: {e.term}")
        print(f"Status: {e.enrollment_status}")
        print(f"Regularity: {'Regular' if e.is_regular else 'Irregular'}")
        print(f"Reason: {e.regularity_reason if not e.is_regular else 'N/A'}")
        
    except Exception as ex:
        print(f"Error: {ex}")

if __name__ == "__main__":
    check_regularity('260003')
