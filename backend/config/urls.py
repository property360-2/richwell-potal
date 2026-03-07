"""
Richwell Portal — Root URL Configuration
"""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    # API endpoints will be added as apps are built
    # path('api/accounts/', include('apps.accounts.urls')),
    # path('api/academics/', include('apps.academics.urls')),
    # etc.
]
