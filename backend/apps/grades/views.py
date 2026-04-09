"""
Richwell Portal — Grades & Advising Views

This module manages student academic performance via class rosters, 
grade submissions, and INC resolution workflows. It also handles 
the advising and crediting process for new and irregular students.
"""

from rest_framework import viewsets, status, permissions, exceptions as drf_exceptions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core import exceptions as django_exceptions
from rest_framework.exceptions import ValidationError as DRFValidationError
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count, Q, F, Exists, OuterRef
import django_filters

from apps.auditing.mixins import AuditMixin

from core.permissions import (
    IsStudent, IsProgramHead, IsRegistrar, IsAdmin, IsProfessor, IsProgramHeadOfStudent
)
from apps.grades.models import Grade
from apps.grades.serializers import GradeSerializer, AdvisingSubmitSerializer
from apps.students.serializers import StudentEnrollmentSerializer
from apps.grades.services.advising_service import AdvisingService
from apps.grades.services.grading_service import GradingService
from apps.grades.services.resolution_service import ResolutionService
from apps.students.models import Student, StudentEnrollment
from apps.terms.models import Term
from apps.academics.models import Subject

class GradeFilter(django_filters.FilterSet):
    """
    Filter set for Grade records.
    """
    grade_status__in = django_filters.BaseInFilter(field_name='grade_status', lookup_expr='in')
    resolution_status__in = django_filters.BaseInFilter(field_name='resolution_status', lookup_expr='in')
    
    class Meta:
        model = Grade
        fields = {
            'student': ['exact'], 
            'is_credited': ['exact'], 
            'term': ['exact'], 
            'advising_status': ['exact'],
            'resolution_status': ['exact']
        }

class AdvisingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing student advising and subject selection.
    Handles auto-advising for regular students and manual selection for irregular ones.
    """
    serializer_class = GradeSerializer
    filterset_class = GradeFilter

    def get_queryset(self):
        """
        Filters the Grade queryset based on the authenticated user's role.
        
        - Students: see only their own grades.
        - Program Heads: see only students in their program.
        - Professors: see students in subjects they are teaching.
        - Admin/Registrar: see all records.
        """
        user = self.request.user
        queryset = Grade.objects.all()
        if user.role == 'STUDENT': return queryset.filter(student__user=user)
        if user.role == 'PROGRAM_HEAD': return queryset.filter(student__program__program_head=user)
        if user.role in ('ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR'): return queryset
        if user.role == 'PROFESSOR':
            from apps.scheduling.models import Schedule
            matching = Schedule.objects.filter(term=OuterRef('term'), section=OuterRef('section'), subject=OuterRef('subject'), professor__user=user)
            return queryset.filter(Exists(matching))
        return queryset.none()

    @action(detail=False, methods=['post'], url_path='auto-advise')
    def auto_advise(self, request):
        """
        Auto-generates advising records for regular students based on their 
        curriculum and current year level/semester.
        
        Returns a list of created/updated Grade objects.
        """
        student = request.user.student_profile
        active_term = Term.objects.filter(is_active=True).first()
        if not active_term: raise drf_exceptions.ValidationError({'detail': 'No active term.'})
        enrollment = StudentEnrollment.objects.filter(student=student, term=active_term).first()
        if not enrollment: raise drf_exceptions.ValidationError({'detail': 'Not enrolled for active term.'})
        
        try:
            grades = AdvisingService.auto_advise_regular(student, active_term)
            return Response(GradeSerializer(grades, many=True).data, status=status.HTTP_201_CREATED)
        except django_exceptions.ValidationError as e:
            # Always return a dictionary with a 'detail' key for consistent frontend parsing
            if hasattr(e, 'message_dict'):
                err_data = {k: v[0] if isinstance(v, list) and len(v) == 1 else v for k, v in e.message_dict.items()}
                # Ensure 'detail' exists if not present
                if 'detail' not in err_data and e.messages:
                    err_data['detail'] = e.messages[0]
                raise drf_exceptions.ValidationError(err_data)
            
            # Fallback for non-dict-based validation errors
            raise drf_exceptions.ValidationError({'detail': e.messages[0] if e.messages else "Validation failed."})

    @action(detail=False, methods=['post'], url_path='manual-advise')
    def manual_advise(self, request):
        """
        Manually creates advising records for irregular students based on a 
        provided list of subject IDs.
        
        Returns the list of Grade objects for the enrolled subjects.
        """
        serializer = AdvisingSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        student, active_term = request.user.student_profile, Term.objects.filter(is_active=True).first()
        if not active_term: raise drf_exceptions.ValidationError({'detail': 'No active term.'})
        
        try:
            grades = AdvisingService.manual_advise_irregular(student, active_term, serializer.validated_data['subject_ids'])
            return Response(GradeSerializer(grades, many=True).data, status=status.HTTP_201_CREATED)
        except django_exceptions.ValidationError as e:
            raise drf_exceptions.ValidationError(e.message_dict if hasattr(e, 'message_dict') else e.messages)

class AdvisingApprovalViewSet(AuditMixin, viewsets.ModelViewSet):
    """
    ViewSet for administrative approval of student advising.
    Allows Program Heads and Registrars to review and finalize subject selections.
    """
    queryset = StudentEnrollment.objects.all()
    serializer_class = StudentEnrollmentSerializer
    permission_classes = [IsAdmin | IsRegistrar | IsProgramHeadOfStudent]

    def get_queryset(self):
        """
        Filters pending advising requests. Visibility (list) is limited to 
        the program head's program, but other IDs are accessible for 403 checks.
        """
        user = self.request.user
        queryset = StudentEnrollment.objects.filter(advising_status='PENDING')
        
        # Limit visibility in the list view
        if user.role == 'PROGRAM_HEAD' and self.action == 'list':
            return queryset.filter(student__program__program_head=user)
            
        return queryset

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        Finalizes a student's advising, transitioning them to officially enrolled in their subjects.
        """
        enrollment = self.get_object()
        try:
            AdvisingService.approve_advising(enrollment, request.user)
            
            # Log the approval action
            self.audit_action(
                request,
                action="ADVISING_APPROVE",
                resource=f"StudentEnrollment:{enrollment.id}",
                description=f"Approved highlighting advising for student {enrollment.student.idn}",
                metadata={
                    "student_id": enrollment.student.id,
                    "student_idn": enrollment.student.idn,
                    "term": enrollment.term.code
                }
            )
            
            return Response({"status": "Advising approved and student enrolled."})
        except django_exceptions.ValidationError as e:
            raise drf_exceptions.ValidationError(e.message_dict if hasattr(e, 'message_dict') else e.messages)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Rejects a student's advising request with a mandatory reason.
        """
        reason = request.data.get('reason')
        if not reason:
            raise drf_exceptions.ValidationError({"reason": "A reason for rejection is required."})
            
        enrollment = self.get_object()
        AdvisingService.reject_advising(enrollment, reason)
        
        # Log the rejection
        self.audit_action(
            request,
            action="ADVISING_REJECT",
            resource=f"StudentEnrollment:{enrollment.id}",
            description=f"Rejected advising for student {enrollment.student.idn}",
            metadata={
                "student_id": enrollment.student.id,
                "reason": reason
            }
        )
        
        return Response({"status": "Advising rejected."})
    @action(detail=True, methods=['post'], url_path='override-max-units', permission_classes=[IsAdmin | IsRegistrar])
    def override_max_units(self, request, pk=None):
        """
        Allows Registrar/Admin to override the maximum unit limit for a student.
        """
        enrollment = self.get_object()
        new_limit = request.data.get('max_units_override')
        
        if not new_limit:
            raise drf_exceptions.ValidationError({"max_units_override": "New limit is required."})
            
        try:
            new_limit = int(new_limit)
            if new_limit < 1 or new_limit > 36:
                raise ValueError()
        except ValueError:
            raise drf_exceptions.ValidationError({"max_units_override": "Limit must be a number between 1 and 36."})
            
        enrollment.max_units_override = new_limit
        enrollment.save()
        
        # Log the override action
        self.audit_action(
            request,
            action="UNIT_LIMIT_OVERRIDE",
            resource=f"StudentEnrollment:{enrollment.id}",
            description=f"Overrode max units for student {enrollment.student.idn} to {new_limit}",
            metadata={
                "student_id": enrollment.student.id,
                "student_idn": enrollment.student.idn,
                "new_limit": new_limit,
                "term": enrollment.term.code
            }
        )
        
        return Response({
            "status": f"Max units updated to {new_limit}.",
            "max_units_override": enrollment.max_units_override
        })

    @action(detail=False, methods=['post'], url_path='batch_approve_regular')
    def batch_approve_regular(self, request):
        """
        Approves all regular students with PENDING advising status in the 
        active term for the user's program.
        """
        user = self.request.user
        queryset = StudentEnrollment.objects.filter(
            advising_status='PENDING',
            is_regular=True
        )
        
        # Limit by program head jurisdiction
        if user.role == 'PROGRAM_HEAD':
            queryset = queryset.filter(student__program__program_head=user)
        
        count = queryset.count()
        if count == 0:
            return Response({"error": "No pending regular students found."}, status=status.HTTP_400_BAD_REQUEST)
            
        processed_count = 0
        errors = []
        for enrollment in queryset:
            try:
                AdvisingService.approve_advising(enrollment, user)
                processed_count += 1
            except Exception as e:
                errors.append(f"{enrollment.student.idn}: {str(e)}")
        
        # Log the batch approval action
        self.audit_action(
            request,
            action="BATCH_ADVISING_APPROVE",
            resource="StudentEnrollment:Batch",
            description=f"Batch approved {processed_count} regular students",
            metadata={
                "count": processed_count,
                "errors": errors,
                "role": user.role
            }
        )
        
        return Response({
            "status": f"Successfully approved {processed_count} regular students.",
            "processed_count": processed_count,
            "errors": errors
        })


from apps.grades.models import CreditingRequest
from apps.grades.serializers import CreditingRequestSerializer, BulkCreditingSubmitSerializer

class CreditingRequestViewSet(AuditMixin, viewsets.ModelViewSet):
    """
    Manages the lifecycle of bulk crediting requests.
    - Registrar: Create, List, Retrieve
    - Program Head: List, Retrieve, Approve, Reject
    """
    queryset = CreditingRequest.objects.all().select_related(
        'student', 'term', 'requested_by', 'reviewed_by'
    ).prefetch_related('items__subject')
    serializer_class = CreditingRequestSerializer
    # NOTE: IsProgramHeadOfStudent is intentionally NOT here, only on approve/reject actions.
    # Keeping it at class level would block Registrars from list/retrieve operations.
    permission_classes = [IsRegistrar | IsProgramHead | IsAdmin]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
            
        student_id = self.request.query_params.get('student_id')
        if student_id:
            qs = qs.filter(student_id=student_id)
            
        if user.role == 'PROGRAM_HEAD':
            # Head sees only requests for their program
            return qs.filter(student__program__program_head=user)
        return qs

    @action(detail=False, methods=['post'], permission_classes=[IsRegistrar | IsAdmin])
    def submit_bulk(self, request):
        serializer = BulkCreditingSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        student_id = request.data.get('student_id')
        term_id = serializer.validated_data.get('term_id')
        items = serializer.validated_data['items']
        
        student = Student.objects.get(id=student_id)
        if term_id:
            term = Term.objects.get(id=term_id)
        else:
            term = Term.objects.get(is_active=True)
        
        try:
            crediting_request = AdvisingService.submit_bulk_crediting_request(
                student=student, 
                term=term, 
                user=request.user, 
                items_data=items
            )
            return Response(CreditingRequestSerializer(crediting_request).data, status=status.HTTP_201_CREATED)
        except django_exceptions.ValidationError as e:
            raise drf_exceptions.ValidationError(e.message_dict if hasattr(e, 'message_dict') else e.messages)

    @action(detail=True, methods=['post'], permission_classes=[IsProgramHeadOfStudent])
    def approve(self, request, pk=None):
        comment = request.data.get('comment', "")
        try:
            crediting_request = AdvisingService.approve_crediting_request(
                request_id=pk, 
                user=request.user, 
                comment=comment
            )
            
            # Log the approval
            self.audit_action(
                request,
                action="CREDITING_APPROVE",
                resource=f"CreditingRequest:{crediting_request.id}",
                description=f"Approved subject crediting for student {crediting_request.student.idn}",
                metadata={
                    "student_id": crediting_request.student.id,
                    "comment": comment
                }
            )
            
            return Response(CreditingRequestSerializer(crediting_request).data)
        except django_exceptions.ValidationError as e:
            raise drf_exceptions.ValidationError(e.message_dict if hasattr(e, 'message_dict') else e.messages)

    @action(detail=True, methods=['post'], permission_classes=[IsProgramHeadOfStudent])
    def reject(self, request, pk=None):
        reason = request.data.get('reason')
        if not reason:
            raise drf_exceptions.ValidationError({"reason": "A reason for rejection is required."})
        try:
            crediting_request = AdvisingService.reject_crediting_request(
                request_id=pk, 
                user=request.user, 
                reason=reason
            )
            
            # Log the rejection
            self.audit_action(
                request,
                action="CREDITING_REJECT",
                resource=f"CreditingRequest:{crediting_request.id}",
                description=f"Rejected subject crediting for student {crediting_request.student.idn}",
                metadata={
                    "student_id": crediting_request.student.id,
                    "reason": reason
                }
            )
            
            return Response(CreditingRequestSerializer(crediting_request).data)
        except django_exceptions.ValidationError as e:
            raise drf_exceptions.ValidationError(e.message_dict if hasattr(e, 'message_dict') else e.messages)


class SubjectCreditingViewSet(viewsets.ViewSet):
    """
    Helper ViewSet for Registrar to credit subjects manually.
    Handles crediting of external subjects and historical encoding for TOR.
    """
    permission_classes = [IsRegistrar | IsAdmin]

    @action(detail=False, methods=['post'])
    def credit(self, request):
        """
        Manually credits a single subject for a student.
        Used for crediting subjects from external institutions or historical TOR.
        """
        student, subject = Student.objects.get(pk=request.data.get('student_id')), Subject.objects.get(pk=request.data.get('subject_id'))
        active_term = Term.objects.get(is_active=True)
        grade = AdvisingService.credit_subject(student, subject, active_term, request.user, request.data.get('final_grade'))
        return Response(GradeSerializer(grade).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='bulk-historical-encode')
    def bulk_historical_encode(self, request):
        """
        Encodes multiple historical subjects for a student in one operation.
        Expects a list of subject data in 'credit_data'.
        """
        student, active_term = Student.objects.get(pk=request.data.get('student_id')), Term.objects.get(is_active=True)
        AdvisingService.bulk_historical_encoding(student, active_term, request.data.get('credit_data', []), request.user)
        return Response({"message": "Encoded successfully"}, status=status.HTTP_201_CREATED)

class GradeSubmissionViewSet(viewsets.ViewSet):
    """
    ViewSet for Professor grade submissions.
    Handles midterm/final grade submission and section-wide finalization.
    """
    permission_classes = [IsProfessor | IsRegistrar | IsAdmin]
    service = GradingService()

    @action(detail=True, methods=['post'], url_path='submit-midterm')
    def submit_midterm(self, request, pk=None):
        """
        Processes the submission of a midterm grade for a specific record.
        Support flags for marking as an INC (Incomplete) initially.
        """
        updated = self.service.submit_midterm(pk, request.data.get('value'), request.user, is_inc=request.data.get('is_inc', False))
        return Response(GradeSerializer(updated).data)

    @action(detail=True, methods=['post'], url_path='submit-final')
    def submit_final(self, request, pk=None):
        """
        Processes the final grade submission. Validates against the midterm 
        submission state if business rules require it.
        """
        updated = self.service.submit_final(pk, request.data.get('value'), request.user)
        return Response(GradeSerializer(updated).data)

    @action(detail=False, methods=['get'])
    def roster(self, request):
        """
        Returns the class roster for a specific section and subject.
        Used by professors to see a list of students ready for grading.
        Supports search and pagination.
        """
        section_id = request.query_params.get('section_id')
        subject_id = request.query_params.get('subject_id')
        search_term = request.query_params.get('search')

        queryset = Grade.objects.filter(
            section_id=section_id, 
            subject_id=subject_id
        ).select_related('student__user').order_by('student__user__last_name')

        if search_term:
            queryset = queryset.filter(
                Q(student__user__first_name__icontains=search_term) |
                Q(student__user__last_name__icontains=search_term) |
                Q(student__idn__icontains=search_term)
            )

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = GradeSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = GradeSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='finalize-section')
    def finalize_section(self, request):
        """
        Finalizes all grades for a specific class section.
        Locks the record from further professor modification.
        """
        from apps.sections.models import Section
        term, subject, section = Term.objects.get(pk=request.data.get('term_id')), Subject.objects.get(pk=request.data.get('subject_id')), Section.objects.get(pk=request.data.get('section_id'))
        self.service.finalize_section_grades(term, subject, section, request.user)
        return Response({"status": "Finalized"})

class ResolutionViewSet(viewsets.GenericViewSet):
    """
    Workflow ViewSet for resolving INC (Incomplete) grades.
    Handles a multi-step workflow from request to final Registrar finalization.
    """
    queryset = Grade.objects.all()
    serializer_class = GradeSerializer
    permission_classes = [IsProfessor | IsRegistrar | IsProgramHead | IsAdmin]
    service = ResolutionService()

    @action(detail=True, methods=['post'], url_path='request-resolution')
    def request_resolution(self, request, pk=None):
        """
        Initiates a resolution request for an INC grade.
        Typically called by a Professor or Registrar.
        """
        obj = self.get_object()
        return Response(GradeSerializer(self.service.request_resolution(obj.id, request.user, request.data.get('reason'))).data)

    @action(detail=True, methods=['post'], url_path='registrar-approve')
    def registrar_approve(self, request, pk=None):
        """
        Approves the resolution request from the Registrar's side.
        Allows the professor to then submit a replacement grade.
        """
        obj = self.get_object()
        return Response(GradeSerializer(self.service.registrar_approve_request(obj.id, request.user)).data)

    @action(detail=True, methods=['post'], url_path='registrar-reject')
    def registrar_reject(self, request, pk=None):
        """
        Rejects the resolution request from the Registrar's side.
        Reverts the grade status to INC.
        """
        reason = request.data.get('reason')
        if not reason:
            raise DRFValidationError({"reason": "A reason for rejection is required."})
        obj = self.get_object()
        return Response(GradeSerializer(self.service.registrar_reject_request(obj.id, request.user, reason)).data)

    @action(detail=True, methods=['post'], url_path='submit-grade')
    def submit_grade(self, request, pk=None):
        """
        Allows the professor to submit the alternative grade for the INC resolution.
        """
        obj = self.get_object()
        return Response(GradeSerializer(self.service.submit_resolved_grade(obj.id, request.user, request.data.get('new_grade'))).data)

    @action(detail=True, methods=['post'], url_path='head-approve', permission_classes=[IsProgramHeadOfStudent | IsAdmin])
    def head_approve(self, request, pk=None):
        """
        Approves the resolution from the Program Head's side.
        Moves the status to HEAD_APPROVED, making it visible to the Registrar.
        """
        obj = self.get_object()
        return Response(GradeSerializer(self.service.head_approve_resolution(obj.id, request.user)).data)

    @action(detail=True, methods=['post'], url_path='head-reject', permission_classes=[IsProgramHeadOfStudent | IsAdmin])
    def head_reject(self, request, pk=None):
        """
        Rejects the resolution from the Program Head's side.
        Professors must re-submit the grade.
        """
        reason = request.data.get('reason')
        if not reason:
            raise DRFValidationError({"reason": "A reason for rejection is required."})
        obj = self.get_object()
        return Response(GradeSerializer(self.service.head_reject_resolution(obj.id, request.user, reason)).data)

    @action(detail=True, methods=['post'], url_path='registrar-finalize')
    def registrar_finalize(self, request, pk=None):
        """
        Final step in the resolution workflow.
        The Registrar confirms the new grade and officially updates the record.
        """
        obj = self.get_object()
        return Response(GradeSerializer(self.service.registrar_finalize_resolution(obj.id, request.user)).data)
