import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.enrollment.models import Semester

user = User.objects.filter(role='ADMIN').first()
if not user:
    user = User.objects.first()

client = APIClient()
client.force_authenticate(user=user)

semester = Semester.objects.filter(id="f7e162df-b93e-43c0-9ffa-202b3db352b0").first()
if not semester:
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

try:
    response = client.patch(
        f"/api/v1/academics/semesters/{semester.id}/",
        data=data,
        format='json'
    )
    print("STATUS:", response.status_code)
    try:
        print("RESPONSE CONTENT:", response.json())
    except:
        print("RESPONSE CONTENT:", response.content.decode('utf-8'))
except Exception as e:
    import traceback
    traceback.print_exc()
