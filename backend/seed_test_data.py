"""
Test Data Seeder for Prerequisite Testing
Creates various student scenarios for testing enrollment flows.

Run with: python manage.py shell < seed_test_data.py
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()

from decimal import Decimal
from django.utils import timezone
from apps.accounts.models import User, StudentProfile
from apps.academics.models import Program, Subject, Section, SectionSubject
from apps.enrollment.models import Enrollment, Semester, SubjectEnrollment, MonthlyPaymentBucket

print("=" * 60)
print("TEST DATA SEEDER - Prerequisite Testing Scenarios")
print("=" * 60)

# Get current semester and BSIT program
semester = Semester.objects.filter(is_current=True).first()
bsit = Program.objects.get(code='BSIT')

print(f"\nUsing Semester: {semester}")
print(f"Using Program: {bsit.code} - {bsit.name}")

# === Create Year 2 Subjects with Prerequisites ===
print("\n--- Creating Year 2 subjects with prerequisites ---")

# Year 1 subjects (prerequisites)
it101, _ = Subject.objects.get_or_create(code='IT101', program=bsit, defaults={
    'title': 'Introduction to Computing', 'units': 3, 'year_level': 1, 'semester_number': 1
})
it102, _ = Subject.objects.get_or_create(code='IT102', program=bsit, defaults={
    'title': 'Computer Programming 1', 'units': 3, 'year_level': 1, 'semester_number': 1
})

# Year 2 subjects with prerequisites
it201, created = Subject.objects.get_or_create(code='IT201', program=bsit, defaults={
    'title': 'Computer Programming 2', 'units': 3, 'year_level': 2, 'semester_number': 1
})
if created or it201.prerequisites.count() == 0:
    it201.prerequisites.add(it102)  # IT201 requires IT102
    print(f"  IT201 → requires IT102")

it202, created = Subject.objects.get_or_create(code='IT202', program=bsit, defaults={
    'title': 'Data Structures and Algorithms', 'units': 3, 'year_level': 2, 'semester_number': 1
})
if created or it202.prerequisites.count() == 0:
    it202.prerequisites.add(it201)  # IT202 requires IT201
    print(f"  IT202 → requires IT201")

it203, created = Subject.objects.get_or_create(code='IT203', program=bsit, defaults={
    'title': 'Object Oriented Programming', 'units': 3, 'year_level': 2, 'semester_number': 2
})
if created or it203.prerequisites.count() == 0:
    it203.prerequisites.add(it201)  # IT203 requires IT201
    print(f"  IT203 → requires IT201")

# Link Year 2 subjects to section
bsit_sec, _ = Section.objects.get_or_create(name='BSIT-2A', semester=semester, defaults={
    'program': bsit, 'year_level': 2, 'capacity': 40
})
for subj in [it201, it202, it203]:
    SectionSubject.objects.get_or_create(section=bsit_sec, subject=subj)

# Also link to BSIT-1A for Year 1 subjects
bsit_1a = Section.objects.get(name='BSIT-1A', semester=semester)
for subj in [it101, it102]:
    SectionSubject.objects.get_or_create(section=bsit_1a, subject=subj)


# === SCENARIO 1: Student with INC in prerequisite ===
print("\n--- SCENARIO 1: Student with INC in prerequisite ---")

user1, created = User.objects.get_or_create(
    email='student_inc@test.com',
    defaults={
        'username': 'student_inc@test.com',
        'first_name': 'John',
        'last_name': 'INC-Test',
        'role': 'STUDENT',
        'student_number': '2024-INC01'
    }
)
if created:
    user1.set_password('test123')
    user1.save()

profile1, _ = StudentProfile.objects.get_or_create(
    user=user1,
    defaults={'program': bsit, 'year_level': 2}
)

enrollment1, _ = Enrollment.objects.get_or_create(
    student=user1,
    semester=semester,
    defaults={'status': 'ACTIVE', 'created_via': 'ONLINE', 'monthly_commitment': Decimal('5000')}
)

# Create subject enrollment with INC status for IT102
se_inc, _ = SubjectEnrollment.objects.get_or_create(
    enrollment=enrollment1,
    subject=it102,
    defaults={'section': bsit_1a, 'status': 'INC'}  # INCOMPLETE
)
print(f"  Created: {user1.email} / test123")
print(f"  Has INC in: {it102.code} - {it102.title}")
print(f"  → CANNOT enroll in IT201 (requires IT102)")


# === SCENARIO 2: Student with PASSED prerequisites ===
print("\n--- SCENARIO 2: Student with PASSED prerequisites ---")

user2, created = User.objects.get_or_create(
    email='student_passed@test.com',
    defaults={
        'username': 'student_passed@test.com',
        'first_name': 'Maria',
        'last_name': 'Passed-Test',
        'role': 'STUDENT',
        'student_number': '2024-PASS01'
    }
)
if created:
    user2.set_password('test123')
    user2.save()

profile2, _ = StudentProfile.objects.get_or_create(
    user=user2,
    defaults={'program': bsit, 'year_level': 2}
)

enrollment2, _ = Enrollment.objects.get_or_create(
    student=user2,
    semester=semester,
    defaults={'status': 'ACTIVE', 'created_via': 'ONLINE', 'monthly_commitment': Decimal('5000')}
)

# Create subject enrollments with PASSED status
for subj in [it101, it102]:
    se, _ = SubjectEnrollment.objects.get_or_create(
        enrollment=enrollment2,
        subject=subj,
        defaults={'section': bsit_1a, 'status': 'PASSED'}
    )

print(f"  Created: {user2.email} / test123")
print(f"  PASSED: IT101, IT102")
print(f"  → CAN enroll in IT201 (prerequisite met)")


# === SCENARIO 3: Year 1 Student (no subjects yet) ===
print("\n--- SCENARIO 3: Fresh Year 1 Student ---")

user3, created = User.objects.get_or_create(
    email='student_fresh@test.com',
    defaults={
        'username': 'student_fresh@test.com',
        'first_name': 'Fresh',
        'last_name': 'Student',
        'role': 'STUDENT',
        'student_number': '2024-FRSH01'
    }
)
if created:
    user3.set_password('test123')
    user3.save()

profile3, _ = StudentProfile.objects.get_or_create(
    user=user3,
    defaults={'program': bsit, 'year_level': 1}
)

enrollment3, _ = Enrollment.objects.get_or_create(
    student=user3,
    semester=semester,
    defaults={'status': 'ACTIVE', 'created_via': 'ONLINE', 'monthly_commitment': Decimal('5000')}
)

print(f"  Created: {user3.email} / test123")
print(f"  No subjects yet (Year 1)")
print(f"  → Can only enroll in Year 1 subjects")


# === SCENARIO 4: Student with CREDITED (transferee) ===
print("\n--- SCENARIO 4: Transferee with CREDITED subjects ---")

user4, created = User.objects.get_or_create(
    email='student_transferee@test.com',
    defaults={
        'username': 'student_transferee@test.com',
        'first_name': 'Transfer',
        'last_name': 'Student',
        'role': 'STUDENT',
        'student_number': '2024-TRNS01'
    }
)
if created:
    user4.set_password('test123')
    user4.save()

profile4, _ = StudentProfile.objects.get_or_create(
    user=user4,
    defaults={'program': bsit, 'year_level': 2, 'is_transferee': True, 'previous_school': 'Other University'}
)

enrollment4, _ = Enrollment.objects.get_or_create(
    student=user4,
    semester=semester,
    defaults={'status': 'ACTIVE', 'created_via': 'TRANSFEREE', 'monthly_commitment': Decimal('5000')}
)

# Create CREDITED subjects
for subj in [it101, it102]:
    se, _ = SubjectEnrollment.objects.get_or_create(
        enrollment=enrollment4,
        subject=subj,
        defaults={'section': None, 'status': 'CREDITED'}
    )

print(f"  Created: {user4.email} / test123")
print(f"  CREDITED: IT101, IT102 (from previous school)")
print(f"  → CAN enroll in IT201 (credited counts as passed)")


# === Summary ===
print("\n" + "=" * 60)
print("TEST ACCOUNTS SUMMARY")
print("=" * 60)
print("""
| Email                       | Password | Scenario                    |
|-----------------------------|----------|-----------------------------|
| student_inc@test.com        | test123  | Has INC in IT102 (blocked)  |
| student_passed@test.com     | test123  | Passed IT101, IT102 (ready) |
| student_fresh@test.com      | test123  | Fresh Year 1 (no subjects)  |
| student_transferee@test.com | test123  | Credited IT101, IT102       |

PREREQUISITE CHAIN:
  IT102 (Programming 1) → IT201 (Programming 2) → IT202 (Data Structures)
                                                → IT203 (OOP)
""")
print("Done! Refresh the frontend to test.")
