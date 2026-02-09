"""
User Data Seeder
================
Seeds the database with users and their essential prerequisites, wiping all other data.
"""

import random
from datetime import date
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
    help = 'Seeds the database with users only, wiping all other data.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('='*60))
        self.stdout.write(self.style.WARNING('  User Data Seeder'))
        self.stdout.write(self.style.WARNING('='*60))
        self.stdout.write(self.style.ERROR('WARNING: This will wipe ALL existing data!'))
        
        with transaction.atomic():
            self._wipe_all_data()
            
            # Level 0: Foundation (Semesters, Permissions)
            self._seed_foundation()
            
            # Level 1: Organization & Staff
            self._seed_organization()
            
            # Level 2: Academics Base (Programs, Curricula, Professors)
            self._seed_academics()
            
            # Level 3: Students
            self._seed_students()
            
            self.stdout.write(self.style.SUCCESS('\n✓ User seeding completed successfully!'))

    def _wipe_all_data(self):
        self.stdout.write('\n🗑️  Wiping existing data...')
        
        # Reverse dependency order
        GradeResolution.objects.all().delete()
        AuditLog.objects.all().delete()
        GradeHistory.objects.all().delete()
        SemesterGPA.objects.all().delete()
        ExamPermit.objects.all().delete()
        PaymentTransaction.objects.all().delete()
        EnrollmentApproval.objects.all().delete()
        SubjectEnrollment.objects.all().delete()
        MonthlyPaymentBucket.objects.all().delete()
        OverloadRequest.objects.all().delete()
        Enrollment.objects.all().delete()
        ScheduleSlot.objects.all().delete()
        SectionSubjectProfessor.objects.all().delete()
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
        UserPermission.objects.all().delete()
        Permission.objects.all().delete()
        PermissionCategory.objects.all().delete()
        
        User.objects.filter(is_superuser=False).delete()
        
        self.stdout.write(self.style.SUCCESS('   ✓ Data wiped'))

    def _seed_foundation(self):
        self.stdout.write('\n📦 Level 0: Foundation...')
        
        # Semesters
        self._create_semesters()
        
        # Permissions
        self._create_permissions()
        
        self.stdout.write(self.style.SUCCESS('   ✓ Foundation complete'))

    def _create_semesters(self):
        # Current semester (2nd Semester 2025-2026)
        self.semester_current, _ = Semester.objects.get_or_create(
            name='2nd Semester',
            academic_year='2025-2026',
            defaults={
                'start_date': date(2026, 1, 5),
                'end_date': date(2026, 5, 30),
                'enrollment_start_date': date(2025, 12, 1),
                'enrollment_end_date': date(2026, 1, 15),
                'grading_start_date': date(2026, 1, 25),
                'grading_end_date': date(2026, 6, 15),
                'status': 'GRADING_OPEN',
                'is_current': True
            }
        )
        Semester.objects.exclude(pk=self.semester_current.pk).update(is_current=False)
        self.stdout.write(f'   - Created current semester')

    def _create_permissions(self):
        # Simplified permissions setup (Copying essential categories)
        categories_data = [
            ('academic_management', 'Academic Management', 'book-open', 1),
            ('enrollment_management', 'Enrollment Management', 'users', 2),
            ('user_management', 'User Management', 'user-group', 3),
            ('schedule_management', 'Schedule Management', 'calendar', 4),
            ('grade_management', 'Grade Management', 'chart-bar', 5),
            ('payment_management', 'Payment Management', 'currency-dollar', 6),
        ]
        
        cat_map = {}
        for code, name, icon, order in categories_data:
            cat, _ = PermissionCategory.objects.get_or_create(
                code=code,
                defaults={'name': name, 'icon': icon, 'order': order}
            )
            cat_map[code] = cat

        # Essential Permissions
        permissions_data = [
             ('program.view', 'View Programs', 'academic_management', ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR']),
             ('enrollment.view', 'View Enrollments', 'enrollment_management', ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR', 'CASHIER']),
             ('user.view', 'View Users', 'user_management', ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR']),
             ('grade.view', 'View Grades', 'grade_management', ['ADMIN', 'REGISTRAR', 'PROFESSOR', 'STUDENT']),
        ]
        
        for code, name, cat_code, roles in permissions_data:
            Permission.objects.get_or_create(
                code=code,
                defaults={
                    'name': name,
                    'category': cat_map[cat_code],
                    'default_for_roles': roles
                }
            )
        self.stdout.write(f'   - Created permissions')

    def _seed_organization(self):
        self.stdout.write('\n🏢 Level 1: Organization & Staff...')
        
        # Staff Users
        staff_data = [
            ('admin@richwell.edu', 'System', 'Administrator', User.Role.ADMIN, True),
            ('head.registrar@richwell.edu', 'Helena', 'Cruz', User.Role.HEAD_REGISTRAR, False),
            ('registrar@richwell.edu', 'Regina', 'Santos', User.Role.REGISTRAR, False),
            ('head@richwell.edu', 'Harold', 'Reyes', User.Role.DEPARTMENT_HEAD, False),
            ('cashier@richwell.edu', 'Carlos', 'Mendoza', User.Role.CASHIER, False),
            ('admission@richwell.edu', 'Ana', 'Villanueva', User.Role.ADMISSION_STAFF, False),
        ]
        
        for email, first, last, role, is_super in staff_data:
            user, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': email,
                    'first_name': first,
                    'last_name': last,
                    'role': role,
                    'is_staff': True,
                    'is_superuser': is_super
                }
            )
            user.set_password('password123')
            user.save()
            
        self.stdout.write('   - Created staff users')

    def _seed_academics(self):
        self.stdout.write('\n🎓 Level 2: Academics Base...')
        
        # Programs
        self.programs = {}
        programs_data = [
            ('BSIT', 'Bachelor of Science in Information Technology', 4),
            ('BSCS', 'Bachelor of Science in Computer Science', 4),
            ('BSIS', 'Bachelor of Science in Information Systems', 4),
        ]
        
        for code, name, years in programs_data:
            prog, _ = Program.objects.get_or_create(
                code=code,
                defaults={'name': name, 'duration_years': years, 'is_active': True}
            )
            self.programs[code] = prog
            
        # Curricula
        self.curricula = {}
        for code, prog in self.programs.items():
            curr, _ = Curriculum.objects.get_or_create(
                program=prog,
                code='2024-REV',
                defaults={'name': f'{code} 2024', 'effective_year': 2024, 'is_active': True}
            )
            self.curricula[code] = curr
            
        # Professors
        professors_data = [
            ('Juan', 'Dela Cruz', 'Programming'),
            ('Maria', 'Santos', 'Databases'),
            ('Pedro', 'Garcia', 'Networking'),
        ]
        
        for first, last, spec in professors_data:
            email = f'{first.lower()}.{last.lower()}@richwell.edu'.replace(' ', '.')
            user, _ = User.objects.get_or_create(
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
            
            ProfessorProfile.objects.get_or_create(
                user=user,
                defaults={'department': 'CCS', 'specialization': spec}
            )
            
        self.stdout.write('   - Created programs, curricula, and professors')

    def _seed_students(self):
        self.stdout.write('\n👥 Level 3: Students...')
        
        students_data = [
            ('student.regular1@richwell.edu', 'Maria', 'Garcia', '2025-00001', 1, 'BSIT'),
            ('student.regular2@richwell.edu', 'Juan', 'Santos', '2025-00002', 1, 'BSIT'),
            ('student.second1@richwell.edu', 'Pedro', 'Cruz', '2024-00001', 2, 'BSIT'),
            ('student.bscs@richwell.edu', 'Charlie', 'Science', '2025-CS001', 1, 'BSCS'),
        ]
        
        for email, first, last, number, year, prog_code in students_data:
            user, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': email,
                    'first_name': first,
                    'last_name': last,
                    'role': User.Role.STUDENT,
                    'student_number': number
                }
            )
            user.set_password('password123')
            user.save()
            
            StudentProfile.objects.get_or_create(
                user=user,
                defaults={
                    'program': self.programs[prog_code],
                    'curriculum': self.curricula[prog_code],
                    'year_level': year,
                    'status': 'ACTIVE',
                    'academic_status': 'REGULAR',
                    'birthdate': date(2005, 1, 1),
                    'address': 'Sample Address',
                    'contact_number': '09123456789'
                }
            )
            
        self.stdout.write(f'   - Created {len(students_data)} students')
