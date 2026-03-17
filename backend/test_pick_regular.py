import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.conf import settings
settings.ALLOWED_HOSTS.append('testserver')

from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.students.models import Student, StudentEnrollment
from apps.terms.models import Term
from apps.sections.models import Section

User = get_user_model()

def test_pick_regular():
    try:
        user = User.objects.get(username='enrollee_e2e')
        term = Term.objects.get(code='E2E-TERM')
        
        # Ensure enrollment is APPROVED (required for picking)
        enrollment = StudentEnrollment.objects.get(student__user=user, term=term)
        enrollment.advising_status = 'APPROVED'
        enrollment.save()
        
        client = APIClient()
        client.force_authenticate(user=user)
        
        url = '/api/scheduling/pick-regular/'
        
        print(f"Post to {url} as {user}...")
        response = client.post(url, {'term_id': term.id, 'session': 'AM'})
        
        print(f"Status: {response.status_code}")
        if response.status_code >= 400:
            print(f"Response data: {response.data}")
        else:
            print(f"Message: {response.data.get('message')}")
            
            # Now check enrollment details
            enroll_url = f'/api/students/enrollments/me/?term={term.id}'
            e_response = client.get(enroll_url)
            print(f"Enrollment Info: {e_response.data}")
            print(f"is_schedule_picked: {e_response.data.get('is_schedule_picked')}")
            
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_pick_regular()
