import os
import django
from django.test import RequestFactory
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.students.models import Student

User = get_user_model()

def test_patch():
    try:
        reg_user = User.objects.get(username='registrar_e2e')
        student = Student.objects.get(idn='E2E-2002')
        
        client = APIClient()
        client.force_authenticate(user=reg_user)
        
        url = f'/api/students/{student.id}/'
        data = {
            'document_checklist': {
                'Form 138': {'submitted': True, 'verified': True},
                'Good Moral': {'submitted': True, 'verified': True},
                'PSA Birth Certificate': {'submitted': True, 'verified': True}
            }
        }
        
        print(f"Patching {url} as {reg_user}...")
        response = client.patch(url, data, format='json')
        
        print(f"Status: {response.status_code}")
        if response.status_code != 200:
            print(f"Response data: {response.data}")
            # If it's a 500, response.data might be the HTML if not handled by custom handler
            # But we have a custom handler.
        else:
            print("Success!")
            
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_patch()
