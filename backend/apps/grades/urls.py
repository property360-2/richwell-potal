from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.grades.views import AdvisingViewSet, AdvisingApprovalViewSet, SubjectCreditingViewSet

router = DefaultRouter()
router.register('advising', AdvisingViewSet, basename='advising')
router.register('approvals', AdvisingApprovalViewSet, basename='advising-approvals')
router.register('crediting', SubjectCreditingViewSet, basename='subject-crediting')

urlpatterns = [
    path('', include(router.urls)),
]
