"""
Comprehensive Database Seeder
==============================
Full seeder covering every table in the Richwell Portal DB.
Current semester is ENROLLMENT_OPEN with enrollment_end_date = next month.

Usage:
    python manage.py seed_comprehensive           # Additive
    python manage.py seed_comprehensive --wipe    # Wipe and reseed
    python manage.py seed_comprehensive --minimal # Quick test data
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
    StudentProfile, ProfessorProfile, DepartmentHeadProfile,
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
    GradeResolution, DocumentRelease, EnrollmentDocument, CreditSource
)
from apps.audit.models import AuditLog
from apps.core.models import SystemConfig, Notification

User = get_user_model()


class Command(BaseCommand):
    help = 'Seeds the database with comprehensive test data (enrollment is OPEN until next month)'

    def add_arguments(self, parser):
        parser.add_argument('--wipe', action='store_true', help='Wipe all data before seeding')
        parser.add_argument('--minimal', action='store_true', help='Minimal dataset for quick testing')

    def handle(self, *args, **options):
        self.wipe = options.get('wipe', False)
        self.minimal = options.get('minimal', False)

        # Seed date anchor: Feb 22, 2026
        self.today = date(2026, 2, 22)
        self.now = timezone.make_aware(timezone.datetime(2026, 2, 22, 10, 0, 0))

        self.stdout.write(self.style.WARNING('=' * 65))
        self.stdout.write(self.style.WARNING('  Richwell Portal — Comprehensive Database Seeder'))
        self.stdout.write(self.style.WARNING('  Enrollment is OPEN until next month (Mar 22, 2026)'))
        self.stdout.write(self.style.WARNING('=' * 65))

        with transaction.atomic():
            if self.wipe:
                self._wipe_all_data()

            self._seed_level_0_foundation()
            self._seed_level_1_organization()
            self._seed_level_2_academics_base()
            self._seed_level_3_curriculum_subjects()
            self._seed_level_4_sections_students()
            self._seed_level_5_offerings()
            self._seed_level_6_schedules_enrollments()
            self._seed_level_7_subject_enrollments()
            self._seed_level_8_transactions_audit()
            self._seed_level_9_resolutions_docs()
            self._seed_system_configs()
            self._seed_notifications()
            self._print_summary()

        self.stdout.write(self.style.SUCCESS('\n✓ Comprehensive seeding completed!'))

    # =========================================================================
    # WIPE
    # =========================================================================

    def _wipe_all_data(self):
        self.stdout.write('\n🗑️  Wiping existing data...')
        # Wipe in reverse dependency order; AuditLog is immutable so use raw delete
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM audit_auditlog")

        GradeResolution.objects.all().delete()
        DocumentRelease.objects.all().delete()
        GradeHistory.objects.all().delete()
        SemesterGPA.objects.all().delete()
        ExamPermit.objects.all().delete()
        PaymentTransaction.objects.all().delete()
        EnrollmentApproval.objects.all().delete()
        CreditSource.objects.all().delete()
        SubjectEnrollment.objects.all().delete()       # plain manager
        MonthlyPaymentBucket.objects.all().delete()
        OverloadRequest.objects.all().delete()
        EnrollmentDocument.objects.all().delete()
        Enrollment.objects.all().delete()
        ScheduleSlot.objects.all().delete()
        SectionSubjectProfessor.objects.all().delete()
        SectionSubject.objects.all().delete()
        Section.all_objects.all().delete()             # has all_objects
        StudentProfile.objects.all().delete()
        DepartmentHeadProfile.objects.all().delete()
        CurriculumSubject.objects.all().delete()
        CurriculumVersion.objects.all().delete()
        Subject.all_objects.all().delete()             # has all_objects
        Curriculum.objects.all().delete()
        ProfessorProfile.objects.all().delete()
        Program.all_objects.all().delete()             # has all_objects
        Room.objects.all().delete()
        ExamMonthMapping.objects.all().delete()
        Semester.objects.all().delete()
        UserPermission.objects.all().delete()
        Permission.objects.all().delete()
        PermissionCategory.objects.all().delete()
        Notification.objects.all().delete()
        SystemConfig.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()
        self.stdout.write(self.style.SUCCESS('   ✓ Wiped'))

    # =========================================================================
    # LEVEL 0: Foundation
    # =========================================================================

    def _seed_level_0_foundation(self):
        self.stdout.write('\n📦 Level 0: Foundation...')
        self._create_semesters()
        self._create_permissions()
        self._create_exam_mappings()
        self.stdout.write(self.style.SUCCESS('   ✓ Foundation complete'))

    def _create_semesters(self):
        # Semester 1 AY 2024-2025 — ARCHIVED
        self.sem_2024_1, _ = Semester.objects.get_or_create(
            name='1st Semester', academic_year='2024-2025',
            defaults={
                'start_date': date(2024, 8, 1), 'end_date': date(2024, 12, 15),
                'enrollment_start_date': date(2024, 7, 15), 'enrollment_end_date': date(2024, 8, 15),
                'grading_start_date': date(2024, 11, 1), 'grading_end_date': date(2024, 12, 31),
                'status': 'ARCHIVED', 'is_current': False,
            }
        )

        # Semester 2 AY 2024-2025 — ARCHIVED
        self.sem_2024_2, _ = Semester.objects.get_or_create(
            name='2nd Semester', academic_year='2024-2025',
            defaults={
                'start_date': date(2025, 1, 6), 'end_date': date(2025, 5, 31),
                'enrollment_start_date': date(2024, 12, 15), 'enrollment_end_date': date(2025, 1, 10),
                'grading_start_date': date(2025, 4, 1), 'grading_end_date': date(2025, 6, 15),
                'status': 'ARCHIVED', 'is_current': False,
            }
        )

        # Semester 1 AY 2025-2026 — GRADING_CLOSED (past, grades finalized)
        self.sem_2025_1, _ = Semester.objects.get_or_create(
            name='1st Semester', academic_year='2025-2026',
            defaults={
                'start_date': date(2025, 8, 1), 'end_date': date(2025, 12, 15),
                'enrollment_start_date': date(2025, 7, 1), 'enrollment_end_date': date(2025, 8, 15),
                'grading_start_date': date(2025, 11, 1), 'grading_end_date': date(2025, 12, 31),
                'status': 'GRADING_CLOSED', 'is_current': False,
            }
        )

        # Semester 2 AY 2025-2026 — ENROLLMENT_OPEN (enrollment_end_date = next month!)
        self.sem_current, _ = Semester.objects.get_or_create(
            name='2nd Semester', academic_year='2025-2026',
            defaults={
                'start_date': date(2026, 1, 5), 'end_date': date(2026, 5, 30),
                'enrollment_start_date': date(2026, 1, 5),
                'enrollment_end_date': date(2026, 3, 22),   # << next month from Feb 22
                'grading_start_date': date(2026, 4, 20), 'grading_end_date': date(2026, 6, 15),
                'status': 'ENROLLMENT_OPEN', 'is_current': True,
            }
        )

        # Ensure only the current semester is marked current
        Semester.objects.exclude(pk=self.sem_current.pk).update(is_current=False)
        self.stdout.write(f'   - Created 4 semesters (current: ENROLLMENT_OPEN until Mar 22, 2026)')

    def _create_permissions(self):
        cats = [
            ('academic_management', 'Academic Management', 'book-open', 1),
            ('enrollment_management', 'Enrollment Management', 'users', 2),
            ('user_management', 'User Management', 'user-group', 3),
            ('schedule_management', 'Schedule Management', 'calendar', 4),
            ('grade_management', 'Grade Management', 'chart-bar', 5),
            ('payment_management', 'Payment Management', 'currency-dollar', 6),
            ('document_management', 'Document Management', 'document', 7),
        ]
        self.perm_cats = {}
        for code, name, icon, order in cats:
            cat, _ = PermissionCategory.objects.get_or_create(
                code=code, defaults={'name': name, 'icon': icon, 'order': order}
            )
            self.perm_cats[code] = cat

        perms = [
            # Academic
            ('program.view', 'View Programs', 'academic_management',
             ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR', 'DEPARTMENT_HEAD']),
            ('program.manage', 'Manage Programs', 'academic_management', ['ADMIN', 'HEAD_REGISTRAR']),
            ('curriculum.view', 'View Curricula', 'academic_management',
             ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR', 'DEPARTMENT_HEAD', 'PROFESSOR']),
            ('curriculum.manage', 'Manage Curricula', 'academic_management', ['ADMIN', 'HEAD_REGISTRAR']),
            ('subject.view', 'View Subjects', 'academic_management',
             ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR', 'DEPARTMENT_HEAD', 'PROFESSOR', 'STUDENT']),
            ('subject.manage', 'Manage Subjects', 'academic_management', ['ADMIN', 'HEAD_REGISTRAR']),
            # Enrollment
            ('enrollment.view', 'View Enrollments', 'enrollment_management',
             ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR', 'DEPARTMENT_HEAD', 'CASHIER']),
            ('enrollment.process', 'Process Enrollments', 'enrollment_management',
             ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR', 'ADMISSION_STAFF']),
            ('enrollment.approve', 'Approve Enrollments', 'enrollment_management',
             ['ADMIN', 'HEAD_REGISTRAR', 'DEPARTMENT_HEAD']),
            # Users
            ('user.view', 'View Users', 'user_management',
             ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR']),
            ('user.manage', 'Manage Users', 'user_management', ['ADMIN']),
            # Schedule
            ('schedule.view', 'View Schedules', 'schedule_management',
             ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR', 'DEPARTMENT_HEAD', 'PROFESSOR', 'STUDENT']),
            ('schedule.manage', 'Manage Schedules', 'schedule_management',
             ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR']),
            # Grades
            ('grade.view', 'View Grades', 'grade_management',
             ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR', 'PROFESSOR', 'STUDENT']),
            ('grade.submit', 'Submit Grades', 'grade_management', ['PROFESSOR']),
            ('grade.finalize', 'Finalize Grades', 'grade_management',
             ['ADMIN', 'HEAD_REGISTRAR', 'REGISTRAR']),
            # Payments
            ('payment.view', 'View Payments', 'payment_management',
             ['ADMIN', 'CASHIER', 'REGISTRAR', 'HEAD_REGISTRAR']),
            ('payment.process', 'Process Payments', 'payment_management', ['ADMIN', 'CASHIER']),
            # Documents
            ('document.view', 'View Documents', 'document_management',
             ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR']),
            ('document.release', 'Release Documents', 'document_management',
             ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR']),
        ]

        for code, name, cat_code, roles in perms:
            Permission.objects.get_or_create(
                code=code,
                defaults={
                    'name': name,
                    'category': self.perm_cats[cat_code],
                    'default_for_roles': roles,
                }
            )
        self.stdout.write(f'   - Created {Permission.objects.count()} permissions')

    def _create_exam_mappings(self):
        for exam_period, month in [('PRELIM', 1), ('MIDTERM', 2), ('PREFINAL', 4), ('FINAL', 6)]:
            ExamMonthMapping.objects.get_or_create(
                semester=self.sem_current, exam_period=exam_period,
                defaults={'required_month': month, 'is_active': True}
            )

    # =========================================================================
    # LEVEL 1: Organization
    # =========================================================================

    def _seed_level_1_organization(self):
        self.stdout.write('\n🏢 Level 1: Organization...')
        self._create_rooms()
        self._create_staff_users()
        self.stdout.write(self.style.SUCCESS('   ✓ Organization complete'))

    def _create_rooms(self):
        self.rooms = []
        for i in range(1, 11):
            r, _ = Room.objects.get_or_create(
                name=f'Room {100 + i}',
                defaults={'capacity': 40, 'room_type': 'LECTURE', 'is_active': True}
            )
            self.rooms.append(r)
        for i in range(1, 5):
            r, _ = Room.objects.get_or_create(
                name=f'CompLab {i}',
                defaults={'capacity': 35, 'room_type': 'COMPUTER_LAB', 'is_active': True}
            )
            self.rooms.append(r)
        self.stdout.write(f'   - Created {len(self.rooms)} rooms')

    def _create_staff_users(self):
        def make_staff(email, first, last, role, superuser=False):
            u, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': email, 'first_name': first, 'last_name': last,
                    'role': role, 'is_staff': True, 'is_superuser': superuser,
                }
            )
            u.set_password('password123')
            u.save()
            return u

        self.admin = make_staff('admin@richwell.edu', 'System', 'Administrator', User.Role.ADMIN, True)
        self.head_registrar = make_staff('head.registrar@richwell.edu', 'Helena', 'Cruz', User.Role.HEAD_REGISTRAR)
        self.registrar = make_staff('registrar@richwell.edu', 'Regina', 'Santos', User.Role.REGISTRAR)
        self.registrar2 = make_staff('registrar2@richwell.edu', 'Ramon', 'Dela Rosa', User.Role.REGISTRAR)
        self.dept_head = make_staff('head@richwell.edu', 'Harold', 'Reyes', User.Role.DEPARTMENT_HEAD)
        self.dept_head_bsa = make_staff('head.bsa@richwell.edu', 'Rosario', 'Alcantara', User.Role.DEPARTMENT_HEAD)
        self.cashier = make_staff('cashier@richwell.edu', 'Carlos', 'Mendoza', User.Role.CASHIER)
        self.cashier2 = make_staff('cashier2@richwell.edu', 'Clara', 'Bautista', User.Role.CASHIER)
        self.admission = make_staff('admission@richwell.edu', 'Ana', 'Villanueva', User.Role.ADMISSION_STAFF)
        self.stdout.write('   - Created 9 staff users')

    # =========================================================================
    # LEVEL 2: Academic Base
    # =========================================================================

    def _seed_level_2_academics_base(self):
        self.stdout.write('\n🎓 Level 2: Academics Base...')
        self._create_programs()
        self._create_curricula()
        self._create_professors()
        self._create_head_profiles()
        self.stdout.write(self.style.SUCCESS('   ✓ Academics base complete'))

    def _create_programs(self):
        prog_data = [
            ('BSIT', 'Bachelor of Science in Information Technology', 4),
            ('BSCS', 'Bachelor of Science in Computer Science', 4),
            ('BSIS', 'Bachelor of Science in Information Systems', 4),
            ('BSA',  'Bachelor of Science in Accountancy', 4),
        ]
        if self.minimal:
            prog_data = prog_data[:2]
        self.programs = {}
        for code, name, years in prog_data:
            p, _ = Program.objects.get_or_create(
                code=code,
                defaults={'name': name, 'description': f'{name} at Richwell Colleges',
                          'duration_years': years, 'is_active': True}
            )
            self.programs[code] = p
        self.stdout.write(f'   - Created {len(self.programs)} programs')

    def _create_curricula(self):
        self.curricula = {}
        for code, program in self.programs.items():
            c_2024, _ = Curriculum.objects.get_or_create(
                program=program, code='2024-REV',
                defaults={
                    'name': f'{code} Curriculum 2024 Revision',
                    'description': f'Standard 2024 curriculum for {code}',
                    'effective_year': 2024, 'is_active': True,
                }
            )
            self.curricula[f'{code}_2024'] = c_2024

        # BSIT gets an updated 2025 curriculum
        if 'BSIT' in self.programs:
            c_2025, _ = Curriculum.objects.get_or_create(
                program=self.programs['BSIT'], code='2025-UPDATE',
                defaults={
                    'name': 'BSIT Curriculum 2025 Update',
                    'description': 'Updated curriculum with revised subject placement',
                    'effective_year': 2025, 'is_active': True,
                }
            )
            self.curricula['BSIT_2025'] = c_2025
        self.stdout.write(f'   - Created {len(self.curricula)} curricula')

    def _create_professors(self):
        prof_data = [
            ('Juan', 'Dela Cruz',   'Programming',       ['CS', 'IT1']),
            ('Maria', 'Santos',     'Databases',         ['DB']),
            ('Pedro', 'Garcia',     'Networking',        ['IT2', 'NET']),
            ('Ana', 'Reyes',        'Web Development',   ['WEB', 'IT3']),
            ('Jose', 'Bautista',    'Mathematics',       ['MATH', 'STAT']),
            ('Carmen', 'Flores',    'General Education', ['ENG', 'FIL', 'HUM', 'PE']),
            ('Crispin', 'Vargas',   'Accountancy',       ['ACC', 'AUD']),
            ('Elena', 'Magno',      'Taxation/Law',      ['TAX', 'BL']),
            ('Junjun', 'Profesor',  'Programming',       ['CS', 'IT1']),
        ]
        if self.minimal:
            prof_data = prof_data[:4]
        self.professors = []
        self.prof_map = {}   # specialization -> user
        for first, last, spec, prefixes in prof_data:
            email = f'{first.lower()}.{last.lower().replace(" ", ".")}@richwell.edu'
            u, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': email, 'first_name': first, 'last_name': last,
                    'role': User.Role.PROFESSOR,
                }
            )
            u.set_password('password123')
            u.save()
            profile, _ = ProfessorProfile.objects.get_or_create(
                user=u,
                defaults={
                    'department': 'College of Computer Studies',
                    'office_location': f'Faculty Room {len(self.professors) + 1}',
                    'specialization': spec,
                    'max_teaching_hours': 24,
                    'is_active': True,
                }
            )
            self.professors.append((u, profile, prefixes))
            self.prof_map[spec] = u
        self.stdout.write(f'   - Created {len(self.professors)} professors')

    def _create_head_profiles(self):
        # BSIT / BSIS head
        progs_it = Program.objects.filter(code__in=['BSIT', 'BSIS'])
        prof_it, _ = DepartmentHeadProfile.objects.get_or_create(
            user=self.dept_head, defaults={'is_active': True}
        )
        if progs_it.exists():
            prof_it.programs.set(progs_it)

        # BSA head
        progs_bsa = Program.objects.filter(code__in=['BSA', 'BSCS'])
        prof_bsa, _ = DepartmentHeadProfile.objects.get_or_create(
            user=self.dept_head_bsa, defaults={'is_active': True}
        )
        if progs_bsa.exists():
            prof_bsa.programs.set(progs_bsa)

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
        self.subjects = {}
        bsit = self.programs.get('BSIT')
        bsa  = self.programs.get('BSA')

        # (code, title, units, year, sem, is_major, program_key, global)
        data = [
            # BSIT Y1S1
            ('CS101',  'Introduction to Computing',         3, 1, 1, True,  'BSIT', False),
            ('CS102',  'Computer Programming 1',            3, 1, 1, True,  'BSIT', False),
            ('MATH101','College Algebra',                   3, 1, 1, False, 'BSIT', True),
            ('ENG101', 'Communication Skills 1',            3, 1, 1, False, 'BSIT', True),
            ('FIL101', 'Komunikasyon sa Filipino',          3, 1, 1, False, 'BSIT', True),
            ('PE101',  'Physical Education 1',              2, 1, 1, False, 'BSIT', True),
            ('IT102',  'Computing and Professional Ethics', 3, 1, 1, True,  'BSIT', False),
            # BSIT Y1S2
            ('CS103',  'Computer Programming 2',            3, 1, 2, True,  'BSIT', False),
            ('IT101',  'IT Fundamentals',                   3, 1, 2, True,  'BSIT', False),
            ('MATH102','Plane Trigonometry',                3, 1, 2, False, 'BSIT', True),
            ('ENG102', 'Communication Skills 2',            3, 1, 2, False, 'BSIT', True),
            ('PE102',  'Physical Education 2',              2, 1, 2, False, 'BSIT', True),
            # BSIT Y2S1
            ('CS201',  'Data Structures and Algorithms',   3, 2, 1, True,  'BSIT', False),
            ('DB101',  'Database Management Systems',       3, 2, 1, True,  'BSIT', False),
            ('IT201',  'Networking Fundamentals',           3, 2, 1, True,  'BSIT', False),
            ('STAT101','Probability and Statistics',        3, 2, 1, False, 'BSIT', True),
            ('HUM101', 'Art Appreciation',                  3, 2, 1, False, 'BSIT', True),
            # BSIT Y2S2
            ('CS202',  'Object-Oriented Programming',      3, 2, 2, True,  'BSIT', False),
            ('DB201',  'Advanced Database Systems',        3, 2, 2, True,  'BSIT', False),
            ('IT202',  'Web Systems and Technologies',     3, 2, 2, True,  'BSIT', False),
            ('NET101', 'Network Administration',           3, 2, 2, True,  'BSIT', False),
            # BSIT Y3S1
            ('CS301',  'Software Engineering',             3, 3, 1, True,  'BSIT', False),
            ('IT301',  'Web Development',                  3, 3, 1, True,  'BSIT', False),
            ('CAP101', 'Capstone Project 1',               3, 3, 1, True,  'BSIT', False),
            # BSIT Y3S2
            ('CS302',  'Information Assurance & Security', 3, 3, 2, True,  'BSIT', False),
            ('IT302',  'System Administration',            3, 3, 2, True,  'BSIT', False),
            ('CAP102', 'Capstone Project 2',               3, 3, 2, True,  'BSIT', False),
            # BSIT Y4S1
            ('OJT101', 'On-the-Job Training',              6, 4, 1, True,  'BSIT', False),
            # BSIT Y4S2
            ('CS401',  'Professional Issues in IT',        3, 4, 2, True,  'BSIT', False),
            ('CAP201', 'Capstone Project Defense',         3, 4, 2, True,  'BSIT', False),
            # BSA Y1
            ('ACC101', 'Financial Accounting 1',           3, 1, 1, True,  'BSA',  False),
            ('ACC102', 'Financial Accounting 2',           3, 1, 2, True,  'BSA',  False),
            ('ACC201', 'Conceptual Framework & Standards', 3, 1, 2, True,  'BSA',  False),
            ('BL101',  'Law on Obligations and Contracts', 3, 1, 2, False, 'BSA',  False),
            # BSA Y2
            ('ACC202', 'Intermediate Accounting 1',        3, 2, 1, True,  'BSA',  False),
            ('ACC203', 'Intermediate Accounting 2',        3, 2, 2, True,  'BSA',  False),
            ('ACC301', 'Cost Accounting and Control',      3, 2, 1, True,  'BSA',  False),
            ('TAX101', 'Income Taxation',                  3, 2, 2, True,  'BSA',  False),
            ('BL102',  'Business Laws and Regulations',    3, 2, 1, True,  'BSA',  False),
            # BSA Y3
            ('ACC204', 'Intermediate Accounting 3',        3, 3, 1, True,  'BSA',  False),
            ('AUD101', 'Auditing Concepts and Principles', 3, 3, 1, True,  'BSA',  False),
            ('TAX102', 'Business Taxation',                3, 3, 1, True,  'BSA',  False),
            ('AUD102', 'Auditing: Specialized Industries', 3, 3, 2, True,  'BSA',  False),
            # BSA Y4
            ('AUD201', 'Auditing: Concepts & Applications',3, 4, 1, True,  'BSA',  False),
        ]
        if self.minimal:
            data = [s for s in data if s[3] <= 2]

        prereq_map = {
            'CS103': ['CS102'], 'IT101': ['CS101'], 'MATH102': ['MATH101'],
            'ENG102': ['ENG101'], 'PE102': ['PE101'],
            'CS201': ['CS103'], 'DB101': ['CS103'], 'IT201': ['IT101'],
            'STAT101': ['MATH102'],
            'CS202': ['CS201'], 'DB201': ['DB101'], 'IT202': ['IT101'], 'NET101': ['IT201'],
            'CS301': ['CS202'], 'IT301': ['IT202', 'DB101'], 'CAP101': ['CS202', 'DB201'],
            'CS302': ['NET101'], 'IT302': ['NET101'], 'CAP102': ['CAP101'],
            'OJT101': ['CAP102'], 'CS401': ['OJT101'], 'CAP201': ['OJT101'],
            'ACC102': ['ACC101'], 'ACC201': ['ACC101'],
            'ACC202': ['ACC201'], 'ACC203': ['ACC202'], 'ACC301': ['ACC102'],
            'TAX101': ['ACC202'], 'BL102': ['BL101'],
            'ACC204': ['ACC203'], 'AUD101': ['ACC203'], 'TAX102': ['TAX101'],
            'AUD102': ['AUD101'], 'AUD201': ['AUD102'],
        }

        prog_map = {'BSIT': self.programs.get('BSIT'), 'BSA': self.programs.get('BSA')}

        for code, title, units, year, sem, is_major, prog_key, is_global in data:
            primary = prog_map.get(prog_key) or list(self.programs.values())[0]
            subj, _ = Subject.objects.get_or_create(
                code=code,
                defaults={
                    'program': primary, 'title': title,
                    'description': f'{title} course description',
                    'units': units, 'year_level': year, 'semester_number': sem,
                    'is_major': is_major, 'is_global': is_global,
                    'allow_multiple_sections': False,
                }
            )
            self.subjects[code] = subj

        # Set prerequisites second pass
        for code, prereqs in prereq_map.items():
            if code in self.subjects:
                for p in prereqs:
                    if p in self.subjects:
                        self.subjects[code].prerequisites.add(self.subjects[p])

        self.stdout.write(f'   - Created {len(self.subjects)} subjects')

    def _link_curriculum_subjects(self):
        # Link each subject to ALL curricula whose program matches
        for curr_key, curriculum in self.curricula.items():
            prog_code = curr_key.split('_')[0]
            prog = self.programs.get(prog_code)
            if not prog:
                continue
            # BSIT_2025 excludes nothing extra; BSIT_2024 excludes IT102
            for code, subj in self.subjects.items():
                if curr_key == 'BSIT_2024' and code == 'IT102':
                    continue
                # Only include subjects whose program matches OR global subjects
                if not (subj.is_global or subj.program == prog):
                    continue
                year = subj.year_level
                sem  = subj.semester_number
                if curr_key == 'BSIT_2025' and code == 'CS101':
                    sem = 2  # placement difference
                CurriculumSubject.objects.get_or_create(
                    curriculum=curriculum, subject=subj,
                    defaults={'year_level': year, 'semester_number': sem, 'is_required': True}
                )
        self.stdout.write(f'   - Linked subjects to {len(self.curricula)} curricula')

    def _assign_professors_to_subjects(self):
        for u, profile, prefixes in self.professors:
            for code, subj in self.subjects.items():
                if any(code.startswith(p) for p in prefixes):
                    profile.assigned_subjects.add(subj)
            profile.programs.set(list(self.programs.values()))

    # =========================================================================
    # LEVEL 4: Sections & Students
    # =========================================================================

    def _seed_level_4_sections_students(self):
        self.stdout.write('\n👥 Level 4: Sections & Students...')
        self._create_sections()
        self._create_students()
        self.stdout.write(self.style.SUCCESS('   ✓ Sections & students complete'))

    def _create_sections(self):
        self.sections = {}
        sem = self.sem_current
        bsit = self.programs.get('BSIT')
        bscs = self.programs.get('BSCS')
        bsis = self.programs.get('BSIS')
        bsa  = self.programs.get('BSA')
        c24  = self.curricula.get('BSIT_2024')
        c25  = self.curricula.get('BSIT_2025')
        c_bscs = self.curricula.get('BSCS_2024')
        c_bsis = self.curricula.get('BSIS_2024')
        c_bsa  = self.curricula.get('BSA_2024')

        section_defs = []
        if bsit:
            section_defs += [
                ('BSIT-1A', 1, 40, c25,  bsit),
                ('BSIT-1B', 1, 40, c25,  bsit),
                ('BSIT-2A', 2, 35, c24,  bsit),
                ('BSIT-2B', 2, 35, c24,  bsit),
                ('BSIT-3A', 3, 30, c24,  bsit),
                ('BSIT-3B', 3, 30, c24,  bsit),
                ('BSIT-4A', 4, 25, c24,  bsit),
            ]
        if bscs and not self.minimal:
            section_defs += [
                ('BSCS-1A', 1, 40, c_bscs, bscs),
                ('BSCS-2A', 2, 35, c_bscs, bscs),
            ]
        if bsis and not self.minimal:
            section_defs += [('BSIS-1A', 1, 40, c_bsis, bsis)]
        if bsa and not self.minimal:
            section_defs += [
                ('BSA-1A', 1, 40, c_bsa, bsa),
                ('BSA-2A', 2, 35, c_bsa, bsa),
            ]

        for name, year, cap, curr, prog in section_defs:
            sec, created = Section.all_objects.get_or_create(
                name=name, semester=sem,
                defaults={'program': prog, 'curriculum': curr,
                          'year_level': year, 'capacity': cap, 'is_dissolved': False}
            )
            if not created and sec.is_deleted:
                sec.is_deleted = False
                sec.save()
            self.sections[name] = sec
        self.stdout.write(f'   - Created {len(self.sections)} sections')

    def _create_students(self):
        """Create 40+ diverse students covering all scenarios."""
        self.students = []
        bsit = self.programs.get('BSIT')
        bsa  = self.programs.get('BSA')
        c24  = self.curricula.get('BSIT_2024')
        c25  = self.curricula.get('BSIT_2025')
        c_bsa = self.curricula.get('BSA_2024')

        # scenario: REGULAR_PAID, REGULAR_UNPAID, REGULAR_PENDING,
        #           IRREGULAR_RETAKE, OVERLOAD, TRANSFEREE,
        #           INC, EXPIRING_INC, LOA, PROBATION, GRADUATED
        students_data = [
            # --- BSIT 1A (Y1, 2025 curr) ---
            dict(email='s.garcia@richwell.edu',     fn='Maria',   ln='Garcia',     sn='2026-00001', yr=1, sec='BSIT-1A', prog='BSIT', curr='BSIT_2025', scenario='REGULAR_PAID'),
            dict(email='s.santos@richwell.edu',      fn='Juan',    ln='Santos',     sn='2026-00002', yr=1, sec='BSIT-1A', prog='BSIT', curr='BSIT_2025', scenario='REGULAR_PAID'),
            dict(email='s.ramos@richwell.edu',       fn='Liza',    ln='Ramos',      sn='2026-00003', yr=1, sec='BSIT-1A', prog='BSIT', curr='BSIT_2025', scenario='REGULAR_UNPAID'),
            dict(email='s.dela.cruz@richwell.edu',   fn='Carlo',   ln='Dela Cruz',  sn='2026-00004', yr=1, sec='BSIT-1A', prog='BSIT', curr='BSIT_2025', scenario='REGULAR_PENDING'),
            dict(email='s.torres@richwell.edu',      fn='Nina',    ln='Torres',     sn='2026-00005', yr=1, sec='BSIT-1A', prog='BSIT', curr='BSIT_2025', scenario='REGULAR_PAID'),
            # --- BSIT 1B ---
            dict(email='s.reyes@richwell.edu',       fn='Ana',     ln='Reyes',      sn='2026-00006', yr=1, sec='BSIT-1B', prog='BSIT', curr='BSIT_2025', scenario='REGULAR_PENDING'),
            dict(email='s.flores@richwell.edu',      fn='Mark',    ln='Flores',     sn='2026-00007', yr=1, sec='BSIT-1B', prog='BSIT', curr='BSIT_2025', scenario='REGULAR_PAID'),
            dict(email='s.old.curr@richwell.edu',    fn='Alice',   ln='Oldcurr',    sn='2026-00008', yr=1, sec='BSIT-1A', prog='BSIT', curr='BSIT_2024', scenario='REGULAR_PENDING'),
            # --- BSIT 2A (Y2) ---
            dict(email='s.cruz@richwell.edu',        fn='Pedro',   ln='Cruz',       sn='2025-00001', yr=2, sec='BSIT-2A', prog='BSIT', curr='BSIT_2024', scenario='REGULAR_PAID'),
            dict(email='s.mendoza@richwell.edu',     fn='Carlos',  ln='Mendoza',    sn='2025-00002', yr=2, sec='BSIT-2A', prog='BSIT', curr='BSIT_2024', scenario='IRREGULAR_RETAKE'),
            dict(email='s.national@richwell.edu',    fn='Ina',     ln='Nacional',   sn='2025-I001',  yr=2, sec='BSIT-2A', prog='BSIT', curr='BSIT_2024', scenario='INC'),
            dict(email='s.expiring@richwell.edu',    fn='Leo',     ln='Expiring',   sn='2025-I002',  yr=2, sec='BSIT-2A', prog='BSIT', curr='BSIT_2024', scenario='EXPIRING_INC'),
            dict(email='s.transfer@richwell.edu',    fn='Luis',    ln='Bautista',   sn='2025-T001',  yr=2, sec='BSIT-2A', prog='BSIT', curr='BSIT_2024', scenario='TRANSFEREE'),
            dict(email='s.unpaid2@richwell.edu',     fn='Grace',   ln='Dizon',      sn='2025-00003', yr=2, sec='BSIT-2A', prog='BSIT', curr='BSIT_2024', scenario='REGULAR_UNPAID'),
            # --- BSIT 2B ---
            dict(email='s.2b.one@richwell.edu',      fn='Roel',    ln='Aquino',     sn='2025-00004', yr=2, sec='BSIT-2B', prog='BSIT', curr='BSIT_2024', scenario='REGULAR_PAID'),
            dict(email='s.2b.two@richwell.edu',      fn='Cathy',   ln='Marquez',    sn='2025-00005', yr=2, sec='BSIT-2B', prog='BSIT', curr='BSIT_2024', scenario='REGULAR_PAID'),
            dict(email='s.probation@richwell.edu',   fn='Dante',   ln='Probado',    sn='2025-00006', yr=2, sec='BSIT-2B', prog='BSIT', curr='BSIT_2024', scenario='PROBATION'),
            # --- BSIT 3A (Y3) ---
            dict(email='s.overload@richwell.edu',    fn='Rosa',    ln='Villanueva', sn='2024-00001', yr=3, sec='BSIT-3A', prog='BSIT', curr='BSIT_2024', scenario='OVERLOAD'),
            dict(email='s.three.a@richwell.edu',     fn='Mike',    ln='Tamayo',     sn='2024-00002', yr=3, sec='BSIT-3A', prog='BSIT', curr='BSIT_2024', scenario='REGULAR_PAID'),
            dict(email='s.three.b@richwell.edu',     fn='Joy',     ln='Cabrera',    sn='2024-00003', yr=3, sec='BSIT-3A', prog='BSIT', curr='BSIT_2024', scenario='REGULAR_PAID'),
            # --- BSIT 3B ---
            dict(email='s.three.c@richwell.edu',     fn='Rico',    ln='Manalo',     sn='2024-00004', yr=3, sec='BSIT-3B', prog='BSIT', curr='BSIT_2024', scenario='REGULAR_PENDING'),
            dict(email='s.three.d@richwell.edu',     fn='Lorna',   ln='Pascual',    sn='2024-00005', yr=3, sec='BSIT-3B', prog='BSIT', curr='BSIT_2024', scenario='REGULAR_PAID'),
            # --- BSIT 4A (Y4) ---
            dict(email='s.four.a@richwell.edu',      fn='Ben',     ln='Guerrero',   sn='2023-00001', yr=4, sec='BSIT-4A', prog='BSIT', curr='BSIT_2024', scenario='REGULAR_PAID'),
            dict(email='s.four.b@richwell.edu',      fn='Trish',   ln='Castillo',   sn='2023-00002', yr=4, sec='BSIT-4A', prog='BSIT', curr='BSIT_2024', scenario='REGULAR_PAID'),
            # LOA - no current enrollment possible
            dict(email='s.loa@richwell.edu',         fn='Jerome',  ln='Loa',        sn='2024-L001',  yr=2, sec='BSIT-2A', prog='BSIT', curr='BSIT_2024', scenario='LOA'),
            # Graduated - no current enrollment, has old history
            dict(email='s.graduated@richwell.edu',   fn='Patricia', ln='Graduates', sn='2022-G001', yr=4, sec='BSIT-4A', prog='BSIT', curr='BSIT_2024', scenario='GRADUATED'),
            # New enrollee: paid, ADMITTED (no subject enrollment yet)
            dict(email='s.admitted@richwell.edu',    fn='Ryan',    ln='Admitted',   sn='2026-A001',  yr=1, sec='BSIT-1A', prog='BSIT', curr='BSIT_2025', scenario='ADMITTED'),
            # BSCS students
            dict(email='s.bscs1@richwell.edu',       fn='Charlie', ln='Science',    sn='2026-CS01',  yr=1, sec='BSCS-1A', prog='BSCS', curr='BSCS_2024', scenario='REGULAR_PAID'),
            dict(email='s.bscs2@richwell.edu',       fn='Dana',    ln='Comsci',     sn='2026-CS02',  yr=1, sec='BSCS-1A', prog='BSCS', curr='BSCS_2024', scenario='REGULAR_PENDING'),
            dict(email='s.bscs3@richwell.edu',       fn='Ernie',   ln='Coder',      sn='2025-CS01',  yr=2, sec='BSCS-2A', prog='BSCS', curr='BSCS_2024', scenario='REGULAR_PAID'),
            # BSIS student
            dict(email='s.bsis1@richwell.edu',       fn='Faye',    ln='Systems',    sn='2026-IS01',  yr=1, sec='BSIS-1A', prog='BSIS', curr='BSIS_2024', scenario='REGULAR_PAID'),
            # BSA students
            dict(email='s.bsa1@richwell.edu',        fn='Gina',    ln='Accountant', sn='2026-BA01',  yr=1, sec='BSA-1A',  prog='BSA',  curr='BSA_2024',  scenario='REGULAR_PAID'),
            dict(email='s.bsa2@richwell.edu',        fn='Henry',   ln='Audit',      sn='2026-BA02',  yr=1, sec='BSA-1A',  prog='BSA',  curr='BSA_2024',  scenario='REGULAR_UNPAID'),
            dict(email='s.bsa3@richwell.edu',        fn='Iris',    ln='Taxlaw',     sn='2025-BA01',  yr=2, sec='BSA-2A',  prog='BSA',  curr='BSA_2024',  scenario='REGULAR_PAID'),
            # INC resolution test student
            dict(email='s.inc.resolution@richwell.edu', fn='Test', ln='Resolution', sn='2024-IR01', yr=2, sec='BSIT-2A', prog='BSIT', curr='BSIT_2024', scenario='INC_RESOLUTION'),
        ]
        if self.minimal:
            students_data = students_data[:8]

        for d in students_data:
            # Fix typo in graduated entry
            if 'ln' in d and "'ln'" in str(d):
                d['ln'] = 'Graduates'

            email    = d['email']
            prog_key = d.get('prog', 'BSIT')
            curr_key = d.get('curr', f'{prog_key}_2024')
            prog     = self.programs.get(prog_key) or list(self.programs.values())[0]
            curr     = self.curricula.get(curr_key) or self.curricula.get(f'{prog_key}_2024')
            section  = self.sections.get(d.get('sec', ''))

            u, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': email,
                    'first_name': d['fn'],
                    'last_name':  d['ln'],
                    'role': User.Role.STUDENT,
                    'student_number': d['sn'],
                }
            )
            u.set_password('password123')
            u.save()

            scenario = d['scenario']
            profile, _ = StudentProfile.objects.get_or_create(
                user=u,
                defaults={
                    'program': prog,
                    'curriculum': curr,
                    'year_level': d['yr'],
                    'home_section': section,
                    'is_irregular': scenario in ('IRREGULAR_RETAKE', 'TRANSFEREE'),
                    'overload_approved': scenario == 'OVERLOAD',
                    'is_transferee': scenario == 'TRANSFEREE',
                    'previous_school': 'Previous University' if scenario == 'TRANSFEREE' else '',
                    'previous_course': 'BSIT' if scenario == 'TRANSFEREE' else '',
                    'status': 'LOA' if scenario == 'LOA' else ('GRADUATED' if scenario == 'GRADUATED' else 'ACTIVE'),
                    'academic_status': 'PROBATION' if scenario == 'PROBATION' else 'REGULAR',
                    'academic_standing': 'Probation' if scenario == 'PROBATION' else 'Good Standing',
                    'middle_name': 'M',
                    'birthdate': date(2000 + random.randint(0, 5), random.randint(1, 12), random.randint(1, 28)),
                    'address': f'{random.randint(1, 999)} Sample Street, City',
                    'contact_number': f'09{random.randint(100000000, 999999999)}',
                }
            )
            self.students.append({'user': u, 'profile': profile, 'scenario': scenario})

        self.stdout.write(f'   - Created {len(self.students)} students')

    # =========================================================================
    # LEVEL 5: Section Offerings
    # =========================================================================

    def _seed_level_5_offerings(self):
        self.stdout.write('\n📋 Level 5: Section Offerings...')
        self.section_subjects = defaultdict(list)
        semester_num = 2  # 2nd Semester is current

        for section_name, section in self.sections.items():
            year = section.year_level
            year_subjects = [
                s for s in self.subjects.values()
                if s.year_level == year and s.semester_number == semester_num
                and (s.is_global or s.program == section.program)
            ]
            for subject in year_subjects:
                qualified = [u for u, prof, prefixes in self.professors
                             if prof.assigned_subjects.filter(pk=subject.pk).exists()]
                professor = random.choice(qualified) if qualified else self.professors[0][0]

                ss, _ = SectionSubject.objects.get_or_create(
                    section=section, subject=subject,
                    defaults={'professor': professor, 'capacity': section.capacity, 'is_tba': False}
                )
                SectionSubjectProfessor.objects.get_or_create(
                    section_subject=ss, professor=professor,
                    defaults={'is_primary': True}
                )
                self.section_subjects[section_name].append(ss)

        total = sum(len(v) for v in self.section_subjects.values())
        self.stdout.write(self.style.SUCCESS(f'   ✓ Created {total} section-subject offerings'))

    # =========================================================================
    # LEVEL 6: Schedules & Enrollments
    # =========================================================================

    def _seed_level_6_schedules_enrollments(self):
        self.stdout.write('\n📅 Level 6: Schedules & Enrollments...')
        self._create_schedules()
        self._create_enrollments()
        self.stdout.write(self.style.SUCCESS('   ✓ Schedules & enrollments complete'))

    def _create_schedules(self):
        occupied = {'prof': defaultdict(set), 'room': defaultdict(set), 'sec': defaultdict(set)}
        DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI']
        HOURS = list(range(7, 19))
        count = 0

        for sec_name, ss_list in self.section_subjects.items():
            section = self.sections[sec_name]
            for ss in ss_list:
                found = False
                for _ in range(120):
                    day = random.choice(DAYS)
                    hour = random.choice(HOURS)
                    room = random.choice(self.rooms)
                    key = (day, hour)
                    prof_id = ss.professor_id
                    if prof_id and prof_id in occupied['prof'][key]:
                        continue
                    if room.id in occupied['room'][key]:
                        continue
                    if section.id in occupied['sec'][key]:
                        continue
                    ScheduleSlot.objects.get_or_create(
                        section_subject=ss, day=day,
                        start_time=time(hour, 0), end_time=time(hour + 1, 30),
                        defaults={'professor': ss.professor, 'room': room.name}
                    )
                    if prof_id:
                        occupied['prof'][key].add(prof_id)
                    occupied['room'][key].add(room.id)
                    occupied['sec'][key].add(section.id)
                    found = True
                    count += 1
                    break
        self.stdout.write(f'   - Created {count} schedule slots')

    def _create_enrollments(self):
        self.enrollments = {}
        EVENTS = ['Upon Enrollment', 'Prelims', 'Midterms', 'Semi-Finals', 'Finals', 'Clearance']

        for sd in self.students:
            user = sd['user']
            scenario = sd['scenario']
            if scenario in ('LOA', 'GRADUATED'):
                continue  # no current enrollment

            first_paid = scenario in ('REGULAR_PAID', 'OVERLOAD', 'TRANSFEREE',
                                      'IRREGULAR_RETAKE', 'INC', 'EXPIRING_INC',
                                      'PROBATION', 'ADMITTED', 'INC_RESOLUTION')
            if scenario == 'ADMITTED':
                status = 'ADMITTED'
            elif scenario == 'REGULAR_UNPAID':
                status = 'PENDING_PAYMENT'
            elif scenario == 'REGULAR_PENDING':
                status = 'PENDING'
            else:
                status = 'ACTIVE'

            enroll, _ = Enrollment.objects.get_or_create(
                student=user, semester=self.sem_current,
                defaults={
                    'status': status,
                    'created_via': 'TRANSFEREE' if scenario == 'TRANSFEREE' else 'ONLINE',
                    'monthly_commitment': Decimal('5000.00'),
                    'first_month_paid': first_paid,
                }
            )
            # 6 monthly payment buckets
            for i in range(1, 7):
                paid_this = first_paid and i == 1
                MonthlyPaymentBucket.objects.get_or_create(
                    enrollment=enroll, month_number=i,
                    defaults={
                        'event_label': EVENTS[i - 1],
                        'required_amount': Decimal('5000.00'),
                        'paid_amount': Decimal('5000.00') if paid_this else Decimal('0.00'),
                        'is_fully_paid': paid_this,
                    }
                )
            self.enrollments[user.email] = {'enrollment': enroll, 'scenario': scenario}

        self.stdout.write(f'   - Created {len(self.enrollments)} enrollments with 6 buckets each')

    # =========================================================================
    # LEVEL 7: Subject Enrollments & Past History
    # =========================================================================

    def _seed_level_7_subject_enrollments(self):
        self.stdout.write('\n📝 Level 7: Subject Enrollments...')
        self._create_current_subject_enrollments()
        self._create_past_enrollments()
        self.stdout.write(self.style.SUCCESS('   ✓ Subject enrollments complete'))

    def _get_status_flags(self, scenario):
        if scenario == 'REGULAR_PAID':
            return 'ENROLLED', True, True
        elif scenario == 'REGULAR_UNPAID':
            return 'PENDING_PAYMENT', False, True
        elif scenario in ('REGULAR_PENDING', 'PROBATION'):
            return 'PENDING', False, False
        elif scenario in ('IRREGULAR_RETAKE', 'TRANSFEREE', 'OVERLOAD',
                          'INC', 'EXPIRING_INC', 'INC_RESOLUTION'):
            return 'ENROLLED', True, True
        return 'PENDING', False, False

    def _create_current_subject_enrollments(self):
        receipt_ctr = [1]

        for sd in self.students:
            user, profile, scenario = sd['user'], sd['profile'], sd['scenario']
            if scenario in ('LOA', 'GRADUATED', 'ADMITTED'):
                continue
            ed = self.enrollments.get(user.email)
            if not ed:
                continue
            enroll = ed['enrollment']
            section = profile.home_section
            if not section:
                continue

            status, pay_approved, head_approved = self._get_status_flags(scenario)
            ss_list = SectionSubject.objects.filter(section=section)

            for ss in ss_list:
                SubjectEnrollment.objects.get_or_create(
                    enrollment=enroll, subject=ss.subject,
                    defaults={
                        'section': section,
                        'enrollment_type': 'HOME',
                        'status': status,
                        'is_irregular': profile.is_irregular,
                        'payment_approved': pay_approved,
                        'head_approved': head_approved,
                    }
                )

            # IRREGULAR_RETAKE: add a retake subject from a different section
            if scenario == 'IRREGULAR_RETAKE':
                retake_subj = self.subjects.get('CS102')
                other_ss = SectionSubject.objects.filter(
                    subject=retake_subj
                ).exclude(section=section).first() if retake_subj else None
                if other_ss:
                    SubjectEnrollment.objects.get_or_create(
                        enrollment=enroll, subject=retake_subj,
                        defaults={
                            'section': other_ss.section, 'enrollment_type': 'RETAKE',
                            'status': 'ENROLLED', 'is_retake': True,
                            'payment_approved': True, 'head_approved': True,
                        }
                    )

            # OVERLOAD: add one extra subject + OverloadRequest
            if scenario == 'OVERLOAD':
                extra = self.subjects.get('DB101')
                extra_ss = SectionSubject.objects.filter(subject=extra).first() if extra else None
                if extra_ss:
                    SubjectEnrollment.objects.get_or_create(
                        enrollment=enroll, subject=extra,
                        defaults={
                            'section': extra_ss.section, 'enrollment_type': 'OVERLOAD',
                            'status': 'ENROLLED', 'payment_approved': True,
                            'head_approved': True, 'registrar_approved': True,
                        }
                    )
                OverloadRequest.objects.get_or_create(
                    student=user, semester=self.sem_current,
                    defaults={
                        'requested_units': 27, 'reason': 'Dean\'s Lister, needs extra unit to graduate on time.',
                        'status': 'APPROVED', 'reviewed_by': self.head_registrar,
                        'rejection_reason': '',
                    }
                )

            # TRANSFEREE: mark some subjects as CREDITED + CreditSource
            if scenario == 'TRANSFEREE':
                credited_codes = ['CS101', 'MATH101', 'ENG101']
                for code in credited_codes:
                    subj = self.subjects.get(code)
                    if subj:
                        se, _ = SubjectEnrollment.objects.get_or_create(
                            enrollment=enroll, subject=subj,
                            defaults={
                                'section': None, 'enrollment_type': 'HOME',
                                'status': 'CREDITED', 'payment_approved': True, 'head_approved': True,
                            }
                        )
                        CreditSource.objects.get_or_create(
                            subject_enrollment=se,
                            defaults={
                                'original_school': 'Previous University',
                                'original_subject_code': f'OLD-{code}',
                                'original_grade': Decimal('2.00'),
                                'notes': 'Evaluated by registrar.',
                                'credited_by': self.registrar,
                            }
                        )

    def _create_past_enrollments(self):
        """Create 1st Sem 2025-2026 history (GRADING_CLOSED) for 2nd-year+ students."""
        if self.minimal:
            return

        # Past section used for history
        past_section, _ = Section.all_objects.get_or_create(
            name='BSIT-1A-HIST', semester=self.sem_2025_1,
            defaults={
                'program': self.programs['BSIT'],
                'curriculum': self.curricula.get('BSIT_2024'),
                'year_level': 1, 'capacity': 40,
            }
        )

        for sd in self.students:
            user, profile, scenario = sd['user'], sd['profile'], sd['scenario']
            if profile.year_level < 2 and scenario not in ('INC_RESOLUTION', 'EXPIRING_INC', 'INC'):
                continue

            past_enroll, created = Enrollment.objects.get_or_create(
                student=user, semester=self.sem_2025_1,
                defaults={
                    'status': 'COMPLETED', 'created_via': 'ONLINE',
                    'monthly_commitment': Decimal('5000.00'), 'first_month_paid': True,
                }
            )
            if not created:
                continue

            # Pay all buckets
            EVENTS = ['Upon Enrollment', 'Prelims', 'Midterms', 'Semi-Finals', 'Finals', 'Clearance']
            for i in range(1, 7):
                MonthlyPaymentBucket.objects.get_or_create(
                    enrollment=past_enroll, month_number=i,
                    defaults={
                        'event_label': EVENTS[i - 1],
                        'required_amount': Decimal('5000.00'),
                        'paid_amount': Decimal('5000.00'),
                        'is_fully_paid': True,
                    }
                )

            # Enroll in Y1S1 subjects historically
            hist_subjects = [s for s in self.subjects.values()
                             if s.year_level == 1 and s.semester_number == 1
                             and (s.is_global or s.program == profile.program)]

            for subj in hist_subjects:
                passed = True
                grade = Decimal('1.75')
                sub_status = 'PASSED'
                inc_at = None

                if scenario == 'IRREGULAR_RETAKE' and subj.code == 'CS103':
                    sub_status = 'FAILED'
                    grade = Decimal('5.00')
                    passed = False
                elif scenario in ('INC', 'INC_RESOLUTION') and subj.code == 'CS101':
                    sub_status = 'INC'
                    grade = None
                    inc_at = timezone.make_aware(timezone.datetime(2025, 11, 15))
                elif scenario == 'EXPIRING_INC' and subj.code == 'CS102':
                    sub_status = 'INC'
                    grade = None
                    # 5 months ago — near the 6-month major subject expiry
                    inc_at = timezone.make_aware(timezone.datetime(2025, 9, 20))

                se = SubjectEnrollment.objects.create(
                    enrollment=past_enroll, subject=subj,
                    section=past_section if subj.code in ('CS101', 'CS102') else None,
                    status=sub_status,
                    grade=str(grade) if grade else None,
                    inc_marked_at=inc_at,
                    is_finalized=True,
                    payment_approved=True,
                    head_approved=True,
                )
                # Grade history for each finalized subject
                GradeHistory.objects.create(
                    subject_enrollment=se,
                    previous_grade=None,
                    new_grade=grade,
                    previous_status='ENROLLED',
                    new_status=sub_status,
                    changed_by=self.registrar,
                    change_reason='End of semester grade finalization.',
                    is_finalization=True,
                )

            # SemesterGPA for past semester
            passed_ses = SubjectEnrollment.objects.filter(
                enrollment=past_enroll, status='PASSED', is_finalized=True
            )
            total_units = sum(se.subject.units for se in passed_ses)
            total_pts = sum(
                Decimal(str(se.grade or '0')) * se.subject.units
                for se in passed_ses if se.grade
            )
            gpa = (total_pts / total_units).quantize(Decimal('0.01')) if total_units else Decimal('0.00')
            SemesterGPA.objects.get_or_create(
                enrollment=past_enroll,
                defaults={
                    'gpa': gpa, 'total_units': total_units,
                    'total_grade_points': total_pts,
                    'subjects_included': passed_ses.count(),
                    'is_finalized': True,
                }
            )

        self.stdout.write('   - Created past semester history with GradeHistory & SemesterGPA')

    # =========================================================================
    # LEVEL 8: Transactions & Audit
    # =========================================================================

    def _seed_level_8_transactions_audit(self):
        self.stdout.write('\n💰 Level 8: Transactions & Audit...')
        rcpt = [1]
        permit = [1]

        for email, ed in self.enrollments.items():
            enroll = ed['enrollment']
            scenario = ed['scenario']

            # Payment transaction for students who paid month 1
            if scenario in ('REGULAR_PAID', 'OVERLOAD', 'IRREGULAR_RETAKE',
                            'INC', 'EXPIRING_INC', 'PROBATION', 'INC_RESOLUTION'):
                bucket = enroll.payment_buckets.filter(month_number=1).first()
                receipt_num = f"RCV-20260122-{rcpt[0]:05d}"
                rcpt[0] += 1
                PaymentTransaction.objects.get_or_create(
                    enrollment=enroll, receipt_number=receipt_num,
                    defaults={
                        'amount': Decimal('5000.00'),
                        'payment_mode': random.choice(['CASH', 'GCASH', 'ONLINE', 'MAYA']),
                        'processed_by': self.cashier,
                        'allocated_buckets': [
                            {'bucket_id': str(bucket.id), 'month': 1, 'amount': 5000.00}
                        ] if bucket else [],
                        'notes': 'Initial enrollment payment.',
                    }
                )
                # Exam permit for prelims
                permit_code = f"EXP-20260122-{permit[0]:05d}"
                permit[0] += 1
                ExamPermit.objects.get_or_create(
                    enrollment=enroll, exam_period='PRELIM',
                    defaults={'permit_code': permit_code, 'required_month': 1, 'is_printed': False}
                )

            # EnrollmentApproval audit trail for ENROLLED students
            if scenario in ('REGULAR_PAID', 'OVERLOAD', 'IRREGULAR_RETAKE', 'INC', 'EXPIRING_INC'):
                first_se = enroll.subject_enrollments.filter(status='ENROLLED').first()
                if first_se:
                    EnrollmentApproval.objects.get_or_create(
                        subject_enrollment=first_se,
                        role='HEAD',
                        defaults={
                            'approver': self.dept_head,
                            'action': 'APPROVE',
                            'comment': 'Student meets all requirements.',
                        }
                    )

        # Audit logs
        AuditLog.objects.create(
            actor=self.admin, action='SEMESTER_CREATED',
            target_model='Semester', target_id=self.sem_current.id,
            payload={'name': str(self.sem_current), 'status': 'ENROLLMENT_OPEN'},
        )
        for u, prof, _ in self.professors[:3]:
            AuditLog.objects.create(
                actor=self.admin, action='USER_CREATED',
                target_model='User', target_id=u.id,
                payload={'email': u.email, 'role': u.role},
            )
        # Log enrollments
        for email, ed in list(self.enrollments.items())[:5]:
            enroll = ed['enrollment']
            AuditLog.objects.create(
                actor=enroll.student, action='ENROLLMENT_CREATED',
                target_model='Enrollment', target_id=enroll.id,
                payload={'semester': str(self.sem_current), 'status': enroll.status},
            )

        self.stdout.write(self.style.SUCCESS(
            f'   ✓ Created {PaymentTransaction.objects.count()} txns, '
            f'{ExamPermit.objects.count()} permits, {AuditLog.objects.count()} audit logs'
        ))

    # =========================================================================
    # LEVEL 9: Grade Resolutions & Document Releases
    # =========================================================================

    def _seed_level_9_resolutions_docs(self):
        self.stdout.write('\n📋 Level 9: Grade Resolutions & Documents...')
        if self.minimal:
            return

        prof_user = self.professors[0][0] if self.professors else self.admin

        # Grade resolutions from past semester INC/FAILED
        past_inc = SubjectEnrollment.objects.filter(
            status__in=['INC', 'FAILED'], is_finalized=True
        ).select_related('enrollment__student').order_by('?')[:4]

        for i, se in enumerate(past_inc):
            statuses = [
                GradeResolution.Status.PENDING_HEAD,
                GradeResolution.Status.PENDING_REGISTRAR,
                GradeResolution.Status.APPROVED,
                GradeResolution.Status.REJECTED,
            ]
            res_status = statuses[i % 4]

            defaults = {
                'current_grade': se.grade,
                'proposed_grade': Decimal('2.50'),
                'current_status': se.status,
                'proposed_status': 'PASSED',
                'reason': f'Resolution request #{i+1} — student completed requirements.',
                'status': res_status,
                'requested_by': prof_user,
            }
            if res_status in (GradeResolution.Status.APPROVED, GradeResolution.Status.REJECTED,
                              GradeResolution.Status.PENDING_REGISTRAR):
                defaults['reviewed_by_head'] = self.dept_head
                defaults['head_notes'] = 'Reviewed by dept head.'
                defaults['head_action_at'] = self.now - timedelta(days=3)
            if res_status == GradeResolution.Status.APPROVED:
                defaults['reviewed_by_registrar'] = self.registrar
                defaults['registrar_notes'] = 'Confirmed and approved.'
                defaults['registrar_action_at'] = self.now - timedelta(days=1)

            GradeResolution.objects.get_or_create(
                subject_enrollment=se, defaults=defaults
            )

        # Document releases: TOR, DIPLOMA, GOOD_MORAL, ENROLLMENT_CERT
        doc_counter = [1]

        def release_doc(student, doc_type, purpose=''):
            code = f"DOC-20260222-{doc_counter[0]:05d}"
            doc_counter[0] += 1
            DocumentRelease.objects.get_or_create(
                document_code=code,
                defaults={
                    'document_type': doc_type,
                    'student': student,
                    'released_by': self.registrar,
                    'status': 'ACTIVE',
                    'purpose': purpose or f'Student request for {doc_type}',
                    'copies_released': 1,
                }
            )

        # Graduated student gets DIPLOMA + TOR
        grad = User.objects.filter(email='s.graduated@richwell.edu').first()
        if grad:
            release_doc(grad, 'DIPLOMA', 'Graduation ceremony')
            release_doc(grad, 'TOR', 'Post-graduation')

        # A few active students get ENROLLMENT_CERT and GOOD_MORAL
        for email in ['s.garcia@richwell.edu', 's.santos@richwell.edu',
                      's.cruz@richwell.edu', 's.bsa3@richwell.edu']:
            stu = User.objects.filter(email=email).first()
            if stu:
                release_doc(stu, 'ENROLLMENT_CERT', 'Scholarship application')

        for email in ['s.four.a@richwell.edu', 's.four.b@richwell.edu']:
            stu = User.objects.filter(email=email).first()
            if stu:
                release_doc(stu, 'GOOD_MORAL', 'Job application')

        # One REVOKED document
        rev_stu = User.objects.filter(email='s.garcia@richwell.edu').first()
        if rev_stu:
            code = f"DOC-20260222-{doc_counter[0]:05d}"
            doc_counter[0] += 1
            DocumentRelease.objects.get_or_create(
                document_code=code,
                defaults={
                    'document_type': 'GRADES_CERT',
                    'student': rev_stu,
                    'released_by': self.registrar,
                    'status': 'REVOKED',
                    'revoked_by': self.head_registrar,
                    'revoked_at': self.now,
                    'revocation_reason': 'Issued in error; correct version reissued.',
                    'purpose': 'Academic award application',
                    'copies_released': 1,
                }
            )

        self.stdout.write(self.style.SUCCESS(
            f'   ✓ Created {GradeResolution.objects.count()} resolutions, '
            f'{DocumentRelease.objects.count()} document releases'
        ))

    # =========================================================================
    # SYSTEM CONFIG & NOTIFICATIONS
    # =========================================================================

    def _seed_system_configs(self):
        configs = [
            ('ENROLLMENT_ENABLED', True, 'Master switch for online enrollment'),
            ('MAX_UNITS_REGULAR', 30, 'Maximum units for regular students'),
            ('MAX_UNITS_OVERLOAD', 27, 'Maximum units with overload approval'),
            ('INC_EXPIRY_MAJOR_MONTHS', 6, 'Months before major INC converts to FAILED'),
            ('INC_EXPIRY_MINOR_MONTHS', 12, 'Months before minor INC converts to FAILED'),
            ('SCHOOL_NAME', 'Richwell Colleges', 'Official school name'),
            ('SCHOOL_YEAR', '2025-2026', 'Current academic year'),
        ]
        for key, value, desc in configs:
            SystemConfig.objects.get_or_create(
                key=key, defaults={'value': value, 'description': desc}
            )

    def _seed_notifications(self):
        if self.minimal:
            return
        stu = User.objects.filter(email='s.garcia@richwell.edu').first()
        if stu:
            Notification.objects.get_or_create(
                user=stu,
                title='Enrollment Confirmed',
                defaults={
                    'notification_type': 'ENROLLMENT',
                    'message': 'Your enrollment for 2nd Semester 2025-2026 has been confirmed.',
                    'link': '/enrollment/',
                    'is_read': False,
                }
            )
        if self.registrar:
            Notification.objects.get_or_create(
                user=self.registrar,
                title='Pending Enrollments',
                defaults={
                    'notification_type': 'ENROLLMENT',
                    'message': 'There are students with pending enrollment approval.',
                    'link': '/registrar/enrollments/',
                    'is_read': False,
                }
            )

    # =========================================================================
    # SUMMARY
    # =========================================================================

    def _print_summary(self):
        self.stdout.write('\n' + '=' * 65)
        self.stdout.write(self.style.SUCCESS('  SEEDING SUMMARY'))
        self.stdout.write('=' * 65)

        rows = [
            ('Semesters', Semester.objects.count()),
            ('Programs', Program.objects.count()),
            ('Curricula', Curriculum.objects.count()),
            ('Subjects', Subject.objects.count()),
            ('Rooms', Room.objects.count()),
            ('Sections', Section.objects.count()),
            ('Section-Subject Offerings', SectionSubject.objects.count()),
            ('Schedule Slots', ScheduleSlot.objects.count()),
            ('Permissions', Permission.objects.count()),
            ('ExamMonth Mappings', ExamMonthMapping.objects.count()),
            ('---Staff Users---', User.objects.filter(
                role__in=['ADMIN','REGISTRAR','HEAD_REGISTRAR','CASHIER',
                          'DEPARTMENT_HEAD','ADMISSION_STAFF']).count()),
            ('Professors', User.objects.filter(role='PROFESSOR').count()),
            ('Students', User.objects.filter(role='STUDENT').count()),
            ('Student Profiles', StudentProfile.objects.count()),
            ('---Enrollments---', Enrollment.objects.count()),
            ('Subject Enrollments', SubjectEnrollment.objects.count()),
            ('Payment Buckets', MonthlyPaymentBucket.objects.count()),
            ('Payment Transactions', PaymentTransaction.objects.count()),
            ('Exam Permits', ExamPermit.objects.count()),
            ('Grade History', GradeHistory.objects.count()),
            ('Semester GPAs', SemesterGPA.objects.count()),
            ('Grade Resolutions', GradeResolution.objects.count()),
            ('Document Releases', DocumentRelease.objects.count()),
            ('Audit Logs', AuditLog.objects.count()),
            ('System Configs', SystemConfig.objects.count()),
            ('Notifications', Notification.objects.count()),
        ]

        for label, count in rows:
            if label.startswith('---'):
                self.stdout.write(f'   {label}')
            else:
                self.stdout.write(f'   {label:.<40} {count:>5}')

        self.stdout.write('\n' + '-' * 65)
        self.stdout.write('  Current Semester: 2nd Semester 2025-2026')
        self.stdout.write('  Status: ENROLLMENT_OPEN')
        self.stdout.write('  Enrollment window: Jan 5 – Mar 22, 2026  ← still OPEN!')
        self.stdout.write('\n  Test Credentials (all use password: password123)')
        self.stdout.write('-' * 65)
        creds = [
            ('Admin',          'admin@richwell.edu'),
            ('Head Registrar', 'head.registrar@richwell.edu'),
            ('Registrar',      'registrar@richwell.edu'),
            ('Dept Head',      'head@richwell.edu'),
            ('Cashier',        'cashier@richwell.edu'),
            ('Admission',      'admission@richwell.edu'),
            ('Professor',      'juan.dela.cruz@richwell.edu'),
            ('Student (PAID)', 's.garcia@richwell.edu'),
            ('Student (UNPAID)','s.ramos@richwell.edu'),
            ('Student (INC)',   's.national@richwell.edu'),
            ('Student (RETAKE)','s.mendoza@richwell.edu'),
            ('Student (OVERLOAD)','s.overload@richwell.edu'),
            ('Student (TRANSFEREE)','s.transfer@richwell.edu'),
            ('Student (LOA)',   's.loa@richwell.edu'),
            ('Student (BSA)',   's.bsa1@richwell.edu'),
        ]
        for role, email in creds:
            self.stdout.write(f'   {role:<22} {email}')
        self.stdout.write('=' * 65)

