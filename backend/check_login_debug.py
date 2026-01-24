import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import User

emails = ['test18@gmail.com', 'test189166@richwell.edu.ph', 'admin@richwell.edu.ph']

print("--- Checking Users ---")
for email in emails:
    try:
        user = User.objects.get(email=email)
        print(f"Found: {user.email}")
        print(f"  Role: {user.role}")
        print(f"  Active: {user.is_active}")
        print(f"  Student Number: {user.student_number}")
        # Reset password to known value for debugging
        user.set_password('richwell123')
        user.save()
        print(f"  Password reset to: richwell123")
    except User.DoesNotExist:
        print(f"Not Found: {email}")

# Ensure at least one admin exists
if not User.objects.filter(role='ADMISSION_STAFF').exists():
    print("\nNo Admission Staff found. Creating one...")
    User.objects.create_user(
        email='admission@richwell.edu.ph',
        password='richwell123',
        first_name='Admission',
        last_name='Staff',
        role='ADMISSION_STAFF',
        username='admission@richwell.edu.ph'
    )
    print("Created: admission@richwell.edu.ph / richwell123")
else:
    staff = User.objects.filter(role='ADMISSION_STAFF').first()
    print(f"\nExisting Admission Staff: {staff.email}")
    staff.set_password('richwell123')
    staff.save()
    print("Password reset to: richwell123")
