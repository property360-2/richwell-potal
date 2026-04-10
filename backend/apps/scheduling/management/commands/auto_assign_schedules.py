"""
Management Command — Automatic Schedule Assignment
File: apps/scheduling/management/commands/auto_assign_schedules.py

This command identifies terms where the student schedule picking window has 
expired (72 hours after publication) and triggers the automatic assignment 
of any remaining students.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.terms.models import Term
from apps.scheduling.services.picking_service import PickingService
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Automatically assigns students to sections for terms where the picking window has closed.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Checking for terms with expired picking windows..."))
        
        # Deadlines are 3 days after picking_published_at
        deadline_cutoff = timezone.now() - timezone.timedelta(days=3)
        
        # We only care about active terms where picking was published but the deadline has passed
        # and where picking is still considered "active" (meaning auto-assignment hasn't fully completed or we want to catch laggards)
        expired_terms = Term.objects.filter(
            is_active=True,
            schedule_published=True,
            picking_published_at__lte=deadline_cutoff
        )

        if not expired_terms.exists():
            self.stdout.write(self.style.SUCCESS("No terms found with expired picking windows."))
            return

        picking_service = PickingService()
        
        for term in expired_terms:
            self.stdout.write(self.style.WARNING(f"Processing auto-assignment for Term: {term.code}"))
            try:
                assigned_count = picking_service.auto_assign_remaining(term)
                self.stdout.write(self.style.SUCCESS(f"Successfully assigned {assigned_count} students for {term.code}."))
                
                # NOTE: We don't "close" the term here because new students might 
                # still be advised/enrolled late and need auto-assignment in future runs.
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error processing term {term.code}: {str(e)}"))
                logger.error(f"Auto-assignment failed for term {term.code}", exc_info=True)

        self.stdout.write(self.style.SUCCESS("Auto-assignment sweep completed."))
