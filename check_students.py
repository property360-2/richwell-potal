import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.students.models import Student

print("Checking Students status counts:")
for status in ['APPLICANT', 'APPROVED', 'REJECTED', 'ENROLLED']:
    count = Student.objects.filter(status=status).count()
    print(f"{status}: {count}")

print("\nRecent APPROVED students:")
for student in Student.objects.filter(status='APPROVED').order_by('-updated_at')[:5]:
    print(f"IDN: {student.idn}, Name: {student.user.get_full_name()}, Status: {student.status}")
