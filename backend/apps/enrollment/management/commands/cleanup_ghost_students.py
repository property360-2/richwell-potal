from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.enrollment.models import Enrollment

class Command(BaseCommand):
    help = 'Cleans up PENDING enrollments that have not been activated for a long time.'

    def handle(self, *args, **options):
        # Find PENDING enrollments that are older than 30 days and have no payments
        # Or enrollments from past semesters that remained PENDING
        
        # 1. Past Semesters Cleanup
        active_semester = self.get_active_semester()
        if active_semester:
            ghosts = Enrollment.objects.filter(
                status=Enrollment.Status.PENDING,
                semester__end_date__lt=timezone.now().date()
            )
            count = ghosts.count()
            ghosts.update(status='REJECTED') # Or a new 'CANCELLED' status
            self.stdout.write(self.style.SUCCESS(f'Successfully marked {count} past pending enrollments as REJECTED'))

    def get_active_semester(self):
        from apps.enrollment.models import Semester
        return Semester.objects.filter(is_current=True).first()
