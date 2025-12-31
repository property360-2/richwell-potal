"""
Academics URL configuration.
EPIC 2: Curriculum, Subjects & Section Scheduling
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from apps.enrollment.views import SemesterViewSet

app_name = 'academics'

# Create router for ViewSets
router = DefaultRouter()
router.register(r'manage/programs', views.ProgramViewSet, basename='program-manage')
router.register(r'manage/subjects', views.SubjectViewSet, basename='subject-manage')
router.register(r'sections', views.SectionViewSet, basename='section')
router.register(r'section-subjects', views.SectionSubjectViewSet, basename='section-subject')
router.register(r'schedule-slots', views.ScheduleSlotViewSet, basename='schedule-slot')
router.register(r'curricula', views.CurriculumViewSet, basename='curriculum')
router.register(r'semesters', SemesterViewSet, basename='semester')
router.register(r'professors', views.ProfessorViewSet, basename='professor')

urlpatterns = [
    # EPIC 1 - Public endpoints (unchanged)
    path('programs/', views.ProgramListView.as_view(), name='program-list'),
    path('programs/<uuid:pk>/', views.ProgramDetailView.as_view(), name='program-detail'),
    path('subjects/', views.SubjectListView.as_view(), name='subject-list'),
    path('subjects/<uuid:pk>/', views.SubjectDetailView.as_view(), name='subject-detail'),
    
    # EPIC 2 - ViewSet routes
    path('', include(router.urls)),
    
    # EPIC 2 - Conflict checking
    path('check-professor-conflict/', views.ProfessorConflictCheckView.as_view(), name='check-professor-conflict'),
    path('check-room-conflict/', views.RoomConflictCheckView.as_view(), name='check-room-conflict'),
    
    # EPIC 2 - Professor schedule
    path('professor/<uuid:professor_id>/schedule/<uuid:semester_id>/', 
         views.ProfessorScheduleView.as_view(), name='professor-schedule'),
    
    # EPIC 2 - Curriculum versions
    path('curriculum-versions/<uuid:pk>/', 
         views.CurriculumVersionDetailView.as_view(), name='curriculum-version-detail'),
]

