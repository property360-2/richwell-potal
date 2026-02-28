"""
Enrollment views — main module with SemesterViewSet, base views, and re-exports.

Split view modules:
  - views_public.py        — Public endpoints (enrollment status, program list, online enrollment)
  - views_applicants.py    — Admission staff (applicant list, approval, transferee creation)
  - views_enrollment.py    — Subject enrollment (recommended, available, enroll, schedule)
  - views_payments.py      — Payment endpoints (cashier, SOA, transactions)
  - views_reports.py       — Reports, grading, grade resolutions
  - views_grading.py       — Professor grading (pre-existing split)
  - views_exam.py          — Exam permits (pre-existing split)
  - views_finalization.py  — Grade finalization (pre-existing split)
  - views_student_grades.py — Student grade views (pre-existing split)
  - views_documents.py     — Document releases (pre-existing split)
  - views_head.py          — Head approval views (pre-existing split)
"""

from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiParameter
from django.db import transaction
from django.utils import timezone

from apps.core.permissions import IsDepartmentHead, IsRegistrar, IsAdmin
from apps.enrollment.models import Enrollment, SubjectEnrollment, Semester, GradeResolution
from .serializers import GradeResolutionSerializer


# ============================================================
# Base Stub Views (used as aliases/placeholders throughout)
# ============================================================

class SimpleGETView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return Response({"success": True, "data": []})


class SimplePOSTView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        return Response({"success": True, "data": {}}, status=201)


# ============================================================
# Semester ViewSet (imported by academics/urls.py)
# ============================================================

class SemesterViewSet(ModelViewSet):
    """ViewSet for managing semesters."""
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Semester.objects.all().order_by('-start_date')
    
    def get_serializer_class(self):
        from apps.enrollment.serializers import SemesterSerializer, SemesterCreateSerializer
        if self.action == 'create':
            return SemesterCreateSerializer
        return SemesterSerializer

    def perform_create(self, serializer):
        semester = serializer.save()
        from apps.audit.models import AuditLog
        AuditLog.log(
            action=AuditLog.Action.SEMESTER_CREATED,
            target_model='Semester',
            target_id=semester.id,
            payload={'name': semester.name, 'academic_year': semester.academic_year}
        )

    def perform_update(self, serializer):
        semester = serializer.save()
        from apps.audit.models import AuditLog
        AuditLog.log(
            action=AuditLog.Action.SEMESTER_UPDATED,
            target_model='Semester',
            target_id=semester.id,
            payload={'name': semester.name, 'changes': serializer.validated_data}
        )

    @action(detail=False, methods=['get'])
    def active(self, request):
        """
        Get the currently active semester.
        """
        semester = Semester.objects.filter(is_current=True).first()
        if not semester:
            return Response({'error': 'No active semester found'}, status=404)
        
        from apps.enrollment.serializers import SemesterSerializer
        return Response(SemesterSerializer(semester).data)

    @extend_schema(request=None, responses={200: None})
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """
        Activate a term (set is_current=True).
        Strict Rule: Cannot activate a new term unless the current active term is fully ended (GRADING_CLOSED or ARCHIVED).
        """
        target_semester = self.get_object()
        
        current_active = Semester.objects.filter(is_current=True).exclude(pk=target_semester.pk).first()
        
        if current_active:
            if current_active.status not in [Semester.TermStatus.GRADING_CLOSED, Semester.TermStatus.ARCHIVED]:
                return Response(
                    {
                        'detail': f'Current active term "{current_active.name}" must be closed (Grading Closed or Archived)'
                                  f' before activating a new term. Current status: {current_active.get_status_display()}'
                    }, 
                    status=400
                )
            
            current_active.is_current = False
            current_active.save()

        target_semester.is_current = True
        target_semester.status = Semester.TermStatus.ENROLLMENT_OPEN
        target_semester.save()
        
        from apps.audit.models import AuditLog
        AuditLog.log(
            action=AuditLog.Action.SEMESTER_SET_CURRENT,
            target_model='Semester',
            target_id=target_semester.id,
            payload={'name': target_semester.name}
        )
        
        return Response({'success': True, 'message': f'Term "{target_semester.name}" is now active and open for enrollment.'})


# ============================================================
# Re-exports — Backward compatibility for urls.py and other importers
# All views are accessed via `from . import views` → `views.ClassName`
# ============================================================

# --- Public views ---
from .views_public import (
    PublicProgramListView,
    EnrollmentStatusView,
    CheckEmailAvailabilityView,
    CheckStudentIdAvailabilityView,
    CheckNameAvailabilityView,
    OnlineEnrollmentView,
)

# --- Applicant views ---
from .views_applicants import (
    ApplicantListView,
    TransfereeCreateView,
    TransfereeCreditView,
    NextStudentNumberView,
    ApplicantUpdateView,
)

# --- Subject enrollment views ---
from .views_enrollment import (
    EnrollmentDetailView,
    RecommendedSubjectsView,
    AvailableSubjectsView,
    MySubjectEnrollmentsView,
    StudentCurriculumView,
    MyScheduleView,
    EnrollSubjectView,
    BulkEnrollSubjectView,
    RegistrarOverrideEnrollmentView,
)

# --- Payment views ---
from .views_payments import (
    PaymentRecordView,
    PaymentAdjustmentView,
    PaymentTransactionListView,
    StudentPaymentHistoryView,
    CashierStudentSearchView,
    CashierPendingPaymentsView,
    CashierTodayTransactionsView,
    MyPaymentsView,
)

# --- Report and resolution views ---
from .views_reports import (
    HeadReportView,
    SubmitGradeView,
    UpdateAcademicStandingView,
    GradeResolutionViewSet,
)

# --- Pre-existing split modules (re-exported here for urls.py compatibility) ---
from .views_grading import (
    ProfessorGradeableStudentsView,
    ProfessorAssignedSectionsView,
    ProfessorSubmitGradeView,
    BulkGradeSubmissionView,
    GradeHistoryView,
)

from .views_exam import (
    ExamMonthMappingView,
    ExamMonthMappingDetailView,
    MyExamPermitsView,
    GenerateExamPermitView,
    PrintExamPermitView,
    ExamPermitListView,
)

from .views_finalization import (
    SectionFinalizationListView,
    FinalizeSectionGradesView,
    OverrideGradeView,
)

from .views_student_grades import (
    MyGradesView,
    MyTranscriptView,
    INCReportView,
    ProcessExpiredINCsView,
)

from .views_documents import (
    CreateDocumentReleaseView,
    MyReleasesView,
    StudentDocumentsView,
    DocumentDetailView,
    DownloadDocumentPDFView,
    RevokeDocumentView,
    ReissueDocumentView,
    AllReleasesView,
    DocumentReleaseStatsView,
)

from .views_head import (
    HeadPendingEnrollmentsView,
    HeadApproveEnrollmentView,
    HeadRejectEnrollmentView,
    HeadBulkApproveView,
)

# ============================================================
# Stub aliases — Simple views used as placeholders
# ============================================================
DocumentUploadView = SimplePOSTView
DocumentVerifyView = SimplePOSTView
DropSubjectView = SimplePOSTView
EditSubjectEnrollmentView = SimplePOSTView
ProfessorSectionsView = SimpleGETView
SectionStudentsView = SimpleGETView
StudentEnrollmentStatusView = SimpleGETView
GenerateCORView = SimplePOSTView

# Legacy alias
GradeHistoryViewLegacy = GradeHistoryView
