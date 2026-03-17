from django.db import transaction
from django.utils import timezone
from dateutil.relativedelta import relativedelta
from apps.grades.models import Grade
from apps.notifications.services.notification_service import NotificationService
from apps.notifications.models import Notification
from apps.accounts.models import User

class GradingService:
    @transaction.atomic
    def submit_midterm(self, grade_id, value, professor, override_window=False):
        """
        Professors submit midterm grades. No status change, just updates value.
        Strict check for grading window unless override_window is True.
        """
        grade = Grade.objects.select_for_update().get(id=grade_id)
        
        # 1. Check if finalized (Global Lock)
        if grade.finalized_at:
            raise ValueError("This grade is already finalized and locked.")

        # 2. Check Grading Window
        if not override_window:
            term = grade.term
            now = timezone.now().date()
            if not term.midterm_grade_start or not term.midterm_grade_end:
                 raise ValueError("Midterm grading window is not set for this term.")
            if not (term.midterm_grade_start <= now <= term.midterm_grade_end):
                raise ValueError(f"Midterm grading window is closed (Open: {term.midterm_grade_start} to {term.midterm_grade_end}).")
        
        grade.midterm_grade = value
        grade.midterm_submitted_at = timezone.now()
        grade.save()

        # Notify Registrar
        registrars = User.objects.filter(role__in=['REGISTRAR', 'HEAD_REGISTRAR'])
        for registrar in registrars:
            NotificationService.notify(
                recipient=registrar,
                notification_type=Notification.NotificationType.GRADE,
                title="Midterm Grade Submitted",
                message=f"{professor.get_full_name()} submitted midterm grades for {grade.subject.code}{' - ' + grade.section.name if grade.section else ''}.",
                link_url="/registrar/grades"
            )

        return grade

    @transaction.atomic
    def submit_final(self, grade_id, value, professor, override_window=False):
        """
        Professors submit final grades. Sets status to PASSED, FAILED, or INC.
        Strict check for grading window unless override_window is True.
        """
        grade = Grade.objects.select_for_update().get(id=grade_id)
        
        # 1. Check if finalized (Global Lock)
        if grade.finalized_at:
            raise ValueError("This grade is already finalized and locked.")

        # 2. Check Grading Window
        if not override_window:
            term = grade.term
            now = timezone.now().date()
            if not term.final_grade_start or not term.final_grade_end:
                 raise ValueError("Final grading window is not set for this term.")
            if not (term.final_grade_start <= now <= term.final_grade_end):
                raise ValueError(f"Final grading window is closed (Open: {term.final_grade_start} to {term.final_grade_end}).")

        grade.final_grade = value
        grade.final_submitted_at = timezone.now()
        grade.submitted_by = professor

        # Logic for Philippine grading system (1.0 is best, 5.0 is fail)
        if value is None:
             grade.grade_status = Grade.STATUS_NO_GRADE
        elif value <= 3.0:
            grade.grade_status = Grade.STATUS_PASSED
        elif value == 5.0:
            grade.grade_status = Grade.STATUS_FAILED

        # Special INC handling
        if getattr(grade, '_is_inc', False) or value == 'INC':
            grade.grade_status = Grade.STATUS_INC
            months = 6 if grade.subject.is_major else 12
            grade.inc_deadline = (timezone.now() + relativedelta(months=months)).date()

        grade.save()

        # Notify Registrar
        registrars = User.objects.filter(role__in=['REGISTRAR', 'HEAD_REGISTRAR'])
        for registrar in registrars:
            NotificationService.notify(
                recipient=registrar,
                notification_type=Notification.NotificationType.GRADE,
                title="Final Grade Submitted",
                message=f"{professor.get_full_name()} submitted final grades for {grade.subject.code}{' - ' + grade.section.name if grade.section else ''}.",
                link_url="/registrar/grades"
            )

        return grade

    @transaction.atomic
    def finalize_section_grades(self, term, subject, section, user):
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

            NotificationService.notify(
                recipient=grade.student.user,
                notification_type=Notification.NotificationType.GRADE,
                title="Grade Finalized",
                message=f"Your grade for {grade.subject.code} has been finalized.",
                link_url="/student/grades"
            )
        
        return grades

    @transaction.atomic
    def finalize_term_grades(self, term, user):
        """
        Registrar level global lock for an entire term.
        Includes all grades regardless of status to ensure no more edits.
        """
        grades = Grade.objects.filter(
            term=term,
            finalized_at__isnull=True
        )

        count = grades.update(
            finalized_at=timezone.now(),
            finalized_by=user
        )
        return count

    @transaction.atomic
    def mark_unsubmitted_as_inc(self, term, period_type, user):
        """
        Optimized auto-INC logic for unsubmitted grades after deadline.
        Only touches students currently ENROLLED in the subject.
        """
        if period_type == 'MIDTERM':
            grades = Grade.objects.filter(
                term=term,
                midterm_grade__isnull=True,
                grade_status=Grade.STATUS_ENROLLED
            )
        else:
            grades = Grade.objects.filter(
                term=term,
                final_grade__isnull=True,
                grade_status=Grade.STATUS_ENROLLED
            )

        for grade in grades:
            grade.grade_status = Grade.STATUS_INC
            # Standard INC deadline
            months = 6 if grade.subject.is_major else 12
            grade.inc_deadline = (timezone.now() + relativedelta(months=months)).date()
            grade.save()
            
        return grades.count()

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
