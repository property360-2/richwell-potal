"""
URL configuration for SIS app.
"""

from django.urls import path
from . import views

app_name = 'sis'

urlpatterns = [
    path('', views.HomeView.as_view(), name='home'),
]
