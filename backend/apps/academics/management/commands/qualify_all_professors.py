from django.core.management.base import BaseCommand
from apps.accounts.models import ProfessorProfile
from apps.academics.models import Subject

class Command(BaseCommand):
    help = 'Qualifies ALL active professors for ALL active subjects (for testing/dev only)'

    def handle(self, *args, **kwargs):
        self.stdout.write('Fetching all active professors...')
        professors = ProfessorProfile.objects.filter(is_active=True, user__is_active=True)
        
        self.stdout.write('Fetching all active subjects...')
        subjects = Subject.objects.filter(is_deleted=False)
        
        count = 0
        for prof in professors:
            self.stdout.write(f'Qualifying {prof.user.get_full_name()} for {subjects.count()} subjects...')
            prof.assigned_subjects.add(*subjects)
            count += 1
            
        self.stdout.write(self.style.SUCCESS(f'Successfully updated {count} professors!'))
