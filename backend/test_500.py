import os
import django
import traceback

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.enrollment.models import Semester
from apps.enrollment.serializers import SemesterSerializer
from apps.audit.models import AuditLog

try:
    semester = Semester.objects.last()
    data = {
      "name": "2nd Semester",
      "academic_year": "2026-2027",
      "start_date": "2026-03-03",
      "end_date": "2026-03-09",
      "enrollment_start_date": "2026-03-03",
      "enrollment_end_date": "2026-03-04",
      "grading_start_date": None,
      "grading_end_date": None,
      "is_current": True,
      "status": "SETUP"
    }

    serializer = SemesterSerializer(semester, data=data, partial=True)
    if serializer.is_valid():
        try:
            updated = serializer.save()
            AuditLog.log(
                action=AuditLog.Action.SEMESTER_UPDATED,
                target_model='Semester',
                target_id=updated.id,
                payload={'name': updated.name, 'changes': serializer.validated_data}
            )
            print("Success")
        except Exception as e:
            print(f"Error during save/audit: {e}")
            traceback.print_exc()
    else:
        print(f"Validation errors: {serializer.errors}")
except Exception as e:
    print(f"General error: {e}")
    traceback.print_exc()
