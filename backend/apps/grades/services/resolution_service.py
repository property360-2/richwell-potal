from django.db import transaction
from django.utils import timezone
from apps.grades.models import Grade
from apps.notifications.services.notification_service import NotificationService
from apps.notifications.models import Notification
from apps.accounts.models import User

class ResolutionService:
    @transaction.atomic
    def request_resolution(self, grade_id, professor, reason):
        """
        Professor requests to resolve an INC grade.
        Status: INC -> RESOLUTION_REQUESTED
        """
        grade = Grade.objects.select_for_update().get(id=grade_id)
        
        if grade.grade_status != Grade.STATUS_INC:
            raise ValueError("Only INC grades can be resolved.")

        grade.resolution_status = 'REQUESTED'
        grade.resolution_reason = reason
        grade.resolution_requested_by = professor
        grade.resolution_requested_at = timezone.now()
        grade.save()
        
        # Notify Registrar
        registrars = User.objects.filter(role='REGISTRAR')
        for registrar in registrars:
            NotificationService.notify(
                recipient=registrar,
                notification_type=Notification.NotificationType.GRADE,
                title="Resolution Requested",
                message=f"{professor.get_full_name()} requested to resolve INC for {grade.student.idn} - {grade.subject.code}.",
                link_url="/registrar/resolutions"
            )

        return grade

    @transaction.atomic
    def registrar_approve_request(self, grade_id, registrar):
        """
        Registrar approves the resolution request, unlocking it for grade entry.
        Status: RESOLUTION_REQUESTED -> RESOLUTION_APPROVED
        """
        grade = Grade.objects.select_for_update().get(id=grade_id)
        
        if grade.resolution_status != 'REQUESTED':
            raise ValueError("No pending resolution request found.")
            
        grade.resolution_status = 'APPROVED'
        grade.save()

        # Notify Professor
        NotificationService.notify(
            recipient=grade.resolution_requested_by,
            notification_type=Notification.NotificationType.GRADE,
            title="Resolution Request Approved",
            message=f"Registrar approved your resolution request for {grade.student.idn} - {grade.subject.code}. You can now submit the new grade.",
            link_url="/professor/grading"
        )
        
        return grade

    @transaction.atomic
    def submit_resolved_grade(self, grade_id, professor, new_grade):
        """
        Professor submits the actual numeric grade for the INC.
        Status: RESOLUTION_APPROVED -> RESOLUTION_SUBMITTED
        """
        grade = Grade.objects.select_for_update().get(id=grade_id)
        
        if grade.resolution_status != 'APPROVED':
            raise ValueError("Resolution request must be approved by registrar first.")
            
        grade.resolution_new_grade = new_grade
        grade.resolution_status = 'SUBMITTED'
        grade.save()
        
        return grade

    @transaction.atomic
    def head_approve_resolution(self, grade_id, program_head):
        """
        Program Head approves the new grade.
        Status: RESOLUTION_SUBMITTED -> RESOLUTION_FINAL_PENDING
        Updates the main grade value but keeps status for final Registrar action.
        """
        grade = Grade.objects.select_for_update().get(id=grade_id)
        
        if grade.resolution_status != 'SUBMITTED':
            raise ValueError("No submitted resolution grade to approve.")
            
        grade.final_grade = grade.resolution_new_grade
        grade.resolution_status = 'COMPLETED'
        grade.resolution_approved_by = program_head
        grade.resolution_approved_at = timezone.now()
        
        # Once approved by Head, it's ready for finalization by Registrar 
        # (who finalized the original INC)
        # We transition grade_status to PASSED or FAILED based on new_grade
        grade.save()

        # Notify Professor
        NotificationService.notify(
            recipient=grade.resolution_requested_by,
            notification_type=Notification.NotificationType.GRADE,
            title="Resolution Completed",
            message=f"Program Head approved the resolved grade for {grade.student.idn} - {grade.subject.code}.",
            link_url="/professor/grading"
        )

        # Notify Student
        NotificationService.notify(
            recipient=grade.student.user,
            notification_type=Notification.NotificationType.GRADE,
            title="Grade Resolved",
            message=f"Your INC grade for {grade.subject.code} has been resolved and updated.",
            link_url="/student/grades"
        )
        
        return grade

    @transaction.atomic
    def head_reject_resolution(self, grade_id, reason):
        """
        Program Head rejects the resolution. Professor must re-submit grade.
        Status: RESOLUTION_SUBMITTED -> RESOLUTION_APPROVED (back to entry state)
        """
        grade = Grade.objects.select_for_update().get(id=grade_id)
        
        if grade.resolution_status != 'SUBMITTED':
            raise ValueError("No submitted resolution grade to reject.")
            
        grade.resolution_status = 'APPROVED' # Back to approved for re-submission
        grade.rejection_reason = reason
        grade.save()
        
        return grade
