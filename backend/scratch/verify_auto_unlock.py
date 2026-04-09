import os
import sys
import django
from django.conf import settings

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.students.models import Student
from apps.grades.models import CreditingRequest, CreditingRequestItem
from apps.grades.services.advising_service import AdvisingService
from apps.terms.models import Term
from django.contrib.auth import get_user_model
from apps.academics.models import Program, CurriculumVersion, Subject

User = get_user_model()

def verify_unlock():
    print("Starting verification of auto-unlock logic...")
    
    # 1. Setup a dummy student
    user, _ = User.objects.get_or_create(username="test_student", defaults={"email": "test@example.com"})
    program, _ = Program.objects.get_or_create(code="BSCS", defaults={"name": "BS Computer Science"})
    curriculum, _ = CurriculumVersion.objects.get_or_create(
        program=program, 
        version_name="V1", 
        defaults={"is_active": True}
    )
    
    student, created = Student.objects.get_or_create(
        user=user,
        defaults={
            "idn": "TEST001",
            "date_of_birth": "2000-01-01",
            "gender": "MALE",
            "program": program,
            "curriculum": curriculum,
            "student_type": "TRANSFEREE",
            "is_advising_unlocked": False
        }
    )
    
    if not created:
        student.is_advising_unlocked = False
        student.save()

    print(f"Student {student.idn} is_advising_unlocked: {student.is_advising_unlocked}")

    # 2. Setup a term and a request
    from datetime import date
    term, _ = Term.objects.get_or_create(
        code="2025-1", 
        defaults={
            "is_active": True, 
            "academic_year": "2025-2026",
            "semester_type": "1",
            "start_date": date(2025, 6, 1),
            "end_date": date(2025, 10, 31),
            "enrollment_start": date(2025, 5, 1),
            "enrollment_end": date(2025, 6, 15),
            "advising_start": date(2025, 5, 1),
            "advising_end": date(2025, 6, 15)
        }
    )
    head_user, _ = User.objects.get_or_create(username="head_user", defaults={"is_staff": True})
    
    request = CreditingRequest.objects.create(
        student=student,
        term=term,
        status="PENDING",
        requested_by=head_user
    )
    
    # Add an item
    subject, _ = Subject.objects.get_or_create(
        code="CS101", 
        curriculum=curriculum,
        defaults={
            "description": "Intro to CS", 
            "total_units": 3,
            "year_level": 1,
            "semester": "1"
        }
    )
    CreditingRequestItem.objects.create(
        request=request,
        subject=subject,
        final_grade="1.0"
    )

    print(f"Created CreditingRequest {request.id} for student.")

    # 3. Call approve_crediting_request
    print("Approving crediting request...")
    AdvisingService.approve_crediting_request(request.id, head_user, "Approved auto-unlock test")

    # 4. Verify student is unlocked
    student.refresh_from_db()
    print(f"Student {student.idn} is_advising_unlocked after approval: {student.is_advising_unlocked}")
    
    if student.is_advising_unlocked:
        print("SUCCESS: Advising was automatically unlocked!")
    else:
        print("FAILURE: Advising remains locked.")

    # Cleanup
    request.delete()
    # Note: we leave student/user/term etc as they are shared/persisted in dev db usually
    # but for a scratch script it's fine.

if __name__ == "__main__":
    verify_unlock()
