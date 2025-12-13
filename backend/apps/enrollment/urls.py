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
    
    # ============================================================
    # Payments & Exam Permits (EPIC 4)
    # ============================================================
    
    # Cashier payment entry
    path('payments/record/', views.PaymentRecordView.as_view(), name='payment-record'),
    path('payments/adjust/', views.PaymentAdjustmentView.as_view(), name='payment-adjust'),
    path('payments/transactions/', views.PaymentTransactionListView.as_view(), name='payment-transactions'),
    path('payments/student/<uuid:enrollment_id>/', views.StudentPaymentHistoryView.as_view(), name='student-payments'),
    
    # Student payment view
    path('my-enrollment/payments/', views.MyPaymentsView.as_view(), name='my-payments'),
    
    # Exam-month mappings (admin/registrar)
    path('exam-mappings/', views.ExamMonthMappingView.as_view(), name='exam-mappings'),
    path('exam-mappings/<uuid:pk>/', views.ExamMonthMappingDetailView.as_view(), name='exam-mapping-detail'),
    
    # Student exam permits
    path('my-enrollment/exam-permits/', views.MyExamPermitsView.as_view(), name='my-exam-permits'),
    path('exam-permits/<str:exam_period>/generate/', views.GenerateExamPermitView.as_view(), name='generate-exam-permit'),
    path('exam-permits/<uuid:permit_id>/print/', views.PrintExamPermitView.as_view(), name='print-exam-permit'),
    
    # Admin exam permit list
    path('exam-permits/', views.ExamPermitListView.as_view(), name='exam-permit-list'),
]
