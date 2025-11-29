from django.urls import path
from . import views

app_name = 'sis'

urlpatterns = [
    path('', views.HomeView.as_view(), name='home'),
    path('login/', views.CustomLoginView.as_view(), name='login'),
    path('logout/', views.CustomLogoutView.as_view(), name='logout'),

    # Student enrollment views
    path('dashboard/', views.StudentDashboardView.as_view(), name='student_dashboard'),
    path('enroll/', views.EnrollSubjectView.as_view(), name='enroll_subject'),
    path('drop/<int:enrollment_id>/', views.DropSubjectView.as_view(), name='drop_subject'),

    # Cashier payment views
    path('payment/<str:student_id>/', views.RecordPaymentView.as_view(), name='record_payment'),
]
