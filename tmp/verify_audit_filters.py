import os
import django
import sys

# Setup django
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
import django
from django.conf import settings
if not settings.configured:
    django.setup()
settings.ALLOWED_HOSTS = ['*']

from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.auditing.models import AuditLog
from datetime import datetime, timedelta

User = get_user_model()

def verify_filters():
    client = APIClient()
    # Find the 'admin' user specifically as it was identified in the shell
    admin = User.objects.filter(username='admin').first()
    if not admin:
        # Fallback to any user if admin not found (for testing filters only)
        admin = User.objects.first()
        
    if not admin:
        print("No user found for verification.")
        return
        
    client.force_authenticate(user=admin)

    print("--- Testing Audit Filters ---")
    
    # 1. Test Date Range
    today = datetime.now()
    yesterday = today - timedelta(days=7) # wider range
    tomorrow = today + timedelta(days=1)
    
    url = f'/api/auditing/?start_date={yesterday.strftime("%Y-%m-%d")}&end_date={tomorrow.strftime("%Y-%m-%d")}'
    res = client.get(url)
    print(f"Date Range ({yesterday.date()} to {tomorrow.date()}): {res.status_code}, Found: {res.data.get('count', len(res.data))}")

    # 2. Test Model Name Partial
    url = '/api/auditing/?model_name=User'
    res = client.get(url)
    print(f"Model Name (User): {res.status_code}, Found: {res.data.get('count', len(res.data))}")

    # 3. Test Search
    url = f'/api/auditing/?search={admin.username}'
    res = client.get(url)
    print(f"Search ({admin.username}): {res.status_code}, Found: {res.data.get('count', len(res.data))}")

    # 4. Test Ordering
    url = '/api/auditing/?ordering=user__username'
    res = client.get(url)
    print(f"Ordering (user__username): {res.status_code}")
    if res.status_code == 200:
        results = res.data.get('results', [])
        if results:
             print(f"First result user: {results[0].get('user_username', 'N/A')}")

if __name__ == "__main__":
    verify_filters()
