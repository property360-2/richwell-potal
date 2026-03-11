from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.grades.views import (
    AdvisingViewSet, 
    AdvisingApprovalViewSet, 
    SubjectCreditingViewSet,
    GradeSubmissionViewSet,
    ResolutionViewSet
)

router = DefaultRouter()
router.register('advising', AdvisingViewSet, basename='advising')
router.register('approvals', AdvisingApprovalViewSet, basename='advising-approvals')
router.register('crediting', SubjectCreditingViewSet, basename='subject-crediting')
router.register('submission', GradeSubmissionViewSet, basename='grade-submission')
router.register('resolution', ResolutionViewSet, basename='grade-resolution')

urlpatterns = [
    path('', include(router.urls)),
]
