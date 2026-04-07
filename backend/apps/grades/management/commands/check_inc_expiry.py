"""
Richwell Portal — INC Expiry Management Command

Scheduled background job that expires overdue INC and NO_GRADE records.
Run daily via cron or Windows Task Scheduler.

See: docs/setup/background-jobs.md
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.grades.models import Grade
from apps.notifications.services.notification_service import NotificationService
from apps.notifications.models import Notification
from django.db.models import Q


class Command(BaseCommand):
    """
    Scans all INC and NO_GRADE grade records and transitions any that have passed
    their deadline to RETAKE status. Notifies the affected student after each
    transition so they are aware of the change.
    """
    help = 'Checks for expired INC and NO_GRADE statuses and updates them to RETAKE'

    def handle(self, *args, **options):
        """
        Entry point for the management command. Processes each expired grade
        individually so notification failures do not block the batch.

        Outputs:
            Writes success counts to stdout for logging.
        """
        today = timezone.now().date()

        # ── 1. Expire INC grades past their individual deadline ────────────────
        expired_inc = Grade.objects.filter(
            grade_status=Grade.STATUS_INC,
            inc_deadline__lt=today
        ).select_related('student__user', 'subject')

        count_inc = expired_inc.count()
        for grade in expired_inc:
            grade.grade_status = Grade.STATUS_RETAKE
            grade.save()

            # NOTIF-01: Notify the student that their INC has expired
            try:
                NotificationService.notify(
                    recipient=grade.student.user,
                    notification_type=Notification.NotificationType.GRADE,
                    title="INC Grade Expired",
                    message=(
                        f"Your Incomplete (INC) grade for {grade.subject.code} — "
                        f"{grade.subject.description} has expired. "
                        f"You are now required to retake this subject."
                    ),
                    link_url="/student/grades"
                )
            except Exception as e:
                self.stderr.write(
                    f"  Warning: Could not notify student {grade.student.idn} for INC expiry: {e}"
                )

        self.stdout.write(self.style.SUCCESS(
            f'Successfully expired {count_inc} INC grades to RETAKE.'
        ))

        # ── 2. Expire NO_GRADE statuses after the term's final grade deadline ──
        expired_ng = Grade.objects.filter(
            grade_status=Grade.STATUS_NO_GRADE,
            term__final_grade_end__lt=today
        ).select_related('student__user', 'subject', 'term')

        count_ng = expired_ng.count()
        for grade in expired_ng:
            grade.grade_status = Grade.STATUS_RETAKE
            grade.save()

            # NOTIF-01: Notify the student that their NO_GRADE has expired
            try:
                NotificationService.notify(
                    recipient=grade.student.user,
                    notification_type=Notification.NotificationType.GRADE,
                    title="Grade Not Submitted — Retake Required",
                    message=(
                        f"No grade was submitted for {grade.subject.code} — "
                        f"{grade.subject.description} during the {grade.term.code} term. "
                        f"Your record has been updated to RETAKE."
                    ),
                    link_url="/student/grades"
                )
            except Exception as e:
                self.stderr.write(
                    f"  Warning: Could not notify student {grade.student.idn} for NO_GRADE expiry: {e}"
                )

        self.stdout.write(self.style.SUCCESS(
            f'Successfully expired {count_ng} NO_GRADE records to RETAKE.'
        ))
