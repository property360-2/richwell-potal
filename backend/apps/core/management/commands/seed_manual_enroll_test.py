"""
Manual Enrollment Test Seeder
=============================
Sets up a clean environment for testing the manual enrollment workflow.
Creates a BSCS Program, Curriculum, and 3 Test Students who are NOT yet enrolled.

Usage:
    python manage.py seed_manual_enroll_test --wipe
"""

import random
from datetime import date, time
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model
from apps.accounts.models import StudentProfile, ProfessorProfile, DepartmentHeadProfile
from apps.academics.models import Program, Curriculum, Subject, Section, SectionSubject, ScheduleSlot, Room, CurriculumSubject
from apps.enrollment.models import Semester, ExamMonthMapping, SubjectEnrollment, Enrollment

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds data specifically for manual enrollment testing'

    def add_arguments(self, parser):
        parser.add_argument('--wipe', action='store_true', help='Wipe existing manual test data')

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('🚀 Starting Manual Enrollment Test Seeder...'))
        
        with transaction.atomic():
            if options['wipe']:
                self._wipe_data()
            
            # 1. Semester
            semester = self._setup_semester()
            
            # 2. Program & Department
            program, dept_head = self._setup_organization()
            
            # 3. Curriculum
            curriculum = self._setup_curriculum(program)
            
            # 4. Subjects
            subjects = self._setup_subjects(curriculum)
            
            # 5. Offering (Section)
            self._setup_offerings(semester, program, curriculum, subjects)
            
            # 6. Students (NOT enrolled)
            self._create_test_students(program, curriculum)
            
        self.stdout.write(self.style.SUCCESS('\n✅ Success! Manual enrollment environment is ready.'))
        self.stdout.write(self.style.NOTICE('Log in as Registrar to test enrollment for:'))
        self.stdout.write(' - student.freshman@test.com')
        self.stdout.write(' - student.sophomore@test.com')
        self.stdout.write(' - student.transferee@test.com')

    def _wipe_data(self):
        self.stdout.write('🧹 Wiping existing manual test data...')
        test_emails = [
            'student.freshman@test.com', 
            'student.sophomore@test.com', 
            'student.transferee@test.com',
            'head.ccs@test.com',
            'prof.tester@test.com'
        ]
        User.objects.filter(email__in=test_emails).delete()
        # Optionally wipe specific test sections/programs if needed, 
        # but keep it focused to avoid destroying other test data.

    def _setup_semester(self):
        semester, _ = Semester.objects.get_or_create(
            academic_year='2025-2026',
            name='2nd Semester',
            defaults={
                'start_date': date(2025, 11, 1),
                'end_date': date(2026, 4, 30),
                'is_current': True,
                'status': 'ENROLLMENT_OPEN'
            }
        )
        return semester

    def _setup_organization(self):
        # Create CCS Program
        program, _ = Program.objects.get_or_create(
            code='BSCS',
            defaults={'name': 'Bachelor of Science in Computer Science', 'description': 'Main CS program'}
        )
        
        # Create Dept Head
        user, _ = User.objects.get_or_create(
            email='head.ccs@test.com',
            defaults={
                'username': 'head.ccs@test.com',
                'first_name': 'Charles',
                'last_name': 'Science',
                'role': User.Role.DEPARTMENT_HEAD
            }
        )
        user.set_password('password123')
        user.save()
        
        head_profile, _ = DepartmentHeadProfile.objects.get_or_create(user=user)
        head_profile.programs.add(program)
        
        return program, head_profile

    def _setup_curriculum(self, program):
        curriculum, _ = Curriculum.objects.get_or_create(
            program=program,
            name='BSCS Curriculum 2024 Revision',
            defaults={'is_active': True, 'description': 'Latest CS curriculum'}
        )
        return curriculum

    def _setup_subjects(self, curriculum):
        subject_data = [
            {'code': 'CS101', 'title': 'Introduction to Computing', 'units': 3},
            {'code': 'CS102', 'title': 'Computer Programming 1', 'units': 3},
            {'code': 'MATH101', 'title': 'Calculus 1', 'units': 3},
            {'code': 'ENG101', 'title': 'English Composition', 'units': 3},
        ]
        
        subjects = []
        for i, data in enumerate(subject_data):
            subj, _ = Subject.objects.get_or_create(
                code=data['code'],
                defaults={'title': data['title'], 'units': data['units']}
            )
            # Link to curriculum
            CurriculumSubject.objects.get_or_create(
                curriculum=curriculum,
                subject=subj,
                defaults={'year_level': 1, 'semester': '1ST_SEMESTER', 'order': i}
            )
            subjects.append(subj)
        return subjects

    def _setup_offerings(self, semester, program, curriculum, subjects):
        # Create a Section
        section, _ = Section.objects.get_or_create(
            name='BSCS-1A',
            semester=semester,
            defaults={'program': program, 'curriculum': curriculum, 'year_level': 1, 'capacity': 40}
        )
        
        # Create a Professor
        prof_user, _ = User.objects.get_or_create(
            email='prof.tester@test.com',
            defaults={'username': 'prof.tester@test.com', 'first_name': 'Prof', 'last_name': 'Tester', 'role': User.Role.PROFESSOR}
        )
        prof_user.set_password('password123')
        prof_user.save()
        prof_profile, _ = ProfessorProfile.objects.get_or_create(user=prof_user)
        
        # Room
        room, _ = Room.objects.get_or_create(name='LAB-1', defaults={'capacity': 40})
        
        # Link subjects to section and create slots
        for i, subj in enumerate(subjects):
            ss, _ = SectionSubject.objects.get_or_create(
                section=section,
                subject=subj,
                defaults={'professor': prof_user}
            )
            
            # Simple schedule slots (Mon/Wed or Tue/Thu)
            day = 'MON' if i % 2 == 0 else 'TUE'
            ScheduleSlot.objects.get_or_create(
                section_subject=ss,
                day=day,
                start_time=time(8 + (i * 2), 0),
                end_time=time(10 + (i * 2), 0),
                defaults={'room': room}
            )

    def _create_test_students(self, program, curriculum):
        students = [
            {
                'email': 'student.freshman@test.com',
                'first': 'Frankie', 'last': 'Freshman',
                'no': '2026-00001', 'year': 1, 'type': 'REGULAR'
            },
            {
                'email': 'student.sophomore@test.com',
                'first': 'Sally', 'last': 'Sophomore',
                'no': '2025-00001', 'year': 2, 'type': 'REGULAR'
            },
            {
                'email': 'student.transferee@test.com',
                'first': 'Travis', 'last': 'Transferee',
                'no': '2026-T0001', 'year': 2, 'type': 'TRANSFEREE', 
                'prev': 'Old College', 'course': 'BSCS'
            },
        ]
        
        for data in students:
            user, _ = User.objects.get_or_create(
                email=data['email'],
                defaults={
                    'username': data['email'],
                    'first_name': data['first'],
                    'last_name': data['last'],
                    'role': User.Role.STUDENT,
                    # Ensure unique student_number by appending random suffix
                    'student_number': f"{data['no']}-{random.randint(1000, 9999)}"
                }
            )
            user.set_password('password123')
            user.save()
            
            StudentProfile.objects.update_or_create(
                user=user,
                defaults={
                    'program': program,
                    'curriculum': curriculum,
                    'year_level': data['year'],
                    'status': 'ACTIVE',
                    'academic_status': data['type'],
                    'is_transferee': data['type'] == 'TRANSFEREE',
                    'previous_school': data.get('prev', ''),
                    'previous_course': data.get('course', ''),
                    'birthdate': date(2005, 1, 1),
                    'address': 'Test Address 123'
                }
            )
