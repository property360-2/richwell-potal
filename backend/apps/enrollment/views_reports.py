"""
Report, grading, and resolution views — administrative and academic endpoints.
Handles department head reports, grade submission, academic standing, and grade resolutions.
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
from .models import Enrollment, SubjectEnrollment, Semester, GradeResolution, GradeHistory
from .serializers import GradeResolutionSerializer


class GradingDeadlineStatusView(APIView):
    """
    Returns the current grading window status for the active semester.
    Professors can use this to check their deadline.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        semester = Semester.objects.filter(is_current=True).first()
        if not semester:
            return Response({'error': 'No active semester'}, status=status.HTTP_404_NOT_FOUND)

        today = timezone.now().date()
        is_open = semester.is_grading_open
        days_remaining = None

        if semester.grading_end_date:
            delta = (semester.grading_end_date - today).days
            days_remaining = max(delta, 0)

        data = {
            'semester': str(semester),
            'semester_id': str(semester.id),
            'grading_start_date': semester.grading_start_date.isoformat() if semester.grading_start_date else None,
            'grading_end_date': semester.grading_end_date.isoformat() if semester.grading_end_date else None,
            'is_grading_open': is_open,
            'days_remaining': days_remaining,
            'status': semester.status,
        }

        # If professor, show their ungraded count
        user = request.user
        if user.role == 'PROFESSOR':
            from django.db.models import Q
            ungraded_count = SubjectEnrollment.objects.filter(
                Q(section__section_subjects__professor=user) |
                Q(section__section_subjects__professor_assignments__professor=user),
                enrollment__semester=semester,
                status='ENROLLED',
                grade__isnull=True,
                is_deleted=False,
            ).distinct().count()
            data['ungraded_count'] = ungraded_count

        return Response(data)


class HeadReportView(APIView):
    """
    Generate reports for department heads.
    Supports enrollment lists and grade summaries.
    """
    permission_classes = [IsAuthenticated, IsDepartmentHead | IsRegistrar | IsAdmin]

    @extend_schema(
        summary="Generate Report",
        description="Generate enrollment or grade reports with filters",
        tags=["Reports"],
        parameters=[
            OpenApiParameter('type', str, description='Report type: enrollment, grades', required=True),
            OpenApiParameter('semester', str, description='Semester ID'),
            OpenApiParameter('program', str, description='Program ID'),
            OpenApiParameter('date_from', str, description='Start date (YYYY-MM-DD)'),
            OpenApiParameter('date_to', str, description='End date (YYYY-MM-DD)'),
        ]
    )
    def get(self, request):
        report_type = request.query_params.get('type')
        semester_id = request.query_params.get('semester')
        program_id = request.query_params.get('program')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        if not report_type:
            return Response({"error": "Report type is required"}, status=400)

        queryset = Enrollment.objects.select_related(
            'student', 'student__student_profile', 'semester', 'student__student_profile__program'
        ).filter(status__in=[Enrollment.Status.ACTIVE, Enrollment.Status.COMPLETED])

        if semester_id:
            queryset = queryset.filter(semester_id=semester_id)
        if program_id:
            queryset = queryset.filter(student__student_profile__program_id=program_id)
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)

        data = []
        
        if report_type == 'enrollment':
            enrollments = queryset.prefetch_related('subject_enrollments')
            
            for enrollment in enrollments:
                profile = enrollment.student.student_profile
                total_units = sum(
                    se.subject.units for se in enrollment.subject_enrollments.all()
                    if se.status == SubjectEnrollment.Status.ENROLLED
                )
                
                data.append({
                    'student_number': enrollment.student.student_number,
                    'student_name': enrollment.student.get_full_name(),
                    'program_code': profile.program.code if profile and profile.program else 'N/A',
                    'year_level': profile.year_level if profile else 'N/A',
                    'status': enrollment.get_status_display(),
                    'total_units': total_units,
                    'date_enrolled': enrollment.created_at.date()
                })

        elif report_type == 'grades':
            subject_enrollments = SubjectEnrollment.objects.filter(
                enrollment__in=queryset
            ).select_related('subject', 'enrollment__student')
            
            for se in subject_enrollments:
                data.append({
                    'student_number': se.enrollment.student.student_number,
                    'student_name': se.enrollment.student.get_full_name(),
                    'subject_code': se.subject.code,
                    'subject_title': se.subject.title,
                    'grade': str(se.grade) if se.grade else 'N/A',
                    'status': se.get_status_display(),
                    'units': se.subject.units
                })

        else:
            return Response({"error": "Invalid report type"}, status=400)

        return Response({
            "success": True,
            "type": report_type,
            "count": len(data),
            "results": data
        })


class SubmitGradeView(APIView):
    """
    Submit grades for a specific student in a subject.
    Enforces grading window.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        from decimal import Decimal
        
        semester = Semester.objects.filter(is_current=True).first()
        if not semester:
            return Response({"error": "No active semester"}, status=400)
            
        if not semester.is_grading_open:
            return Response({"error": "Grading window is closed"}, status=400)
            
        enrollment_id = request.data.get('enrollment_id')
        grade_value = request.data.get('grade')
        
        if not enrollment_id or grade_value is None:
            return Response({"error": "Enrollment ID and Grade are required"}, status=400)
            
        try:
            se = SubjectEnrollment.objects.get(id=enrollment_id)
        except SubjectEnrollment.DoesNotExist:
            return Response({"error": "Subject enrollment not found"}, status=404)
            
        if se.is_finalized:
            return Response({"error": "Grade is already finalized"}, status=400)
            
        allowed_grades = ['1.00', '1.25', '1.50', '1.75', '2.00', '2.25', '2.50', '2.75', '3.00', '5.00', 'INC', 'DRP']
        if str(grade_value) not in allowed_grades and str(float(grade_value)) not in allowed_grades:
             pass
        
        old_grade = se.grade
        old_status = se.status
        
        se.grade = Decimal(grade_value) if hasattr(grade_value, 'isdigit') or isinstance(grade_value, (int, float)) else None
        
        new_status = 'ENROLLED'
        if str(grade_value) == 'INC':
            new_status = 'INC'
        elif str(grade_value) == 'DRP':
            new_status = 'DROPPED'
        elif str(grade_value) == '5.00' or (se.grade and se.grade == 5.0):
             new_status = 'FAILED'
        elif se.grade and se.grade <= 3.0:
             new_status = 'PASSED'
             
        se.status = new_status
        se.save()
        
        GradeHistory.objects.create(
            subject_enrollment=se,
            previous_grade=old_grade,
            new_grade=se.grade,
            previous_status=old_status,
            new_status=new_status,
            changed_by=request.user,
            change_reason="Grade submission"
        )
        
        return Response({"success": True, "message": "Grade submitted"})


class UpdateAcademicStandingView(APIView):
    """
    Update a student's academic standing.
    POST: Set the academic standing (e.g., Good Standing, Dean's List, Probation).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, student_id, *args, **kwargs):
        from apps.accounts.models import StudentProfile

        user = request.user
        if user.role not in ['REGISTRAR', 'HEAD_REGISTRAR', 'ADMIN']:
            return Response({"error": "Permission denied"}, status=403)

        try:
            profile = StudentProfile.objects.select_related('user').get(user__id=student_id)
        except StudentProfile.DoesNotExist:
            return Response({"error": "Student not found"}, status=404)

        standing = request.data.get('academic_standing', '').strip()
        if not standing:
            return Response({"error": "academic_standing is required"}, status=400)
        if len(standing) > 100:
            return Response({"error": "academic_standing must be 100 characters or less"}, status=400)

        profile.academic_standing = standing
        profile.save(update_fields=['academic_standing'])

        from apps.audit.models import AuditLog
        AuditLog.log(
            action=AuditLog.Action.USER_UPDATED,
            target_model='StudentProfile',
            target_id=profile.id,
            payload={'action': 'update_standing', 'standing': standing, 'student': profile.user.get_full_name()}
        )

        return Response({
            "message": "Academic standing updated successfully",
            "academic_standing": profile.academic_standing,
            "student_name": profile.user.get_full_name()
        })


class GradeResolutionViewSet(ModelViewSet):
    """
    ViewSet for grade resolution requests (Sir Gil's 5-step workflow).
    
    Actions:
      GET    /grade-resolutions/          — list (filtered by role)
      POST   /grade-resolutions/          — create request (professor/dean)
      GET    /grade-resolutions/pending/   — pending for current role
      POST   /grade-resolutions/{id}/registrar_initial_approve/
      POST   /grade-resolutions/{id}/input_grade/
      POST   /grade-resolutions/{id}/head_approve/
      POST   /grade-resolutions/{id}/registrar_final_approve/
      POST   /grade-resolutions/{id}/reject/
      POST   /grade-resolutions/{id}/cancel/
    """
    queryset = GradeResolution.objects.all().select_related(
        'subject_enrollment__enrollment__student',
        'subject_enrollment__subject',
        'requested_by',
        'reviewed_by_registrar',
        'reviewed_by_head',
        'grade_input_by',
    )
    serializer_class = GradeResolutionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        if user.role == 'PROFESSOR':
            from django.db.models import Q
            return self.queryset.filter(
                Q(requested_by=user) |
                Q(subject_enrollment__section__section_subjects__professor=user) |
                Q(subject_enrollment__section__section_subjects__professor_assignments__professor=user)
            ).distinct()
        elif user.role in ['REGISTRAR', 'HEAD_REGISTRAR', 'ADMIN']:
            return self.queryset.all()
        elif user.role == 'DEPARTMENT_HEAD':
            if hasattr(user, 'department_head_profile') and user.department_head_profile.programs.exists():
                return self.queryset.filter(
                    subject_enrollment__subject__program__in=user.department_head_profile.programs.all()
                )
            return self.queryset.all()
        return self.queryset.none()

    def perform_create(self, serializer):
        """Step 1: Professor/Dean creates a resolution request."""
        subject_enrollment = serializer.validated_data['subject_enrollment']
        is_dean = self.request.user.role == 'DEPARTMENT_HEAD'

        resolution = serializer.save(
            requested_by=self.request.user,
            current_grade=subject_enrollment.grade,
            current_status=subject_enrollment.status,
            submitted_by_dean=is_dean,
            status=GradeResolution.Status.PENDING_REGISTRAR_INITIAL
        )

        from apps.audit.models import AuditLog
        AuditLog.log(
            action=AuditLog.Action.GRADE_UPDATED,
            target_model='GradeResolution',
            target_id=resolution.id,
            payload={
                'action': 'requested',
                'student': subject_enrollment.enrollment.student.get_full_name(),
                'subject': subject_enrollment.subject.code,
                'proposed_grade': str(resolution.proposed_grade),
                'submitted_by_dean': is_dean,
            }
        )

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """List resolutions pending for the current user's role."""
        user = request.user
        qs = self.get_queryset()

        if user.role in ['REGISTRAR', 'HEAD_REGISTRAR', 'ADMIN']:
            # Registrar sees Step 1 (initial review) and Step 5 (final sign-off)
            pending = qs.filter(
                status__in=[
                    GradeResolution.Status.PENDING_REGISTRAR_INITIAL,
                    GradeResolution.Status.PENDING_REGISTRAR_FINAL,
                ]
            )
        elif user.role == 'DEPARTMENT_HEAD':
            # Head sees Step 4 (head approval)
            pending = qs.filter(status=GradeResolution.Status.PENDING_HEAD)
        elif user.role == 'PROFESSOR':
            # Professor sees Step 3 (grade input pending)
            pending = qs.filter(status=GradeResolution.Status.GRADE_INPUT_PENDING)
        else:
            pending = qs.none()

        serializer = self.get_serializer(pending, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def registrar_initial_approve(self, request, pk=None):
        """Step 2: Registrar reviews and approves for grade input."""
        resolution = self.get_object()
        user = request.user

        if user.role not in ['REGISTRAR', 'HEAD_REGISTRAR', 'ADMIN']:
            return Response({'error': 'Only registrar can perform initial approval'}, status=status.HTTP_403_FORBIDDEN)

        from .services_grading import GradeResolutionService
        notes = request.data.get('notes', '')
        result = GradeResolutionService.registrar_initial_approve(resolution, user, notes)

        if not result['success']:
            return Response({'detail': result['error']}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)

    @action(detail=True, methods=['post'])
    def input_grade(self, request, pk=None):
        """Step 3: Professor/Dean inputs the actual grade."""
        resolution = self.get_object()
        user = request.user

        if user.role not in ['PROFESSOR', 'DEPARTMENT_HEAD']:
            return Response({'error': 'Only professor or department head can input grade'}, status=status.HTTP_403_FORBIDDEN)

        from .serializers_grading import GradeInputSerializer
        serializer = GradeInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from .services_grading import GradeResolutionService
        result = GradeResolutionService.input_grade(
            resolution,
            user,
            proposed_grade=serializer.validated_data['proposed_grade'],
            proposed_status=serializer.validated_data['proposed_status'],
            comment=serializer.validated_data.get('comment', '')
        )

        if not result['success']:
            return Response({'detail': result['error']}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)

    @action(detail=True, methods=['post'])
    def head_approve(self, request, pk=None):
        """Step 4: Department head reviews and approves."""
        resolution = self.get_object()
        user = request.user

        if user.role != 'DEPARTMENT_HEAD':
            return Response({'error': 'Only department head can approve at this step'}, status=status.HTTP_403_FORBIDDEN)

        from .services_grading import GradeResolutionService
        notes = request.data.get('notes', '')
        result = GradeResolutionService.head_approve(resolution, user, notes)

        if not result['success']:
            return Response({'detail': result['error']}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)

    @action(detail=True, methods=['post'])
    def registrar_final_approve(self, request, pk=None):
        """Step 5: Registrar final sign-off — applies the grade."""
        resolution = self.get_object()
        user = request.user

        if user.role not in ['REGISTRAR', 'HEAD_REGISTRAR', 'ADMIN']:
            return Response({'error': 'Only registrar can perform final approval'}, status=status.HTTP_403_FORBIDDEN)

        from .services_grading import GradeResolutionService
        notes = request.data.get('notes', '')
        result = GradeResolutionService.registrar_final_approve(resolution, user, notes)

        if not result['success']:
            return Response({'detail': result['error']}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a resolution at any active step."""
        resolution = self.get_object()
        reason = request.data.get('reason', '') or request.data.get('notes', '')

        from .services_grading import GradeResolutionService
        result = GradeResolutionService.reject_resolution(resolution, request.user, reason)

        if not result['success']:
            return Response({'detail': result['error']}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a resolution (only by requester)."""
        resolution = self.get_object()

        from .services_grading import GradeResolutionService
        result = GradeResolutionService.cancel_resolution(resolution, request.user)

        if not result['success']:
            return Response({'detail': result['error']}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)

