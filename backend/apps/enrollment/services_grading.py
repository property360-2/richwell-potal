"""
Grading services - Grade submission, resolution workflow, and history logic.
Implements Sir Gil's 5-step grade resolution workflow.
"""

from django.db import transaction
from django.utils import timezone
from apps.enrollment.models import SubjectEnrollment
from apps.enrollment.models_grading import GradeHistory, GradeResolution


class GradingService:
    """Service for grade management operations."""

    @staticmethod
    def submit_grade(subject_enrollment, grade, user, new_status=None, remarks=None):
        """
        Submit a grade for a student.
        Handles:
        1. Regular grade submission (open grading window)
        2. INC Resolution or late submission → creates resolution request
        
        Returns:
            dict with success, is_resolution, and status data
        """
        semester = subject_enrollment.enrollment.semester
        is_inc_resolution = subject_enrollment.status == 'INC'
        is_window_closed = not semester.is_grading_open

        # Check exact date range if set (P4 enforcement)
        is_past_deadline = False
        if semester.grading_start_date and semester.grading_end_date:
            today = timezone.now().date()
            is_past_deadline = today > semester.grading_end_date

        # Professors must go through resolution if INC, window closed, or past deadline
        if (is_inc_resolution or is_window_closed or is_past_deadline) and user.role == 'PROFESSOR':
            return GradingService._create_resolution_request(
                subject_enrollment, grade, new_status, remarks, user
            )

        return GradingService._process_grade_update(
            subject_enrollment, grade, new_status, remarks, user
        )

    @staticmethod
    def _create_resolution_request(subject_enrollment, grade, new_status, remarks, user, submitted_by_dean=False):
        """
        Step 1: Create a grade resolution request.
        Initial status = PENDING_REGISTRAR_INITIAL (Sir Gil's flow).
        """
        # Check for existing active resolution on this enrollment
        active_statuses = [
            GradeResolution.Status.PENDING_REGISTRAR_INITIAL,
            GradeResolution.Status.GRADE_INPUT_PENDING,
            GradeResolution.Status.PENDING_HEAD,
            GradeResolution.Status.PENDING_REGISTRAR_FINAL,
        ]
        existing = GradeResolution.objects.filter(
            subject_enrollment=subject_enrollment,
            status__in=active_statuses
        ).first()

        if existing:
            # Update existing active resolution instead of creating duplicate
            existing.proposed_grade = grade
            existing.proposed_status = new_status or subject_enrollment.status
            existing.reason = remarks or 'INC Resolution'
            existing.save()
            return {
                'success': True,
                'is_resolution': True,
                'subject_enrollment_id': str(subject_enrollment.id),
                'resolution_id': str(existing.id),
                'status': existing.status,
                'message': 'Existing resolution request updated'
            }

        resolution = GradeResolution.objects.create(
            subject_enrollment=subject_enrollment,
            current_grade=subject_enrollment.grade,
            proposed_grade=grade,
            current_status=subject_enrollment.status,
            proposed_status=new_status or subject_enrollment.status,
            reason=remarks or 'INC Resolution',
            requested_by=user,
            submitted_by_dean=submitted_by_dean,
            status=GradeResolution.Status.PENDING_REGISTRAR_INITIAL
        )

        return {
            'success': True,
            'is_resolution': True,
            'subject_enrollment_id': str(subject_enrollment.id),
            'resolution_id': str(resolution.id),
            'status': 'PENDING_REGISTRAR_INITIAL',
            'message': 'Grade resolution request submitted for registrar review'
        }

    @staticmethod
    @transaction.atomic
    def _process_grade_update(subject_enrollment, grade, new_status, remarks, user):
        """Direct grade update (bypasses resolution for registrar or open-window professors)."""
        previous_grade = subject_enrollment.grade
        previous_status = subject_enrollment.status

        subject_enrollment.grade = grade
        if new_status:
            subject_enrollment.status = new_status

        if remarks:
            subject_enrollment.remarks = remarks

        if new_status == 'FAILED' and previous_status != 'FAILED':
            subject_enrollment.failed_at = timezone.now()

        if new_status == 'INC' and previous_status != 'INC':
            subject_enrollment.inc_marked_at = timezone.now()

        subject_enrollment.save()

        from apps.audit.models import AuditLog
        AuditLog.log(
            action=AuditLog.Action.GRADE_SUBMITTED,
            target_model='SubjectEnrollment',
            target_id=subject_enrollment.id,
            payload={
                'student': subject_enrollment.enrollment.student.get_full_name(),
                'subject': subject_enrollment.subject.code,
                'grade': str(grade),
                'status': subject_enrollment.status,
                'submitted_by': user.get_full_name()
            }
        )

        history = GradeHistory.objects.create(
            subject_enrollment=subject_enrollment,
            previous_grade=previous_grade,
            new_grade=grade,
            previous_status=previous_status,
            new_status=new_status or subject_enrollment.status,
            changed_by=user,
            change_reason=remarks,
            is_system_action=False,
            is_finalization=False
        )

        return {
            'success': True,
            'is_resolution': False,
            'subject_enrollment_id': str(subject_enrollment.id),
            'grade': str(grade) if grade else None,
            'status': subject_enrollment.status,
            'grade_history_id': str(history.id),
            'message': 'Grade submitted successfully'
        }


class GradeResolutionService:
    """
    Service for the 5-step grade resolution workflow.
    
    Flow:
    1. Professor/Dean creates request → PENDING_REGISTRAR_INITIAL
    2. Registrar reviews → GRADE_INPUT_PENDING
    3. Professor/Dean inputs grade → PENDING_HEAD
    4. Head approves → PENDING_REGISTRAR_FINAL
    5. Registrar final sign-off → APPROVED (grade applied)
    """

    @staticmethod
    @transaction.atomic
    def registrar_initial_approve(resolution, registrar, notes=''):
        """
        Step 2: Registrar reviews request and approves for grade input.
        Transitions: PENDING_REGISTRAR_INITIAL → GRADE_INPUT_PENDING
        """
        if resolution.status != GradeResolution.Status.PENDING_REGISTRAR_INITIAL:
            return {
                'success': False,
                'error': f'Cannot approve: resolution is in {resolution.get_status_display()} status'
            }

        resolution.status = GradeResolution.Status.GRADE_INPUT_PENDING
        resolution.reviewed_by_registrar = registrar
        resolution.registrar_action_at = timezone.now()
        resolution.registrar_notes = notes
        resolution.save()

        from apps.audit.models import AuditLog
        AuditLog.log(
            action=AuditLog.Action.GRADE_UPDATED,
            target_model='GradeResolution',
            target_id=resolution.id,
            payload={
                'action': 'registrar_initial_approved',
                'registrar': registrar.get_full_name(),
                'student': resolution.subject_enrollment.enrollment.student.get_full_name(),
                'subject': resolution.subject_enrollment.subject.code,
            }
        )

        return {
            'success': True,
            'message': 'Resolution approved — waiting for grade input from professor/dean'
        }

    @staticmethod
    @transaction.atomic
    def input_grade(resolution, user, proposed_grade, proposed_status, comment=''):
        """
        Step 3: Professor/Dean inputs the actual grade.
        Transitions: GRADE_INPUT_PENDING → PENDING_HEAD
        """
        if resolution.status != GradeResolution.Status.GRADE_INPUT_PENDING:
            return {
                'success': False,
                'error': f'Cannot input grade: resolution is in {resolution.get_status_display()} status'
            }

        resolution.proposed_grade = proposed_grade
        resolution.proposed_status = proposed_status
        resolution.grade_input_by = user
        resolution.grade_input_at = timezone.now()
        resolution.grade_input_comment = comment
        resolution.status = GradeResolution.Status.PENDING_HEAD
        resolution.save()

        from apps.audit.models import AuditLog
        AuditLog.log(
            action=AuditLog.Action.GRADE_UPDATED,
            target_model='GradeResolution',
            target_id=resolution.id,
            payload={
                'action': 'grade_inputted',
                'input_by': user.get_full_name(),
                'proposed_grade': str(proposed_grade),
                'proposed_status': proposed_status,
            }
        )

        return {
            'success': True,
            'message': 'Grade inputted — forwarded to department head for approval'
        }

    @staticmethod
    @transaction.atomic
    def head_approve(resolution, head, notes=''):
        """
        Step 4: Department head reviews and approves.
        Transitions: PENDING_HEAD → PENDING_REGISTRAR_FINAL
        """
        if resolution.status != GradeResolution.Status.PENDING_HEAD:
            return {
                'success': False,
                'error': f'Cannot approve: resolution is in {resolution.get_status_display()} status'
            }

        resolution.status = GradeResolution.Status.PENDING_REGISTRAR_FINAL
        resolution.reviewed_by_head = head
        resolution.head_action_at = timezone.now()
        resolution.head_notes = notes
        resolution.save()

        from apps.audit.models import AuditLog
        AuditLog.log(
            action=AuditLog.Action.GRADE_UPDATED,
            target_model='GradeResolution',
            target_id=resolution.id,
            payload={
                'action': 'head_approved',
                'head': head.get_full_name(),
                'student': resolution.subject_enrollment.enrollment.student.get_full_name(),
                'proposed_grade': str(resolution.proposed_grade),
            }
        )

        return {
            'success': True,
            'message': 'Head approved — forwarded to registrar for final sign-off'
        }

    @staticmethod
    @transaction.atomic
    def registrar_final_approve(resolution, registrar, notes=''):
        """
        Step 5: Registrar final sign-off. Applies the grade change.
        Transitions: PENDING_REGISTRAR_FINAL → APPROVED
        """
        if resolution.status != GradeResolution.Status.PENDING_REGISTRAR_FINAL:
            return {
                'success': False,
                'error': f'Cannot finalize: resolution is in {resolution.get_status_display()} status'
            }

        # Update resolution
        resolution.status = GradeResolution.Status.APPROVED
        resolution.registrar_final_at = timezone.now()
        if notes:
            # Append final notes to registrar_notes
            existing = resolution.registrar_notes or ''
            resolution.registrar_notes = f"{existing}\n[Final] {notes}".strip()
        resolution.save()

        # Apply grade change to SubjectEnrollment
        se = resolution.subject_enrollment
        previous_grade = se.grade
        previous_status = se.status

        se.grade = resolution.proposed_grade
        se.status = resolution.proposed_status
        se.save()

        # Create grade history
        GradeHistory.objects.create(
            subject_enrollment=se,
            previous_grade=previous_grade,
            new_grade=se.grade,
            previous_status=previous_status,
            new_status=se.status,
            changed_by=registrar,
            change_reason=f"Grade Resolution Approved: {resolution.reason}",
            is_system_action=False
        )

        from apps.audit.models import AuditLog
        AuditLog.log(
            action=AuditLog.Action.GRADE_UPDATED,
            target_model='GradeResolution',
            target_id=resolution.id,
            payload={
                'action': 'registrar_final_approved',
                'registrar': registrar.get_full_name(),
                'student': se.enrollment.student.get_full_name(),
                'subject': se.subject.code,
                'grade': str(se.grade),
            }
        )

        return {
            'success': True,
            'message': 'Resolution approved — grade has been applied'
        }

    @staticmethod
    @transaction.atomic
    def reject_resolution(resolution, user, reason=''):
        """
        Reject a resolution at any active step.
        Any role involved in the chain can reject.
        """
        terminal_statuses = [
            GradeResolution.Status.APPROVED,
            GradeResolution.Status.REJECTED,
            GradeResolution.Status.CANCELLED,
        ]
        if resolution.status in terminal_statuses:
            return {
                'success': False,
                'error': f'Cannot reject: resolution is already {resolution.get_status_display()}'
            }

        resolution.status = GradeResolution.Status.REJECTED

        # Track who rejected based on role
        if user.role in ['REGISTRAR', 'HEAD_REGISTRAR', 'ADMIN']:
            resolution.reviewed_by_registrar = user
            resolution.registrar_action_at = timezone.now()
            resolution.registrar_notes = reason
        elif user.role == 'DEPARTMENT_HEAD':
            resolution.reviewed_by_head = user
            resolution.head_action_at = timezone.now()
            resolution.head_notes = reason

        resolution.save()

        from apps.audit.models import AuditLog
        AuditLog.log(
            action=AuditLog.Action.GRADE_UPDATED,
            target_model='GradeResolution',
            target_id=resolution.id,
            payload={
                'action': 'rejected',
                'rejected_by': user.get_full_name(),
                'role': user.role,
                'reason': reason,
            }
        )

        return {
            'success': True,
            'message': 'Resolution rejected'
        }

    @staticmethod
    @transaction.atomic
    def cancel_resolution(resolution, user):
        """
        Cancel a resolution. Only the requester can cancel, and only before approval.
        """
        terminal_statuses = [
            GradeResolution.Status.APPROVED,
            GradeResolution.Status.REJECTED,
            GradeResolution.Status.CANCELLED,
        ]
        if resolution.status in terminal_statuses:
            return {
                'success': False,
                'error': f'Cannot cancel: resolution is already {resolution.get_status_display()}'
            }

        if resolution.requested_by != user:
            return {
                'success': False,
                'error': 'Only the requester can cancel a resolution'
            }

        resolution.status = GradeResolution.Status.CANCELLED
        resolution.save()

        from apps.audit.models import AuditLog
        AuditLog.log(
            action=AuditLog.Action.GRADE_UPDATED,
            target_model='GradeResolution',
            target_id=resolution.id,
            payload={
                'action': 'cancelled',
                'cancelled_by': user.get_full_name(),
            }
        )

        return {
            'success': True,
            'message': 'Resolution cancelled'
        }
