import csv
import random
import re
from datetime import date, time
from django.core.management.base import BaseCommand
from django.db import transaction
from django.conf import settings
import os

from apps.accounts.models import User, StudentProfile, ProfessorProfile
from apps.academics.models import (
    Program, Subject, Curriculum, CurriculumVersion, CurriculumSubject,
    Section, SectionSubject, SectionSubjectProfessor, ScheduleSlot, Room
)
from apps.enrollment.models import Semester
from decimal import Decimal


class Command(BaseCommand):
    help = 'Seeds database dynamically from documentation/curriculum.csv'

    def add_arguments(self, parser):
        parser.add_argument('--flush', action='store_true', help='Clear existing data before seeding')

    def handle(self, *args, **options):
        if options['flush']:
            self.stdout.write('Clearing existing data...')
            self._flush_database()

        csv_path = os.path.join(settings.BASE_DIR.parent, 'documentation', 'curriculum.csv')
        if not os.path.exists(csv_path):
            self.stdout.write(self.style.ERROR(f'CSV file not found at {csv_path}'))
            return

        with transaction.atomic():
            self.stdout.write('Creating users...')
            self._create_users()

            self.stdout.write('Setting up active semester...')
            semester = self._setup_semester()

            self.stdout.write('Parsing curriculum.csv...')
            self._parse_and_seed_csv(csv_path, semester)

            self.stdout.write('Generating Sections and Schedules...')
            self._generate_sections_and_schedules(semester)
            
            self.stdout.write(self.style.SUCCESS('\nSuccessfully seeded from CSV!'))
            self.stdout.write(self.style.SUCCESS(f'Login as Student: student1@richwell.edu.ph (pass: password123)'))
            self.stdout.write(self.style.SUCCESS(f'Login as Admin: admin@richwell.edu.ph (pass: admin123)'))

    def _flush_database(self):
        # We need to delete Enrollment-related records to avoid ProtectedError for Semester
        from apps.enrollment.models import Enrollment, SubjectEnrollment, EnrollmentDocument, MonthlyPaymentBucket
        from apps.enrollment.models_payments import PaymentTransaction
        
        # Enrollment records
        EnrollmentDocument.objects.all().delete()
        PaymentTransaction.objects.all().delete()
        MonthlyPaymentBucket.objects.all().delete()
        SubjectEnrollment.objects.all().delete()
        Enrollment.objects.all().delete()

        # Keep superusers if any, just clear profiles and test users
        StudentProfile.objects.all().delete()
        ProfessorProfile.objects.all().delete()
        User.objects.filter(role__in=['STUDENT', 'PROFESSOR']).delete()

        # Academics records
        ScheduleSlot.objects.all().delete()
        SectionSubjectProfessor.objects.all().delete()
        SectionSubject.objects.all().delete()
        Section.objects.all().delete()
        Semester.objects.all().delete()
        CurriculumSubject.objects.all().delete()
        CurriculumVersion.objects.all().delete()
        Curriculum.objects.all().delete()
        Subject.objects.all().delete()
        Program.objects.all().delete()
        Room.objects.all().delete()

    def _create_users(self):
        # Admin
        if not User.objects.filter(email='admin@richwell.edu.ph').exists():
            admin = User.objects.create_superuser(
                username='admin',
                email='admin@richwell.edu.ph',
                password='admin123',
            )
            admin.first_name = 'System'
            admin.last_name = 'Admin'
            admin.role = 'ADMIN'
            admin.save()

        # Professors
        self.professors = []
        for i in range(1, 6):
            email = f'prof{i}@richwell.edu.ph'
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': f'prof{i}',
                    'first_name': f'Prof{i}',
                    'last_name': 'Teacher',
                    'role': 'PROFESSOR',
                    'is_staff': True
                }
            )
            if created:
                user.set_password('password123')
                user.save()
            ProfessorProfile.objects.get_or_create(user=user)
            self.professors.append(user)

        # Test Student (will be assigned a program later)
        self.test_student, created = User.objects.get_or_create(
            email='student1@richwell.edu.ph',
            defaults={
                'username': 'student1',
                'first_name': 'Test',
                'last_name': 'Student',
                'role': 'STUDENT'
            }
        )
        if created:
            self.test_student.set_password('password123')
            self.test_student.save()

    def _setup_semester(self):
        semester, created = Semester.objects.get_or_create(
            academic_year='2024-2025',
            name='1st Semester',
            defaults={
                'start_date': date(2024, 8, 1),
                'end_date': date(2024, 12, 15),
                'enrollment_start_date': date(2024, 7, 1),
                'enrollment_end_date': date(2024, 8, 15),
                'status': Semester.TermStatus.ENROLLMENT_OPEN,
                'is_current': True
            }
        )
        if not created:
            semester.status = Semester.TermStatus.ENROLLMENT_OPEN
            semester.is_current = True
            semester.save()
            
        Semester.objects.exclude(id=semester.id).update(is_current=False)
        return semester

    def _parse_year_semester(self, year_sem_str):
        """Parses '1st Year - 1st Semester' into (1, 1). Defaults to (1,1) if format unrecognized."""
        year_level, semester_number = 1, 1
        
        if '1st Year' in year_sem_str: year_level = 1
        elif '2nd Year' in year_sem_str: year_level = 2
        elif '3rd Year' in year_sem_str: year_level = 3
        elif '4th Year' in year_sem_str: year_level = 4
        
        if '1st Semester' in year_sem_str: semester_number = 1
        elif '2nd Semester' in year_sem_str: semester_number = 2
        elif 'Summer' in year_sem_str: semester_number = 3
            
        return year_level, semester_number

    def _parse_and_seed_csv(self, csv_filepath, active_semester):
        prerequisites_map = {} # subject_obj -> [prereq_codes]
        
        with open(csv_filepath, mode='r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            for row in reader:
                program_name = row['Program'].strip()
                year_sem_str = row['Year_Semester'].strip()
                subject_code = row['Program_Code'].strip()
                subject_title = row['Subject_Description'].strip()
                
                # Handle potentially empty units
                try:
                    units = int(row['Total_Units'].strip()) if row['Total_Units'].strip() else 3
                except ValueError:
                    units = 3

                prereq_str = row.get('Prerequisites', '').strip()

                if not subject_code or not program_name:
                    continue
                    
                year_level, sem_number = self._parse_year_semester(year_sem_str)

                # Get or Create Program
                program, _ = Program.objects.get_or_create(
                    code=program_name,
                    defaults={
                        'name': f'Bachelor of Science in {program_name.replace("_", " ")}',
                        'duration_years': 4
                    }
                )

                # Get or create Curriculum
                curriculum, _ = Curriculum.objects.get_or_create(
                    program=program,
                    code='REV1',
                    defaults={
                        'name': f'{program.code} Revised Curriculum',
                        'effective_year': 2020,
                        'is_active': True
                    }
                )

                # Get or Create Subject
                subject, created = Subject.objects.get_or_create(
                    code=subject_code,
                    defaults={
                        'program': program,
                        'title': subject_title,
                        'units': units,
                        'year_level': year_level,
                        'semester_number': sem_number,
                    }
                )
                
                # If subject already existed in another program, add this program to its list
                if not created:
                    subject.programs.add(program)
                    # If the existing subject is in a different year/sem, we keep the original definition
                    # but maybe we should update units if they changed? Not critical for seed.

                # Link Subject to Curriculum
                if not CurriculumSubject.objects.filter(curriculum=curriculum, subject=subject).exists():
                    CurriculumSubject.objects.create(
                        curriculum=curriculum,
                        subject=subject,
                        year_level=year_level,
                        semester_number=sem_number,
                        is_required=True
                    )

                # Store prereqs for later resolution
                if prereq_str and prereq_str.lower() not in ['none', '', 'n/a']:
                    prerequisites_map[subject] = prereq_str

        # Resolve Prerequisites
        self.stdout.write('  Resolving prerequisites...')
        for subject, prereq_str in prerequisites_map.items():
            # Clean up prereq string (split by comma or &)
            # Remove text in parenthesis if any
            clean_str = re.sub(r'\(.*?\)', '', prereq_str)
            prereq_codes = [p.strip() for p in re.split(r',|&| and ', clean_str) if p.strip()]
            
            for p_code_raw in prereq_codes:
                # Try to find exactly, or case-insensitive
                prereqs = Subject.objects.filter(code__iexact=p_code_raw)
                if prereqs.exists():
                    subject.prerequisites.add(prereqs.first())

        # Link first test student to first loaded program/curriculum
        first_program = Program.objects.first()
        first_curriculum = Curriculum.objects.first()
        if first_program and not StudentProfile.objects.filter(user=self.test_student).exists():
            self.test_student.student_number = '2024-0001'
            self.test_student.save()
            
            StudentProfile.objects.create(
                user=self.test_student,
                program=first_program,
                curriculum=first_curriculum,
                year_level=1,
            )

    def _generate_sections_and_schedules(self, semester):
        # Create Room
        room, _ = Room.objects.get_or_create(name='Room 101', defaults={'capacity': 40})
        
        programs = Program.objects.all()
        for program in programs:
            curriculum = program.curricula.filter(is_active=True).first()
            if not curriculum:
                continue

            # Need 1st year subjects for this program (because our test student is 1st year)
            curr_subjects = curriculum.curriculum_subjects.filter(
                year_level=1, 
                semester_number=1 # Assuming we are seeding for 1st sem
            )
            
            if not curr_subjects.exists():
                curr_subjects = curriculum.curriculum_subjects.filter(year_level=1)

            # Create an AM Section
            section_am, _ = Section.objects.get_or_create(
                name=f'{program.code}-1A',
                semester=semester,
                defaults={
                    'program': program,
                    'curriculum': curriculum,
                    'year_level': 1,
                    'capacity': 40,
                    'shift': Section.Shift.AM
                }
            )

            # Create a PM Section
            section_pm, _ = Section.objects.get_or_create(
                name=f'{program.code}-1B',
                semester=semester,
                defaults={
                    'program': program,
                    'curriculum': curriculum,
                    'year_level': 1,
                    'capacity': 40,
                    'shift': Section.Shift.PM
                }
            )

            # Create SectionSubjects and Schedules
            for cs in curr_subjects:
                # AM
                ss_am, _ = SectionSubject.objects.get_or_create(
                    section=section_am,
                    subject=cs.subject,
                    defaults={'capacity': 40}
                )
                self._assign_prof(ss_am)
                self._create_schedule(ss_am, room, 'AM')

                # PM
                ss_pm, _ = SectionSubject.objects.get_or_create(
                    section=section_pm,
                    subject=cs.subject,
                    defaults={'capacity': 40}
                )
                self._assign_prof(ss_pm)
                self._create_schedule(ss_pm, room, 'PM')

    def _assign_prof(self, section_subject):
        prof = random.choice(self.professors)
        SectionSubjectProfessor.objects.get_or_create(
            section_subject=section_subject,
            professor=prof,
            defaults={'is_primary': True}
        )

    def _create_schedule(self, section_subject, room, shift):
        if not ScheduleSlot.objects.filter(section_subject=section_subject).exists():
            # Simplistic schedule: Mon/Wed or Tue/Thu based on shift
            day1, day2 = ('MON', 'WED') if random.choice([True, False]) else ('TUE', 'THU')
            
            if shift == 'AM':
                start = time(random.randint(7, 10), 0)
                end = time(start.hour + 1, start.minute) # 1 hour class
            else:
                start = time(random.randint(13, 16), 0)
                end = time(start.hour + 1, start.minute)

            for day in [day1, day2]:
                 ScheduleSlot.objects.create(
                    section_subject=section_subject,
                    day=day,
                    start_time=start,
                    end_time=end,
                    room=room.name
                )
