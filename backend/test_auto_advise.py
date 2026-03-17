import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.conf import settings
settings.ALLOWED_HOSTS.append('testserver')

from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.students.models import Student
from apps.terms.models import Term

User = get_user_model()

def test_auto_advise():
    try:
        user = User.objects.get(username='enrollee_e2e')
        
        client = APIClient()
        client.force_authenticate(user=user)
        
        url = '/api/grades/advising/auto-advise/'
        
        print(f"Post to {url} as {user}...")
        response = client.post(url, {})
        
        print(f"Status: {response.status_code}")
        if response.status_code >= 400:
            print(f"Response data: {response.data}")
        else:
            from apps.students.models import StudentEnrollment
            term = Term.objects.get(is_active=True)
            enrollment = StudentEnrollment.objects.get(student__user=user, term=term)
            print(f"Advising Status: {enrollment.advising_status}")
            
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_auto_advise()
