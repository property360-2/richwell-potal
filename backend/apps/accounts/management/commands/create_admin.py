from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Creates an initial admin user'

    def handle(self, *args, **options):
        username = 'admin'
        email = 'admin@richwell.edu.ph'
        password = 'admin'
        
        if User.objects.filter(username=username).exists():
            admin_user = User.objects.get(username=username)
            admin_user.set_password(password)
            admin_user.save()
            self.stdout.write(self.style.SUCCESS(f'Admin user "{username}" already exists. Password successfully reset to "{password}".'))
            return

        try:
            admin_user = User.objects.create_superuser(
                username=username,
                email=email,
                password=password,
                first_name='System',
                last_name='Admin'
            )
            admin_user.role = 'ADMIN'
            admin_user.save()
            self.stdout.write(self.style.SUCCESS(f'Successfully created admin user "{username}" with password "{password}"'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error creating admin user: {str(e)}'))
