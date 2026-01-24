from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SystemConfigViewSet

router = DefaultRouter()
router.register(r'config', SystemConfigViewSet, basename='system-config')

urlpatterns = [
    path('', include(router.urls)),
]
