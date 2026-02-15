"""
SIS Full Database Seeder v2
===========================
Comprehensive seeder following the architecture document patterns.

Features:
- 8-level dependency-aware seeding
- Conflict-free schedule generation
- Realistic student scenarios (regular, irregular, retake, overload)
- Multi-term history support
- Complete audit trail

Usage:
    python manage.py seed_full_v2           # Additive seed
    python manage.py seed_full_v2 --wipe    # Wipe and reseed
    python manage.py seed_full_v2 --minimal # Minimal data for quick testing
"""

import random
from datetime import time, date, timedelta
from decimal import Decimal
from collections import defaultdict

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from django.contrib.auth import get_user_model

from apps.accounts.models import (
    StudentProfile, ProfessorProfile,
    Permission, PermissionCategory, UserPermission
)
from apps.academics.models import (
    Program, Curriculum, Subject, Section, SectionSubject,
    ScheduleSlot, Room, CurriculumSubject, CurriculumVersion,
    SectionSubjectProfessor
)
from apps.enrollment.models import (
    Enrollment, SubjectEnrollment, Semester, MonthlyPaymentBucket,
    PaymentTransaction, ExamMonthMapping, ExamPermit,
    GradeHistory, SemesterGPA, OverloadRequest, EnrollmentApproval,
    GradeResolution
)
from apps.audit.models import AuditLog

User = get_user_model()


class Command(BaseCommand):
    help = 'Seeds the database with comprehensive test data (v2 architecture)'

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
        self.stdout.write(self.style.WARNING('  SIS Database Seeder v2'))
        self.stdout.write(self.style.WARNING('='*60))
        
        if self.wipe:
            self.stdout.write(self.style.ERROR('WARNING: This will wipe ALL existing data!'))
        
        with transaction.atomic():
            if self.wipe:
                self._wipe_all_data()
            
            # Level 0: Foundation (no dependencies)
            self._seed_level_0_foundation()
            
            # Level 1: Organization
            self._seed_level_1_organization()
            
            # Level 2: Programs & Professors
            self._seed_level_2_academics_base()
            
            # Level 3: Curriculum & Subjects
            self._seed_level_3_curriculum_subjects()
            
            # Level 4: Sections & Students
            self._seed_level_4_sections_students()
            
            # Level 5: Section Offerings
            self._seed_level_5_offerings()
            
            # Level 6: Schedules & Enrollments
            self._seed_level_6_schedules_enrollments()
            
            # Level 7: Subject Enrollments & Payments
            self._seed_level_7_subject_enrollments()
            
            # Level 8: Transactions & Audit
            self._seed_level_8_transactions_audit()
            
            # Level 9: Grade Resolutions & History
            self._seed_level_9_resolutions()
            
            # Additional Scenarios
            self._seed_junjun_scenario()
            
            self._print_summary()
        
        self.stdout.write(self.style.SUCCESS('\n✓ Seeding completed successfully!'))

    # =========================================================================
    # WIPE DATA
    # =========================================================================
    
    def _wipe_all_data(self):
        self.stdout.write('\n🗑️  Wiping existing data (reverse dependency order)...')
        
        # Level 8 first (most dependent) + Level 9
        GradeResolution.objects.all().delete()
        AuditLog.objects.all().delete()
        GradeHistory.objects.all().delete()
        SemesterGPA.objects.all().delete()
        ExamPermit.objects.all().delete()
        PaymentTransaction.objects.all().delete()
        
        # Level 7
        EnrollmentApproval.objects.all().delete()
        SubjectEnrollment.objects.all().delete()
        MonthlyPaymentBucket.objects.all().delete()
        OverloadRequest.objects.all().delete()
        
        # Level 6
        Enrollment.objects.all().delete()
        ScheduleSlot.objects.all().delete()
        SectionSubjectProfessor.objects.all().delete()
        
        # Level 5
        SectionSubject.objects.all().delete()
        
        # Level 4
        StudentProfile.objects.all().delete()
        # Use all_objects to ensure soft-deleted sections are also wiped
        Section.all_objects.all().delete()
        
        # Level 3
        CurriculumSubject.objects.all().delete()
        CurriculumVersion.objects.all().delete()
        Subject.objects.all().delete()
        
        # Level 2
        Curriculum.objects.all().delete()
        ProfessorProfile.objects.all().delete()
        
        # Level 1
        Program.objects.all().delete()
        Room.objects.all().delete()
        
        # Level 0
        ExamMonthMapping.objects.all().delete()
        Semester.objects.all().delete()
        UserPermission.objects.all().delete()
        Permission.objects.all().delete()
        PermissionCategory.objects.all().delete()
        
        # Users (except superusers)
        User.objects.filter(is_superuser=False).delete()
        
        self.stdout.write(self.style.SUCCESS('   ✓ Data wiped'))

    # =========================================================================
    # LEVEL 0: Foundation
    # =========================================================================
    
    def _seed_level_0_foundation(self):
        self.stdout.write('\n📦 Level 0: Foundation...')
        
        # Semesters
        self._create_semesters()
        
        # Permissions
        self._create_permissions()
        
        # Exam-Month Mappings
        self._create_exam_mappings()
        
        self.stdout.write(self.style.SUCCESS('   ✓ Foundation complete'))

    def _create_semesters(self):
        """Create current and past semesters for multi-term history."""
        # The user's test date is Jan 29, 2026
        now = date(2026, 1, 29)
        
        # Past semesters (Academic Year 2024-2025)
        self.semester_2024_1, _ = Semester.objects.get_or_create(
            name='1st Semester',
            academic_year='2024-2025',
            defaults={
                'start_date': date(2024, 8, 1),
                'end_date': date(2024, 12, 15),
                'enrollment_start_date': date(2024, 7, 15),
                'enrollment_end_date': date(2024, 8, 15),
                'grading_start_date': date(2024, 11, 1),
                'grading_end_date': date(2024, 12, 31),
                'status': 'ARCHIVED',
                'is_current': False
            }
        )
        
        self.semester_2024_2, _ = Semester.objects.get_or_create(
            name='2nd Semester',
            academic_year='2024-2025',
            defaults={
                'start_date': date(2025, 1, 6),
                'end_date': date(2025, 5, 31),
                'enrollment_start_date': date(2024, 12, 15),
                'enrollment_end_date': date(2025, 1, 10),
                'grading_start_date': date(2025, 4, 1),
                'grading_end_date': date(2025, 6, 15),
                'status': 'ARCHIVED',
                'is_current': False
            }
        )
        
        # Last Semester (1st Semester 2025-2026) - This is where INCs should be from
        self.semester_2025_1, _ = Semester.objects.get_or_create(
            name='1st Semester',
            academic_year='2025-2026',
            defaults={
                'start_date': date(2025, 8, 1),
                'end_date': date(2025, 12, 15),
                'enrollment_start_date': date(2025, 7, 1),
                'enrollment_end_date': date(2025, 8, 15),
                'grading_start_date': date(2025, 11, 1),
                'grading_end_date': date(2025, 12, 31),
                'status': 'GRADING_CLOSED',
                'is_current': False
            }
        )
        
        # Current semester (2nd Semester 2025-2026) - Grading should be open
        self.semester_current, _ = Semester.objects.get_or_create(
            name='2nd Semester',
            academic_year='2025-2026',
            defaults={
                'start_date': date(2026, 1, 5),
                'end_date': date(2026, 5, 30),
                'enrollment_start_date': date(2025, 12, 1),
                'enrollment_end_date': date(2026, 1, 15),
                'grading_start_date': date(2026, 1, 25), # Grading just opened
                'grading_end_date': date(2026, 6, 15),
                'status': 'GRADING_OPEN',
                'is_current': True
            }
        )
        
        # Ensure only one is current
        Semester.objects.exclude(pk=self.semester_current.pk).update(is_current=False)
        
        self.stdout.write(f'   - Created {Semester.objects.count()} semesters')

    def _create_permissions(self):
        """Create permission categories and permissions."""
        categories_data = [
            ('academic_management', 'Academic Management', 'Manage programs, curricula, and subjects', 'book-open', 1),
            ('enrollment_management', 'Enrollment Management', 'Manage student enrollments', 'users', 2),
            ('user_management', 'User Management', 'Manage system users', 'user-group', 3),
            ('schedule_management', 'Schedule Management', 'Manage class schedules', 'calendar', 4),
            ('grade_management', 'Grade Management', 'Manage student grades', 'chart-bar', 5),
            ('payment_management', 'Payment Management', 'Manage payments and fees', 'currency-dollar', 6),
        ]
        
        self.permission_categories = {}
        for code, name, desc, icon, order in categories_data:
            cat, _ = PermissionCategory.objects.get_or_create(
                code=code,
                defaults={'name': name, 'description': desc, 'icon': icon, 'order': order}
            )
            self.permission_categories[code] = cat
        
        permissions_data = [
            # Academic
            ('program.view', 'View Programs', 'academic_management', ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR', 'DEPARTMENT_HEAD']),
            ('program.manage', 'Manage Programs', 'academic_management', ['ADMIN', 'HEAD_REGISTRAR']),
            ('curriculum.view', 'View Curricula', 'academic_management', ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR', 'DEPARTMENT_HEAD', 'PROFESSOR']),
            ('curriculum.manage', 'Manage Curricula', 'academic_management', ['ADMIN', 'HEAD_REGISTRAR']),
            ('subject.view', 'View Subjects', 'academic_management', ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR', 'DEPARTMENT_HEAD', 'PROFESSOR', 'STUDENT']),
            ('subject.manage', 'Manage Subjects', 'academic_management', ['ADMIN', 'HEAD_REGISTRAR']),
            
            # Enrollment
            ('enrollment.view', 'View Enrollments', 'enrollment_management', ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR', 'DEPARTMENT_HEAD', 'CASHIER']),
            ('enrollment.process', 'Process Enrollments', 'enrollment_management', ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR', 'DEPARTMENT_HEAD']),
            ('enrollment.approve', 'Approve Enrollments', 'enrollment_management', ['ADMIN', 'HEAD_REGISTRAR', 'DEPARTMENT_HEAD']),
            
            # Users
            ('user.view', 'View Users', 'user_management', ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR']),
            ('user.manage', 'Manage Users', 'user_management', ['ADMIN']),
            
            # Schedule
            ('schedule.view', 'View Schedules', 'schedule_management', ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR', 'DEPARTMENT_HEAD', 'PROFESSOR', 'STUDENT']),
            ('schedule.manage', 'Manage Schedules', 'schedule_management', ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR']),
            
            # Grades
            ('grade.view', 'View Grades', 'grade_management', ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR', 'PROFESSOR', 'STUDENT']),
            ('grade.submit', 'Submit Grades', 'grade_management', ['PROFESSOR']),
            ('grade.finalize', 'Finalize Grades', 'grade_management', ['ADMIN', 'HEAD_REGISTRAR', 'REGISTRAR']),
            
            # Payments
            ('payment.view', 'View Payments', 'payment_management', ['ADMIN', 'CASHIER', 'REGISTRAR', 'HEAD_REGISTRAR']),
            ('payment.process', 'Process Payments', 'payment_management', ['ADMIN', 'CASHIER']),
        ]
        
        for code, name, cat_code, roles in permissions_data:
            Permission.objects.get_or_create(
                code=code,
                defaults={
                    'name': name,
                    'category': self.permission_categories[cat_code],
                    'default_for_roles': roles
                }
            )
        
        self.stdout.write(f'   - Created {Permission.objects.count()} permissions')

    def _create_exam_mappings(self):
        """Create exam period to payment month mappings."""
        mappings = [
            ('PRELIM', 1),
            ('MIDTERM', 2),
            ('PREFINAL', 4),
            ('FINAL', 6),
        ]
        
        for exam_period, month in mappings:
            ExamMonthMapping.objects.get_or_create(
                semester=self.semester_current,
                exam_period=exam_period,
                defaults={'required_month': month, 'is_active': True}
            )

    # =========================================================================
    # LEVEL 1: Organization
    # =========================================================================
    
    def _seed_level_1_organization(self):
        self.stdout.write('\n🏢 Level 1: Organization...')
        
        # Rooms
        self._create_rooms()
        
        # Staff users
        self._create_staff_users()
        
        self.stdout.write(self.style.SUCCESS('   ✓ Organization complete'))

    def _create_rooms(self):
        """Create lecture rooms and laboratories."""
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
        for i in range(1, 4):
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

    def _create_staff_users(self):
        """Create staff users (admin, registrar, heads, cashier)."""
        
        # Admin
        self.admin, _ = User.objects.get_or_create(
            email='admin@richwell.edu',
            defaults={
                'username': 'admin@richwell.edu',
                'first_name': 'System',
                'last_name': 'Administrator',
                'role': User.Role.ADMIN,
                'is_staff': True,
                'is_superuser': True
            }
        )
        self.admin.set_password('password123')
        self.admin.save()
        
        # Head Registrar
        self.head_registrar, _ = User.objects.get_or_create(
            email='head.registrar@richwell.edu',
            defaults={
                'username': 'head.registrar@richwell.edu',
                'first_name': 'Helena',
                'last_name': 'Cruz',
                'role': User.Role.HEAD_REGISTRAR,
                'is_staff': True
            }
        )
        self.head_registrar.set_password('password123')
        self.head_registrar.save()
        
        # Registrar
        self.registrar, _ = User.objects.get_or_create(
            email='registrar@richwell.edu',
            defaults={
                'username': 'registrar@richwell.edu',
                'first_name': 'Regina',
                'last_name': 'Santos',
                'role': User.Role.REGISTRAR,
                'is_staff': True
            }
        )
        self.registrar.set_password('password123')
        self.registrar.save()
        
        # Department Head
        self.dept_head, _ = User.objects.get_or_create(
            email='head@richwell.edu',
            defaults={
                'username': 'head@richwell.edu',
                'first_name': 'Harold',
                'last_name': 'Reyes',
                'role': User.Role.DEPARTMENT_HEAD,
                'is_staff': True
            }
        )
        self.dept_head.set_password('password123')
        self.dept_head.save()
        
        # Cashier
        self.cashier, _ = User.objects.get_or_create(
            email='cashier@richwell.edu',
            defaults={
                'username': 'cashier@richwell.edu',
                'first_name': 'Carlos',
                'last_name': 'Mendoza',
                'role': User.Role.CASHIER,
                'is_staff': True
            }
        )
        self.cashier.set_password('password123')
        self.cashier.save()
        
        # Admission Staff
        self.admission, _ = User.objects.get_or_create(
            email='admission@richwell.edu',
            defaults={
                'username': 'admission@richwell.edu',
                'first_name': 'Ana',
                'last_name': 'Villanueva',
                'role': User.Role.ADMISSION_STAFF,
                'is_staff': True
            }
        )
        self.admission.set_password('password123')
        self.admission.save()
        
        self.stdout.write('   - Created staff users')

    # =========================================================================
    # LEVEL 2: Academics Base
    # =========================================================================
    
    def _seed_level_2_academics_base(self):
        self.stdout.write('\n🎓 Level 2: Academics Base...')
        
        # Programs
        self._create_programs()
        
        # Curricula
        self._create_curricula()
        
        # Professors
        self._create_professors()
        
        self.stdout.write(self.style.SUCCESS('   ✓ Academics base complete'))

    def _create_programs(self):
        """Create academic programs."""
        programs_data = [
            ('BSIT', 'Bachelor of Science in Information Technology', 4),
            ('BSCS', 'Bachelor of Science in Computer Science', 4),
            ('BSIS', 'Bachelor of Science in Information Systems', 4),
            ('BSA', 'Bachelor of Science in Accountancy', 4),
        ]
        
        if self.minimal:
            programs_data = programs_data[:1]  # Only BSIT for minimal
        
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
        """Create curriculum versions for each program."""
        self.curricula = {}
        
        for code, program in self.programs.items():
            # Standard 2024 Curriculum
            curriculum, _ = Curriculum.objects.get_or_create(
                program=program,
                code='2024-REV',
                defaults={
                    'name': f'{code} Curriculum 2024 Revision',
                    'description': f'Latest curriculum for {code}',
                    'effective_year': 2024,
                    'is_active': True
                }
            )
            self.curricula[f'{code}_2024'] = curriculum

            # EPIC 7: Create a second curriculum for BSIT (2025 Update)
            if code == 'BSIT':
                curriculum_2025, _ = Curriculum.objects.get_or_create(
                    program=program,
                    code='2025-UPDATE',
                    defaults={
                        'name': f'{code} Curriculum 2025 Update',
                        'description': 'Updated curriculum with revised subject placement',
                        'effective_year': 2025,
                        'is_active': True
                    }
                )
                self.curricula[f'{code}_2025'] = curriculum_2025
        
        self.stdout.write(f'   - Created {len(self.curricula)} curricula configurations')

    def _create_professors(self):
        """Create professor users with profiles."""
        professors_data = [
            ('Juan', 'Dela Cruz', 'Programming', ['CS101', 'CS102', 'CS103', 'CS201']),
            ('Maria', 'Santos', 'Databases', ['DB101', 'DB201', 'IT101']),
            ('Pedro', 'Garcia', 'Networking', ['IT201', 'IT301', 'NET101']),
            ('Ana', 'Reyes', 'Web Development', ['WEB101', 'WEB201', 'IT301']),
            ('Jose', 'Bautista', 'Mathematics', ['MATH101', 'MATH102', 'STAT101']),
            ('Carmen', 'Flores', 'General Education', ['ENG101', 'FIL101', 'HUM101']),
            ('Crispin', 'Reyes', 'Accountancy', ['ACC101', 'ACC102', 'ACC201']),
            ('Elena', 'Vargas', 'Accountancy', ['TAX101', 'TAX102', 'BL101']),
        ]
        
        if self.minimal:
            professors_data = professors_data[:3]
        
        self.professors = []
        for first, last, spec, _ in professors_data:
            email = f'{first.lower()}.{last.lower()}@richwell.edu'.replace(' ', '.')
            
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': email,
                    'first_name': first,
                    'last_name': last,
                    'role': User.Role.PROFESSOR
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
            
            self.professors.append(user)
        
        self.stdout.write(f'   - Created {len(self.professors)} professors')

    # =========================================================================
    # LEVEL 3: Curriculum & Subjects
    # =========================================================================
    
    def _seed_level_3_curriculum_subjects(self):
        self.stdout.write('\n📚 Level 3: Curriculum & Subjects...')
        
        self._create_subjects()
        self._link_curriculum_subjects()
        self._assign_professors_to_subjects()
        
        self.stdout.write(self.style.SUCCESS('   ✓ Curriculum & subjects complete'))

    def _create_subjects(self):
        """Create subjects for BSIT program."""
        self.subjects = {}
        
        # Subject data: (code, title, units, year, sem, is_major, prereqs)
        subjects_data = [
            # Year 1 Semester 1
            ('CS101', 'Introduction to Computing', 3, 1, 1, True, []),
            ('CS102', 'Computer Programming 1', 3, 1, 1, True, []),
            ('IT102', 'Computing and Professional Ethics', 3, 1, 1, True, []), # New exclusive subject
            ('MATH101', 'College Algebra', 3, 1, 1, False, []),
            ('ENG101', 'Communication Skills 1', 3, 1, 1, False, []),
            ('FIL101', 'Komunikasyon sa Filipino', 3, 1, 1, False, []),
            ('PE101', 'Physical Education 1', 2, 1, 1, False, []),
            
            # Year 1 Semester 2
            ('CS103', 'Computer Programming 2', 3, 1, 2, True, ['CS102']),
            ('IT101', 'IT Fundamentals', 3, 1, 2, True, ['CS101']),
            ('MATH102', 'Plane Trigonometry', 3, 1, 2, False, ['MATH101']),
            ('ENG102', 'Communication Skills 2', 3, 1, 2, False, ['ENG101']),
            ('PE102', 'Physical Education 2', 2, 1, 2, False, ['PE101']),
            
            # Year 2 Semester 1
            ('CS201', 'Data Structures and Algorithms', 3, 2, 1, True, ['CS103']),
            ('DB101', 'Database Management Systems', 3, 2, 1, True, ['CS103']),
            ('IT201', 'Networking Fundamentals', 3, 2, 1, True, ['IT101']),
            ('STAT101', 'Probability and Statistics', 3, 2, 1, False, ['MATH102']),
            ('HUM101', 'Art Appreciation', 3, 2, 1, False, []),
            
            # Year 2 Semester 2
            ('CS202', 'Object-Oriented Programming', 3, 2, 2, True, ['CS201']),
            ('DB201', 'Advanced Database Systems', 3, 2, 2, True, ['DB101']),
            ('IT202', 'Web Systems and Technologies', 3, 2, 2, True, ['IT101']),
            ('NET101', 'Network Administration', 3, 2, 2, True, ['IT201']),
            
            # Year 3 Semester 1
            ('CS301', 'Software Engineering', 3, 3, 1, True, ['CS202']),
            ('IT301', 'Web Development', 3, 3, 1, True, ['IT202', 'DB101']),
            ('CAP101', 'Capstone Project 1', 3, 3, 1, True, ['CS202', 'DB201']),
            
            # Year 3 Semester 2
            ('CS302', 'Information Assurance and Security', 3, 3, 2, True, ['NET101']),
            ('IT302', 'System Administration', 3, 3, 2, True, ['NET101']),
            ('CAP102', 'Capstone Project 2', 3, 3, 2, True, ['CAP101']),
            
            # Year 4 Semester 1
            ('OJT101', 'On-the-Job Training', 6, 4, 1, True, ['CAP102']),
            
            # Year 4 Semester 2
            ('CS401', 'Professional Issues in IT', 3, 4, 2, True, ['OJT101']),
            ('CAP201', 'Capstone Project Defense', 3, 4, 2, True, ['OJT101']),

            # BSA - Year 1
            ('ACC101', 'Financial Accounting and Reporting 1', 3, 1, 1, True, []),
            ('ACC102', 'Financial Accounting and Reporting 2', 3, 1, 2, True, ['ACC101']),
            ('ACC201', 'Conceptual Framework and Accounting Standards', 3, 1, 2, True, ['ACC101']),
            ('BL101', 'Law on Obligations and Contracts', 3, 1, 2, False, []),

            # BSA - Year 2
            ('ACC202', 'Intermediate Accounting 1', 3, 2, 1, True, ['ACC201']),
            ('ACC203', 'Intermediate Accounting 2', 3, 2, 2, True, ['ACC202']),
            ('ACC301', 'Cost Accounting and Control', 3, 2, 1, True, ['ACC102']),
            ('ACC302', 'Strategic Cost Management', 3, 2, 2, True, ['ACC301']),
            ('TAX101', 'Income Taxation', 3, 2, 2, True, ['ACC202']),
            ('BL102', 'Business Laws and Regulations', 3, 2, 1, True, ['BL101']),

            # BSA - Year 3
            ('ACC204', 'Intermediate Accounting 3', 3, 3, 1, True, ['ACC203']),
            ('ACC303', 'Accounting Information Systems', 3, 3, 1, True, ['ACC202']),
            ('AUD101', 'Auditing and Assurance Concepts and Principles', 3, 3, 1, True, ['ACC203']),
            ('AUD102', 'Auditing and Assurance: Specialized Industries', 3, 3, 2, True, ['AUD101']),
            ('TAX102', 'Business Taxation', 3, 3, 1, True, ['TAX101']),

            # BSA - Year 4
            ('AUD201', 'Auditing and Assurance: Concepts and Applications 1', 3, 4, 1, True, ['AUD102']),
        ]
        
        if self.minimal:
            # Only Year 1-2 for minimal
            subjects_data = [s for s in subjects_data if s[3] <= 2]
        
        program = self.programs.get('BSIT') or list(self.programs.values())[0]
        
        for code, title, units, year, sem, is_major, prereqs in subjects_data:
            subject, _ = Subject.objects.get_or_create(
                code=code,
                defaults={
                    'program': program,
                    'title': title,
                    'description': f'{title} - Course description',
                    'units': units,
                    'year_level': year,
                    'semester_number': sem,
                    'is_major': is_major,
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
        
        self.stdout.write(f'   - Created {len(self.subjects)} subjects')

    def _link_curriculum_subjects(self):
        """Link subjects to curricula with version-specific placement."""
        # 1. Standard 2024 Curriculum (All Programs)
        for code, program in self.programs.items():
            curr_key = f'{code}_2024'
            if curr_key not in self.curricula: continue
            
            curriculum = self.curricula[curr_key]
            for subject_code, subject in self.subjects.items():
                # Skip the 2025-exclusive subject for 2024 curriculum
                if subject_code == 'IT102': continue
                
                CurriculumSubject.objects.get_or_create(
                    curriculum=curriculum,
                    subject=subject,
                    defaults={
                        'year_level': subject.year_level,
                        'semester_number': subject.semester_number,
                        'is_required': True
                    }
                )

        # 2. BSIT 2025 Update Curriculum (Modified Placement)
        if 'BSIT_2025' in self.curricula:
            bsit_2025 = self.curricula['BSIT_2025']
            for subject_code, subject in self.subjects.items():
                # Rules for 2025:
                # - Include IT102 (The new subject)
                # - Move CS101 to Year 1 Sem 2
                # - Keep others same
                
                year = subject.year_level
                sem = subject.semester_number
                
                if subject_code == 'CS101':
                    sem = 2 # Move to Sem 2
                
                CurriculumSubject.objects.get_or_create(
                    curriculum=bsit_2025,
                    subject=subject,
                    defaults={
                        'year_level': year,
                        'semester_number': sem,
                        'is_required': True
                    }
                )
        
        self.stdout.write(f'   - Linked subjects to {len(self.curricula)} curriculum versions')

    def _assign_professors_to_subjects(self):
        """Assign professors to subjects they can teach."""
        # Map specializations to subject prefixes
        specialization_map = {
            'Programming': ['CS'],
            'Databases': ['DB'],
            'Networking': ['IT2', 'NET'],
            'Web Development': ['IT3', 'WEB'],
            'Mathematics': ['MATH', 'STAT'],
            'General Education': ['ENG', 'FIL', 'HUM', 'PE'],
            'Accountancy': ['ACC', 'TAX', 'AUD', 'BL'],
        }
        
        for prof in self.professors:
            profile = prof.professor_profile
            spec = profile.specialization
            
            if spec in specialization_map:
                prefixes = specialization_map[spec]
                for code, subject in self.subjects.items():
                    if any(code.startswith(p) for p in prefixes):
                        profile.assigned_subjects.add(subject)
            else:
                # Assign random subjects if no match
                random_subjects = random.sample(
                    list(self.subjects.values()),
                    min(5, len(self.subjects))
                )
                for subject in random_subjects:
                    profile.assigned_subjects.add(subject)

    # =========================================================================
    # LEVEL 4: Sections & Students
    # =========================================================================
    
    def _seed_level_4_sections_students(self):
        self.stdout.write('\n👥 Level 4: Sections & Students...')
        
        self._create_sections()
        self._create_students()
        
        self.stdout.write(self.style.SUCCESS('   ✓ Sections & students complete'))

    def _create_sections(self):
        """Create sections for each year level."""
        self.sections = {}
        
        # 1. BSIT Sections (with version phase-in)
        bsit_program = self.programs.get('BSIT')
        bsit_2024 = self.curricula.get('BSIT_2024')
        bsit_2025 = self.curricula.get('BSIT_2025')
        
        bsit_sections = [
            ('BSIT-1A', 1, 40, bsit_2025),
            ('BSIT-1B', 1, 40, bsit_2025),
            ('BSIT-2A', 2, 35, bsit_2024),
            ('BSIT-2B', 2, 35, bsit_2024),
            ('BSIT-3A', 3, 30, bsit_2024),
            ('BSIT-4A', 4, 30, bsit_2024),
        ]

        # 2. BSCS Sections
        bscs_program = self.programs.get('BSCS')
        bscs_2024 = self.curricula.get('BSCS_2024')
        bscs_sections = [
            ('BSCS-1A', 1, 40, bscs_2024),
            ('BSCS-2A', 2, 35, bscs_2024),
        ]

        # 3. BSIS Sections
        bsis_program = self.programs.get('BSIS')
        bsis_2024 = self.curricula.get('BSIS_2024')
        bsis_sections = [
            ('BSIS-1A', 1, 40, bsis_2024),
        ]

        # Combine all sections
        all_sections_def = []
        if bsit_program:
            all_sections_def.extend([(name, year, cap, curr, bsit_program) for name, year, cap, curr in bsit_sections])
        if bscs_program and not self.minimal:
            all_sections_def.extend([(name, year, cap, curr, bscs_program) for name, year, cap, curr in bscs_sections])
        if bsis_program and not self.minimal:
            all_sections_def.extend([(name, year, cap, curr, bsis_program) for name, year, cap, curr in bsis_sections])

        for name, year, capacity, curriculum, program in all_sections_def:
            # Use all_objects to prevent UNIQUE constraint failure if a soft-deleted section exists
            section, created = Section.all_objects.get_or_create(
                name=name,
                semester=self.semester_current,
                defaults={
                    'program': program,
                    'curriculum': curriculum,
                    'year_level': year,
                    'capacity': capacity,
                    'is_dissolved': False
                }
            )
            
            # If it was found but soft-deleted, restore it
            if not created and section.is_deleted:
                section.is_deleted = False
                section.save()
                
            self.sections[name] = section
        
        self.stdout.write(f'   - Created {len(self.sections)} sections')

    def _create_students(self):
        """Create diverse student profiles for testing scenarios."""
        self.students = []
        
        program = self.programs.get('BSIT') or list(self.programs.values())[0]
        curriculum = self.curricula.get('BSIT') or list(self.curricula.values())[0]
        
        # Student scenarios
        students_data = [
            # Regular 1st year students
            {
                'email': 'student.regular1@richwell.edu',
                'first_name': 'Maria', 'last_name': 'Garcia',
                'student_number': '2025-00001',
                'year_level': 1, 'section': 'BSIT-1A',
                'is_irregular': False, 'overload_approved': False,
                'scenario': 'REGULAR_PAID'
            },
            {
                'email': 'student.regular2@richwell.edu',
                'first_name': 'Juan', 'last_name': 'Santos',
                'student_number': '2025-00002',
                'year_level': 1, 'section': 'BSIT-1A',
                'is_irregular': False, 'overload_approved': False,
                'scenario': 'REGULAR_UNPAID'
            },
            {
                'email': 'student.regular3@richwell.edu',
                'first_name': 'Ana', 'last_name': 'Reyes',
                'student_number': '2025-00003',
                'year_level': 1, 'section': 'BSIT-1B',
                'is_irregular': False, 'overload_approved': False,
                'scenario': 'REGULAR_PENDING'
            },
            
            # 2nd year students
            {
                'email': 'student.second1@richwell.edu',
                'first_name': 'Pedro', 'last_name': 'Cruz',
                'student_number': '2024-00001',
                'year_level': 2, 'section': 'BSIT-2A',
                'is_irregular': False, 'overload_approved': False,
                'scenario': 'REGULAR_PAID'
            },
            
            # Irregular student (failed subject, needs retake)
            {
                'email': 'student.irregular@richwell.edu',
                'first_name': 'Carlos', 'last_name': 'Mendoza',
                'student_number': '2024-00002',
                'year_level': 2, 'section': 'BSIT-2A',
                'is_irregular': True, 'overload_approved': False,
                'scenario': 'IRREGULAR_RETAKE'
            },
            
            # Overloaded student
            {
                'email': 'student.overload@richwell.edu',
                'first_name': 'Rosa', 'last_name': 'Villanueva',
                'student_number': '2023-00001',
                'year_level': 3, 'section': 'BSIT-3A',
                'is_irregular': False, 'overload_approved': True,
                'scenario': 'OVERLOAD'
            },
            
            # Transferee
            {
                'email': 'student.transferee@richwell.edu',
                'first_name': 'Luis', 'last_name': 'Bautista',
                'student_number': '2025-T0001',
                'year_level': 2, 'section': 'BSIT-2A',
                'is_irregular': True, 'overload_approved': False,
                'is_transferee': True,
                'scenario': 'TRANSFEREE'
            },
            
            # Student with expiring INC
            {
                'email': 'student.inc@richwell.edu',
                'first_name': 'Ina', 'last_name': 'Nacional',
                'student_number': '2024-I0001',
                'year_level': 2, 'section': 'BSIT-2A',
                'scenario': 'EXPIRING_INC'
            },
            
            # Curriculum Comparison Test Students (BSIT)
            {
                'email': 'student.curr2024@richwell.edu',
                'first_name': 'Alice', 'last_name': 'Oldversion',
                'student_number': '2025-C2024',
                'year_level': 1, 'section': 'BSIT-1A',
                'program_key': 'BSIT', 'curriculum_key': 'BSIT_2024',
                'scenario': 'REGULAR_PENDING'
            },
            {
                'email': 'student.curr2025@richwell.edu',
                'first_name': 'Bob', 'last_name': 'Newversion',
                'student_number': '2025-C2025',
                'year_level': 1, 'section': 'BSIT-1A',
                'program_key': 'BSIT', 'curriculum_key': 'BSIT_2025',
                'scenario': 'REGULAR_PENDING'
            },

            # Curriculum Test Students (BSCS)
            {
                'email': 'student.bscs2024@richwell.edu',
                'first_name': 'Charlie', 'last_name': 'Science',
                'student_number': '2025-CS24',
                'year_level': 1, 'section': 'BSCS-1A',
                'program_key': 'BSCS', 'curriculum_key': 'BSCS_2024',
                'scenario': 'REGULAR_PENDING'
            },

            # Curriculum Test Students (BSIS)
            {
                'email': 'student.bsis2024@richwell.edu',
                'first_name': 'Diana', 'last_name': 'Systems',
                'student_number': '2025-IS24',
                'year_level': 1, 'section': 'BSIS-1A',
                'program_key': 'BSIS', 'curriculum_key': 'BSIS_2024',
                'scenario': 'REGULAR_PENDING'
            },
            {
                'email': 'student.test.inc@richwell.edu',
                'first_name': 'Test', 'last_name': 'INC Student',
                'student_number': '2024-TEST-INC',
                'year_level': 2, 'section': 'BSIT-2A',
                'scenario': 'INC_RESOLUTION_TEST'
            },
        ]
        
        if self.minimal:
            students_data = students_data[:4]
        
        for data in students_data:
            user, created = User.objects.get_or_create(
                email=data['email'],
                defaults={
                    'username': data['email'],
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'role': User.Role.STUDENT,
                    'student_number': data['student_number']
                }
            )
            user.set_password('password123')
            user.save()
            
            section = self.sections.get(data['section'])
            
            # Determine program and curriculum override
            program_key = data.get('program_key', 'BSIT')
            program = self.programs.get(program_key)
            
            curriculum_key = data.get('curriculum_key')
            curriculum = self.curricula.get(curriculum_key)
            
            # Fallback if specific key not found
            if not curriculum:
                curriculum = self.curricula.get(f'{program_key}_2024')

            profile, _ = StudentProfile.objects.get_or_create(
                user=user,
                defaults={
                    'program': program,
                    'curriculum': curriculum,
                    'year_level': data['year_level'],
                    'home_section': section,
                    'is_irregular': data.get('is_irregular', False),
                    'overload_approved': data.get('overload_approved', False),
                    'status': 'ACTIVE',
                    'academic_status': 'TRANSFEREE' if data.get('is_transferee') else ('IRREGULAR' if data.get('is_irregular') else 'REGULAR'),
                    'middle_name': 'M',
                    'birthdate': date(2000 + random.randint(0, 5), random.randint(1, 12), random.randint(1, 28)),
                    'address': f'{random.randint(1, 999)} Sample Street, City',
                    'contact_number': f'09{random.randint(100000000, 999999999)}',
                    'is_transferee': data.get('is_transferee', False),
                    'previous_school': 'Previous University' if data.get('is_transferee') else '',
                    'previous_course': 'BSIT' if data.get('is_transferee') else '',
                    'academic_standing': 'Good Standing'
                }
            )
            
            self.students.append({
                'user': user,
                'profile': profile,
                'scenario': data['scenario']
            })
        
        self.stdout.write(f'   - Created {len(self.students)} students')

    # =========================================================================
    # LEVEL 5: Section Offerings
    # =========================================================================
    
    def _seed_level_5_offerings(self):
        self.stdout.write('\n📋 Level 5: Section Offerings...')
        
        self._create_section_subjects()
        
        self.stdout.write(self.style.SUCCESS('   ✓ Section offerings complete'))

    def _create_section_subjects(self):
        """Create SectionSubject entries linking subjects to sections."""
        self.section_subjects = defaultdict(list)
        
        semester_num = 1 if self.semester_current.name == '1st Semester' else 2
        
        for section_name, section in self.sections.items():
            year = section.year_level
            
            # Get subjects for this year level and current semester
            year_subjects = [
                s for s in self.subjects.values()
                if s.year_level == year and s.semester_number == semester_num
            ]
            
            for subject in year_subjects:
                # Find qualified professor
                qualified_profs = [
                    p for p in self.professors
                    if p.professor_profile.assigned_subjects.filter(pk=subject.pk).exists()
                ]
                
                if not qualified_profs:
                    qualified_profs = self.professors[:1]
                
                professor = random.choice(qualified_profs)
                
                ss, _ = SectionSubject.objects.get_or_create(
                    section=section,
                    subject=subject,
                    defaults={
                        'professor': professor,
                        'capacity': section.capacity,
                        'is_tba': False
                    }
                )
                
                self.section_subjects[section_name].append(ss)
                
                # Also create SectionSubjectProfessor entry
                SectionSubjectProfessor.objects.get_or_create(
                    section_subject=ss,
                    professor=professor,
                    defaults={'is_primary': True}
                )
        
        total = sum(len(v) for v in self.section_subjects.values())
        self.stdout.write(f'   - Created {total} section-subject offerings')

    # =========================================================================
    # LEVEL 6: Schedules & Enrollments
    # =========================================================================
    
    def _seed_level_6_schedules_enrollments(self):
        self.stdout.write('\n📅 Level 6: Schedules & Enrollments...')
        
        self._create_schedules()
        self._create_enrollments()
        
        self.stdout.write(self.style.SUCCESS('   ✓ Schedules & enrollments complete'))

    def _create_schedules(self):
        """Create conflict-free schedules for all section subjects."""
        # Track occupied slots
        occupied = {
            'professor': defaultdict(set),
            'room': defaultdict(set),
            'section': defaultdict(set),
        }
        
        DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI']
        HOURS = list(range(7, 19))  # 7 AM to 7 PM
        
        schedule_count = 0
        
        for section_name, section_subjects in self.section_subjects.items():
            section = self.sections[section_name]
            
            for ss in section_subjects:
                # Try to find a free slot
                slot_found = False
                attempts = 0
                
                while not slot_found and attempts < 100:
                    attempts += 1
                    
                    day = random.choice(DAYS)
                    hour = random.choice(HOURS)
                    room = random.choice(self.rooms)
                    
                    slot_key = (day, hour)
                    
                    # Check conflicts
                    prof_id = ss.professor_id if ss.professor else None
                    
                    if prof_id and prof_id in occupied['professor'][slot_key]:
                        continue
                    if room.id in occupied['room'][slot_key]:
                        continue
                    if section.id in occupied['section'][slot_key]:
                        continue
                    
                    # Slot is free
                    ScheduleSlot.objects.get_or_create(
                        section_subject=ss,
                        day=day,
                        start_time=time(hour, 0),
                        end_time=time(hour + 1, 30),
                        defaults={
                            'professor': ss.professor,
                            'room': room.name
                        }
                    )
                    
                    # Mark as occupied
                    if prof_id:
                        occupied['professor'][slot_key].add(prof_id)
                    occupied['room'][slot_key].add(room.id)
                    occupied['section'][slot_key].add(section.id)
                    
                    slot_found = True
                    schedule_count += 1
                
                if not slot_found:
                    self.stdout.write(self.style.WARNING(
                        f'   ⚠ Could not schedule {ss.subject.code} for {section_name}'
                    ))
        
        self.stdout.write(f'   - Created {schedule_count} schedule slots')

    def _create_enrollments(self):
        """Create enrollment headers for students."""
        self.enrollments = {}
        
        for student_data in self.students:
            user = student_data['user']
            scenario = student_data['scenario']
            
            # Determine status based on scenario
            if scenario in ['REGULAR_PAID', 'OVERLOAD', 'TRANSFEREE', 'IRREGULAR_RETAKE', 'EXPIRING_INC']:
                status = 'ACTIVE'
                first_month_paid = True
            elif scenario == 'REGULAR_UNPAID':
                status = 'PENDING_PAYMENT'
                first_month_paid = False
            else:
                status = 'PENDING'
                first_month_paid = False
            
            enrollment, _ = Enrollment.objects.get_or_create(
                student=user,
                semester=self.semester_current,
                defaults={
                    'status': status,
                    'created_via': 'ONLINE',
                    'monthly_commitment': Decimal('5000.00'),
                    'first_month_paid': first_month_paid
                }
            )
            
            self.enrollments[user.email] = {
                'enrollment': enrollment,
                'scenario': scenario
            }
            
            # Create payment buckets
            events = ['Upon Enrollment', 'Prelims', 'Midterms', 'Semi-Finals', 'Finals', 'Clearance']
            for i in range(1, 7):
                is_paid = first_month_paid and i == 1
                
                MonthlyPaymentBucket.objects.get_or_create(
                    enrollment=enrollment,
                    month_number=i,
                    defaults={
                        'event_label': events[i-1],
                        'required_amount': Decimal('5000.00'),
                        'paid_amount': Decimal('5000.00') if is_paid else Decimal('0.00'),
                        'is_fully_paid': is_paid
                    }
                )
        
        self.stdout.write(f'   - Created {len(self.enrollments)} enrollment records')

    # =========================================================================
    # LEVEL 7: Subject Enrollments
    # =========================================================================
    
    def _seed_level_7_subject_enrollments(self):
        self.stdout.write('\n📝 Level 7: Subject Enrollments...')
        
        self._create_subject_enrollments()
        self._create_past_enrollments()
        
        self.stdout.write(self.style.SUCCESS('   ✓ Subject enrollments complete'))

    def _create_subject_enrollments(self):
        """Create subject enrollment records based on scenarios."""
        
        for student_data in self.students:
            user = student_data['user']
            profile = student_data['profile']
            scenario = student_data['scenario']
            
            enrollment_data = self.enrollments.get(user.email)
            if not enrollment_data:
                continue
            
            enrollment = enrollment_data['enrollment']
            section = profile.home_section
            
            if not section:
                continue
            
            # Get section subjects
            section_subjects = SectionSubject.objects.filter(section=section)
            
            # Determine enrollment status
            if scenario == 'REGULAR_PAID':
                status = 'ENROLLED'
                payment_approved = True
                head_approved = True
            elif scenario == 'REGULAR_UNPAID':
                status = 'PENDING_PAYMENT'
                payment_approved = False
                head_approved = True
            else:
                status = 'PENDING'
                payment_approved = False
                head_approved = False
            
            for ss in section_subjects:
                SubjectEnrollment.objects.get_or_create(
                    enrollment=enrollment,
                    subject=ss.subject,
                    defaults={
                        'section': section,
                        'enrollment_type': 'HOME',
                        'status': status,
                        'is_irregular': profile.is_irregular,
                        'payment_approved': payment_approved,
                        'head_approved': head_approved
                    }
                )
            
            # Handle special scenarios
            if scenario == 'IRREGULAR_RETAKE':
                self._add_retake_enrollment(user, enrollment, profile)
            
            if scenario == 'OVERLOAD':
                self._add_overload_enrollment(user, enrollment, profile)
        
        self.stdout.write(f'   - Created {SubjectEnrollment.objects.count()} subject enrollments')

    def _add_retake_enrollment(self, user, enrollment, profile):
        """Add retake subject for irregular student."""
        # Find a subject they "failed" to retake
        failed_subject = self.subjects.get('CS102')  # Programming 1
        if not failed_subject:
            return
        
        # Find another section offering this subject
        other_section = SectionSubject.objects.filter(
            subject=failed_subject
        ).exclude(section=profile.home_section).first()
        
        if not other_section:
            return
        
        SubjectEnrollment.objects.get_or_create(
            enrollment=enrollment,
            subject=failed_subject,
            defaults={
                'section': other_section.section,
                'enrollment_type': 'RETAKE',
                'status': 'ENROLLED',
                'is_irregular': True,
                'is_retake': True,
                'payment_approved': True,
                'head_approved': True
            }
        )

    def _add_overload_enrollment(self, user, enrollment, profile):
        """Add extra subjects for overloaded student."""
        # Find a subject from lower year
        extra_subject = self.subjects.get('DB101')  # Database from Year 2
        if not extra_subject:
            return
        
        # Find section offering this
        section_subj = SectionSubject.objects.filter(subject=extra_subject).first()
        
        if not section_subj:
            return
        
        SubjectEnrollment.objects.get_or_create(
            enrollment=enrollment,
            subject=extra_subject,
            defaults={
                'section': section_subj.section,
                'enrollment_type': 'OVERLOAD',
                'status': 'ENROLLED',
                'is_irregular': False,
                'payment_approved': True,
                'head_approved': True,
                'registrar_approved': True
            }
        )

    def _create_past_enrollments(self):
        """Create past semester enrollments for academic history."""
        if self.minimal:
            return
        
        # Create a past section for Juan Dela Cruz to have in archives
        juan = self.professors[0] # Juan Dela Cruz
        past_section, _ = Section.all_objects.get_or_create(
            name='BSIT-1A-PAST',
            semester=self.semester_2025_1,
            defaults={
                'program': self.programs['BSIT'],
                'curriculum': self.curricula['BSIT_2024'],
                'year_level': 1,
                'capacity': 40
            }
        )
        
        # Create past section subjects
        for code in ['CS101', 'CS102']:
            subject = self.subjects[code]
            ss, _ = SectionSubject.objects.get_or_create(
                section=past_section,
                subject=subject,
                defaults={'professor': juan}
            )
            SectionSubjectProfessor.objects.get_or_create(
                section_subject=ss,
                professor=juan,
                defaults={'is_primary': True}
            )

        # Find students who need past history
        for student_data in self.students:
            user = student_data['user']
            profile = student_data['profile']
            scenario = student_data['scenario']
            
            if profile.year_level == 1 and scenario != 'INC_RESOLUTION_TEST':
                continue
            
            # Create past enrollment (Last Semester - 1st Sem 2025-2026)
            past_enroll, created = Enrollment.objects.get_or_create(
                student=user,
                semester=self.semester_2025_1,
                defaults={
                    'status': 'COMPLETED',
                    'created_via': 'ONLINE',
                    'monthly_commitment': Decimal('5000.00'),
                    'first_month_paid': True
                }
            )
            
            if not created:
                continue
            
            # Add past subjects
            year = 1 if scenario == 'INC_RESOLUTION_TEST' else (profile.year_level if profile.year_level > 1 else 1)
            past_subjects = [
                s for s in self.subjects.values()
                if s.year_level == year and s.semester_number == 1
            ]
            
            for subject in past_subjects:
                passed = True
                
                # For irregular student, one subject was failed
                if scenario == 'IRREGULAR_RETAKE' and subject.code == 'CS103':
                    passed = False
                
                enrollment_status = 'PASSED' if passed else 'FAILED'
                enrollment_grade = Decimal('1.50') if passed else Decimal('5.00')
                inc_marked_at = None
                
                # Special cases for INC
                if scenario == 'EXPIRING_INC' and subject.code == 'CS103':
                    enrollment_status = 'INC'
                    enrollment_grade = None
                    inc_marked_at = timezone.make_aware(timezone.datetime(2025, 2, 15))
                elif scenario == 'INC_RESOLUTION_TEST' and subject.code == 'CS101':
                    enrollment_status = 'INC'
                    enrollment_grade = None
                    inc_marked_at = timezone.make_aware(timezone.datetime(2025, 11, 15))
                
                SubjectEnrollment.objects.create(
                    enrollment=past_enroll,
                    subject=subject,
                    section=past_section if subject.code in ['CS101', 'CS102'] else None,
                    status=enrollment_status,
                    grade=enrollment_grade,
                    inc_marked_at=inc_marked_at,
                    is_finalized=True,
                    payment_approved=True,
                    head_approved=True
                )
        
        self.stdout.write('   - Created past enrollment history')

    # =========================================================================
    # LEVEL 8: Transactions & Audit
    # =========================================================================
    
    def _seed_level_8_transactions_audit(self):
        self.stdout.write('\n💰 Level 8: Transactions & Audit...')
        
        self._create_payment_transactions()
        self._create_exam_permits()
        self._create_audit_logs()
        
        self.stdout.write(self.style.SUCCESS('   ✓ Transactions & audit complete'))

    def _create_payment_transactions(self):
        """Create payment transaction records for paid students."""
        receipt_counter = 1
        
        for email, data in self.enrollments.items():
            enrollment = data['enrollment']
            scenario = data['scenario']
            
            if scenario not in ['REGULAR_PAID', 'OVERLOAD']:
                continue
            
            receipt_number = f"RCV-{timezone.now().strftime('%Y%m%d')}-{receipt_counter:05d}"
            receipt_counter += 1
            
            PaymentTransaction.objects.get_or_create(
                enrollment=enrollment,
                receipt_number=receipt_number,
                defaults={
                    'amount': Decimal('5000.00'),
                    'payment_mode': random.choice(['CASH', 'GCASH', 'ONLINE']),
                    'processed_by': self.cashier,
                    'allocated_buckets': [
                        {'bucket_id': str(enrollment.payment_buckets.first().id), 'month': 1, 'amount': 5000.00}
                    ],
                    'is_adjustment': False
                }
            )
        
        self.stdout.write(f'   - Created {PaymentTransaction.objects.count()} payment transactions')

    def _create_exam_permits(self):
        """Create exam permits for paid students."""
        permit_counter = 1
        
        for email, data in self.enrollments.items():
            enrollment = data['enrollment']
            
            if enrollment.first_month_paid:
                permit_code = f"EXP-{timezone.now().strftime('%Y%m%d')}-{permit_counter:05d}"
                permit_counter += 1
                
                ExamPermit.objects.get_or_create(
                    enrollment=enrollment,
                    exam_period='PRELIM',
                    defaults={
                        'permit_code': permit_code,
                        'required_month': 1,
                        'is_printed': False
                    }
                )
        
        self.stdout.write(f'   - Created {ExamPermit.objects.count()} exam permits')

    def _create_audit_logs(self):
        """Create audit log entries for tracking."""
        # Log user creation
        for prof in self.professors[:3]:
            AuditLog.objects.create(
                actor=self.admin,
                action=AuditLog.Action.USER_CREATED,
                target_model='User',
                target_id=prof.id,
                payload={'email': prof.email, 'role': prof.role}
            )
        
        # Log curriculum creation
        for code, curriculum in self.curricula.items():
            AuditLog.objects.create(
                actor=self.registrar,
                action=AuditLog.Action.CURRICULUM_CREATED,
                target_model='Curriculum',
                target_id=curriculum.id,
                payload={'code': curriculum.code, 'program': code}
            )
        
        # Log enrollments
        for email, data in list(self.enrollments.items())[:5]:
            enrollment = data['enrollment']
            AuditLog.objects.create(
                actor=enrollment.student,
                action=AuditLog.Action.ENROLLMENT_CREATED,
                target_model='Enrollment',
                target_id=enrollment.id,
                payload={'semester': str(enrollment.semester), 'status': enrollment.status}
            )
        
        self.stdout.write(f'   - Created {AuditLog.objects.count()} audit logs')

    # =========================================================================
    # LEVEL 9: Grade Resolutions & History
    # =========================================================================
    
    def _seed_level_9_resolutions(self):
        self.stdout.write('\n📋 Level 9: Grade Resolutions & History...')
        
        self._create_grade_resolutions()
        self._create_inc_scenarios()
        
        self.stdout.write(self.style.SUCCESS('   ✓ Grade resolutions complete'))

    def _create_grade_resolutions(self):
        """Create grade resolution records in various states for testing."""
        if self.minimal:
            return
        
        # Find a completed enrollment with a grade that could be resolved
        # We need past semester enrollments with finalized grades
        past_enrollment = SubjectEnrollment.objects.filter(
            status__in=['FAILED', 'PASSED'],
            is_finalized=True
        ).first()
        
        if not past_enrollment:
            self.stdout.write(self.style.WARNING('   ⚠ No finalized enrollments for resolutions'))
            return
        
        professor = self.professors[0] if self.professors else None
        if not professor:
            return
        
        # 1. PENDING_HEAD: Awaiting Department Head approval
        GradeResolution.objects.get_or_create(
            subject_enrollment=past_enrollment,
            status=GradeResolution.Status.PENDING_HEAD,
            defaults={
                'current_grade': past_enrollment.grade or Decimal('5.00'),
                'proposed_grade': Decimal('2.50'),
                'current_status': past_enrollment.status,
                'proposed_status': 'PASSED',
                'reason': 'Recomputation of final grade after reviewing exam papers.',
                'requested_by': professor,
                'reviewed_by_registrar': self.registrar,
                'registrar_notes': 'Verified by Registrar. Forwarded to Head for approval.',
                'registrar_action_at': timezone.now() - timedelta(days=2),
            }
        )
        
        # Find specific student for PENDING_REGISTRAR test
        test_inc_student = User.objects.filter(email='student.test.inc@richwell.edu').first()
        another_enrollment = None
        
        if test_inc_student:
             another_enrollment = SubjectEnrollment.objects.filter(
                enrollment__student=test_inc_student,
                status__in=['INC', 'FAILED'],
                is_finalized=True
            ).first()

        if not another_enrollment:
            # Fallback to any student
            another_enrollment = SubjectEnrollment.objects.filter(
                status__in=['INC', 'FAILED'],
                is_finalized=True
            ).exclude(pk=past_enrollment.pk).first()
        
        if another_enrollment:
            # 2. PENDING_REGISTRAR: Awaiting Registrar review (first step)
            GradeResolution.objects.get_or_create(
                subject_enrollment=another_enrollment,
                status=GradeResolution.Status.PENDING_REGISTRAR,
                defaults={
                    'current_grade': another_enrollment.grade or Decimal('5.00'),
                    'proposed_grade': Decimal('3.00'),
                    'current_status': another_enrollment.status,
                    'proposed_status': 'PASSED',
                    'reason': 'Student submitted missing requirements after deadline.',
                    'requested_by': professor,
                }
            )
        
        # 3. APPROVED: Fully approved resolution (for history)
        approved_enrollment = SubjectEnrollment.objects.filter(
            status='PASSED',
            is_finalized=True
        ).exclude(pk__in=[past_enrollment.pk, another_enrollment.pk if another_enrollment else None]).first()
        
        if approved_enrollment:
            GradeResolution.objects.get_or_create(
                subject_enrollment=approved_enrollment,
                status=GradeResolution.Status.APPROVED,
                defaults={
                    'current_grade': Decimal('3.00'),
                    'proposed_grade': approved_enrollment.grade or Decimal('2.00'),
                    'current_status': 'PASSED',
                    'proposed_status': 'PASSED',
                    'reason': 'Grade adjustment after clerical error discovery.',
                    'requested_by': professor,
                    'reviewed_by_registrar': self.registrar,
                    'registrar_notes': 'Verified computation error.',
                    'registrar_action_at': timezone.now() - timedelta(days=5),
                    'reviewed_by_head': self.dept_head,
                    'head_notes': 'Approved. Grade corrected.',
                    'head_action_at': timezone.now() - timedelta(days=3),
                }
            )

        if another_enrollment:
             # EPIC 5: Create a resolution pending registrar review for testing
             GradeResolution.objects.get_or_create(
                 subject_enrollment=another_enrollment,
                 status=GradeResolution.Status.PENDING_REGISTRAR,
                 defaults={
                     'current_grade': None,
                     'proposed_grade': Decimal('2.50'),
                     'current_status': 'INC',
                     'proposed_status': 'PASSED',
                     'reason': 'Student submitted late project for resolution.',
                     'requested_by': professor,
                     'reviewed_by_head': self.dept_head,
                     'head_notes': 'Verified compliance. Passed to registrar.',
                     'head_action_at': timezone.now() - timedelta(days=1),
                 }
             )
        
        self.stdout.write(f'   - Created {GradeResolution.objects.count()} grade resolutions')

    def _create_inc_scenarios(self):
        """Create INC grade scenarios for testing expiry workflows."""
        if self.minimal:
            return
        
        # Find an enrollment that can be set to INC
        enrolled_subj = SubjectEnrollment.objects.filter(
            status='ENROLLED',
            is_finalized=False
        ).first()
        
        if enrolled_subj:
            # Set this to INC with a finalized_at date ~20 days ago
            enrolled_subj.status = 'INC'
            enrolled_subj.grade = None
            enrolled_subj.is_finalized = True
            enrolled_subj.finalized_at = timezone.now() - timedelta(days=20)
            enrolled_subj.save()
            
            # Create grade history for this
            GradeHistory.objects.get_or_create(
                subject_enrollment=enrolled_subj,
                new_grade=None,
                new_status='INC',
                defaults={
                    'previous_grade': None,
                    'previous_status': 'ENROLLED',
                    'change_reason': 'Student did not complete requirements.',
                    'changed_by': self.professors[0] if self.professors else self.registrar,
                    'is_finalization': True
                }
            )
            
            self.stdout.write('   - Created INC scenario (expiring in ~10 days)')

    # =========================================================================
    # JUNJUN SCENARIO
    # =========================================================================

    def _seed_junjun_scenario(self):
        """
        Special scenario for Professor Junjun:
        - 3 terms of history (past semesters)
        - 3 sections per term, 5 students per section
        - 4 INCs in the last term
        - Current sections with retake students
        """
        self.stdout.write('\n👨‍🏫 Special Scenario: Professor Junjun...')
        
        # 1. Create Professor Junjun
        junjun_user, _ = User.objects.get_or_create(
            email='junjun@richwell.edu',
            defaults={
                'username': 'junjun@richwell.edu',
                'first_name': 'Junjun',
                'last_name': 'Professor',
                'role': User.Role.PROFESSOR
            }
        )
        junjun_user.set_password('password123')
        junjun_user.save()
        
        junjun_profile, _ = ProfessorProfile.objects.get_or_create(
            user=junjun_user,
            defaults={
                'department': 'College of Computer Studies',
                'specialization': 'Programming',
                'is_active': True
            }
        )
        
        # Assign him some subjects
        subjects = [self.subjects['CS101'], self.subjects['CS102'], self.subjects['CS103']]
        for s in subjects:
            junjun_profile.assigned_subjects.add(s)

        # 2. Terms to seed (3 past + 1 current = 4 total, but user said "already teached in 3 terms" + current?)
        # Let's interpret as 2 past terms + 1 last term (where INCs are) + 1 current term.
        terms = [
            (self.semester_2024_1, 'T1'),
            (self.semester_2024_2, 'T2'),
            (self.semester_2025_1, 'T3'),  # Last term (with INCs)
            (self.semester_current, 'CURR')
        ]
        
        program = self.programs['BSIT']
        curriculum = self.curricula['BSIT_2024']
        
        inc_count = 0
        
        for semester, term_suffix in terms:
            is_current = (semester == self.semester_current)
            is_last_term = (semester == self.semester_2025_1)
            
            for i in range(1, 4):  # 3 sections
                section_name = f'JUNJUN-{term_suffix}-{i}'
                section, _ = Section.all_objects.get_or_create(
                    name=section_name,
                    semester=semester,
                    defaults={
                        'program': program,
                        'curriculum': curriculum,
                        'year_level': 1,
                        'capacity': 10
                    }
                )
                if section.is_deleted:
                    section.is_deleted = False
                    section.save()
                
                # Assign Junjun to a subject in this section
                subject = subjects[i-1] # Cycle through subjects
                ss, _ = SectionSubject.objects.get_or_create(
                    section=section,
                    subject=subject,
                    defaults={'professor': junjun_user, 'capacity': 10}
                )
                SectionSubjectProfessor.objects.get_or_create(
                    section_subject=ss,
                    professor=junjun_user,
                    defaults={'is_primary': True}
                )

                # Add a schedule slot for current term to avoid empty schedule view
                if is_current:
                    from datetime import time
                    ScheduleSlot.objects.get_or_create(
                        section_subject=ss,
                        day=['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][i % 6],
                        defaults={
                            'start_time': time(8 + i, 0),
                            'end_time': time(10 + i, 0),
                            'room': f'CL-0{i}',
                            'professor': junjun_user
                        }
                    )
                    # Mark as not TBA since it has a schedule
                    ss.is_tba = False
                    ss.save()
                
                # 5 students per section
                for j in range(1, 6):
                    student_email = f'student.junjun.{term_suffix}.{i}.{j}@richwell.edu'
                    s_user, created = User.objects.get_or_create(
                        email=student_email,
                        defaults={
                            'username': student_email,
                            'first_name': f'Student-{term_suffix}-{i}',
                            'last_name': f'Junjun-{j}',
                            'role': User.Role.STUDENT,
                            'student_number': f'JJ-{term_suffix}-{i}-{j}'
                        }
                    )
                    if created:
                        s_user.set_password('password123')
                        s_user.save()
                    
                    s_profile, _ = StudentProfile.objects.get_or_create(
                        user=s_user,
                        defaults={
                            'program': program,
                            'curriculum': curriculum, # Already using BSIT_2024 from line 1769
                            'year_level': 1,
                            'home_section': section if is_current else None,
                            'academic_status': 'REGULAR',
                            'status': 'ACTIVE', # Ensure they are active/approved
                            'middle_name': 'M',
                            'birthdate': date(2000 + random.randint(0, 5), random.randint(1, 12), random.randint(1, 28)),
                            'address': f'{random.randint(1, 999)} Junjun Street, City',
                            'contact_number': f'09{random.randint(100000000, 999999999)}',
                            'academic_standing': 'Good Standing'
                        }
                    )
                    
                    # Force update important fields ensuring status is active and curriculum is set
                    if s_profile.status != 'ACTIVE' or s_profile.curriculum != curriculum:
                        s_profile.status = 'ACTIVE'
                        s_profile.curriculum = curriculum
                        s_profile.save()
                    
                    # Enrollment record
                    enroll, _ = Enrollment.objects.get_or_create(
                        student=s_user,
                        semester=semester,
                        defaults={
                            'status': 'COMPLETED' if not is_current else 'ACTIVE',
                            'monthly_commitment': Decimal('5000.00'),
                            'created_via': 'ONLINE',
                            'first_month_paid': True
                        }
                    )
                    
                    status = 'PASSED'
                    grade = Decimal('2.00')
                    inc_date = None
                    is_retake = False
                    
                    # Last term INCs (Total 4)
                    if is_last_term and inc_count < 4:
                        status = 'INC'
                        grade = None
                        inc_date = semester.end_date - timedelta(days=5)
                        inc_count += 1
                    
                    # Current term retakes
                    if is_current and j == 1: # Let 1 student per section be a retaker
                        is_retake = True
                        # To make them a retaker, they must have failed in a past term
                        # Let's add a failed enrollment in T1 for this student
                        past_enroll, _ = Enrollment.objects.get_or_create(
                            student=s_user,
                            semester=self.semester_2024_1,
                            defaults={
                                'status': 'COMPLETED',
                                'monthly_commitment': Decimal('5000.00'),
                                'created_via': 'ONLINE',
                                'first_month_paid': True
                            }
                        )
                        SubjectEnrollment.objects.get_or_create(
                            enrollment=past_enroll,
                            subject=subject,
                            defaults={
                                'status': 'FAILED',
                                'grade': Decimal('5.00'),
                                'is_finalized': True,
                                'failed_at': timezone.make_aware(timezone.datetime.combine(self.semester_2024_1.end_date, timezone.datetime.min.time()))
                            }
                        )
                    
                    subject_enroll = SubjectEnrollment.objects.create(
                        enrollment=enroll,
                        subject=subject,
                        section=section,
                        status=status if not is_current else 'ENROLLED',
                        grade=grade if not is_current else None,
                        inc_marked_at=timezone.make_aware(timezone.datetime.combine(inc_date, timezone.datetime.min.time())) if inc_date else None,
                        is_finalized=not is_current,
                        is_retake=is_retake,
                        head_approved=True,
                        payment_approved=True
                    )
                    
                    # Create Resolutions for the INCs (for approval flow testing)
                    if status == 'INC':
                         # Student 1: Pending Head
                        if j == 1:
                            GradeResolution.objects.create(
                                subject_enrollment=subject_enroll,
                                status=GradeResolution.Status.PENDING_HEAD,
                                current_grade=None,
                                proposed_grade=Decimal('2.00'),
                                current_status='INC',
                                proposed_status='PASSED',
                                reason='Completed requirements.',
                                requested_by=junjun_user
                            )
                        # Student 2: Pending Registrar
                        elif j == 2:
                            GradeResolution.objects.create(
                                subject_enrollment=subject_enroll,
                                status=GradeResolution.Status.PENDING_REGISTRAR,
                                current_grade=None,
                                proposed_grade=Decimal('2.25'),
                                current_status='INC',
                                proposed_status='PASSED',
                                reason='Late submission accepted.',
                                requested_by=junjun_user,
                                reviewed_by_head=junjun_user, # Self-approve as head? Or explicit head
                                head_notes='Endorsed.'
                            )
                        # Student 3: Pending Head (Another one)
                        elif j == 3:
                            GradeResolution.objects.create(
                                subject_enrollment=subject_enroll,
                                status=GradeResolution.Status.PENDING_HEAD,
                                current_grade=None,
                                proposed_grade=Decimal('1.75'),
                                current_status='INC',
                                proposed_status='PASSED',
                                reason='Output verification.',
                                requested_by=junjun_user
                            )

        self.stdout.write(self.style.SUCCESS(f'   ✓ Seeded Junjun with {inc_count} INCs and retake scenarios'))

    # =========================================================================
    # SUMMARY
    # =========================================================================
    
    def _print_summary(self):
        """Print summary of seeded data."""
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('  SEEDING SUMMARY'))
        self.stdout.write('='*60)
        
        summary = [
            ('Semesters', Semester.objects.count()),
            ('Programs', Program.objects.count()),
            ('Curricula', Curriculum.objects.count()),
            ('Subjects', Subject.objects.count()),
            ('Sections', Section.objects.count()),
            ('Section Offerings', SectionSubject.objects.count()),
            ('Schedule Slots', ScheduleSlot.objects.count()),
            ('Rooms', Room.objects.count()),
            ('Staff Users', User.objects.filter(role__in=['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR', 'CASHIER', 'DEPARTMENT_HEAD']).count()),
            ('Professors', User.objects.filter(role='PROFESSOR').count()),
            ('Students', User.objects.filter(role='STUDENT').count()),
            ('Enrollments', Enrollment.objects.count()),
            ('Subject Enrollments', SubjectEnrollment.objects.count()),
            ('Payment Buckets', MonthlyPaymentBucket.objects.count()),
            ('Payment Transactions', PaymentTransaction.objects.count()),
            ('Exam Permits', ExamPermit.objects.count()),
            ('Grade Resolutions', GradeResolution.objects.count()),
            ('Grade History', GradeHistory.objects.count()),
            ('Audit Logs', AuditLog.objects.count()),
            ('Permissions', Permission.objects.count()),
        ]
        
        for label, count in summary:
            self.stdout.write(f'   {label:.<30} {count:>5}')
        
        self.stdout.write('\n' + '-'*60)
        self.stdout.write('  Test Credentials:')
        self.stdout.write('-'*60)
        self.stdout.write('   Admin:     admin@richwell.edu / password123')
        self.stdout.write('   Registrar: registrar@richwell.edu / password123')
        self.stdout.write('   Head:      head@richwell.edu / password123')
        self.stdout.write('   Cashier:   cashier@richwell.edu / password123')
        self.stdout.write('   Professor: juan.dela.cruz@richwell.edu / password123')
        self.stdout.write('   Professor: junjun@richwell.edu / password123')
        self.stdout.write('   Student:   student.regular1@richwell.edu / password123')
        self.stdout.write('   Student (2024 Curr): student.curr2024@richwell.edu / password123')
        self.stdout.write('   Student (2025 Curr): student.curr2025@richwell.edu / password123')
        self.stdout.write('   Student (INC P-Head): student.junjun.T3.1.1@richwell.edu / password123')
        self.stdout.write('   Student (INC P-Reg):  student.junjun.T3.1.2@richwell.edu / password123')
        self.stdout.write('   Student (INC P-Head): student.junjun.T3.1.3@richwell.edu / password123')
        self.stdout.write('   Student (INC None):   student.junjun.T3.1.4@richwell.edu / password123')
        self.stdout.write('='*60)

