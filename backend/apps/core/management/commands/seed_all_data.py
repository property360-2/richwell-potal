"""
Comprehensive data seeder for Richwell Portal.
Creates all test accounts, programs, subjects, sections, enrollments, and sample grades.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from decimal import Decimal
from datetime import date, datetime, timedelta
import random

from apps.accounts.models import User, StudentProfile
from apps.academics.models import Program, Subject, Section, ScheduleSlot, SectionSubject
from apps.enrollment.models import (
    Semester, Enrollment, MonthlyPaymentBucket,
    PaymentTransaction, SubjectEnrollment
)


class Command(BaseCommand):
    help = 'Comprehensive data seeder - Creates all test accounts and sample data'

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('  RICHWELL PORTAL - COMPREHENSIVE DATA SEEDER'))
        self.stdout.write(self.style.SUCCESS('=' * 60))

        # Step 1: Create Users
        self.stdout.write('\n[1/9] Creating Test Accounts...')
        users = self.create_users()

        # Step 2: Create Programs
        self.stdout.write('\n[2/9] Creating Academic Programs...')
        programs = self.create_programs()

        # Step 3: Create Semesters (Previous and Current)
        self.stdout.write('\n[3/9] Creating Semesters...')
        semesters = self.create_semesters()

        # Step 4: Create Subjects
        self.stdout.write('\n[4/9] Creating Subjects...')
        subjects = self.create_subjects(programs)

        # Step 5: Create Sections for Previous Semester
        self.stdout.write('\n[5/9] Creating Sections for Previous Semester...')
        prev_sections = self.create_sections(semesters['previous'], subjects, users['professor'], year_sem=1)

        # Step 6: Create Sections for Current Semester
        self.stdout.write('\n[6/9] Creating Sections for Current Semester...')
        curr_sections = self.create_sections(semesters['current'], subjects, users['professor'], year_sem=2)

        # Step 7: Create Student Profile & Previous Enrollment with Grades
        self.stdout.write('\n[7/9] Creating Student Previous Enrollment & Grades...')
        self.create_previous_enrollment(users['student'], programs['BSIT'], semesters['previous'], subjects, users['cashier'])

        # Step 8: Create Student Current Enrollment
        self.stdout.write('\n[8/9] Creating Student Current Enrollment...')
        self.create_current_enrollment(users['student'], programs['BSIT'], semesters['current'], users['cashier'])

        # Step 9: Summary
        self.stdout.write('\n[9/9] Summary')
        self.print_summary()

        self.stdout.write(self.style.SUCCESS('\n' + '=' * 60))
        self.stdout.write(self.style.SUCCESS('  DATA SEEDING COMPLETE!'))
        self.stdout.write(self.style.SUCCESS('=' * 60))

    def create_users(self):
        """Create all test accounts."""
        users = {}

        # Admin
        admin, created = User.objects.get_or_create(
            email='admin@richwell.edu.ph',
            defaults={
                'username': 'admin@richwell.edu.ph',
                'first_name': 'Admin',
                'last_name': 'User',
                'role': User.Role.ADMIN,
                'is_staff': True,
                'is_superuser': True
            }
        )
        if created or True:  # Always reset password
            admin.set_password('admin123')
            admin.save()
        users['admin'] = admin
        self.stdout.write(f'  [+] Admin: admin@richwell.edu.ph / admin123')

        # Registrar
        registrar, created = User.objects.get_or_create(
            email='registrar@richwell.edu.ph',
            defaults={
                'username': 'registrar@richwell.edu.ph',
                'first_name': 'Registrar',
                'last_name': 'Staff',
                'role': User.Role.REGISTRAR,
                'is_staff': True
            }
        )
        if created or True:
            registrar.set_password('registrar123')
            registrar.save()
        users['registrar'] = registrar
        self.stdout.write(f'  [+] Registrar: registrar@richwell.edu.ph / registrar123')

        # Cashier
        cashier, created = User.objects.get_or_create(
            email='cashier@richwell.edu.ph',
            defaults={
                'username': 'cashier@richwell.edu.ph',
                'first_name': 'Cashier',
                'last_name': 'Staff',
                'role': User.Role.CASHIER,
                'is_staff': True
            }
        )
        if created or True:
            cashier.set_password('cashier123')
            cashier.save()
        users['cashier'] = cashier
        self.stdout.write(f'  [+] Cashier: cashier@richwell.edu.ph / cashier123')

        # Professor
        professor, created = User.objects.get_or_create(
            email='professor@richwell.edu.ph',
            defaults={
                'username': 'professor@richwell.edu.ph',
                'first_name': 'Juan',
                'last_name': 'Santos',
                'role': User.Role.PROFESSOR,
                'is_staff': False
            }
        )
        if created or True:
            professor.set_password('prof123')
            professor.save()
        users['professor'] = professor
        self.stdout.write(f'  [+] Professor: professor@richwell.edu.ph / prof123')

        # Student
        try:
            student = User.objects.get(email='student@richwell.edu.ph')
            created = False
        except User.DoesNotExist:
            try:
                # Check if student number exists
                student = User.objects.get(student_number='2025-00001')
                student.email = 'student@richwell.edu.ph'
                student.username = 's2025001@richwell.edu.ph'
                created = False
            except User.DoesNotExist:
                student = User.objects.create(
                    email='student@richwell.edu.ph',
                    username='s2025001@richwell.edu.ph',
                    first_name='Maria',
                    last_name='Dela Cruz',
                    role=User.Role.STUDENT,
                    student_number='2025-00001',
                    is_staff=False
                )
                created = True

        student.set_password('student123')
        student.save()
        users['student'] = student
        self.stdout.write(f'  [+] Student: student@richwell.edu.ph / student123')

        return users

    def create_programs(self):
        """Create academic programs."""
        programs_data = [
            {'code': 'BSIT', 'name': 'Bachelor of Science in Information Technology', 'duration_years': 4},
            {'code': 'BSCS', 'name': 'Bachelor of Science in Computer Science', 'duration_years': 4},
            {'code': 'BSBA', 'name': 'Bachelor of Science in Business Administration', 'duration_years': 4},
            {'code': 'BSA', 'name': 'Bachelor of Science in Accountancy', 'duration_years': 4},
            {'code': 'BSED', 'name': 'Bachelor of Secondary Education', 'duration_years': 4},
            {'code': 'BSHM', 'name': 'Bachelor of Science in Hospitality Management', 'duration_years': 4},
        ]

        programs = {}
        for data in programs_data:
            program, created = Program.objects.get_or_create(
                code=data['code'],
                defaults=data
            )
            programs[data['code']] = program
            status = '[+]' if created else '[o]'
            self.stdout.write(f'  {status} {data["code"]} - {data["name"]}')

        return programs

    def create_semesters(self):
        """Create previous and current semesters."""
        semesters = {}

        # Previous Semester (1st Semester 2024-2025) - COMPLETED
        prev_sem, created = Semester.objects.get_or_create(
            academic_year='2024-2025',
            name='1st Semester',
            defaults={
                'start_date': date(2024, 8, 1),
                'end_date': date(2024, 12, 15),
                'enrollment_start_date': date(2024, 7, 1),
                'enrollment_end_date': date(2024, 8, 31),
                'is_current': False
            }
        )
        semesters['previous'] = prev_sem
        status = '[+]' if created else '[o]'
        self.stdout.write(f'  {status} {prev_sem.name} {prev_sem.academic_year} (Previous - Completed)')

        # Current Semester (2nd Semester 2024-2025) - ACTIVE
        curr_sem, created = Semester.objects.get_or_create(
            academic_year='2024-2025',
            name='2nd Semester',
            defaults={
                'start_date': date(2025, 1, 6),
                'end_date': date(2025, 5, 15),
                'enrollment_start_date': date(2024, 12, 1),
                'enrollment_end_date': date(2025, 1, 31),
                'is_current': True
            }
        )
        semesters['current'] = curr_sem

        # Set all other semesters to not current
        Semester.objects.exclude(id=curr_sem.id).update(is_current=False)

        status = '[+]' if created else '[o]'
        self.stdout.write(f'  {status} {curr_sem.name} {curr_sem.academic_year} (Current - Active)')

        return semesters

    def create_subjects(self, programs):
        """Create subjects for BSIT program with proper prerequisites."""
        bsit = programs['BSIT']

        subjects_data = [
            # Year 1, Sem 1 (Previous Semester - Student Already Passed These)
            {'code': 'GE-ERNS', 'title': 'Readings in Philippine History', 'units': 3, 'is_major': False, 'year_level': 1, 'semester_number': 1},
            {'code': 'GE-MMW', 'title': 'Mathematics in the Modern World', 'units': 3, 'is_major': False, 'year_level': 1, 'semester_number': 1},
            {'code': 'IT101', 'title': 'Introduction to Computing', 'units': 3, 'is_major': True, 'year_level': 1, 'semester_number': 1},
            {'code': 'IT102', 'title': 'Computer Programming 1', 'units': 3, 'is_major': True, 'year_level': 1, 'semester_number': 1},
            {'code': 'PE1', 'title': 'Physical Education 1', 'units': 2, 'is_major': False, 'year_level': 1, 'semester_number': 1},
            {'code': 'NSTP1', 'title': 'National Service Training Program 1', 'units': 3, 'is_major': False, 'year_level': 1, 'semester_number': 1},

            # Year 1, Sem 2 (Current Semester - Student Can Enroll)
            {'code': 'IT103', 'title': 'Computer Programming 2', 'units': 3, 'is_major': True, 'year_level': 1, 'semester_number': 2},
            {'code': 'IT104', 'title': 'Data Structures and Algorithms', 'units': 3, 'is_major': True, 'year_level': 1, 'semester_number': 2},
            {'code': 'GE-UTS', 'title': 'Understanding the Self', 'units': 3, 'is_major': False, 'year_level': 1, 'semester_number': 2},
            {'code': 'GE-PURP', 'title': 'Purposive Communication', 'units': 3, 'is_major': False, 'year_level': 1, 'semester_number': 2},
            {'code': 'PE2', 'title': 'Physical Education 2', 'units': 2, 'is_major': False, 'year_level': 1, 'semester_number': 2},
            {'code': 'NSTP2', 'title': 'National Service Training Program 2', 'units': 3, 'is_major': False, 'year_level': 1, 'semester_number': 2},

            # Year 2, Sem 1 (Future - For testing locked prerequisites)
            {'code': 'IT201', 'title': 'Object-Oriented Programming', 'units': 3, 'is_major': True, 'year_level': 2, 'semester_number': 1},
            {'code': 'IT202', 'title': 'Web Development 1', 'units': 3, 'is_major': True, 'year_level': 2, 'semester_number': 1},
        ]

        subjects = {}
        for data in subjects_data:
            subject, created = Subject.objects.get_or_create(
                program=bsit,
                code=data['code'],
                defaults=data
            )
            subjects[data['code']] = subject
            status = '[+]' if created else '[o]'
            self.stdout.write(f'  {status} {data["code"]} - {data["title"]} ({data["units"]} units)')

        # Set up prerequisites
        self.stdout.write('\n  Setting up prerequisites...')
        prerequisites = {
            'IT103': ['IT102'],  # Programming 2 requires Programming 1
            'IT104': ['IT102'],  # Data Structures requires Programming 1
            'PE2': ['PE1'],      # PE2 requires PE1
            'NSTP2': ['NSTP1'],  # NSTP2 requires NSTP1
            'IT201': ['IT103'],  # OOP requires Programming 2
            'IT202': ['IT101'],  # Web Dev requires Intro to Computing
        }

        for subject_code, prereq_codes in prerequisites.items():
            if subject_code in subjects:
                subject = subjects[subject_code]
                for prereq_code in prereq_codes:
                    if prereq_code in subjects:
                        subject.prerequisites.add(subjects[prereq_code])
                        self.stdout.write(f'    - {subject_code} requires {prereq_code}')

        return subjects

    def create_sections(self, semester, subjects, professor, year_sem=1):
        """Create sections with schedules."""

        # Sections for Year 1 Semester 1
        if year_sem == 1:
            sections_data = [
                {'subject_code': 'GE-ERNS', 'section_name': 'IT1-1', 'capacity': 40, 'day': 'MON', 'start_time': '07:00', 'end_time': '10:00', 'room': 'Room 201'},
                {'subject_code': 'GE-MMW', 'section_name': 'IT1-1', 'capacity': 40, 'day': 'MON', 'start_time': '10:00', 'end_time': '13:00', 'room': 'Room 202'},
                {'subject_code': 'IT101', 'section_name': 'IT1-1', 'capacity': 40, 'day': 'TUE', 'start_time': '07:00', 'end_time': '10:00', 'room': 'Lab 1'},
                {'subject_code': 'IT102', 'section_name': 'IT1-1', 'capacity': 40, 'day': 'WED', 'start_time': '07:00', 'end_time': '10:00', 'room': 'Lab 2'},
                {'subject_code': 'PE1', 'section_name': 'IT1-1', 'capacity': 40, 'day': 'THU', 'start_time': '07:00', 'end_time': '09:00', 'room': 'Gym'},
                {'subject_code': 'NSTP1', 'section_name': 'IT1-1', 'capacity': 60, 'day': 'SAT', 'start_time': '07:00', 'end_time': '10:00', 'room': 'Field'},
            ]

        # Sections for Year 1 Semester 2
        else:
            sections_data = [
                {'subject_code': 'IT103', 'section_name': 'IT1-2', 'capacity': 40, 'day': 'MON', 'start_time': '07:00', 'end_time': '10:00', 'room': 'Lab 2'},
                {'subject_code': 'IT104', 'section_name': 'IT1-2', 'capacity': 40, 'day': 'TUE', 'start_time': '07:00', 'end_time': '10:00', 'room': 'Lab 1'},
                {'subject_code': 'GE-UTS', 'section_name': 'IT1-2', 'capacity': 40, 'day': 'WED', 'start_time': '07:00', 'end_time': '10:00', 'room': 'Room 201'},
                {'subject_code': 'GE-PURP', 'section_name': 'IT1-2', 'capacity': 40, 'day': 'THU', 'start_time': '07:00', 'end_time': '10:00', 'room': 'Room 202'},
                {'subject_code': 'PE2', 'section_name': 'IT1-2', 'capacity': 40, 'day': 'FRI', 'start_time': '07:00', 'end_time': '09:00', 'room': 'Gym'},
                {'subject_code': 'NSTP2', 'section_name': 'IT1-2', 'capacity': 60, 'day': 'SAT', 'start_time': '07:00', 'end_time': '10:00', 'room': 'Field'},
            ]

        sections = []
        for data in sections_data:
            subject = subjects.get(data['subject_code'])
            if not subject:
                continue

            section, created = Section.objects.get_or_create(
                semester=semester,
                name=data['section_name'],
                defaults={
                    'capacity': data['capacity'],
                    'year_level': 1,
                    'program': subject.program
                }
            )

            # Create SectionSubject link
            section_subject, ss_created = SectionSubject.objects.get_or_create(
                section=section,
                subject=subject,
                defaults={'professor': professor}
            )

            # Create schedule slot
            schedule, sch_created = ScheduleSlot.objects.get_or_create(
                section_subject=section_subject,
                day=data['day'],
                defaults={
                    'start_time': data['start_time'],
                    'end_time': data['end_time'],
                    'room': data['room']
                }
            )

            sections.append(section)
            status = '[+]' if created else '[o]'
            self.stdout.write(f'  {status} {section.name} - {subject.code} ({data["day"]} {data["start_time"]}-{data["end_time"]})')

        return sections

    def create_previous_enrollment(self, student, program, semester, subjects, cashier):
        """Create student enrollment for previous semester with completed grades."""

        # Create student profile
        profile, created = StudentProfile.objects.get_or_create(
            user=student,
            defaults={
                'program': program,
                'year_level': 1,
                'birthdate': date(2005, 5, 15),
                'address': '123 Main St, Manila, Philippines',
                'contact_number': '09171234567'
            }
        )
        # Always update program to ensure consistency
        if not created and profile.program != program:
            profile.program = program
            profile.save()
        status = '[+]' if created else '[o]'
        self.stdout.write(f'  {status} Student Profile for {student.get_full_name()}')

        # Create previous semester enrollment
        prev_enrollment, created = Enrollment.objects.get_or_create(
            student=student,
            semester=semester,
            defaults={
                'status': Enrollment.Status.ACTIVE,
                'monthly_commitment': Decimal('5000.00')
            }
        )
        status = '[+]' if created else '[o]'
        self.stdout.write(f'  {status} Previous Enrollment for {semester}')

        # Create payment buckets and mark all as paid
        if created or MonthlyPaymentBucket.objects.filter(enrollment=prev_enrollment).count() == 0:
            for month in range(1, 7):
                bucket, bucket_created = MonthlyPaymentBucket.objects.get_or_create(
                    enrollment=prev_enrollment,
                    month_number=month,
                    defaults={
                        'required_amount': Decimal('5000.00'),
                        'paid_amount': Decimal('5000.00'),  # All paid
                        'is_fully_paid': True
                    }
                )
            self.stdout.write(f'  [+] Created 6 payment buckets (All PAID)')

        # Enroll in all Year 1 Sem 1 subjects with passing grades
        sem1_subjects = ['GE-ERNS', 'GE-MMW', 'IT101', 'IT102', 'PE1', 'NSTP1']
        grades = [1.75, 2.0, 1.5, 2.25, 1.0, 1.25]  # Passing grades

        self.stdout.write(f'\n  Enrolling in {len(sem1_subjects)} subjects with grades:')

        for subject_code, grade in zip(sem1_subjects, grades):
            subject = subjects.get(subject_code)
            if not subject:
                continue

            # Find section for this subject in previous semester
            section = Section.objects.filter(
                semester=semester,
                section_subjects__subject=subject
            ).first()

            if not section:
                continue

            # Create subject enrollment with PASSED status and grade
            subj_enrollment, se_created = SubjectEnrollment.objects.get_or_create(
                enrollment=prev_enrollment,
                subject=subject,
                section=section,
                defaults={
                    'status': SubjectEnrollment.Status.PASSED,
                    'grade': Decimal(str(grade)),
                    'is_finalized': True,
                    'finalized_at': datetime.now(),
                }
            )

            status = '[+]' if se_created else '[o]'
            self.stdout.write(f'    {status} {subject_code}: {grade} (PASSED)')

    def create_current_enrollment(self, student, program, semester, cashier):
        """Create student enrollment for current semester (NO payment yet)."""

        # Create current semester enrollment
        enrollment, created = Enrollment.objects.get_or_create(
            student=student,
            semester=semester,
            defaults={
                'status': Enrollment.Status.ACTIVE,
                'monthly_commitment': Decimal('5000.00')
            }
        )
        status = '[+]' if created else '[o]'
        self.stdout.write(f'  {status} Current Enrollment for {semester}')

        # Create 6 payment buckets - NO PAYMENT YET (to test pending enrollment)
        if created or MonthlyPaymentBucket.objects.filter(enrollment=enrollment).count() == 0:
            for month in range(1, 7):
                bucket, bucket_created = MonthlyPaymentBucket.objects.get_or_create(
                    enrollment=enrollment,
                    month_number=month,
                    defaults={
                        'required_amount': Decimal('5000.00'),
                        'paid_amount': Decimal('0.00'),  # NO PAYMENT
                        'is_fully_paid': False
                    }
                )
            self.stdout.write(f'  [+] Created 6 payment buckets (NOT PAID - for testing)')

    def print_summary(self):
        """Print summary of created data."""
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(self.style.SUCCESS('  TEST ACCOUNTS'))
        self.stdout.write('=' * 60)
        self.stdout.write('  Admin:      admin@richwell.edu.ph / admin123')
        self.stdout.write('  Registrar:  registrar@richwell.edu.ph / registrar123')
        self.stdout.write('  Cashier:    cashier@richwell.edu.ph / cashier123')
        self.stdout.write('  Professor:  professor@richwell.edu.ph / prof123')
        self.stdout.write('  Student:    student@richwell.edu.ph / student123')

        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(self.style.SUCCESS('  TEST SCENARIO'))
        self.stdout.write('=' * 60)
        self.stdout.write('  Student has PASSED Year 1 Semester 1 (6 subjects with grades)')
        self.stdout.write('  Student is CURRENTLY ENROLLED in Year 1 Semester 2')
        self.stdout.write('  Student has NOT PAID Month 1 yet')
        self.stdout.write('  Student CAN enroll in subjects (will be PENDING_PAYMENT status)')
        self.stdout.write('  IT103 and IT104 require IT102 (passed) - Student CAN enroll')
        self.stdout.write('  PE2 requires PE1 (passed) - Student CAN enroll')
        self.stdout.write('  NSTP2 requires NSTP1 (passed) - Student CAN enroll')

        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(self.style.SUCCESS('  QUICK START'))
        self.stdout.write('=' * 60)
        self.stdout.write('  1. Login as student: http://localhost:3000/login.html')
        self.stdout.write('  2. Go to Subject Enrollment: http://localhost:3000/subject-enrollment.html')
        self.stdout.write('  3. Enroll in subjects (will be marked PENDING_PAYMENT)')
        self.stdout.write('  4. Login as cashier and process payment to auto-approve')
        self.stdout.write('')
