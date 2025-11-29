"""
URL configuration for richwell_config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.views import obtain_auth_token

urlpatterns = [
    path("", include('sis.urls')),
    path("api/v1/", include('sis.api.urls')),
    path("api-auth/", include('rest_framework.urls')),
    path("api-token-auth/", obtain_auth_token, name='api_token_auth'),
    path("admin/", admin.site.urls),
]

# Error handlers
handler404 = 'sis.views.handler_404'
handler500 = 'sis.views.handler_500'
