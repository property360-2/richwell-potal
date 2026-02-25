import os
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.enrollment.models import SubjectEnrollment, Enrollment, Semester

emails = ['student3rdyear@richwell.edu', 'studentinc@richwell.edu']

# Cleanup all current and historical SubjectEnrollments for these students to avoid duplicates
# then re-run the fix script
enrolls = Enrollment.objects.filter(student__email__in=emails)
count = SubjectEnrollment.objects.filter(enrollment__in=enrolls).delete()[0]
print(f"Cleaned up {count} SubjectEnrollment records.")

# Also cleanup Enrollments for them except for the current active one (keep it but reset)
active_semester = Semester.objects.filter(is_current=True).first()
Enrollment.objects.filter(student__email__in=emails).exclude(semester=active_semester).delete()
print(f"Cleaned up old Enrollment records.")
