
import os
import django
import sys
import json

sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import User
from apps.enrollment.views import RecommendedSubjectsView
from rest_framework.test import APIRequestFactory, force_authenticate

factory = APIRequestFactory()
try:
    user = User.objects.get(student_number='2026-00006')
except User.DoesNotExist:
    user = User.objects.filter(role='STUDENT').first()

request = factory.get('/api/v1/enrollment/subjects/recommended/')
force_authenticate(request, user=user)
view = RecommendedSubjectsView.as_view()
response = view(request)

if response.status_code != 200:
    print(f"Error {response.status_code}: {response.data}")
    sys.exit(1)

res_data = response.data
# Accessing nesting data['data']['recommended_subjects']
data_list = res_data.get('data', {}).get('recommended_subjects', [])

if not data_list:
    print("Could not find recommended_subjects in response structure")
    print(f"Keys: {list(res_data.keys())}")
    if 'data' in res_data: print(f"Keys in data: {list(res_data['data'].keys())}")
    sys.exit(1)

# Group by Year and Semester
grouped = {}
for s in data_list:
    yl = s.get('year_level')
    sn = s.get('semester_number')
    key = f"Year {yl} - Sem {sn}"
    if key not in grouped: grouped[key] = []
    grouped[key].append(s)

for key in sorted(grouped.keys()):
    print(f"\n=== {key} ===")
    for s in grouped[key]:
        sections = s.get('available_sections', [])
        status = "OPEN" if sections else "CLOSED"
        print(f"  {status} | {s['code']} - {s['title']} ({len(sections)} sections)")
        for sec in sections:
            print(f"    - {sec['name']}")
