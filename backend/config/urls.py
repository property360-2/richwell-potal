"""
URL configuration for Richwell Colleges Portal.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView
)


def health_check(request):
    """Simple health check endpoint for the root URL."""
    return JsonResponse({
        "status": "ok",
        "service": "Richwell Colleges Portal API",
        "version": "1.0.0",
        "docs": "/api/docs/"
    })


urlpatterns = [
    # Health check at root
    path('', health_check, name='health-check'),
    
    # Admin
    path('admin/', admin.site.urls),
    
    # API v1
    path('api/v1/', include([
        path('accounts/', include('apps.accounts.urls')),
        path('admissions/', include('apps.enrollment.urls')),
        path('academics/', include('apps.academics.urls')),
        path('audit/', include('apps.audit.urls')),
        path('core/', include('apps.core.urls')),
    ])),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
