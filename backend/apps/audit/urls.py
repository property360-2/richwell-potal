"""
Audit URL configuration.
"""

from django.urls import path
from . import views

app_name = 'audit'

urlpatterns = [
    # Audit logs
    path('logs/', views.AuditLogListView.as_view(), name='audit-list'),
    path('logs/<uuid:pk>/', views.AuditLogDetailView.as_view(), name='audit-detail'),
]
