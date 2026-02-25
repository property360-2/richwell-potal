
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
    # Fallback to any student
    user = User.objects.filter(role='STUDENT').first()

if not user:
    print("No student found.")
    sys.exit(1)

print(f"Testing for student: {user.get_full_name()} ({user.student_number})")

request = factory.get('/api/v1/enrollment/subjects/recommended/')
force_authenticate(request, user=user)

view = RecommendedSubjectsView.as_view()
response = view(request)

print(f"Status Code: {response.status_code}")
data = response.data

if response.status_code != 200:
    print(f"Error Response: {data}")
    sys.exit(1)

if not isinstance(data, list):
    # Check if it's a dict with recommended_subjects
    if isinstance(data, dict) and 'recommended_subjects' in data:
        data_list = data['recommended_subjects']
    else:
        print(f"Unexpected data type: {type(data)}")
        print(data)
        sys.exit(1)
else:
    data_list = data

# Print subjects and their section counts
print("\nRecommended Subjects:")
for s in data_list:
    year = s.get('year_level', 'N/A')
    sem = s.get('semester_number', 'N/A')
    sections_count = len(s.get('available_sections', []))
    print(f"[{year}-{sem}] {s['code']} - {s['title']} | Sections: {sections_count}")
    if sections_count > 0:
        for sec in s['available_sections']:
            print(f"  - Section: {sec['name']} | Professor: {sec['professor']}")
