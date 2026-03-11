from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PaymentViewSet, PermitViewSet

router = DefaultRouter()
router.register(r'payments', PaymentViewSet)
router.register(r'permits', PermitViewSet, basename='permits')

urlpatterns = [
    path('', include(router.urls)),
]
