"""
Richwell Portal — Root URL Configuration
"""

from django.contrib import admin
from django.urls import path, include
from core.views import BulacanLocationView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/accounts/', include('apps.accounts.urls')),
    path('api/academics/', include('apps.academics.urls')),
    path('api/grades/', include('apps.grades.urls')),
    path('api/sections/', include('apps.sections.urls')),
    path('api/scheduling/', include('apps.scheduling.urls')),
    path('api/terms/', include('apps.terms.urls')),
    path('api/facilities/', include('apps.facilities.urls')),
    path('api/students/', include('apps.students.urls')),
    path('api/faculty/', include('apps.faculty.urls')),
    path('api/finance/', include('apps.finance.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/auditing/', include('apps.auditing.urls')),
    path('api/reports/', include('apps.reports.urls')),
    
    # Public endpoints
    path('api/locations/', BulacanLocationView.as_view(), name='bulacan-locations'),
    # Other app URLs will be added here as we progress
    # etc.
]
