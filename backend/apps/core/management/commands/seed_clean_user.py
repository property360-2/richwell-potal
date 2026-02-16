from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()

class Command(BaseCommand):
    help = 'Wipes the database and creates a single superuser for clean testing.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Initiating clean user seed...'))

        # 1. Wipe Database
        self.stdout.write('Wiping database...')
        call_command('flush', '--no-input')
        self.stdout.write(self.style.SUCCESS('Database wiped successfully.'))

        # 2. Create Superuser
        self.stdout.write('Creating superuser...')
        with transaction.atomic():
            admin = User.objects.create_superuser(
                username='admin',
                email='admin@richwell.edu.ph',
                password='password123',
                first_name='Admin',
                last_name='User'
            )
            self.stdout.write(self.style.SUCCESS(f'Superuser created: {admin.email} / password123'))

        self.stdout.write(self.style.SUCCESS('Clean seed completed!'))
