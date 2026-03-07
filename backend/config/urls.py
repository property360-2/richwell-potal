"""
Richwell Portal — Root URL Configuration
"""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/accounts/', include('apps.accounts.urls')),
    # Other app URLs will be added here as we progress
    # path('api/academics/', include('apps.academics.urls')),
    # etc.
]
