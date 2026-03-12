import os
import django
import sys

# Ensure the project root is in sys.path
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.students.models import Student

print("Checking Students status counts:")
for status_choice in ['APPLICANT', 'APPROVED', 'REJECTED', 'ENROLLED']:
    count = Student.objects.filter(status=status_choice).count()
    print(f"{status_choice}: {count}")

print("\nRecent APPROVED students:")
for student in Student.objects.filter(status='APPROVED').order_by('-updated_at')[:10]:
    print(f"IDN: {student.idn}, Name: {student.user.get_full_name()}, Status: {student.status}")

print("\nRecent APPLICANT students:")
for student in Student.objects.filter(status='APPLICANT').order_by('-updated_at')[:5]:
    print(f"IDN: {student.idn}, Name: {student.user.get_full_name()}, Status: {student.status}")
