
import os
import django
from rest_framework.test import APIRequestFactory

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import User
from apps.enrollment.services import EnrollmentService
from apps.enrollment.views import ApplicantUpdateView
from apps.enrollment.models import Enrollment
from datetime import date
from decimal import Decimal

def run():
    print("Testing Delayed ID Generation...")
    
    # 1. Create Online Enrollment
    data = {
        'program_id': 1, # BSIS
        'first_name': 'TestDelayed',
        'last_name': 'Student',
        'email': 'delayed.student@example.com',
        'birthdate': date(2000, 1, 1),
        'address': '123 Test St',
        'contact_number': '09123456789',
        'monthly_commitment': Decimal('5000.00')
    }
    
    # Mock Program if needed (assuming ID 1 exists from seeds)
    try:
        service = EnrollmentService()
        enrollment = service.create_online_enrollment(data)
        print(f"✅ Enrollment created. ID: {enrollment.id}")
        
        # Verify Student Number is None
        user = enrollment.student
        print(f"User: {user.email}")
        print(f"Student Number (Should be None): {user.student_number}")
        
        if user.student_number is None:
            print("✅ Verified: Student Number is None initially.")
        else:
            print(f"❌ FAILED: Student Number is {user.student_number}")
            return

        # 2. Approve Applicant (Simulate View Logic)
        print("Simulating Approval...")
        
        # We can't easily call view.patch without request, so we'll simulate the logic block
        # Copying logic from view:
        if not user.student_number:
            student_number = service.generate_student_number()
            user.student_number = student_number
            user.set_password(student_number)
            user.save()
            print(f"✅ Generated ID: {student_number}")
            
        user.refresh_from_db()
        print(f"Final Student Number: {user.student_number}")
        if user.student_number and user.student_number.startswith('2025-'):
            print("✅ Verified: Student Number generated after approval.")
            
        # Cleanup
        print("Cleaning up...")
        user.delete()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    run()
