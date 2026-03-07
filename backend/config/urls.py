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
    
    # Public endpoints
    path('api/locations/', BulacanLocationView.as_view(), name='bulacan-locations'),
    # Other app URLs will be added here as we progress
    # etc.
]
