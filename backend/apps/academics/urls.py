from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProgramViewSet, CurriculumVersionViewSet, SubjectViewSet, SubjectPrerequisiteViewSet

router = DefaultRouter()
router.register(r'programs', ProgramViewSet)
router.register(r'curriculums', CurriculumVersionViewSet)
router.register(r'subjects', SubjectViewSet)
router.register(r'prerequisites', SubjectPrerequisiteViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
