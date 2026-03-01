"""
Management command: Process grading deadline.
When the grading window closes, auto-assigns INC to ENROLLED students
who were never graded by their professor.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.enrollment.models import Semester, SubjectEnrollment
from apps.enrollment.models_grading import GradeHistory


class Command(BaseCommand):
    help = 'Process grading deadline — mark ungraded students as INC after grading closes'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview which students would be marked INC without applying changes'
        )
        parser.add_argument(
            '--semester-id',
            type=str,
            help='Process a specific semester by ID (defaults to current semester)'
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        semester_id = options.get('semester_id')

        if semester_id:
            try:
                semester = Semester.objects.get(id=semester_id)
            except Semester.DoesNotExist:
                self.stderr.write(self.style.ERROR(f'Semester {semester_id} not found'))
                return
        else:
            semester = Semester.objects.filter(is_current=True).first()
            if not semester:
                self.stderr.write(self.style.ERROR('No current semester found'))
                return

        # Only process if grading window is closed AND end date has passed
        today = timezone.now().date()
        if semester.grading_end_date and today <= semester.grading_end_date:
            self.stdout.write(self.style.WARNING(
                f'Grading window for {semester} has not ended yet '
                f'(ends {semester.grading_end_date}). Skipping.'
            ))
            return

        # Find ENROLLED students with no grade
        ungraded = SubjectEnrollment.objects.filter(
            enrollment__semester=semester,
            status='ENROLLED',
            grade__isnull=True,
            is_deleted=False,
        ).select_related(
            'enrollment__student',
            'subject'
        )

        count = ungraded.count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS('No ungraded students found. Nothing to process.'))
            return

        self.stdout.write(f'Found {count} ungraded subject enrollment(s) for {semester}:')

        for se in ungraded:
            student = se.enrollment.student
            subject = se.subject
            label = f'  {student.get_full_name()} ({student.student_number}) — {subject.code}'

            if dry_run:
                self.stdout.write(self.style.WARNING(f'[DRY RUN] Would mark INC: {label}'))
            else:
                previous_status = se.status
                se.status = 'INC'
                se.inc_marked_at = timezone.now()
                se.save(update_fields=['status', 'inc_marked_at', 'updated_at'])

                GradeHistory.objects.create(
                    subject_enrollment=se,
                    previous_grade=None,
                    new_grade=None,
                    previous_status=previous_status,
                    new_status='INC',
                    changed_by=None,
                    change_reason='Auto-INC: No grade submitted before deadline',
                    is_system_action=True,
                )

                self.stdout.write(self.style.SUCCESS(f'Marked INC: {label}'))

        if dry_run:
            self.stdout.write(self.style.WARNING(f'\n[DRY RUN] Would mark {count} student(s) as INC.'))
        else:
            self.stdout.write(self.style.SUCCESS(f'\nDone. Marked {count} student(s) as INC.'))
