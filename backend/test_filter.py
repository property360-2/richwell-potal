import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.grades.models import Grade
from django.test import RequestFactory
from apps.grades.views import AdvisingViewSet

# Simulate a request
rf = RequestFactory()
url = '/api/grades/advising/?grade_status__in=PASSED,FAILED'
request = rf.get(url)

# Mock user
from apps.accounts.models import User
admin_user = User.objects.filter(role='ADMIN').first()
request.user = admin_user

# Get the queryset as the view would
view = AdvisingViewSet()
view.request = request
view.format_kwarg = None
queryset = view.get_queryset()

# Apply filters manually using the same logic DRF uses
from django_filters.rest_framework import DjangoFilterBackend
backend = DjangoFilterBackend()
filtered_queryset = backend.filter_queryset(request, queryset, view)

print(f"URL: {url}")
print(f"Total in queryset: {queryset.count()}")
print(f"Total after filter: {filtered_queryset.count()}")

# Show some statuses
print(f"Statuses found: {list(filtered_queryset.values_list('grade_status', flat=True).distinct())}")
