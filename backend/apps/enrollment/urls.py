"""
Enrollment URL configuration.
Includes public admissions endpoints and authenticated enrollment endpoints.
"""

from django.urls import path
from . import views

app_name = 'enrollment'

urlpatterns = [
    # Public - Admissions
    path('system/enrollment-status/', views.EnrollmentStatusView.as_view(), name='enrollment-status'),
    path('programs/', views.PublicProgramListView.as_view(), name='public-programs'),
    path('enroll/', views.OnlineEnrollmentView.as_view(), name='online-enroll'),
    
    # Documents
    path('enrollment/<uuid:enrollment_id>/documents/', views.DocumentUploadView.as_view(), name='document-upload'),
    
    # User enrollment
    path('my-enrollment/', views.EnrollmentDetailView.as_view(), name='my-enrollment'),
    
    # Registrar - Transferee management
    path('transferee/', views.TransfereeCreateView.as_view(), name='transferee-create'),
    path('transferee/<uuid:pk>/credits/', views.TransfereeCreditView.as_view(), name='transferee-credits'),
    
    # Admission staff - Applicant management
    path('applicants/', views.ApplicantListView.as_view(), name='applicant-list'),
    path('documents/<uuid:pk>/verify/', views.DocumentVerifyView.as_view(), name='document-verify'),
    
    # ============================================================
    # Subject Enrollment (EPIC 3)
    # ============================================================
    
    # Student subject picker
    path('subjects/recommended/', views.RecommendedSubjectsView.as_view(), name='recommended-subjects'),
    path('subjects/available/', views.AvailableSubjectsView.as_view(), name='available-subjects'),
    path('subjects/my-enrollments/', views.MySubjectEnrollmentsView.as_view(), name='my-subject-enrollments'),
    
    # Enrollment actions
    path('subjects/enroll/', views.EnrollSubjectView.as_view(), name='enroll-subject'),
    path('subjects/<uuid:pk>/drop/', views.DropSubjectView.as_view(), name='drop-subject'),
    
    # Registrar override
    path('enrollment/<uuid:enrollment_id>/override-enroll/', views.RegistrarOverrideEnrollmentView.as_view(), name='override-enroll'),
]
