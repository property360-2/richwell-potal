from django.core.management.base import BaseCommand
from apps.academics.services_sectioning import SectioningEngine
from apps.enrollment.models import Semester

class Command(BaseCommand):
    help = 'Rebalance underfilled sections for a specific semester'

    def add_arguments(self, parser):
        parser.add_argument('--semester_id', type=str, help='UUID of the semester')

    def handle(self, *args, **options):
        semester_id = options.get('semester_id')
        
        if not semester_id:
            # Fallback to active semester
            semester = Semester.objects.filter(is_current=True).first()
            if not semester:
                self.stderr.write("No active semester found. Please provide --semester_id")
                return
            semester_id = str(semester.id)
        
        self.stdout.write(f"Rebalancing sections for semester {semester_id}...")
        actions = SectioningEngine.rebalance_sections(semester_id)
        
        if not actions:
            self.stdout.write(self.style.SUCCESS("No rebalancing actions needed."))
        else:
            for action in actions:
                self.stdout.write(self.style.SUCCESS(f"Action: {action}"))
            self.stdout.write(self.style.SUCCESS(f"Completed {len(actions)} actions."))
