#!/usr/bin/env python
"""
Quick script to create a test user with API token for testing the REST API.
Run this after running migrations: python setup_test_token.py
"""
import os
import django
import uuid

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'richwell_config.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from sis.models import Program, Student

User = get_user_model()

def create_test_user():
    """Create a test student user with API token."""

    # Check if user already exists
    if User.objects.filter(username='teststudent').exists():
        user = User.objects.get(username='teststudent')
        print("[OK] User 'teststudent' already exists")
    else:
        # Create user
        user = User.objects.create_user(
            username='teststudent',
            email='teststudent@example.com',
            password='testpass123',
            first_name='Test',
            last_name='Student',
            role='STUDENT'
        )
        print("[OK] Created user: teststudent")

    # Create student profile if not exists
    if not Student.objects.filter(user=user).exists():
        # Get or create a default program
        program, created = Program.objects.get_or_create(
            code='CS',
            defaults={
                'name': 'Computer Science',
                'duration_years': 4,
                'total_units_required': 120
            }
        )

        # Generate unique student ID
        student_id = f"STU-{uuid.uuid4().hex[:8].upper()}"

        Student.objects.create(
            user=user,
            student_id=student_id,
            program=program,
            status='ACTIVE',
            enrollment_year=2025
        )
        print(f"[OK] Created student profile (ID: {student_id})")
    else:
        print("[OK] Student profile already exists")

    # Create or get token
    token, created = Token.objects.get_or_create(user=user)

    if created:
        print("[OK] Created API token")
    else:
        print("[OK] API token already exists")

    print("\n" + "="*60)
    print("TEST USER CREDENTIALS")
    print("="*60)
    print(f"Username: teststudent")
    print(f"Password: testpass123")
    print(f"API Token: {token.key}")
    print("="*60)
    print("\nUSAGE EXAMPLES:")
    print("\n1. Get authentication token (if needed):")
    print("   curl -X POST http://localhost:8000/api-token-auth/ \\")
    print("     -H 'Content-Type: application/json' \\")
    print("     -d '{\"username\": \"teststudent\", \"password\": \"testpass123\"}'")
    print("\n2. Test authenticated API request:")
    print("   curl -H 'Authorization: Token " + token.key[:20] + "...' \\")
    print("     http://localhost:8000/api/v1/student/profile/me/")
    print("\n3. Access API documentation (Swagger):")
    print("   http://localhost:8000/api/v1/docs/")
    print("   Then click 'Authorize' and enter: Token " + token.key)
    print("="*60 + "\n")

if __name__ == '__main__':
    try:
        create_test_user()
        print("[OK] Test setup complete!")
    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()
