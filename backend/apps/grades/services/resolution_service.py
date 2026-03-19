from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied
from apps.grades.models import Grade
from apps.notifications.services.notification_service import NotificationService
from apps.notifications.models import Notification
from apps.accounts.models import User

class ResolutionService:
    @staticmethod
    def _assert_professor_can_manage_grade(grade, professor):
        if professor.role != 'PROFESSOR':
            return

        from apps.scheduling.models import Schedule

        is_assigned = Schedule.objects.filter(
            term=grade.term,
            section=grade.section,
            subject=grade.subject,
            professor__user=professor
        ).exists()
        if not is_assigned:
            raise PermissionDenied("You are not assigned to manage this grade.")

    @staticmethod
    def _assert_program_head_can_manage_grade(grade, program_head):
        if program_head.role != 'PROGRAM_HEAD':
            return
        if grade.student.program.program_head_id != program_head.id:
            raise PermissionDenied("You do not manage the program for this grade.")

    @transaction.atomic
    def request_resolution(self, grade_id, professor, reason):
        """
        Professor requests to resolve an INC grade.
        Status: INC -> RESOLUTION_REQUESTED
        """
        grade = Grade.objects.select_for_update().get(id=grade_id)
        self._assert_professor_can_manage_grade(grade, professor)
        
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
    def registrar_reject_request(self, grade_id, registrar, reason):
        """
        Registrar rejects the resolution request.
        Status: RESOLUTION_REQUESTED -> None (reverted)
        """
        grade = Grade.objects.select_for_update().get(id=grade_id)
        
        if grade.resolution_status != 'REQUESTED':
            raise ValueError("No pending resolution request found.")
            
        grade.resolution_status = None
        grade.rejection_reason = reason
        grade.save()

        # Notify Professor
        NotificationService.notify(
            recipient=grade.resolution_requested_by,
            notification_type=Notification.NotificationType.GRADE,
            title="Resolution Request Rejected",
            message=f"Registrar rejected your resolution request for {grade.student.idn} - {grade.subject.code}.",
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
        self._assert_professor_can_manage_grade(grade, professor)
        
        if grade.resolution_status != 'APPROVED':
            raise ValueError("Resolution request must be approved by registrar first.")
            
        grade.resolution_new_grade = new_grade
        grade.resolution_status = 'SUBMITTED'
        grade.save()
        
        return grade

    @transaction.atomic
    def head_approve_resolution(self, grade_id, program_head):
        """
        Program Head gives program-level approval for the resolved grade.
        Status: RESOLUTION_SUBMITTED -> HEAD_APPROVED
        """
        grade = Grade.objects.select_for_update().get(id=grade_id)
        self._assert_program_head_can_manage_grade(grade, program_head)
        
        if grade.resolution_status != 'SUBMITTED':
            raise ValueError("No submitted resolution grade to approve.")
            
        grade.resolution_status = 'HEAD_APPROVED'
        grade.resolution_approved_by = program_head
        grade.resolution_approved_at = timezone.now()
        grade.save()

        # Notify Registrar
        registrars = User.objects.filter(role='REGISTRAR')
        for registrar in registrars:
            NotificationService.notify(
                recipient=registrar,
                notification_type=Notification.NotificationType.GRADE,
                title="Resolution Approved by Head",
                message=f"{program_head.get_full_name()} approved the resolved grade for {grade.student.idn} - {grade.subject.code}. Ready for finalization.",
                link_url="/registrar/grades"
            )

        return grade

    @transaction.atomic
    def registrar_finalize_resolution(self, grade_id, registrar):
        """
        Registrar gives final official approval and commits the grade to records.
        Status: HEAD_APPROVED -> COMPLETED
        """
        grade = Grade.objects.select_for_update().get(id=grade_id)
        
        if grade.resolution_status != 'HEAD_APPROVED':
            raise ValueError("Resolution must be approved by Program Head first.")
            
        # Commit the grade to the official record
        grade.final_grade = grade.resolution_new_grade
        grade.grade_status = Grade.STATUS_PASSED if grade.final_grade <= 3.0 else Grade.STATUS_FAILED
        grade.resolution_status = 'COMPLETED'
        
        # Mark as finalized for auditing
        grade.finalized_by = registrar
        grade.finalized_at = timezone.now()
        grade.save()

        # Notify Professor
        NotificationService.notify(
            recipient=grade.resolution_requested_by,
            notification_type=Notification.NotificationType.GRADE,
            title="Resolution Finalized",
            message=f"Registrar has finalized the resolved grade for {grade.student.idn} - {grade.subject.code}.",
            link_url="/professor/grading"
        )

        # Notify Student
        NotificationService.notify(
            recipient=grade.student.user,
            notification_type=Notification.NotificationType.GRADE,
            title="Grade Resolved",
            message=f"Your INC grade for {grade.subject.code} has been officially finalized by the Registrar.",
            link_url="/student/grades"
        )
        
        return grade

    @transaction.atomic
    def head_reject_resolution(self, grade_id, program_head, reason):
        """
        Program Head rejects the resolution. Professor must re-submit grade.
        Status: RESOLUTION_SUBMITTED -> RESOLUTION_APPROVED (back to entry state)
        """
        grade = Grade.objects.select_for_update().get(id=grade_id)
        self._assert_program_head_can_manage_grade(grade, program_head)
        
        if grade.resolution_status != 'SUBMITTED':
            raise ValueError("No submitted resolution grade to reject.")
            
        grade.resolution_status = 'APPROVED' # Back to approved for re-submission
        grade.rejection_reason = reason
        grade.save()
        
        return grade
