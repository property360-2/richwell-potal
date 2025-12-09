"""
Academics URL configuration.
"""

from django.urls import path
from . import views

app_name = 'academics'

urlpatterns = [
    # Programs
    path('programs/', views.ProgramListView.as_view(), name='program-list'),
    path('programs/<uuid:pk>/', views.ProgramDetailView.as_view(), name='program-detail'),
    
    # Subjects
    path('subjects/', views.SubjectListView.as_view(), name='subject-list'),
    path('subjects/<uuid:pk>/', views.SubjectDetailView.as_view(), name='subject-detail'),
]
