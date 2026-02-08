
import os
import django
import sys
import traceback
from datetime import timedelta, date

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.utils import timezone
from apps.accounts.models import User, StudentProfile
from apps.academics.models import Program, Subject, Section, SectionSubject, Curriculum, CurriculumSubject
from apps.enrollment.models import Semester, Enrollment, SubjectEnrollment
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.enrollment.views import EnrollSubjectView

def run_test():
    print("--- Setting up Test Data ---")
    
    # 1. Setup Semester (1st Semester)
    today = timezone.now().date()
    # Ensure one active semester
    Semester.objects.all().update(is_current=False)
    # Clean up previous test runs
    # Order matters due to PROTECT constraints
    semesters = Semester.objects.filter(academic_year="TEST-2025-2026")
    for s in semesters:
        Enrollment.objects.filter(semester=s).delete()
        Section.objects.filter(semester=s).delete()
    semesters.delete()
    
    semester, _ = Semester.objects.get_or_create(
        name="1st Semester",
        academic_year="TEST-2025-2026",
        defaults={
            'start_date': today,
            'end_date': today + timedelta(days=120),
            'enrollment_start_date': today - timedelta(days=5),
            'enrollment_end_date': today + timedelta(days=5),
            'status': 'ENROLLMENT_OPEN',
            'is_current': True
        }
    )
    semester.status = 'ENROLLMENT_OPEN'
    semester.enrollment_start_date = today - timedelta(days=5)
    semester.enrollment_end_date = today + timedelta(days=5)
    semester.is_current = True
    semester.academic_year = "TEST-2025-2026"
    semester.save()

    print(f"Active Semester: {semester} (Dates: {semester.enrollment_start_date} to {semester.enrollment_end_date})")
    print(f"Is Enrollment Open? {semester.is_enrollment_open}")

    # 2. Setup Academic Data
    program, _ = Program.objects.get_or_create(code="BSIT", defaults={'name': 'IT'})
    curriculum, _ = Curriculum.objects.get_or_create(program=program, code="REV1", defaults={'effective_year': 2025, 'name': 'Rev 1'})

    subject, _ = Subject.objects.get_or_create(
        code="TEST_IT101", 
        defaults={
            'title': 'Test Intro to IT', 
            'units': 3, 
            'program': program,
            'year_level': 1,
            'semester_number': 1
        }
    )
    # Clear any prereqs just in case it existed
    subject.prerequisites.clear()
    
    # Curriculum Subject (Critical for validation)
    CurriculumSubject.objects.get_or_create(
        curriculum=curriculum,
        subject=subject,
        defaults={'year_level': 1, 'semester_number': 1}
    )

    # Sections
    section_a, _ = Section.objects.get_or_create(
        name="BSIT-1A", 
        semester=semester,
        defaults={'program': program, 'year_level': 1, 'capacity': 40, 'curriculum': curriculum}
    )
    section_b, _ = Section.objects.get_or_create(
        name="BSIT-1B", 
        semester=semester,
        defaults={'program': program, 'year_level': 1, 'capacity': 40, 'curriculum': curriculum}
    )
    
    # Offer Subject in both sections
    ss_a, _ = SectionSubject.objects.get_or_create(section=section_a, subject=subject)
    ss_b, _ = SectionSubject.objects.get_or_create(section=section_b, subject=subject)

    # 3. Setup Students
    # Freshman (Y1S1)
    freshman_email = "freshman@test.com"
    try:
        freshman = User.objects.get(email=freshman_email)
    except User.DoesNotExist:
        freshman = User.objects.create_user(email=freshman_email, username=freshman_email, password="password", role="STUDENT", first_name="Fresh", last_name="Man")
    
    # Ensure profile
    if not hasattr(freshman, 'student_profile'):
        StudentProfile.objects.create(
            user=freshman, 
            program=program, 
            year_level=1, 
            home_section=section_a, # Assigned to A
            birthdate=today,
            curriculum=curriculum,
            contact_number="123",
            address="Test"
        )
    else:
        freshman.student_profile.year_level = 1
        freshman.student_profile.home_section = section_a
        freshman.student_profile.curriculum = curriculum
        freshman.student_profile.program = program
        freshman.student_profile.save()

    # Current Student (Y2)
    senior_email = "senior@test.com"
    try:
        senior = User.objects.get(email=senior_email)
    except User.DoesNotExist:
        senior = User.objects.create_user(email=senior_email, username=senior_email, password="password", role="STUDENT", first_name="Sen", last_name="Ior")

    if not hasattr(senior, 'student_profile'):
        StudentProfile.objects.create(
            user=senior, 
            program=program, 
            year_level=2, 
            birthdate=today,
            curriculum=curriculum,
            contact_number="123",
            address="Test"
        )
    else:
        senior.student_profile.year_level = 2
        senior.student_profile.curriculum = curriculum
        senior.student_profile.program = program
        senior.student_profile.save() # No home section, or doesn't matter
        
    print("\n--- Testing Y1S1 Freshman (Restricted) ---")
    factory = APIRequestFactory()
    view = EnrollSubjectView.as_view()

    # Clear previous enrollments
    Enrollment.objects.filter(student__in=[freshman, senior]).delete()

    # 1. Try Section B (Other) - Should be BLOCKED (403)
    print("1. Attempting to enroll Freshman in Section B (Other)...")
    request = factory.post('/api/enrollment/enroll/', {'subject_id': str(subject.id), 'section_id': str(section_b.id)}, format='json')
    force_authenticate(request, user=freshman)
    response = view(request)
    print(f"Result: {response.status_code}") # Should be 403
    if response.status_code != 403:
         if 'traceback' in response.data:
            print("Server Traceback:")
            print(response.data['traceback'])
         print(f"Unexpected success/error: {response.data}")
    else:
         print(f"Blocked as expected: {response.data}")

    # 2. Try Section A (Home) - Should be ALLOWED (200)
    print("2. Attempting to enroll Freshman in Section A (Home)...")
    request = factory.post('/api/enrollment/enroll/', {'subject_id': str(subject.id), 'section_id': str(section_a.id)}, format='json')
    force_authenticate(request, user=freshman)
    response = view(request)
    print(f"Result: {response.status_code}") # Should be 200
    if response.status_code != 200:
        if 'traceback' in response.data:
            print("Server Traceback:")
            print(response.data['traceback'])
        print(f"Error: {response.data}")
    else:
        print("Success!")


    print("\n--- Testing Y2 Current Student (Open) ---")
    
    print("Attempting to enroll Senior in Section B (Any)...")
    request = factory.post('/api/enrollment/enroll/', {'subject_id': str(subject.id), 'section_id': str(section_b.id)}, format='json')
    force_authenticate(request, user=senior)
    response = view(request)
    print(f"Result: {response.status_code}") # Should be 200
    if response.status_code != 200:
        if 'traceback' in response.data:
            print("Server Traceback:")
            print(response.data['traceback'])
        print(f"Error: {response.data}")
    else:
        print("Success!")


    print("\n--- Testing Y1S2 Exception (Open) ---")
    
    # Switch Semester
    semester.is_current = False
    semester.save()
    
    semester2, _ = Semester.objects.get_or_create(
        name="2nd Semester",
        academic_year="TEST-2025-2026",
        defaults={
            'start_date': today + timedelta(days=150),
            'end_date': today + timedelta(days=270),
            'enrollment_start_date': today - timedelta(days=5),
            'enrollment_end_date': today + timedelta(days=5),
            'status': 'ENROLLMENT_OPEN',
            'is_current': True
        }
    )
    semester2.status = 'ENROLLMENT_OPEN'
    semester2.enrollment_start_date = today - timedelta(days=5)
    semester2.enrollment_end_date = today + timedelta(days=5)
    semester2.is_current = True
    semester2.academic_year = "TEST-2025-2026"
    semester2.save() # Activate S2
    
    print(f"Active Semester switched to: {Semester.objects.filter(is_current=True).first().name}")

    # Also need section for S2
    section_b_s2, _ = Section.objects.get_or_create(
        name="BSIT-1B-S2", 
        semester=semester2,
        defaults={'program': program, 'year_level': 1, 'capacity': 40, 'curriculum': curriculum}
    )
    # Offer Subject in S2
    ss_b_s2, _ = SectionSubject.objects.get_or_create(section=section_b_s2, subject=subject)

    # Enforce clear
    # Note: If we don't clear, and if system logic is correct, it should validly enroll in a NEW semester.
    # But if "Already Enrolled" logic in view is flawed (checks subject globally), it will fail.
    # Let's see if it fails nicely.
    
    print("Attempting to enroll Freshman (now in 2nd Sem) in Section B (Other)...")
    request = factory.post('/api/enrollment/enroll/', {'subject_id': str(subject.id), 'section_id': str(section_b_s2.id)}, format='json')
    force_authenticate(request, user=freshman)
    
    response = view(request)
    print(f"Result: {response.status_code}") # Should be 200
    if response.status_code != 200:
        if 'traceback' in response.data:
            print("Server Traceback:")
            print(response.data['traceback'])
        print(f"Error: {response.data}")
    else:
        print("Success!")

if __name__ == "__main__":
    try:
        run_test()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
