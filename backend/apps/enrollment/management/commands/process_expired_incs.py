from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.enrollment.models import SubjectEnrollment, GradeHistory

class Command(BaseCommand):
    help = 'Process expired INCOMPLETE grades and convert them to RETAKE/FAILED'

    def handle(self, *args, **options):
        now = timezone.now()
        self.stdout.write(f"Processing expired INCs as of {now}")

        # Find INCs where eligibility date has passed
        # Since logic is in property, we might need to iterate or do a rough filter first
        # Filter INCs that have a date set
        incs = SubjectEnrollment.objects.filter(
            status='INC',
            inc_marked_at__isnull=False
        ).select_related('subject')

        processed_count = 0
        
        for inc in incs:
            if not inc.is_resolution_allowed: # This means eligibility date has PASSED
                self.stdout.write(f"Expiring INC for {inc.id} (Subject: {inc.subject.code})")
                
                old_status = inc.status
                
                # Convert to FAILED/RETAKE
                # Per analysis, use RETAKE status if specific, or FAILED (5.0)
                # Let's use FAILED with 5.0 grade as typically INC becomes 5.0
                inc.status = 'FAILED'
                inc.grade = 5.00
                inc.failed_at = now # Set failed time
                inc.save()
                
                # Log History
                GradeHistory.objects.create(
                    subject_enrollment=inc,
                    previous_grade=None, # Was INC (no grade)
                    new_grade=5.00,
                    previous_status=old_status,
                    new_status='FAILED',
                    change_reason="Auto-expiration of Incomplete status"
                )
                
                processed_count += 1

        self.stdout.write(self.style.SUCCESS(f'Successfully processed {processed_count} expired INCs'))
