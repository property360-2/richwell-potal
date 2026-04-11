"""
Management command to recalculate student regularity and year level for the active term.
This is useful for fixing stale data when logic changes occur.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.terms.models import Term
from apps.students.models import StudentEnrollment
from apps.grades.services.advising_service import AdvisingService

class Command(BaseCommand):
    help = 'Recalculates student standing (regularity, reason, year level) for the active term'

    def handle(self, *args, **options):
        active_term = Term.objects.filter(is_active=True).first()
        if not active_term:
            self.stdout.write(self.style.ERROR('No active term found.'))
            return

        self.stdout.write(f'Refreshing student standing for Term: {active_term.code}...')

        enrollments = StudentEnrollment.objects.filter(term=active_term)
        count = enrollments.count()
        
        self.stdout.write(f'Found {count} enrollments to process.')

        updated_count = 0
        with transaction.atomic():
            for enrollment in enrollments:
                AdvisingService.recalculate_student_standing(enrollment.student, active_term)
                updated_count += 1
                if updated_count % 50 == 0:
                    self.stdout.write(f'  Processed {updated_count}/{count}...')

        self.stdout.write(self.style.SUCCESS(f'Successfully refreshed standing for {updated_count} students.'))
