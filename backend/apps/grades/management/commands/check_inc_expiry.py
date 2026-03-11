from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.grades.models import Grade
from django.db.models import Q

class Command(BaseCommand):
    help = 'Checks for expired INC and NO_GRADE statuses and updates them to RETAKE'

    def handle(self, *args, **options):
        today = timezone.now().date()
        
        # 1. Expire INC grades past their deadline
        expired_inc = Grade.objects.filter(
            grade_status=Grade.STATUS_INC,
            inc_deadline__lt=today
        )
        
        count_inc = expired_inc.count()
        for grade in expired_inc:
            grade.grade_status = Grade.STATUS_RETAKE
            grade.save()
            # TODO: Notify student and professor
            
        self.stdout.write(self.style.SUCCESS(f'Successfully expired {count_inc} INC grades to RETAKE.'))

        # 2. Expire NO_GRADE statuses if the term has ended (optional buffer could be added)
        # Using a simplification: if today > term.final_grade_end
        expired_ng = Grade.objects.filter(
            grade_status=Grade.STATUS_NO_GRADE,
            term__final_grade_end__lt=today
        )
        
        count_ng = expired_ng.count()
        for grade in expired_ng:
            grade.grade_status = Grade.STATUS_RETAKE
            grade.save()
            # TODO: Notify student and professor

        self.stdout.write(self.style.SUCCESS(f'Successfully expired {count_ng} NO_GRADE records to RETAKE.'))
