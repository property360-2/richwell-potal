"""
URL configuration for SIS app.
"""

from django.urls import path
from . import views

app_name = 'sis'

urlpatterns = [
    path('', views.HomeView.as_view(), name='home'),

    # Enrollment URLs
    path('enroll/', views.EnrollmentWizardView.as_view(), name='enroll'),
    path('enroll/confirmation/<str:student_number>/', views.EnrollmentConfirmationView.as_view(), name='enrollment_confirmation'),

    # Cashier/Payment URLs
    path('cashier/dashboard/', views.CashierDashboardView.as_view(), name='cashier_dashboard'),
    path('payment/receipt/<uuid:payment_id>/', views.PaymentReceiptView.as_view(), name='payment_receipt'),
    path('payment/status/', views.EnrollmentPaymentStatusView.as_view(), name='payment_status'),
]
