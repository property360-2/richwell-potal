import os
import sys
import django
import random
from decimal import Decimal
from datetime import date, timedelta

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.academics.models import (
    Program, Curriculum, CurriculumSubject, Section, 
    Subject
)
from apps.accounts.models import User, StudentProfile
from apps.enrollment.models import Semester, Enrollment, SubjectEnrollment

def run():
    print("🚀 Fixing all grades for demo students...")
    
    # 1. Setup
    program = Program.objects.get(code='BS_Information_Systems')
    curriculum = Curriculum.objects.filter(program=program).first()
    active_semester = Semester.objects.filter(is_current=True).first()
    
    if not active_semester:
        print("Error: No active semester found")
        return

    emails = ['student3rdyear@richwell.edu', 'studentinc@richwell.edu', 'studentretake@richwell.edu']
    
    # 2. Define Semester Mapping for a 3rd Year Student (now in Y3S2)
    # We map (Year, SemNumber) to (Name, AcadYear, Status)
    sem_history = [
        # Year 1
        {'y': 1, 's': 1, 'name': '1st Semester', 'ay': '2022-2023'},
        {'y': 1, 's': 2, 'name': '2nd Semester', 'ay': '2022-2023'},
        {'y': 1, 's': 3, 'name': 'Summer',       'ay': '2022-2023'},
        # Year 2
        {'y': 2, 's': 1, 'name': '1st Semester', 'ay': '2023-2024'},
        {'y': 2, 's': 2, 'name': '2nd Semester', 'ay': '2023-2024'},
        # Year 3
        {'y': 3, 's': 1, 'name': '1st Semester', 'ay': '2024-2025'},
        # Year 3 Second Semester is CURRENT (8e5dfe22-9210-4925-b799-1cba56e6cc7a)
    ]

    for email in emails:
        user = User.objects.filter(email=email).first()
        if not user:
            print(f"Creating {email}...")
            first_name = "Retake" if "retake" in email else email.split("@")[0]
            user = User.objects.create_user(
                email=email,
                password='password123',
                first_name=first_name,
                last_name="Test",
                role='STUDENT',
                username=email.split('@')[0],
                student_number=f"2023-{random.randint(10000, 99999)}"
            )

        print(f"Processing {user.email}...")
        
        # Update Profile to Year 3
        profile, _ = StudentProfile.objects.get_or_create(
            user=user,
            defaults={
                'program': program,
                'curriculum': curriculum,
                'year_level': 3,
                'status': 'ACTIVE',
                'academic_status': 'REGULAR'
            }
        )
        profile.year_level = 3
        profile.status = 'ACTIVE'
        # Try to find a section for them (e.g. BSIS-3A)
        home_section = Section.objects.filter(
            semester=active_semester,
            program=program,
            year_level=3
        ).first()
        if home_section:
            profile.home_section = home_section
        profile.save()


        for h in sem_history:
            # Get or create Semester
            sem, _ = Semester.objects.get_or_create(
                name=h['name'],
                academic_year=h['ay'],
                defaults={
                    'start_date': date(2022, 1, 1), # Placeholder
                    'end_date': date(2022, 5, 1),
                    'status': Semester.TermStatus.ARCHIVED
                }
            )
            
            # Create Enrollment
            enrollment, _ = Enrollment.objects.get_or_create(
                student=user,
                semester=sem,
                defaults={
                    'status': Enrollment.Status.COMPLETED,
                    'created_via': Enrollment.CreatedVia.ONLINE,
                    'monthly_commitment': Decimal('1500.00'),
                    'first_month_paid': True
                }
            )
            enrollment.status = Enrollment.Status.COMPLETED
            enrollment.save()
            
            # Create Section for this semester
            section_name = f"{program.code}-{h['y']}{ 'Summer' if h['s'] == 3 else ('S'+str(h['s'])) }"
            section, _ = Section.objects.get_or_create(
                name=f"{program.code}-{h['y']}A-{h['ay'].replace('-', '')}",
                semester=sem,
                program=program,
                defaults={
                    'year_level': h['y'],
                    'curriculum': curriculum,
                    'capacity': 50
                }
            )

            # Get subjects for this Year/Sem from Curriculum
            cur_subjects = CurriculumSubject.objects.filter(
                curriculum=curriculum,
                year_level=h['y'],
                semester_number=h['s']
            )
            
            for cs in cur_subjects:
                # Set Grade: 1.50 for passed, but handle INC for studentinc in Y2S2
                grade = '1.50'
                status = SubjectEnrollment.Status.PASSED
                
                if 'studentinc' in email and h['y'] == 2 and h['s'] == 2 and cs.subject.code == 'CC223':
                    grade = 'INC'
                    status = SubjectEnrollment.Status.INC
                    
                if 'studentretake' in email and h['y'] == 2 and h['s'] == 2 and cs.subject.code == 'CC223':
                    grade = 'INC'
                    status = SubjectEnrollment.Status.INC
                
                # Create SubjectEnrollment
                from django.utils import timezone
                kwargs = {
                    'section': section,
                    'status': status,
                    'grade': grade,
                    'is_finalized': True
                }
                if status == SubjectEnrollment.Status.INC:
                    if 'studentinc' in email:
                        # Set it to exactly 60 days ago (Not passed retake date)
                        kwargs['inc_marked_at'] = timezone.now() - timedelta(days=60)
                    elif 'studentretake' in email:
                        # Set it to exactly 400 days ago (Passed retake date)
                        kwargs['inc_marked_at'] = timezone.now() - timedelta(days=400)

                se, created = SubjectEnrollment.objects.get_or_create(
                    enrollment=enrollment,
                    subject=cs.subject,
                    defaults=kwargs
                )
                if not created:
                    se.status = status
                    se.grade = grade
                    se.section = section
                    se.is_finalized = True
                    if status == SubjectEnrollment.Status.INC:
                         se.inc_marked_at = kwargs['inc_marked_at']
                    se.save()
            
            print(f"  - Completed Year {h['y']} Sem {h['s']} ({sem})")

    print("✅ All grades fixed!")

if __name__ == "__main__":
    run()
