"""
URL routing for Richwell Colleges Portal REST API.
API base path: /api/v1/
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

from sis.api.views import (
    StudentProfileViewSet, EnrollmentViewSet, CashierStudentSearchViewSet,
    CashierPaymentViewSet, PublicProgramViewSet, PublicEnrollmentViewSet
)

# Create router for viewsets
router = DefaultRouter()

# Student API routes
router.register(r'student/profile', StudentProfileViewSet, basename='student-profile')
router.register(r'student/enrollment', EnrollmentViewSet, basename='student-enrollment')

# Cashier API routes
router.register(r'cashier/search', CashierStudentSearchViewSet, basename='cashier-search')
router.register(r'cashier/payment', CashierPaymentViewSet, basename='cashier-payment')

# Public API routes
router.register(r'public/programs', PublicProgramViewSet, basename='public-programs')
router.register(r'public/enrollment', PublicEnrollmentViewSet, basename='public-enrollment')

# API documentation endpoints
schema_urls = [
    path('schema/', SpectacularAPIView.as_view(), name='api-schema'),
    path('docs/', SpectacularSwaggerView.as_view(url_name='api-schema'), name='api-docs'),
    path('redoc/', SpectacularRedocView.as_view(url_name='api-schema'), name='api-redoc'),
]

app_name = 'api'

urlpatterns = [
    path('', include(router.urls)),
    path('', include(schema_urls)),
]
