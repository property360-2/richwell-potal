import os
import json
import django
from django.conf import settings
from rest_framework.test import APIRequestFactory
from core.views import BulacanLocationView

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

factory = APIRequestFactory()
request = factory.get('/api/locations/')
view = BulacanLocationView.as_view()
response = view(request)

print(f"Status: {response.status_code}")
print(f"Data type: {type(response.data)}")
if isinstance(response.data, dict):
    print(f"Keys: {list(response.data.keys())[:5]}")
else:
    print(f"Data: {response.data}")
