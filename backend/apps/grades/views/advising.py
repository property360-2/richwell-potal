"""
Richwell Portal — Advising ViewSets

This module manages student academic advising, including auto-advising 
for regular students and manual subject selection for irregular ones. 
It also handles the administrative approval workflow.
"""

from rest_framework import viewsets, status, exceptions as drf_exceptions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core import exceptions as django_exceptions
from django.db.models import OuterRef, Exists

from core.utils import map_django_error
from apps.auditing.mixins import AuditMixin
from core.permissions import IsRegistrar, IsAdmin, IsProgramHeadOfStudent
from apps.grades.models import Grade
from apps.grades.serializers import GradeSerializer, AdvisingSubmitSerializer
from apps.students.serializers import StudentEnrollmentSerializer
from apps.grades.services.advising_service import AdvisingService
from apps.students.models import StudentEnrollment
from apps.terms.models import Term
from apps.grades.filters import GradeFilter

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
        """
        user = self.request.user
        queryset = Grade.objects.all()
        if user.role == 'STUDENT': return queryset.filter(student__user=user)
        if user.role == 'PROGRAM_HEAD': return queryset.filter(student__program__program_head=user)
        if user.role in ('ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR'): return queryset
        if user.role == 'PROFESSOR':
            from apps.scheduling.models import Schedule
            matching = Schedule.objects.filter(
                term=OuterRef('term'), 
                section=OuterRef('section'), 
                subject=OuterRef('subject'), 
                professor__user=user
            )
            return queryset.filter(Exists(matching))
        return queryset.none()

    @action(detail=False, methods=['post'], url_path='auto-advise')
    def auto_advise(self, request):
        """
        Auto-generates advising records for regular students based on their 
        curriculum and current year level/semester.
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
            raise map_django_error(e)

    @action(detail=False, methods=['post'], url_path='manual-advise')
    def manual_advise(self, request):
        """
        Manually creates advising records for irregular students based on a provided list of subject IDs.
        """
        serializer = AdvisingSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        student, active_term = request.user.student_profile, Term.objects.filter(is_active=True).first()
        if not active_term: raise drf_exceptions.ValidationError({'detail': 'No active term.'})
        
        try:
            grades = AdvisingService.manual_advise_irregular(student, active_term, serializer.validated_data['subject_ids'])
            return Response(GradeSerializer(grades, many=True).data, status=status.HTTP_201_CREATED)
        except django_exceptions.ValidationError as e:
            raise map_django_error(e)

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
        Filters pending advising requests.
        """
        user = self.request.user
        queryset = StudentEnrollment.objects.filter(advising_status='PENDING')
        if user.role == 'PROGRAM_HEAD' and self.action == 'list':
            return queryset.filter(student__program__program_head=user)
        return queryset

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        Finalizes a student's advising, transitioning them to officially enrolled.
        """
        enrollment = self.get_object()
        try:
            AdvisingService.approve_advising(enrollment, request.user)
            self.audit_action(
                request,
                action="ADVISING_APPROVE",
                resource=f"StudentEnrollment:{enrollment.id}",
                description=f"Approved advising for student {enrollment.student.idn}",
                metadata={
                    "student_id": enrollment.student.id,
                    "student_idn": enrollment.student.idn,
                    "term": enrollment.term.code
                }
            )
            return Response({"status": "Advising approved and student enrolled."})
        except django_exceptions.ValidationError as e:
            raise map_django_error(e)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Rejects a student's advising request with a mandatory reason.
        """
        reason = request.data.get('reason')
        if not reason: raise drf_exceptions.ValidationError({"reason": "A reason for rejection is required."})
            
        enrollment = self.get_object()
        AdvisingService.reject_advising(enrollment, reason)
        self.audit_action(
            request,
            action="ADVISING_REJECT",
            resource=f"StudentEnrollment:{enrollment.id}",
            description=f"Rejected advising for student {enrollment.student.idn}",
            metadata={"student_id": enrollment.student.id, "reason": reason}
        )
        return Response({"status": "Advising rejected."})

    @action(detail=True, methods=['post'], url_path='override-max-units', permission_classes=[IsAdmin | IsRegistrar])
    def override_max_units(self, request, pk=None):
        """
        Allows Registrar/Admin to override the maximum unit limit for a student.
        """
        enrollment = self.get_object()
        new_limit = request.data.get('max_units_override')
        if not new_limit: raise drf_exceptions.ValidationError({"max_units_override": "New limit is required."})
            
        try:
            new_limit = int(new_limit)
            if new_limit < 1 or new_limit > 36: raise ValueError()
        except ValueError:
            raise drf_exceptions.ValidationError({"max_units_override": "Limit must be a number between 1 and 36."})
            
        enrollment.max_units_override = new_limit
        enrollment.save()
        
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
        Approves all regular students with PENDING advising status in the user's program.
        """
        user = self.request.user
        queryset = StudentEnrollment.objects.filter(advising_status='PENDING', is_regular=True)
        if user.role == 'PROGRAM_HEAD':
            queryset = queryset.filter(student__program__program_head=user)
        
        count = queryset.count()
        if count == 0:
            return Response({"error": "No pending regular students found."}, status=status.HTTP_400_BAD_REQUEST)
            
        processed_count, errors = 0, []
        for enrollment in queryset:
            try:
                AdvisingService.approve_advising(enrollment, user)
                processed_count += 1
            except Exception as e:
                errors.append(f"{enrollment.student.idn}: {str(e)}")
        
        self.audit_action(
            request,
            action="BATCH_ADVISING_APPROVE",
            resource="StudentEnrollment:Batch",
            description=f"Batch approved {processed_count} regular students",
            metadata={"count": processed_count, "errors": errors, "role": user.role}
        )
        return Response({
            "status": f"Successfully approved {processed_count} regular students.",
            "processed_count": processed_count,
            "errors": errors
        })
