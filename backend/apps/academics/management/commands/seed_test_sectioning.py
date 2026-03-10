from django.core.management.base import BaseCommand
from django.db import transaction
from apps.accounts.models import User
from apps.students.models import Student, StudentEnrollment
from apps.academics.models import Program, Subject, CurriculumVersion
from apps.terms.models import Term
from apps.grades.models import Grade
from datetime import date
import random

class Command(BaseCommand):
    help = 'Seeds 120 BSIS students with approved subject advising for Phase 8/9 testing'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting manual testing seeder (120 students)...'))
        
        # 1. Get required base data
        active_term = Term.objects.filter(is_active=True).first()
        if not active_term:
            self.stdout.write(self.style.ERROR('No active term found! Please create one first.'))
            return
        
        program = Program.objects.filter(code='BS_Information_Systems').first()
        if not program:
            self.stdout.write(self.style.ERROR('BS_Information_Systems program not found!'))
            return

        curriculum = program.curriculum_versions.filter(is_active=True).first()
        if not curriculum:
            self.stdout.write(self.style.ERROR('Active BSIS curriculum not found!'))
            return
            
        approver = User.objects.filter(role='PROGRAM_HEAD').first()
        if not approver:
            approver = User.objects.filter(role='ADMIN').first()

        # 2. Get subjects for 1st Year, Semester matching the active term
        subjects = Subject.objects.filter(
            curriculum=curriculum,
            year_level=1,
            semester=active_term.semester_type
        )
        
        if not subjects.exists():
            self.stdout.write(self.style.WARNING(f'No subjects found for 1st Year, Semester {active_term.semester_type}.'))
            return

        self.stdout.write(f'Using Term: {active_term.code}')
        self.stdout.write(f'Found {subjects.count()} subjects to seed for each student.')

        # 3. Create 120 students
        students_created = 0
        with transaction.atomic():
            for i in range(1, 121):
                username = f'student{i + 100}' # Using offset to avoid collision with existing seeds
                email = f'{username}@example.com'
                idn = f'2026{str(i + 100).zfill(3)}'
                
                # Check if user already exists
                user, created = User.objects.get_or_create(
                    username=username,
                    defaults={
                        'email': email,
                        'first_name': f'Student',
                        'last_name': f'Tester {i}',
                        'role': 'STUDENT'
                    }
                )
                if created:
                    user.set_password('password123')
                    user.save()

                # Create/Update student profile
                student, s_created = Student.objects.get_or_create(
                    user=user,
                    defaults={
                        'idn': idn,
                        'program': program,
                        'curriculum': curriculum,
                        'student_type': 'FRESHMAN',
                        'status': 'APPROVED',
                        'date_of_birth': date(2005, 1, 1),
                        'gender': random.choice(['MALE', 'FEMALE']),
                        'is_advising_unlocked': True
                    }
                )

                # Create Enrollment
                enrollment, e_created = StudentEnrollment.objects.get_or_create(
                    student=student,
                    term=active_term,
                    defaults={
                        'advising_status': 'APPROVED',
                        'is_regular': True,
                        'year_level': 1,
                        'advising_approved_by': approver
                    }
                )

                # Create Grade (Advising) records
                for subject in subjects:
                    Grade.objects.get_or_create(
                        student=student,
                        subject=subject,
                        term=active_term,
                        defaults={
                            'advising_status': 'APPROVED',
                            'grade_status': 'ADVISING'
                        }
                    )
                
                students_created += 1

        self.stdout.write(self.style.SUCCESS(f'Successfully seeded {students_created} students with approved advising!'))
