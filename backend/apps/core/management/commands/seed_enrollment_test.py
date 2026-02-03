"""
Comprehensive Enrollment Test Seeder
=====================================
Creates test data for enrollment testing with period: Jan 18 - Feb 18, 2026

Features:
- 2 Programs (BSIT, BSCS) with 2 curricula each
- 24 Sections (3 per year level)
- Conflict-free schedule generation
- 55+ students with diverse scenarios
- Complete test users in all roles

Usage:
    python manage.py seed_enrollment_test           # Additive seed
    python manage.py seed_enrollment_test --wipe    # Wipe and reseed
    python manage.py seed_enrollment_test --minimal # Minimal data
"""

import random
from datetime import time, date, timedelta
from decimal import Decimal
from collections import defaultdict

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction, models
from django.contrib.auth import get_user_model

from apps.accounts.models import (
    StudentProfile, ProfessorProfile,
    Permission, PermissionCategory, UserPermission
)
from apps.academics.models import (
    Program, Curriculum, Subject, Section, SectionSubject,
    ScheduleSlot, Room, CurriculumSubject, CurriculumVersion
)
from apps.enrollment.models import (
    Enrollment, SubjectEnrollment, Semester, MonthlyPaymentBucket,
    PaymentTransaction, ExamMonthMapping, GradeHistory, OverloadRequest
)

User = get_user_model()


class Command(BaseCommand):
    help = 'Seeds database with comprehensive enrollment test data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--wipe',
            action='store_true',
            help='Wipe all existing data before seeding'
        )
        parser.add_argument(
            '--minimal',
            action='store_true',
            help='Create minimal data set for quick testing'
        )

    def handle(self, *args, **options):
        self.wipe = options.get('wipe', False)
        self.minimal = options.get('minimal', False)
        
        self.stdout.write(self.style.WARNING('='*60))
        self.stdout.write(self.style.WARNING('  Enrollment Test Seeder - Jan 18 to Feb 18, 2026'))
        self.stdout.write(self.style.WARNING('='*60))
        
        if self.wipe:
            self.stdout.write(self.style.ERROR('⚠️  WARNING: This will wipe ALL existing data!'))
        
        with transaction.atomic():
            if self.wipe:
                self._wipe_all_data()
            
            # Phase 1: Foundation
            self._create_semester()
            self._create_rooms()
            self._create_exam_mappings()
            
            # Phase 2: Programs & Curricula
            self._create_programs()
            self._create_curricula()
            
            # Phase 3: Subjects
            self._create_subjects()
            self._link_curriculum_subjects()
            
            # Phase 4: Users
            self._create_staff_users()
            self._create_professors()
            
            # Phase 5: Sections
            self._create_sections()
            
            # Phase 6: Schedules
            self._generate_schedules()
            
            # Phase 7-12: Students
            self._create_students()
            
            # Phase 13: Enrollments
            self._create_enrollments()
            
            # Phase 14: Payments
            self._create_payments()
            
            self._print_summary()
        
        self.stdout.write(self.style.SUCCESS('\n✓ Seeding completed successfully!'))

    # =========================================================================
    # WIPE DATA
    # =========================================================================
    
    def _wipe_all_data(self):
        self.stdout.write('\n🗑️  Wiping existing data...')
        
        # Reverse dependency order
        GradeHistory.objects.all().delete()
        PaymentTransaction.objects.all().delete()
        SubjectEnrollment.objects.all().delete()
        MonthlyPaymentBucket.objects.all().delete()
        OverloadRequest.objects.all().delete()
        Enrollment.objects.all().delete()
        ScheduleSlot.objects.all().delete()
        SectionSubject.objects.all().delete()
        StudentProfile.objects.all().delete()
        Section.all_objects.all().delete()
        CurriculumSubject.objects.all().delete()
        CurriculumVersion.objects.all().delete()
        Subject.objects.all().delete()
        Curriculum.objects.all().delete()
        ProfessorProfile.objects.all().delete()
        Program.objects.all().delete()
        Room.objects.all().delete()
        ExamMonthMapping.objects.all().delete()
        Semester.objects.all().delete()
        
        # Users (except superusers)
        User.objects.filter(is_superuser=False).delete()
        
        self.stdout.write(self.style.SUCCESS('   ✓ Data wiped'))

    # =========================================================================
    # PHASE 1: FOUNDATION
    # =========================================================================
    
    def _create_semester(self):
        self.stdout.write('\n📦 Phase 1: Foundation...')
        
        # Create enrollment semester: Jan 18 - Feb 18, 2026
        self.semester, _ = Semester.objects.get_or_create(
            name='2nd Semester',
            academic_year='2025-2026',
            defaults={
                'start_date': date(2026, 1, 5),
                'end_date': date(2026, 5, 30),
                'enrollment_start_date': date(2026, 1, 18),  # Jan 18
                'enrollment_end_date': date(2026, 2, 18),    # Feb 18
                'grading_start_date': date(2026, 4, 1),
                'grading_end_date': date(2026, 6, 15),
                'status': 'ENROLLMENT_OPEN',
                'is_current': True
            }
        )
        
        # Ensure only this semester is current
        Semester.objects.exclude(pk=self.semester.pk).update(is_current=False)
        
        self.stdout.write(f'   - Created semester: {self.semester.name} {self.semester.academic_year}')
        self.stdout.write(f'   - Enrollment: {self.semester.enrollment_start_date} to {self.semester.enrollment_end_date}')
        self.stdout.write(f'   - Status: {self.semester.status}')

    def _create_rooms(self):
        """Create 15 rooms (10 lecture, 5 labs)."""
        self.rooms = []
        
        # Lecture rooms
        for i in range(1, 11):
            room, _ = Room.objects.get_or_create(
                name=f'Room {100 + i}',
                defaults={
                    'capacity': 40,
                    'room_type': 'LECTURE',
                    'is_active': True
                }
            )
            self.rooms.append(room)
        
        # Computer labs
        for i in range(1, 6):
            room, _ = Room.objects.get_or_create(
                name=f'CompLab {i}',
                defaults={
                    'capacity': 35,
                    'room_type': 'LABORATORY',
                    'is_active': True
                }
            )
            self.rooms.append(room)
        
        self.stdout.write(f'   - Created {len(self.rooms)} rooms')

    def _create_exam_mappings(self):
        """Create exam period mappings."""
        mappings = [
            ('PRELIM', 1),
            ('MIDTERM', 2),
            ('PREFINAL', 4),
            ('FINAL', 6),
        ]
        
        for exam_period, month in mappings:
            ExamMonthMapping.objects.get_or_create(
                semester=self.semester,
                exam_period=exam_period,
                defaults={'required_month': month, 'is_active': True}
            )
        
        self.stdout.write('   ✓ Foundation complete')

    # =========================================================================
    # PHASE 2: PROGRAMS & CURRICULA
    # =========================================================================
    
    def _create_programs(self):
        self.stdout.write('\n🎓 Phase 2: Programs & Curricula...')
        
        programs_data = [
            ('BSIT', 'Bachelor of Science in Information Technology', 4),
            ('BSCS', 'Bachelor of Science in Computer Science', 4),
        ]
        
        self.programs = {}
        for code, name, years in programs_data:
            program, _ = Program.objects.get_or_create(
                code=code,
                defaults={
                    'name': name,
                    'description': f'{name} program at Richwell Colleges',
                    'duration_years': years,
                    'is_active': True
                }
            )
            self.programs[code] = program
        
        self.stdout.write(f'   - Created {len(self.programs)} programs')

    def _create_curricula(self):
        """Create 2 curricula per program (2024 and 2025)."""
        self.curricula = {}
        
        for code, program in self.programs.items():
            # 2024 Revision
            curr_2024, _ = Curriculum.objects.get_or_create(
                program=program,
                code='2024-REV',
                defaults={
                    'name': f'{code} Curriculum 2024 Revision',
                    'description': f'Standard curriculum for {code}',
                    'effective_year': 2024,
                    'is_active': True
                }
            )
            self.curricula[f'{code}_2024'] = curr_2024
            
            # 2025 Update
            curr_2025, _ = Curriculum.objects.get_or_create(
                program=program,
                code='2025-UPDATE',
                defaults={
                    'name': f'{code} Curriculum 2025 Update',
                    'description': f'Updated curriculum with revised placement for {code}',
                    'effective_year': 2025,
                    'is_active': True
                }
            )
            self.curricula[f'{code}_2025'] = curr_2025
        
        self.stdout.write(f'   - Created {len(self.curricula)} curricula')

    # =========================================================================
    # PHASE 3: SUBJECTS
    # =========================================================================
    
    def _create_subjects(self):
        self.stdout.write('\n📚 Phase 3: Subjects...')
        
        self.subjects = {}
        
        # Create BSIT subjects
        self._create_bsit_subjects()
        
        # Create BSCS subjects
        self._create_bscs_subjects()
        
        self.stdout.write(f'   - Created {len(self.subjects)} subjects')

    def _create_bsit_subjects(self):
        """Create BSIT subjects with prerequisites."""
        bsit = self.programs['BSIT']
        
        # (code, title, units, year, sem, is_major, prereqs)
        subjects_data = [
            # Year 1 Semester 1
            ('CS101', 'Introduction to Computing', 3, 1, 1, True, []),
            ('CS102', 'Computer Programming 1', 3, 1, 1, True, []),
            ('IT102', 'Computing and Professional Ethics', 3, 1, 1, True, []),  # 2025 exclusive
            ('MATH101', 'College Algebra', 3, 1, 1, False, []),
            ('ENG101', 'Communication Skills 1', 3, 1, 1, False, []),
            ('FIL101', 'Komunikasyon sa Filipino', 3, 1, 1, False, []),
            ('PE101', 'Physical Education 1', 2, 1, 1, False, []),
            
            # Year 1 Semester 2
            ('CS103', 'Computer Programming 2', 3, 1, 2, True, ['CS102']),
            ('IT101', 'IT Fundamentals', 3, 1, 2, True, ['CS101']),
            ('MATH102', 'Plane Trigonometry', 3, 1, 2, False, ['MATH101']),
            ('ENG102', 'Communication Skills 2', 3, 1, 2, False, ['ENG101']),
            ('FIL102', 'Pagbasa at Pagsulat', 3, 1, 2, False, ['FIL101']),
            ('PE102', 'Physical Education 2', 2, 1, 2, False, ['PE101']),
            
            # Year 2 Semester 1
            ('CS201', 'Data Structures and Algorithms', 3, 2, 1, True, ['CS103']),
            ('DB101', 'Database Management Systems', 3, 2, 1, True, ['CS103']),
            ('IT201', 'Networking Fundamentals', 3, 2, 1, True, ['IT101']),
            ('STAT101', 'Probability and Statistics', 3, 2, 1, False, ['MATH102']),
            ('HUM101', 'Art Appreciation', 3, 2, 1, False, []),
            ('PE103', 'Physical Education 3', 2, 2, 1, False, ['PE102']),
            
            # Year 2 Semester 2
            ('CS202', 'Object-Oriented Programming', 3, 2, 2, True, ['CS201']),
            ('DB201', 'Advanced Database Systems', 3, 2, 2, True, ['DB101']),
            ('IT202', 'Web Systems and Technologies', 3, 2, 2, True, ['IT101']),
            ('NET101', 'Network Administration', 3, 2, 2, True, ['IT201']),
            ('MATH201', 'Discrete Mathematics', 3, 2, 2, False, ['MATH102']),
            ('PE104', 'Physical Education 4', 2, 2, 2, False, ['PE103']),
            
            # Year 3 Semester 1
            ('CS301', 'Software Engineering', 3, 3, 1, True, ['CS202']),
            ('IT301', 'Web Development', 3, 3, 1, True, ['IT202', 'DB101']),
            ('CAP101', 'Capstone Project 1', 3, 3, 1, True, ['CS202', 'DB201']),
            ('SYS101', 'Systems Analysis and Design', 3, 3, 1, True, ['CS202']),
            ('ELECT1', 'Technical Elective 1', 3, 3, 1, False, []),
            
            # Year 3 Semester 2
            ('CS302', 'Information Assurance and Security', 3, 3, 2, True, ['NET101']),
            ('IT302', 'System Administration', 3, 3, 2, True, ['NET101']),
            ('CAP102', 'Capstone Project 2', 3, 3, 2, True, ['CAP101']),
            ('MOB101', 'Mobile Application Development', 3, 3, 2, True, ['CS202']),
            ('ELECT2', 'Technical Elective 2', 3, 3, 2, False, []),
            
            # Year 4 Semester 1
            ('OJT101', 'On-the-Job Training', 6, 4, 1, True, ['CAP102']),
            
            # Year 4 Semester 2
            ('CS401', 'Professional Issues in IT', 3, 4, 2, True, ['OJT101']),
            ('CAP201', 'Capstone Project Defense', 3, 4, 2, True, ['OJT101']),
            ('ETHICS101', 'Ethics and Social Responsibility', 3, 4, 2, False, []),
        ]
        
        for code, title, units, year, sem, is_major, prereqs in subjects_data:
            subject, _ = Subject.objects.get_or_create(
                code=code,
                defaults={
                    'program': bsit,
                    'title': title,
                    'description': f'{title} - Course description',
                    'units': units,
                    'year_level': year,
                    'semester_number': sem,
                    'is_major': is_major,
                    'classification': 'MAJOR' if is_major else 'MINOR',
                    'allow_multiple_sections': False
                }
            )
            self.subjects[code] = subject
        
        # Set prerequisites (second pass)
        for code, _, _, _, _, _, prereqs in subjects_data:
            if code in self.subjects and prereqs:
                subject = self.subjects[code]
                for prereq_code in prereqs:
                    if prereq_code in self.subjects:
                        subject.prerequisites.add(self.subjects[prereq_code])

    def _create_bscs_subjects(self):
        """Create BSCS subjects with prerequisites."""
        bscs = self.programs['BSCS']
        
        # BSCS has similar structure but CS-focused
        subjects_data = [
            # Year 1 Semester 1
            ('CSCS101', 'Foundations of Computer Science', 3, 1, 1, True, []),
            ('CSCS102', 'Programming Fundamentals', 3, 1, 1, True, []),
            ('CSMATH101', 'Calculus 1', 3, 1, 1, False, []),
            ('CSENG101', 'Technical Writing 1', 3, 1, 1, False, []),
            ('CSFIL101', 'Filipino 1', 3, 1, 1, False, []),
            ('CSPE101', 'PE 1', 2, 1, 1, False, []),
            
            # Year 1 Semester 2
            ('CSCS103', 'Advanced Programming', 3, 1, 2, True, ['CSCS102']),
            ('CSCS104', 'Discrete Structures', 3, 1, 2, True, ['CSCS101']),
            ('CSMATH102', 'Calculus 2', 3, 1, 2, False, ['CSMATH101']),
            ('CSENG102', 'Technical Writing 2', 3, 1, 2, False, ['CSENG101']),
            ('CSPE102', 'PE 2', 2, 1, 2, False, ['CSPE101']),
            
            # Year 2 Semester 1
            ('CSCS201', 'Data Structures', 3, 2, 1, True, ['CSCS103']),
            ('CSCS202', 'Computer Architecture', 3, 2, 1, True, ['CSCS101']),
            ('CSDB101', 'Database Systems', 3, 2, 1, True, ['CSCS103']),
            ('CSMATH201', 'Linear Algebra', 3, 2, 1, False, ['CSMATH102']),
            ('CSPE103', 'PE 3', 2, 2, 1, False, ['CSPE102']),
            
            # Year 2 Semester 2
            ('CSCS203', 'Algorithm Analysis', 3, 2, 2, True, ['CSCS201']),
            ('CSCS204', 'Operating Systems', 3, 2, 2, True, ['CSCS202']),
            ('CSNET101', 'Computer Networks', 3, 2, 2, True, ['CSCS202']),
            ('CSMATH202', 'Probability Theory', 3, 2, 2, False, ['CSMATH201']),
            ('CSPE104', 'PE 4', 2, 2, 2, False, ['CSPE103']),
            
            # Year 3 Semester 1
            ('CSCS301', 'Theory of Computation', 3, 3, 1, True, ['CSCS203']),
            ('CSCS302', 'Compiler Design', 3, 3, 1, True, ['CSCS203']),
            ('CSAI101', 'Artificial Intelligence', 3, 3, 1, True, ['CSCS203']),
            ('CSCAP101', 'Thesis 1', 3, 3, 1, True, ['CSCS203', 'CSDB101']),
            
            # Year 3 Semester 2
            ('CSCS303', 'Software Engineering', 3, 3, 2, True, ['CSCS301']),
            ('CSCS304', 'Computer Graphics', 3, 3, 2, True, ['CSMATH201']),
            ('CSML101', 'Machine Learning', 3, 3, 2, True, ['CSAI101']),
            ('CSCAP102', 'Thesis 2', 3, 3, 2, True, ['CSCAP101']),
            
            # Year 4 Semester 1
            ('CSOJT101', 'Practicum', 6, 4, 1, True, ['CSCAP102']),
            
            # Year 4 Semester 2
            ('CSCS401', 'Professional Practice', 3, 4, 2, True, ['CSOJT101']),
            ('CSCAP201', 'Thesis Defense', 3, 4, 2, True, ['CSOJT101']),
        ]
        
        for code, title, units, year, sem, is_major, prereqs in subjects_data:
            subject, _ = Subject.objects.get_or_create(
                code=code,
                defaults={
                    'program': bscs,
                    'title': title,
                    'description': f'{title} - Course description',
                    'units': units,
                    'year_level': year,
                    'semester_number': sem,
                    'is_major': is_major,
                    'classification': 'MAJOR' if is_major else 'MINOR',
                    'allow_multiple_sections': False
                }
            )
            self.subjects[code] = subject
        
        # Set prerequisites
        for code, _, _, _, _, _, prereqs in subjects_data:
            if code in self.subjects and prereqs:
                subject = self.subjects[code]
                for prereq_code in prereqs:
                    if prereq_code in self.subjects:
                        subject.prerequisites.add(self.subjects[prereq_code])

    def _link_curriculum_subjects(self):
        """Link subjects to curricula with version-specific placement."""
        
        # BSIT 2024 Curriculum (excludes IT102)
        bsit_2024 = self.curricula['BSIT_2024']
        for code, subject in self.subjects.items():
            if subject.program.code == 'BSIT' and code != 'IT102':
                CurriculumSubject.objects.get_or_create(
                    curriculum=bsit_2024,
                    subject=subject,
                    defaults={
                        'year_level': subject.year_level,
                        'semester_number': subject.semester_number,
                        'is_required': True
                    }
                )
        
        # BSIT 2025 Curriculum (includes IT102, CS101 moved to Sem 2)
        bsit_2025 = self.curricula['BSIT_2025']
        for code, subject in self.subjects.items():
            if subject.program.code == 'BSIT':
                year = subject.year_level
                sem = subject.semester_number
                
                # Move CS101 to Semester 2 in 2025 curriculum
                if code == 'CS101':
                    sem = 2
                
                CurriculumSubject.objects.get_or_create(
                    curriculum=bsit_2025,
                    subject=subject,
                    defaults={
                        'year_level': year,
                        'semester_number': sem,
                        'is_required': True
                    }
                )
        
        # BSCS 2024 Curriculum
        bscs_2024 = self.curricula['BSCS_2024']
        for code, subject in self.subjects.items():
            if subject.program.code == 'BSCS':
                CurriculumSubject.objects.get_or_create(
                    curriculum=bscs_2024,
                    subject=subject,
                    defaults={
                        'year_level': subject.year_level,
                        'semester_number': subject.semester_number,
                        'is_required': True
                    }
                )
        
        # BSCS 2025 Curriculum (same as 2024 for now)
        bscs_2025 = self.curricula['BSCS_2025']
        for code, subject in self.subjects.items():
            if subject.program.code == 'BSCS':
                CurriculumSubject.objects.get_or_create(
                    curriculum=bscs_2025,
                    subject=subject,
                    defaults={
                        'year_level': subject.year_level,
                        'semester_number': subject.semester_number,
                        'is_required': True
                    }
                )
        
        self.stdout.write(f'   - Linked subjects to {len(self.curricula)} curricula')

    # =========================================================================
    # PHASE 4: USERS
    # =========================================================================
    
    def _create_staff_users(self):
        self.stdout.write('\n👥 Phase 4: Users...')
        
        staff_data = [
            ('admin@richwell.edu', 'System', 'Administrator', 'ADMIN', True, True),
            ('head.registrar@richwell.edu', 'Helena', 'Cruz', 'HEAD_REGISTRAR', True, False),
            ('registrar@richwell.edu', 'Regina', 'Santos', 'REGISTRAR', True, False),
            ('dept.head@richwell.edu', 'Harold', 'Reyes', 'DEPARTMENT_HEAD', True, False),
            ('cashier@richwell.edu', 'Carlos', 'Mendoza', 'CASHIER', True, False),
            ('admission@richwell.edu', 'Ana', 'Villanueva', 'ADMISSION_STAFF', True, False),
            ('librarian@richwell.edu', 'Linda', 'Garcia', 'ADMIN', True, False),
        ]
        
        for email, first, last, role, is_staff, is_super in staff_data:
            user, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': email,
                    'first_name': first,
                    'last_name': last,
                    'role': role,
                    'is_staff': is_staff,
                    'is_superuser': is_super
                }
            )
            user.set_password('password123')
            user.save()
        
        self.stdout.write(f'   - Created {len(staff_data)} staff users')

    def _create_professors(self):
        """Create 10 professors with specializations."""
        professors_data = [
            ('Juan', 'Dela Cruz', 'Programming', ['CS']),
            ('Maria', 'Santos', 'Databases', ['DB']),
            ('Pedro', 'Garcia', 'Networking', ['IT2', 'NET']),
            ('Ana', 'Reyes', 'Web Development', ['IT3', 'WEB']),
            ('Jose', 'Bautista', 'Mathematics', ['MATH', 'STAT']),
            ('Carmen', 'Flores', 'General Education', ['ENG', 'FIL', 'HUM', 'PE']),
            ('Roberto', 'Tan', 'Systems Analysis', ['SYS', 'CAP']),
            ('Linda', 'Ramos', 'Software Engineering', ['CS3']),
            ('Carlos', 'Mendez', 'Data Science', ['AI', 'ML']),
            ('Sofia', 'Cruz', 'Mobile Development', ['MOB']),
        ]
        
        self.professors = []
        for first, last, spec, prefixes in professors_data:
            email = f'{first.lower()}.{last.lower()}@richwell.edu'.replace(' ', '.')
            
            user, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': email,
                    'first_name': first,
                    'last_name': last,
                    'role': 'PROFESSOR'
                }
            )
            user.set_password('password123')
            user.save()
            
            profile, _ = ProfessorProfile.objects.get_or_create(
                user=user,
                defaults={
                    'department': 'College of Computer Studies',
                    'office_location': f'Faculty Room {len(self.professors) + 1}',
                    'specialization': spec,
                    'max_teaching_hours': 24,
                    'is_active': True
                }
            )
            
            # Assign subjects based on specialization
            for code, subject in self.subjects.items():
                if any(code.startswith(p) for p in prefixes):
                    profile.assigned_subjects.add(subject)
            
            self.professors.append(user)
        
        self.stdout.write(f'   - Created {len(self.professors)} professors')

    # =========================================================================
    # PHASE 5: SECTIONS
    # =========================================================================
    
    def _create_sections(self):
        self.stdout.write('\n🏫 Phase 5: Sections...')
        
        self.sections = {}
        section_count = 0
        
        # Create sections for each program
        for prog_code, program in self.programs.items():
            for year in range(1, 5):  # Years 1-4
                for section_letter in ['A', 'B', 'C']:  # 3 sections per year
                    section_name = f'{prog_code}-{year}{section_letter}'
                    
                    # Assign curriculum: Year 1-2 use 2025, Year 3-4 use 2024
                    if year <= 2:
                        curriculum = self.curricula[f'{prog_code}_2025']
                    else:
                        curriculum = self.curricula[f'{prog_code}_2024']
                    
                    section, _ = Section.objects.get_or_create(
                        name=section_name,
                        semester=self.semester,
                        defaults={
                            'program': program,
                            'curriculum': curriculum,
                            'year_level': year,
                            'capacity': 40,
                            'is_dissolved': False
                        }
                    )
                    
                    self.sections[section_name] = section
                    section_count += 1
                    
                    # Link subjects to section (SectionSubject)
                    self._link_section_subjects(section, curriculum, year)
        
        self.stdout.write(f'   - Created {section_count} sections')

    def _link_section_subjects(self, section, curriculum, year_level):
        """Link subjects to section based on curriculum and year level."""
        # Get subjects for this year and semester (Semester 2)
        curriculum_subjects = CurriculumSubject.objects.filter(
            curriculum=curriculum,
            year_level=year_level,
            semester_number=2  # 2nd Semester
        )
        
        for curr_subj in curriculum_subjects:
            # Assign a professor based on subject
            professor = self._get_professor_for_subject(curr_subj.subject)
            
            SectionSubject.objects.get_or_create(
                section=section,
                subject=curr_subj.subject,
                defaults={
                    'professor': professor,
                    'capacity': section.capacity,
                    'is_tba': False
                }
            )

    def _get_professor_for_subject(self, subject):
        """Get appropriate professor for a subject."""
        code = subject.code
        
        # Match professor by subject code prefix
        for prof in self.professors:
            profile = prof.professor_profile
            if profile.assigned_subjects.filter(code=code).exists():
                return prof
        
        # Fallback to random professor
        return random.choice(self.professors) if self.professors else None

    # =========================================================================
    # PHASE 6: SCHEDULES
    # =========================================================================
    
    def _generate_schedules(self):
        self.stdout.write('\n📅 Phase 6: Schedules (Conflict-Free)...')
        
        # Time slots
        time_slots = [
            (time(7, 0), time(8, 30)),
            (time(8, 30), time(10, 0)),
            (time(10, 0), time(11, 30)),
            (time(11, 30), time(13, 0)),
            (time(13, 0), time(14, 30)),
            (time(14, 30), time(16, 0)),
            (time(16, 0), time(17, 30)),
        ]
        
        days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
        
        # Track conflicts
        professor_schedule = defaultdict(set)  # {prof_id: {(day, start, end)}}
        room_schedule = defaultdict(set)  # {room_name: {(day, start, end)}}
        
        schedule_count = 0
        conflict_count = 0
        
        # Generate schedules for all sections
        for section_name, section in self.sections.items():
            section_subjects = SectionSubject.objects.filter(section=section)
            
            for section_subject in section_subjects:
                # Try to assign 2 schedule slots per subject (2 meetings per week)
                slots_assigned = 0
                attempts = 0
                max_attempts = 50
                
                while slots_assigned < 2 and attempts < max_attempts:
                    attempts += 1
                    
                    # Random day and time
                    day = random.choice(days)
                    start_time, end_time = random.choice(time_slots)
                    room = random.choice(self.rooms)
                    professor = section_subject.professor
                    
                    # Check conflicts
                    time_slot = (day, start_time, end_time)
                    
                    has_conflict = False
                    
                    # Check professor conflict
                    if professor and time_slot in professor_schedule[professor.id]:
                        has_conflict = True
                        conflict_count += 1
                    
                    # Check room conflict
                    if time_slot in room_schedule[room.name]:
                        has_conflict = True
                        conflict_count += 1
                    
                    if not has_conflict:
                        # Create schedule slot
                        ScheduleSlot.objects.create(
                            section_subject=section_subject,
                            professor=professor,
                            day=day,
                            start_time=start_time,
                            end_time=end_time,
                            room=room.name,
                            color=self._get_random_color()
                        )
                        
                        # Mark as occupied
                        if professor:
                            professor_schedule[professor.id].add(time_slot)
                        room_schedule[room.name].add(time_slot)
                        
                        slots_assigned += 1
                        schedule_count += 1
        
        self.stdout.write(f'   - Generated {schedule_count} schedule slots')
        self.stdout.write(f'   - Conflicts avoided: {conflict_count}')

    def _get_random_color(self):
        """Get random color for schedule slot."""
        colors = ['blue', 'green', 'purple', 'orange', 'pink', 'indigo', 'teal']
        return random.choice(colors)

    # =========================================================================
    # PHASE 7-12: STUDENTS
    # =========================================================================
    
    def _create_students(self):
        self.stdout.write('\n👨‍🎓 Phase 7-12: Students...')
        
        self.students = []
        
        # Regular students (8)
        self._create_regular_students(8)
        
        # Irregular students (5)
        self._create_irregular_students(5)
        
        # Overloaded students (3)
        self._create_overloaded_students(3)
        
        # Cross-curriculum students (2)
        self._create_cross_curriculum_students(2)
        
        # Students with INC grades (2)
        self._create_inc_students(2)
        
        self.stdout.write(f'   - Created {len(self.students)} students')

    def _create_regular_students(self, count):
        """Create regular students."""
        first_names = ['Juan', 'Maria', 'Pedro', 'Ana', 'Jose', 'Carmen', 'Roberto', 'Linda', 'Carlos', 'Sofia']
        last_names = ['Santos', 'Cruz', 'Reyes', 'Garcia', 'Mendoza', 'Ramos', 'Tan', 'Flores', 'Bautista', 'Villanueva']
        
        for i in range(count):
            first = random.choice(first_names)
            last = random.choice(last_names)
            
            # Distribute across sections
            section = random.choice(list(self.sections.values()))
            
            student_id = f'2023-{10000 + len(self.students):05d}'
            email = f'{first.lower()}.{last.lower()}.{i}@student.richwell.edu'
            
            user, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': email,
                    'first_name': first,
                    'last_name': last,
                    'role': 'STUDENT'
                }
            )
            user.set_password('password123')
            user.save()
            
            profile, _ = StudentProfile.objects.get_or_create(
                user=user,
                defaults={
                    'program': section.program,
                    'curriculum': section.curriculum,
                    'year_level': section.year_level,
                    'status': 'ACTIVE',
                    'academic_status': 'REGULAR',
                    'is_irregular': False,
                    'birthdate': date(2000, 1, 1),
                    'address': '123 Main St, Manila',
                    'contact_number': '09171234567'
                }
            )
            
            self.students.append({
                'user': user,
                'profile': profile,
                'section': section,
                'type': 'regular'
            })

    def _create_irregular_students(self, count):
        """Create irregular students with mixed subjects."""
        first_names = ['Mark', 'Jane', 'Paul', 'Lisa', 'David', 'Emma', 'Ryan', 'Olivia']
        last_names = ['Torres', 'Lopez', 'Fernandez', 'Gonzales', 'Rivera', 'Morales']
        
        for i in range(count):
            first = random.choice(first_names)
            last = random.choice(last_names)
            
            # Irregular students are typically in higher years
            section = random.choice([s for s in self.sections.values() if s.year_level >= 2])
            
            student_id = f'2022-{10000 + len(self.students):05d}'
            email = f'{first.lower()}.{last.lower()}.{i}@student.richwell.edu'
            
            user, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': email,
                    'first_name': first,
                    'last_name': last,
                    'role': 'STUDENT'
                }
            )
            user.set_password('password123')
            user.save()
            
            profile, _ = StudentProfile.objects.get_or_create(
                user=user,
                defaults={
                    'program': section.program,
                    'curriculum': section.curriculum,
                    'year_level': section.year_level,
                    'status': 'ACTIVE',
                    'academic_status': 'REGULAR',
                    'is_irregular': True,
                    'birthdate': date(2000, 1, 1),
                    'address': '123 Main St, Manila',
                    'contact_number': '09171234567'
                }
            )
            
            self.students.append({
                'user': user,
                'profile': profile,
                'section': section,
                'type': 'irregular'
            })

    def _create_overloaded_students(self, count):
        """Create students with overload (>24 units)."""
        first_names = ['Alex', 'Sam', 'Chris', 'Jordan', 'Taylor']
        last_names = ['Kim', 'Lee', 'Park', 'Choi', 'Jung']
        
        for i in range(count):
            first = random.choice(first_names)
            last = random.choice(last_names)
            
            section = random.choice(list(self.sections.values()))
            
            student_id = f'2023-{20000 + len(self.students):05d}'
            email = f'{first.lower()}.{last.lower()}.{i}@student.richwell.edu'
            
            user, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': email,
                    'first_name': first,
                    'last_name': last,
                    'role': 'STUDENT'
                }
            )
            user.set_password('password123')
            user.save()
            
            profile, _ = StudentProfile.objects.get_or_create(
                user=user,
                defaults={
                    'program': section.program,
                    'curriculum': section.curriculum,
                    'year_level': section.year_level,
                    'status': 'ACTIVE',
                    'academic_status': 'REGULAR',
                    'is_irregular': False,
                    'overload_approved': True,
                    'birthdate': date(2000, 1, 1),
                    'address': '123 Main St, Manila',
                    'contact_number': '09171234567'
                }
            )
            
            self.students.append({
                'user': user,
                'profile': profile,
                'section': section,
                'type': 'overloaded'
            })

    def _create_cross_curriculum_students(self, count):
        """Create students taking subjects from different curricula."""
        first_names = ['Miguel', 'Isabel', 'Rafael', 'Elena']
        last_names = ['Aquino', 'Salazar', 'Navarro', 'Herrera']
        
        for i in range(count):
            first = random.choice(first_names)
            last = random.choice(last_names)
            
            # Get BSIT section (to have access to both curricula)
            section = random.choice([s for s in self.sections.values() if s.program.code == 'BSIT'])
            
            student_id = f'2022-{30000 + len(self.students):05d}'
            email = f'{first.lower()}.{last.lower()}.{i}@student.richwell.edu'
            
            user, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': email,
                    'first_name': first,
                    'last_name': last,
                    'role': 'STUDENT'
                }
            )
            user.set_password('password123')
            user.save()
            
            # Assign to 2024 curriculum but will enroll in 2025 subjects
            profile, _ = StudentProfile.objects.get_or_create(
                user=user,
                defaults={
                    'program': section.program,
                    'curriculum': self.curricula['BSIT_2024'],  # 2024 curriculum
                    'year_level': section.year_level,
                    'status': 'ACTIVE',
                    'academic_status': 'REGULAR',
                    'is_irregular': True,
                    'birthdate': date(2000, 1, 1),
                    'address': '123 Main St, Manila',
                    'contact_number': '09171234567'
                }
            )
            
            self.students.append({
                'user': user,
                'profile': profile,
                'section': section,
                'type': 'cross_curriculum'
            })

    def _create_inc_students(self, count):
        """Create students with INC grades from previous semester."""
        first_names = ['Gabriel', 'Sophia', 'Daniel', 'Mia']
        last_names = ['Castro', 'Ortiz', 'Ruiz', 'Diaz']
        
        for i in range(count):
            first = random.choice(first_names)
            last = random.choice(last_names)
            
            section = random.choice([s for s in self.sections.values() if s.year_level >= 2])
            
            student_id = f'2022-{40000 + len(self.students):05d}'
            email = f'{first.lower()}.{last.lower()}.{i}@student.richwell.edu'
            
            user, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': email,
                    'first_name': first,
                    'last_name': last,
                    'role': 'STUDENT'
                }
            )
            user.set_password('password123')
            user.save()
            
            profile, _ = StudentProfile.objects.get_or_create(
                user=user,
                defaults={
                    'program': section.program,
                    'curriculum': section.curriculum,
                    'year_level': section.year_level,
                    'status': 'ACTIVE',
                    'academic_status': 'REGULAR',
                    'is_irregular': True,
                    'birthdate': date(2000, 1, 1),
                    'address': '123 Main St, Manila',
                    'contact_number': '09171234567'
                }
            )
            
            self.students.append({
                'user': user,
                'profile': profile,
                'section': section,
                'type': 'inc'
            })

    # =========================================================================
    # PHASE 13: ENROLLMENTS
    # =========================================================================
    
    def _create_enrollments(self):
        self.stdout.write('\n📝 Phase 13: Enrollments...')
        
        enrollment_count = 0
        subject_enrollment_count = 0
        
        for student_data in self.students:
            user = student_data['user']
            profile = student_data['profile']
            section = student_data['section']
            student_type = student_data['type']
            
            # Create enrollment
            enrollment, _ = Enrollment.objects.get_or_create(
                student=user,
                semester=self.semester,
                defaults={
                    'status': random.choice(['ACTIVE', 'ACTIVE', 'ACTIVE', 'PENDING']),  # 75% active
                    'created_via': 'MANUAL',
                    'monthly_commitment': Decimal('2000.00'),
                    'first_month_paid': random.choice([True, True, False])  # 66% paid first month
                }
            )
            enrollment_count += 1
            
            # Create subject enrollments based on student type
            if student_type == 'regular':
                subject_enrollment_count += self._enroll_regular_subjects(enrollment, section)
            elif student_type == 'irregular':
                subject_enrollment_count += self._enroll_irregular_subjects(enrollment, section)
            elif student_type == 'overloaded':
                subject_enrollment_count += self._enroll_overloaded_subjects(enrollment, section)
            elif student_type == 'cross_curriculum':
                subject_enrollment_count += self._enroll_cross_curriculum_subjects(enrollment, section)
            elif student_type == 'inc':
                subject_enrollment_count += self._enroll_inc_subjects(enrollment, section)
        
        
        self.stdout.write(f'   - Created {enrollment_count} enrollments')
        self.stdout.write(f'   - Created {subject_enrollment_count} subject enrollments')

    def _enroll_regular_subjects(self, enrollment, section):
        """Enroll student in all subjects for their section."""
        count = 0
        section_subjects = SectionSubject.objects.filter(section=section)
        
        for section_subject in section_subjects:
            SubjectEnrollment.objects.get_or_create(
                enrollment=enrollment,
                subject=section_subject.subject,
                defaults={
                    'section': section,
                    'status': 'ENROLLED',
                    'grade': None
                }
            )
            count += 1
        
        return count

    def _enroll_irregular_subjects(self, enrollment, section):
        """Enroll irregular student in current + some previous year subjects."""
        count = 0
        
        # Current year subjects
        section_subjects = SectionSubject.objects.filter(section=section)
        for section_subject in section_subjects[:4]:  # Only 4 subjects from current year
            SubjectEnrollment.objects.get_or_create(
                enrollment=enrollment,
                subject=section_subject.subject,
                defaults={
                    'section': section,
                    'status': 'ENROLLED',
                    'grade': None
                }
            )
            count += 1
        
        # Add some subjects from previous year (if exists)
        if section.year_level > 1:
            prev_section_name = f'{section.program.code}-{section.year_level - 1}A'
            if prev_section_name in self.sections:
                prev_section = self.sections[prev_section_name]
                prev_subjects = SectionSubject.objects.filter(section=prev_section)[:2]
                
                for section_subject in prev_subjects:
                    SubjectEnrollment.objects.get_or_create(
                        enrollment=enrollment,
                        subject=section_subject.subject,
                        defaults={
                            'section': prev_section,
                            'status': 'ENROLLED',
                            'grade': None
                        }
                    )
                    count += 1
        
        return count

    def _enroll_overloaded_subjects(self, enrollment, section):
        """Enroll student in more subjects than normal (overload)."""
        count = 0
        
        # All current year subjects
        section_subjects = SectionSubject.objects.filter(section=section)
        for section_subject in section_subjects:
            SubjectEnrollment.objects.get_or_create(
                enrollment=enrollment,
                subject=section_subject.subject,
                defaults={
                    'section': section,
                    'status': 'ENROLLED',
                    'grade': None
                }
            )
            count += 1
        
        # Add extra subjects from next year (if exists)
        if section.year_level < 4:
            next_section_name = f'{section.program.code}-{section.year_level + 1}A'
            if next_section_name in self.sections:
                next_section = self.sections[next_section_name]
                next_subjects = SectionSubject.objects.filter(section=next_section)[:2]
                
                for section_subject in next_subjects:
                    SubjectEnrollment.objects.get_or_create(
                        enrollment=enrollment,
                        subject=section_subject.subject,
                        defaults={
                            'section': next_section,
                            'status': 'ENROLLED',
                            'grade': None
                        }
                    )
                    count += 1
        
        # Create overload request
        OverloadRequest.objects.get_or_create(
            student=enrollment.student,
            semester=self.semester,
            defaults={
                'requested_units': 27,  # Overloaded units
                'reason': 'Accelerated program completion',
                'status': 'APPROVED',
                'reviewed_by': User.objects.filter(role='HEAD_REGISTRAR').first()
            }
        )
        
        return count

    def _enroll_cross_curriculum_subjects(self, enrollment, section):
        """Enroll student in subjects from both 2024 and 2025 curricula."""
        count = 0
        
        # Enroll in current section subjects (2024 curriculum)
        section_subjects = SectionSubject.objects.filter(section=section)[:3]
        for section_subject in section_subjects:
            SubjectEnrollment.objects.get_or_create(
                enrollment=enrollment,
                subject=section_subject.subject,
                defaults={
                    'section': section,
                    'status': 'ENROLLED',
                    'grade': None
                }
            )
            count += 1
        
        # Find a section with 2025 curriculum and enroll in IT102
        section_2025 = None
        for s in self.sections.values():
            if s.curriculum == self.curricula.get('BSIT_2025') and s.year_level == section.year_level:
                section_2025 = s
                break
        
        if section_2025:
            # Enroll in IT102 (exclusive to 2025)
            it102_subject = self.subjects.get('IT102')
            if it102_subject:
                section_subject_2025 = SectionSubject.objects.filter(
                    section=section_2025,
                    subject=it102_subject
                ).first()
                
                if section_subject_2025:
                    SubjectEnrollment.objects.get_or_create(
                        enrollment=enrollment,
                        subject=section_subject_2025.subject,
                        defaults={
                            'section': section_2025,
                            'status': 'ENROLLED',
                            'grade': None
                        }
                    )
                    count += 1
        
        return count

    def _enroll_inc_subjects(self, enrollment, section):
        """Enroll student with INC grade history."""
        count = 0
        
        # Enroll in current subjects
        section_subjects = SectionSubject.objects.filter(section=section)
        for section_subject in section_subjects:
            SubjectEnrollment.objects.get_or_create(
                enrollment=enrollment,
                subject=section_subject.subject,
                defaults={
                    'section': section,
                    'status': 'ENROLLED',
                    'grade': None
                }
            )
            count += 1
        
        return count

    # =========================================================================
    # PHASE 14: PAYMENTS
    # =========================================================================
    
    def _create_payments(self):
        self.stdout.write('\n💰 Phase 14: Payments...')
        
        payment_count = 0
        transaction_count = 0
        
        enrollments = Enrollment.objects.filter(semester=self.semester)
        
        for enrollment in enrollments:
            # Calculate total units from subject enrollments
            total_units = SubjectEnrollment.objects.filter(
                enrollment=enrollment
            ).aggregate(
                total=models.Sum('subject__units')
            )['total'] or 0
            
            # Calculate total fee (₱500 per unit)
            total_fee = Decimal(str(total_units * 500))
            
            # Determine payment status
            payment_statuses = ['FULLY_PAID', 'FULLY_PAID', 'PARTIAL', 'PARTIAL', 'UNPAID']
            payment_status = random.choice(payment_statuses)
            
            if payment_status == 'FULLY_PAID':
                amount_paid = total_fee
            elif payment_status == 'PARTIAL':
                amount_paid = total_fee * Decimal('0.5')  # 50% paid
            else:
                amount_paid = Decimal('0')
            
            # Create monthly payment buckets
            for month in range(1, 7):  # 6 months
                bucket, _ = MonthlyPaymentBucket.objects.get_or_create(
                    enrollment=enrollment,
                    month_number=month,
                    defaults={
                        'required_amount': total_fee / 6,
                        'paid_amount': amount_paid / 6 if payment_status != 'UNPAID' else Decimal('0')
                    }
                )
                payment_count += 1
            
            # Create payment transactions
            if amount_paid > 0:
                PaymentTransaction.objects.create(
                    enrollment=enrollment,
                    amount=amount_paid,
                    payment_method='CASH',
                    reference_number=f'PAY-{enrollment.id}-{random.randint(1000, 9999)}',
                    processed_by=User.objects.filter(role='CASHIER').first(),
                    status='COMPLETED',
                    payment_date=date(2026, 1, 20)
                )
                transaction_count += 1
        
        self.stdout.write(f'   - Created {payment_count} payment buckets')
        self.stdout.write(f'   - Created {transaction_count} transactions')

    # =========================================================================
    # SUMMARY
    # =========================================================================
    
    def _print_summary(self):
        self.stdout.write('\n' + '='*60)
        self.stdout.write('SEEDING SUMMARY')
        self.stdout.write('='*60)
        
        self.stdout.write(f'\n📦 Foundation:')
        self.stdout.write(f'   - Semesters: {Semester.objects.count()}')
        self.stdout.write(f'   - Rooms: {Room.objects.count()}')
        
        self.stdout.write(f'\n🎓 Academics:')
        self.stdout.write(f'   - Programs: {Program.objects.count()}')
        self.stdout.write(f'   - Curricula: {Curriculum.objects.count()}')
        self.stdout.write(f'   - Subjects: {Subject.objects.count()}')
        
        self.stdout.write(f'\n👥 Users:')
        self.stdout.write(f'   - Staff: {User.objects.filter(role__in=["ADMIN", "REGISTRAR", "HEAD_REGISTRAR", "CASHIER", "ADMISSION_STAFF"]).count()}')
        self.stdout.write(f'   - Professors: {User.objects.filter(role="PROFESSOR").count()}')
        self.stdout.write(f'   - Students: {User.objects.filter(role="STUDENT").count()}')
        
        self.stdout.write(f'\n🏫 Sections:')
        self.stdout.write(f'   - Sections: {Section.objects.count()}')
        self.stdout.write(f'   - Section Subjects: {SectionSubject.objects.count()}')
        self.stdout.write(f'   - Schedule Slots: {ScheduleSlot.objects.count()}')
        
        self.stdout.write(f'\n📝 Enrollments:')
        self.stdout.write(f'   - Enrollments: {Enrollment.objects.count()}')
        self.stdout.write(f'   - Subject Enrollments: {SubjectEnrollment.objects.count()}')
        self.stdout.write(f'   - Payment Buckets: {MonthlyPaymentBucket.objects.count()}')
        self.stdout.write(f'   - Transactions: {PaymentTransaction.objects.count()}')
        
        self.stdout.write('\n' + '='*60)
        
        # Login credentials
        self.stdout.write('\n🔑 LOGIN CREDENTIALS (all passwords: password123):')
        self.stdout.write('   - admin@richwell.edu')
        self.stdout.write('   - head.registrar@richwell.edu')
        self.stdout.write('   - registrar@richwell.edu')
        self.stdout.write('   - cashier@richwell.edu')
        self.stdout.write('   - (any student email)')
        
        self.stdout.write('\n' + '='*60)
