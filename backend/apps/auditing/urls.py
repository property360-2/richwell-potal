from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AuditLogViewSet, RegistrarActionLogViewSet

router = DefaultRouter()
router.register(r'registrar-history', RegistrarActionLogViewSet, basename='registrar-history')
router.register(r'', AuditLogViewSet, basename='auditlog')

urlpatterns = [
    path('', include(router.urls)),
]
