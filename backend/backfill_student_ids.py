
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import User

def run():
    print("Checking for students without IDs...")
    students = User.objects.filter(role=User.Role.STUDENT, student_number__isnull=True)
    
    if not students.exists():
        print("No students found missing IDs.")
        return

    # Get last ID
    last_student = User.objects.filter(student_number__startswith='2025-').order_by('-student_number').first()
    if last_student:
        try:
            last_count = int(last_student.student_number.split('-')[1])
        except:
            last_count = 0
    else:
        last_count = 0
    
    print(f"Found {students.count()} students. Last ID used: 2025-{last_count:05d}")
    
    count = last_count
    for s in students:
        count += 1
        new_id = f"2025-{count:05d}"
        s.student_number = new_id
        s.save()
        print(f"✅ Assigned {new_id} to {s.email} ({s.first_name} {s.last_name})")
    
    print("Done!")

if __name__ == '__main__':
    run()
