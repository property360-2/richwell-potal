import os
import django
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.grades.models import Grade
from apps.terms.models import Term
from apps.accounts.models import User

def simulate_grade_submission():
    term = Term.objects.filter(is_active=True).first()
    if not term:
        print("No active term found")
        return

    # Get some students who are currently ENROLLED
    pending_grades = Grade.objects.filter(term=term, grade_status=Grade.STATUS_ENROLLED)[:10]
    
    if not pending_grades.exists():
        print("No students found with ENROLLED status in active term")
        return
        
    prof = User.objects.filter(role='PROFESSOR').first()
    
    print(f"Submitting grades for {pending_grades.count()} students...")
    for grade in pending_grades:
        grade.grade_status = Grade.STATUS_PASSED
        grade.midterm_grade = Decimal('2.00')
        grade.final_grade = Decimal('1.75')
        grade.submitted_by = prof
        grade.save()
        print(f"  - Submitted: {grade.student.idn} for {grade.subject.code}")

if __name__ == "__main__":
    simulate_grade_submission()
