import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.enrollment.models import Enrollment
from apps.accounts.models import StudentProfile

# Get enrollments with student info
enrollments = Enrollment.objects.filter(status='ACTIVE').select_related('student')[:10]

print(f"Found {enrollments.count()} active enrollments:")
for e in enrollments:
    student = e.student
    # Get student profile for program
    try:
        profile = StudentProfile.objects.get(user=student)
        program_code = profile.program.code if profile.program else 'N/A'
        year_level = profile.year_level
    except:
        program_code = 'N/A'
        year_level = 1
    
    print(f"  {student.student_number}: {student.first_name} {student.last_name} - {program_code} Year {year_level}")
