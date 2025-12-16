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
    path('applicants/<uuid:pk>/', views.ApplicantUpdateView.as_view(), name='applicant-update'),
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
    
    # Cashier student search
    path('cashier/students/search/', views.CashierStudentSearchView.as_view(), name='cashier-student-search'),
    path('cashier/students/pending-payments/', views.CashierPendingPaymentsView.as_view(), name='cashier-pending-payments'),
    
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
    
    # ============================================================
    # Grades & GPA (EPIC 5)
    # ============================================================
    
    # Professor grading
    path('grades/my-sections/', views.ProfessorSectionsView.as_view(), name='professor-sections'),
    path('grades/section/<uuid:section_id>/subject/<uuid:subject_id>/students/', views.SectionStudentsView.as_view(), name='section-students'),
    path('grades/submit/', views.SubmitGradeView.as_view(), name='submit-grade'),
    path('grades/history/<uuid:subject_enrollment_id>/', views.GradeHistoryView.as_view(), name='grade-history'),
    
    # Registrar finalization
    path('grades/sections/', views.SectionFinalizationListView.as_view(), name='sections-for-finalization'),
    path('grades/section/<uuid:section_id>/finalize/', views.FinalizeSectionGradesView.as_view(), name='finalize-section'),
    path('grades/override/', views.OverrideGradeView.as_view(), name='override-grade'),
    
    # INC management
    path('grades/inc-report/', views.INCReportView.as_view(), name='inc-report'),
    path('grades/process-expired-incs/', views.ProcessExpiredINCsView.as_view(), name='process-expired-incs'),
    
    # Student grades
    path('my-enrollment/grades/', views.MyGradesView.as_view(), name='my-grades'),
    path('my-enrollment/transcript/', views.MyTranscriptView.as_view(), name='my-transcript'),
    
    # Academic standing
    path('students/<uuid:student_id>/standing/', views.UpdateAcademicStandingView.as_view(), name='update-standing'),
    
    # ============================================================
    # Document Release (EPIC 6)
    # ============================================================
    
    # Registrar document release
    path('documents/release/', views.CreateDocumentReleaseView.as_view(), name='create-document-release'),
    path('documents/my-releases/', views.MyReleasesView.as_view(), name='my-releases'),
    path('documents/student/<uuid:student_id>/', views.StudentDocumentsView.as_view(), name='student-documents'),
    path('documents/<str:document_code>/', views.DocumentDetailView.as_view(), name='document-detail'),
    path('documents/<str:document_code>/pdf/', views.DownloadDocumentPDFView.as_view(), name='document-pdf'),
    path('documents/<str:document_code>/revoke/', views.RevokeDocumentView.as_view(), name='revoke-document'),
    path('documents/<str:document_code>/reissue/', views.ReissueDocumentView.as_view(), name='reissue-document'),
    
    # Head-Registrar audit views
    path('documents/all/', views.AllReleasesView.as_view(), name='all-releases'),
    path('documents/stats/', views.DocumentReleaseStatsView.as_view(), name='release-stats'),
    
    # ============================================================
    # Head/Department Head Approval
    # ============================================================
    
    path('head/pending-enrollments/', views.HeadPendingEnrollmentsView.as_view(), name='head-pending-enrollments'),
    path('head/approve/<uuid:pk>/', views.HeadApproveEnrollmentView.as_view(), name='head-approve-enrollment'),
    path('head/reject/<uuid:pk>/', views.HeadRejectEnrollmentView.as_view(), name='head-reject-enrollment'),
    path('head/bulk-approve/', views.HeadBulkApproveView.as_view(), name='head-bulk-approve'),
]
