from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.sections.views import SectionViewSet

router = DefaultRouter()
router.register(r'', SectionViewSet, basename='section')

urlpatterns = [
    path('', include(router.urls)),
]
