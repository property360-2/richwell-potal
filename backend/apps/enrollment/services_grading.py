"""
Grading services - Grade submission and history logic.
"""

from django.db import transaction
from django.utils import timezone
from apps.enrollment.models import SubjectEnrollment, GradeHistory, GradeResolution

class GradingService:
    """
    Service for grade management operations.
    """
    
    @staticmethod
    def submit_grade(subject_enrollment, grade, user, new_status=None, remarks=None):
        """
        Submit a grade for a student.
        Handles:
        1. Regular grade submission (Open window)
        2. INC Resolution (Creates GradeResolution)
        3. Late submission request (if window closed) - *Logic from views implies this*
        
        Args:
            subject_enrollment: SubjectEnrollment instance
            grade: The grade value (e.g. '1.00')
            user: User object (Professor/Registrar)
            new_status: Optional new status (e.g. 'PASSED', 'FAILED')
            remarks: Optional remarks
            
        Returns:
            dict: {
                'success': bool,
                'is_resolution': bool,
                'data': dict (message, id, status, etc.)
            }
        """
        semester = subject_enrollment.enrollment.semester
        is_inc_resolution = subject_enrollment.status == 'INC'
        is_window_closed = not semester.is_grading_open
        
        # Logic extracted from views:
        # If resolving INC or window is closed, create a resolution request for PROFESSORs
        # Registrars can bypass this and update directly usually, but logic here preserves view behavior
        if (is_inc_resolution or is_window_closed) and user.role == 'PROFESSOR':
            return GradingService._create_resolution_request(
                subject_enrollment, grade, new_status, remarks, user
            )

        return GradingService._process_grade_update(
            subject_enrollment, grade, new_status, remarks, user
        )

    @staticmethod
    def _create_resolution_request(subject_enrollment, grade, new_status, remarks, user):
        """Helper to create a grade resolution request."""
        
        resolution, created = GradeResolution.objects.get_or_create(
            subject_enrollment=subject_enrollment,
            status__in=[GradeResolution.Status.PENDING_REGISTRAR, GradeResolution.Status.PENDING_HEAD],
            defaults={
                'current_grade': subject_enrollment.grade,
                'proposed_grade': grade,
                'current_status': subject_enrollment.status,
                'proposed_status': new_status or subject_enrollment.status,
                'reason': remarks or 'INC Resolution',
                'requested_by': user,
                'status': GradeResolution.Status.PENDING_HEAD
            }
        )
        
        if not created:
            resolution.proposed_grade = grade
            resolution.proposed_status = new_status or subject_enrollment.status
            resolution.reason = remarks or 'INC Resolution'
            resolution.save()
            
        return {
            'success': True,
            'is_resolution': True,
            'subject_enrollment_id': str(subject_enrollment.id),
            'status': 'PENDING_APPROVAL',
            'message': 'Grade resolution request submitted for approval'
        }

    @staticmethod
    @transaction.atomic
    def _process_grade_update(subject_enrollment, grade, new_status, remarks, user):
        """Helper to process immediate grade update and history."""
        # Store previous values for history
        previous_grade = subject_enrollment.grade
        previous_status = subject_enrollment.status
        
        # Update grade and status
        subject_enrollment.grade = grade
        if new_status:
            subject_enrollment.status = new_status
        
        if remarks:
            subject_enrollment.remarks = remarks
        
        # Set timestamps
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
        
        # Create grade history entry
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
