import os
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import User
from apps.enrollment.models import Enrollment, Semester, SubjectEnrollment

emails = ['student3rdyear@richwell.edu', 'studentinc@richwell.edu']
active_semester = Semester.objects.filter(is_current=True).first()

if active_semester:
    print(f"Current Active Semester: {active_semester}")
    
    # Check for SubjectEnrollments in the current semester
    subject_enrollments = SubjectEnrollment.objects.filter(
        enrollment__student__email__in=emails,
        enrollment__semester=active_semester
    )
    
    count = subject_enrollments.count()
    subject_enrollments.delete()
    print(f"Deleted {count} SubjectEnrollment records for the current semester.")
    
    # Ensure the Enrollment record exists but is ready for enlistment
    # We set status to 'ACTIVE' but with no subjects, the UI should show the enlistment form
    enrolls = Enrollment.objects.filter(student__email__in=emails, semester=active_semester)
    for e in enrolls:
        e.status = 'ACTIVE'
        e.first_month_paid = False # Reset payment
        e.save()
        print(f"Reset {e.student.email} enrollment for current semester.")
else:
    print("No active semester found.")
