from django.db import transaction
from django.utils import timezone
from dateutil.relativedelta import relativedelta
from apps.grades.models import Grade
from apps.notifications.services.notification_service import NotificationService
from apps.notifications.models import Notification
from apps.accounts.models import User

class GradingService:
    @transaction.atomic
    def submit_midterm(self, grade_id, value, professor):
        """
        Professors submit midterm grades. No status change, just updates value.
        """
        grade = Grade.objects.select_for_update().get(id=grade_id)
        
        # Security/Validation
        # In a real scenario, check if professor is assigned to this section
        
        grade.midterm_grade = value
        grade.midterm_submitted_at = timezone.now()
        grade.save()

        # Notify Registrar
        registrars = User.objects.filter(role='REGISTRAR')
        for registrar in registrars:
            NotificationService.notify(
                recipient=registrar,
                notification_type=Notification.NotificationType.GRADE,
                title="Midterm Grade Submitted",
                message=f"{professor.get_full_name()} submitted midterm grades for {grade.subject.code} - {grade.section.name}.",
                link_url="/registrar/grades"
            )

        return grade

    @transaction.atomic
    def submit_final(self, grade_id, value, professor):
        """
        Professors submit final grades. Sets status to PASSED, FAILED, or INC.
        INC gets an automated deadline based on subject type.
        """
        grade = Grade.objects.select_for_update().get(id=grade_id)
        
        grade.final_grade = value
        grade.final_submitted_at = timezone.now()
        grade.submitted_by = professor

        # Identify status based on value
        # 1.0 - 3.0 = PASSED, 5.0 = FAILED, INC = INC, NG = NO_GRADE
        # Assuming value comes as special markers or numeric
        
        # Logic for Philippine grading system (1.0 is best, 5.0 is fail)
        if value is None:
             grade.grade_status = Grade.STATUS_NO_GRADE
        elif value <= 3.0:
            grade.grade_status = Grade.STATUS_PASSED
        elif value == 5.0:
            grade.grade_status = Grade.STATUS_FAILED
        else:
            # Handle numeric codes for INC or similar if needed, 
            # but usually value is null for special statuses handled separately
            pass

        # If INC is selected via UI (passed as a specific marker or separate field)
        # For now, let's assume 'value' might be a marker for INC
        if getattr(grade, '_is_inc', False): # Mocking a flag that would be set by the caller
            grade.grade_status = Grade.STATUS_INC
            # 6 months for Major, 1 year for Minor
            months = 6 if grade.subject.is_major else 12
            grade.inc_deadline = (timezone.now() + relativedelta(months=months)).date()

        grade.save()

        # Notify Registrar
        registrars = User.objects.filter(role='REGISTRAR')
        for registrar in registrars:
            NotificationService.notify(
                recipient=registrar,
                notification_type=Notification.NotificationType.GRADE,
                title="Final Grade Submitted",
                message=f"{professor.get_full_name()} submitted final grades for {grade.subject.code} - {grade.section.name}.",
                link_url="/registrar/grades"
            )

        return grade

    @transaction.atomic
    def finalize_grades(self, term, subject, section, user):
        """
        Registrar bulk-finalizes grades for a section.
        """
        grades = Grade.objects.filter(
            term=term, 
            subject=subject, 
            section=section,
            grade_status__in=[Grade.STATUS_PASSED, Grade.STATUS_FAILED, Grade.STATUS_INC, Grade.STATUS_NO_GRADE]
        ).exclude(grade_status=Grade.STATUS_ENROLLED)

        for grade in grades:
            grade.finalized_by = user
            grade.finalized_at = timezone.now()
            grade.save()

            # Notify Student
            NotificationService.notify(
                recipient=grade.student.user,
                notification_type=Notification.NotificationType.GRADE,
                title="Grade Finalized",
                message=f"Your grade for {grade.subject.code} ({grade.subject.description}) has been finalized.",
                link_url="/student/grades"
            )
        
        return grades

    @transaction.atomic
    def drop_subject(self, student, subject, term):
        """
        Marks a student's subject as DROPPED and removes it from the assigned section.
        """
        grade = Grade.objects.filter(
            student=student, 
            subject=subject, 
            term=term
        ).first()

        if not grade:
            raise ValueError("No enrollment record found for this subject and term.")

        if grade.grade_status != Grade.STATUS_ENROLLED:
            raise ValueError(f"Cannot drop subject with status: {grade.get_grade_status_display()}")

        # 1. Update status and remove section assignment
        grade.grade_status = Grade.STATUS_DROPPED
        grade.section = None
        grade.save()

        # 2. Notify Student
        NotificationService.notify(
            recipient=student.user,
            notification_type=Notification.NotificationType.ENROLLMENT,
            title="Subject Dropped",
            message=f"You have officially dropped {subject.code} ({subject.description}).",
            link_url="/student/finance" 
        )

        return grade

    @transaction.atomic
    def bulk_drop_subjects(self, student, subjects, term):
        results = []
        for subject in subjects:
            results.append(self.drop_subject(student, subject, term))
        return results
