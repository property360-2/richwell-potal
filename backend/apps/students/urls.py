from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudentViewSet, StudentEnrollmentViewSet

router = DefaultRouter()
router.register('enrollments', StudentEnrollmentViewSet)
router.register('', StudentViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
