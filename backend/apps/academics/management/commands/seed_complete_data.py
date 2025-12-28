"""
Complete data seeder for all models in the system.
Seeds realistic data with proper prerequisite ordering and relationships.

Usage:
    python manage.py seed_complete_data            # Seed with existing data
    python manage.py seed_complete_data --flush    # Clear all data first
    python manage.py seed_complete_data --quiet    # Minimal output
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.core.management import call_command
from django.utils import timezone
from datetime import datetime, timedelta
import random

from apps.accounts.models import User, StudentProfile, ProfessorProfile, Permission, UserPermission
from apps.academics.models import (
    Program, Subject, Curriculum, CurriculumSubject,
    Semester, Section, SectionSubject, SectionSubjectProfessor
)
from apps.enrollment.models import (
    Enrollment, EnrollmentSubject, Grade, ScheduleSlot,
    ExamSchedule, Payment, PaymentBucket, PaymentItem, ExamPermit
)
from apps.accounts.models import StudentDocument, TransferCredit
from apps.audit.models import AuditLog


class Command(BaseCommand):
    help = 'Seed all models with comprehensive realistic data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--flush',
            action='store_true',
            help='Delete all existing data before seeding'
        )
        parser.add_argument(
            '--quiet',
            action='store_true',
            help='Minimal output'
        )

    def handle(self, *args, **options):
        self.quiet = options['quiet']

        try:
            with transaction.atomic():
                if options['flush']:
                    self.log('Flushing existing data...')
                    self.flush_all_data()

                self.log('=' * 60)
                self.log('STARTING COMPREHENSIVE DATA SEEDING')
                self.log('=' * 60)

                # Layer 0: Foundation
                self.log('\n[Layer 0] Seeding foundation data...')
                programs = self.seed_foundation()

                # Layer 1: Permissions
                self.log('[Layer 1] Seeding permissions...')
                self.seed_permissions()

                # Layer 2: Users
                self.log('[Layer 2] Seeding users...')
                users = self.seed_users()

                # Layer 3: User Extensions
                self.log('[Layer 3] Seeding user extensions...')
                students, professors = self.seed_user_extensions(users, programs)

                # Layer 4: Curriculum & Subjects
                self.log('[Layer 4] Seeding subjects with prerequisites...')
                subjects = self.seed_subjects_with_prerequisites(programs)
                self.log('[Layer 4] Seeding curricula...')
                curricula = self.seed_curricula(programs, subjects)

                # Layer 5: Sections & Schedules
                self.log('[Layer 5] Seeding sections...')
                sections = self.seed_sections(programs)
                self.log('[Layer 5] Seeding section-subjects...')
                section_subjects = self.seed_section_subjects(sections, subjects)
                self.log('[Layer 5] Seeding schedule slots...')
                self.seed_schedule_slots(section_subjects)

                # Layer 6: Professor Assignments
                self.log('[Layer 6] Seeding professor assignments...')
                self.seed_professor_assignments(section_subjects, professors)

                # Layer 7: Enrollments
                self.log('[Layer 7] Seeding enrollments...')
                semesters = Semester.objects.all()
                enrollments = self.seed_enrollments(students, sections, semesters)
                self.log('[Layer 7] Seeding exam schedules...')
                self.seed_exam_schedules(semesters)

                # Layer 8: Enrollment Details
                self.log('[Layer 8] Seeding enrollment subjects...')
                self.seed_enrollment_subjects(enrollments, section_subjects)
                self.log('[Layer 8] Seeding grades...')
                self.seed_grades(enrollments, subjects, semesters)
                self.log('[Layer 8] Seeding payments...')
                payments = self.seed_payments(enrollments, semesters)
                self.log('[Layer 8] Seeding exam permits...')
                self.seed_exam_permits(students, semesters, payments)
                self.log('[Layer 8] Seeding student documents...')
                self.seed_student_documents(students)
                self.log('[Layer 8] Seeding transfer credits...')
                self.seed_transfer_credits(students, subjects)

                self.log('\n' + '=' * 60)
                self.log('SEEDING COMPLETED SUCCESSFULLY!')
                self.log('=' * 60)
                self.print_summary()

        except Exception as e:
            self.log(f'\n[ERROR] Seeding failed: {str(e)}', level='ERROR')
            raise

    def log(self, message, level='INFO'):
        """Print message if not in quiet mode"""
        if not self.quiet:
            if level == 'ERROR':
                self.stdout.write(self.style.ERROR(message))
            elif level == 'SUCCESS':
                self.stdout.write(self.style.SUCCESS(message))
            else:
                self.stdout.write(message)

    def flush_all_data(self):
        """Delete all existing data (except superusers)"""
        # Delete in reverse dependency order
        models_to_flush = [
            ExamPermit, PaymentItem, PaymentBucket, Payment,
            Grade, EnrollmentSubject, Enrollment,
            ScheduleSlot, SectionSubjectProfessor, SectionSubject, Section,
            CurriculumSubject, Curriculum,
            ExamSchedule, Semester,
            TransferCredit, StudentDocument,
            UserPermission, ProfessorProfile, StudentProfile,
            Subject, Program,
        ]

        for model in models_to_flush:
            count = model.objects.all().delete()[0]
            if count > 0:
                self.log(f'  Deleted {count} {model.__name__} records')

        # Delete non-superuser users
        count = User.objects.filter(is_superuser=False).delete()[0]
        if count > 0:
            self.log(f'  Deleted {count} User records (kept superusers)')

    def seed_foundation(self):
        """Seed programs and semesters"""
        # Create Programs
        programs_data = [
            {'code': 'BSIT', 'name': 'Bachelor of Science in Information Technology', 'description': 'IT program'},
            {'code': 'BSIS', 'name': 'Bachelor of Science in Information Systems', 'description': 'IS program'},
            {'code': 'BSCS', 'name': 'Bachelor of Science in Computer Science', 'description': 'CS program'},
            {'code': 'BSBA', 'name': 'Bachelor of Science in Business Administration', 'description': 'BA program'},
        ]

        programs = []
        for prog_data in programs_data:
            program, created = Program.objects.get_or_create(
                code=prog_data['code'],
                defaults={'name': prog_data['name'], 'description': prog_data['description']}
            )
            programs.append(program)
            if created:
                self.log(f'  [+] Created program: {program.code}')

        # Create Semesters
        semesters_data = [
            {'name': 'AY 2023-2024, 1st Semester', 'start': '2023-08-01', 'end': '2023-12-15', 'status': 'CLOSED'},
            {'name': 'AY 2023-2024, 2nd Semester', 'start': '2024-01-15', 'end': '2024-05-31', 'status': 'CLOSED'},
            {'name': 'AY 2024-2025, 1st Semester', 'start': '2024-08-01', 'end': '2024-12-15', 'status': 'CLOSED'},
            {'name': 'AY 2024-2025, 2nd Semester', 'start': '2025-01-15', 'end': '2025-05-31', 'status': 'ACTIVE'},
            {'name': 'AY 2025-2026, 1st Semester', 'start': '2025-08-01', 'end': '2025-12-15', 'status': 'UPCOMING'},
            {'name': 'AY 2025-2026, 2nd Semester', 'start': '2026-01-15', 'end': '2026-05-31', 'status': 'UPCOMING'},
        ]

        for sem_data in semesters_data:
            semester, created = Semester.objects.get_or_create(
                name=sem_data['name'],
                defaults={
                    'start_date': sem_data['start'],
                    'end_date': sem_data['end'],
                    'status': sem_data['status']
                }
            )
            if created:
                self.log(f'  [+] Created semester: {semester.name}')

        self.log(f'  Total programs: {Program.objects.count()}')
        self.log(f'  Total semesters: {Semester.objects.count()}')

        return programs

    def seed_permissions(self):
        """Run existing seed_permissions command"""
        call_command('seed_permissions', verbosity=0)
        self.log(f'  Total permissions: {Permission.objects.count()}')

    def seed_users(self):
        """Seed 50 users across all roles"""
        users_data = [
            # Admins (2)
            {'email': 'admin1@richwell.edu.ph', 'first_name': 'System', 'last_name': 'Administrator', 'role': 'ADMIN'},
            {'email': 'admin2@richwell.edu.ph', 'first_name': 'Maria', 'last_name': 'Santos', 'role': 'ADMIN'},

            # Registrars (3)
            {'email': 'headregistrar@richwell.edu.ph', 'first_name': 'Carmen', 'last_name': 'Reyes', 'role': 'HEAD_REGISTRAR'},
            {'email': 'registrar1@richwell.edu.ph', 'first_name': 'Pedro', 'last_name': 'Cruz', 'role': 'REGISTRAR'},
            {'email': 'registrar2@richwell.edu.ph', 'first_name': 'Ana', 'last_name': 'Garcia', 'role': 'REGISTRAR'},

            # Department Heads (4)
            {'email': 'head.bsit@richwell.edu.ph', 'first_name': 'Roberto', 'last_name': 'Aquino', 'role': 'DEPARTMENT_HEAD'},
            {'email': 'head.bsis@richwell.edu.ph', 'first_name': 'Elena', 'last_name': 'Ramos', 'role': 'DEPARTMENT_HEAD'},
            {'email': 'head.bscs@richwell.edu.ph', 'first_name': 'Miguel', 'last_name': 'Torres', 'role': 'DEPARTMENT_HEAD'},
            {'email': 'head.bsba@richwell.edu.ph', 'first_name': 'Rosa', 'last_name': 'Dela Cruz', 'role': 'DEPARTMENT_HEAD'},

            # Professors (15)
            {'email': 'prof.santos@richwell.edu.ph', 'first_name': 'Juan', 'last_name': 'Santos', 'role': 'PROFESSOR'},
            {'email': 'prof.garcia@richwell.edu.ph', 'first_name': 'Maria', 'last_name': 'Garcia', 'role': 'PROFESSOR'},
            {'email': 'prof.reyes@richwell.edu.ph', 'first_name': 'Pedro', 'last_name': 'Reyes', 'role': 'PROFESSOR'},
            {'email': 'prof.cruz@richwell.edu.ph', 'first_name': 'Ana', 'last_name': 'Cruz', 'role': 'PROFESSOR'},
            {'email': 'prof.lopez@richwell.edu.ph', 'first_name': 'Jose', 'last_name': 'Lopez', 'role': 'PROFESSOR'},
            {'email': 'prof.torres@richwell.edu.ph', 'first_name': 'Carmen', 'last_name': 'Torres', 'role': 'PROFESSOR'},
            {'email': 'prof.flores@richwell.edu.ph', 'first_name': 'Luis', 'last_name': 'Flores', 'role': 'PROFESSOR'},
            {'email': 'prof.mendoza@richwell.edu.ph', 'first_name': 'Sofia', 'last_name': 'Mendoza', 'role': 'PROFESSOR'},
            {'email': 'prof.ramirez@richwell.edu.ph', 'first_name': 'Carlos', 'last_name': 'Ramirez', 'role': 'PROFESSOR'},
            {'email': 'prof.gonzales@richwell.edu.ph', 'first_name': 'Isabel', 'last_name': 'Gonzales', 'role': 'PROFESSOR'},
            {'email': 'prof.castro@richwell.edu.ph', 'first_name': 'Fernando', 'last_name': 'Castro', 'role': 'PROFESSOR'},
            {'email': 'prof.ramos@richwell.edu.ph', 'first_name': 'Teresa', 'last_name': 'Ramos', 'role': 'PROFESSOR'},
            {'email': 'prof.morales@richwell.edu.ph', 'first_name': 'Ricardo', 'last_name': 'Morales', 'role': 'PROFESSOR'},
            {'email': 'prof.santiago@richwell.edu.ph', 'first_name': 'Beatriz', 'last_name': 'Santiago', 'role': 'PROFESSOR'},
            {'email': 'prof.navarro@richwell.edu.ph', 'first_name': 'Antonio', 'last_name': 'Navarro', 'role': 'PROFESSOR'},

            # Cashiers (2)
            {'email': 'cashier1@richwell.edu.ph', 'first_name': 'Gloria', 'last_name': 'Fernandez', 'role': 'CASHIER'},
            {'email': 'cashier2@richwell.edu.ph', 'first_name': 'Ramon', 'last_name': 'Diaz', 'role': 'CASHIER'},

            # Admission Staff (2)
            {'email': 'admission1@richwell.edu.ph', 'first_name': 'Linda', 'last_name': 'Alvarez', 'role': 'ADMISSION_STAFF'},
            {'email': 'admission2@richwell.edu.ph', 'first_name': 'Mario', 'last_name': 'Romero', 'role': 'ADMISSION_STAFF'},
        ]

        users = {}
        for user_data in users_data:
            user, created = User.objects.get_or_create(
                email=user_data['email'],
                defaults={
                    'first_name': user_data['first_name'],
                    'last_name': user_data['last_name'],
                    'role': user_data['role'],
                    'is_verified': True
                }
            )
            if created:
                user.set_password('password123')
                user.save()
                self.log(f'  [+] Created user: {user.email} ({user.role})')
            users[user_data['role']] = users.get(user_data['role'], []) + [user]

        # Seed students (22 students)
        student_data = self.generate_student_data()
        for data in student_data:
            user, created = User.objects.get_or_create(
                email=data['email'],
                defaults={
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'role': 'STUDENT',
                    'is_verified': True
                }
            )
            if created:
                user.set_password('password123')
                user.student_number = data['student_number']
                user.save()
                self.log(f'  [+] Created student: {user.student_number} - {user.get_full_name()}')
            users['STUDENT'] = users.get('STUDENT', []) + [user]

        self.log(f'  Total users: {User.objects.count()}')
        return users

    def generate_student_data(self):
        """Generate 22 students distributed across programs and year levels"""
        first_names = ['Juan', 'Maria', 'Jose', 'Ana', 'Pedro', 'Carmen', 'Luis', 'Rosa',
                      'Carlos', 'Elena', 'Miguel', 'Sofia', 'Ricardo', 'Isabel', 'Fernando',
                      'Teresa', 'Antonio', 'Gloria', 'Ramon', 'Linda', 'Mario', 'Beatriz']
        last_names = ['Dela Cruz', 'Santos', 'Reyes', 'Garcia', 'Gonzales', 'Rodriguez',
                     'Fernandez', 'Lopez', 'Martinez', 'Torres', 'Flores', 'Ramos']

        students = []
        student_distributions = [
            # (program_code, year_level, count)
            ('BSIT', 1, 2), ('BSIT', 2, 2), ('BSIT', 3, 1), ('BSIT', 4, 2),
            ('BSCS', 1, 2), ('BSCS', 2, 1), ('BSCS', 3, 2), ('BSCS', 4, 1),
            ('BSIS', 1, 1), ('BSIS', 2, 2), ('BSIS', 3, 1), ('BSIS', 4, 1),
            ('BSBA', 1, 1), ('BSBA', 2, 1), ('BSBA', 3, 1), ('BSBA', 4, 1),
        ]

        idx = 0
        for program_code, year_level, count in student_distributions:
            for _ in range(count):
                year = 2025 - (year_level - 1)  # Entry year
                student_num = f"{year}{program_code}{str(idx+1).zfill(4)}"

                students.append({
                    'student_number': student_num,
                    'email': f'{first_names[idx].lower()}.{last_names[idx % len(last_names)].lower().replace(" ", "")}@student.richwell.edu.ph',
                    'first_name': first_names[idx],
                    'last_name': last_names[idx % len(last_names)],
                    'program_code': program_code,
                    'year_level': year_level
                })
                idx += 1

        return students

    def seed_user_extensions(self, users, programs):
        """Create StudentProfile, ProfessorProfile, UserPermission records"""
        students = []
        professors = []

        # Create StudentProfile records
        program_map = {p.code: p for p in programs}
        for user in users.get('STUDENT', []):
            # Extract program code from student number (format: YYYYPROGXXXX)
            student_num = user.student_number
            program_code = student_num[4:8]  # BSIT, BSIS, etc.
            year = int(student_num[:4])
            year_level = 2025 - year + 1

            student, created = StudentProfile.objects.get_or_create(
                user=user,
                defaults={
                    'program': program_map.get(program_code, programs[0]),
                    'year_level': year_level,
                    'status': 'ENROLLED'
                }
            )
            students.append(student)
            if created:
                self.log(f'  [+] Created student profile: {user.student_number}')

        # Create ProfessorProfile records
        for user in users.get('PROFESSOR', []):
            professor, created = ProfessorProfile.objects.get_or_create(
                user=user,
                defaults={
                    'department': programs[0],  # Assign to first program
                    'employee_number': f'EMP{user.id}',
                    'rank': 'ASSISTANT_PROFESSOR'
                }
            )
            professors.append(professor)
            if created:
                self.log(f'  [+] Created professor profile: {user.get_full_name()}')

        # Create some custom UserPermission overrides (5 examples)
        admin_user = users.get('ADMIN', [None])[0]
        if admin_user:
            # Give registrar user some admin permissions
            registrar = users.get('REGISTRAR', [None])[0]
            if registrar:
                audit_perm = Permission.objects.filter(code='audit.view').first()
                if audit_perm:
                    UserPermission.objects.get_or_create(
                        user=registrar,
                        permission=audit_perm,
                        defaults={'granted': True, 'granted_by': admin_user}
                    )
                    self.log(f'  [+] Granted audit.view to {registrar.email}')

        self.log(f'  Total students: {StudentProfile.objects.count()}')
        self.log(f'  Total professors: {ProfessorProfile.objects.count()}')
        return students, professors

    def seed_subjects_with_prerequisites(self, programs):
        """
        Seed subjects with proper prerequisite ordering.
        CRITICAL: No prerequisite within the same year/semester!
        """
        program_map = {p.code: p for p in programs}

        # Define all subjects with proper ordering
        subjects_data = [
            # ===== YEAR 1, SEMESTER 1 (Foundation - NO Prerequisites) =====
            {'code': 'ENG101', 'title': 'English Communication 1', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS', 'BSBA'], 'year': 1, 'sem': 1, 'prereqs': []},
            {'code': 'MATH101', 'title': 'College Algebra', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS', 'BSBA'], 'year': 1, 'sem': 1, 'prereqs': []},
            {'code': 'NSTP101', 'title': 'National Service Training Program 1', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS', 'BSBA'], 'year': 1, 'sem': 1, 'prereqs': []},
            {'code': 'PE101', 'title': 'Physical Education 1', 'units': 2,
             'programs': ['BSIT', 'BSIS', 'BSCS', 'BSBA'], 'year': 1, 'sem': 1, 'prereqs': []},
            {'code': 'CS101', 'title': 'Introduction to Computing', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS'], 'year': 1, 'sem': 1, 'prereqs': []},
            {'code': 'PROG101', 'title': 'Computer Programming 1', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS'], 'year': 1, 'sem': 1, 'prereqs': []},
            {'code': 'ACCT101', 'title': 'Fundamentals of Accounting', 'units': 3,
             'programs': ['BSBA'], 'year': 1, 'sem': 1, 'prereqs': []},
            {'code': 'MGT101', 'title': 'Introduction to Business', 'units': 3,
             'programs': ['BSBA'], 'year': 1, 'sem': 1, 'prereqs': []},

            # ===== YEAR 1, SEMESTER 2 (Prerequisites from Y1S1) =====
            {'code': 'ENG102', 'title': 'English Communication 2', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS', 'BSBA'], 'year': 1, 'sem': 2, 'prereqs': ['ENG101']},
            {'code': 'MATH102', 'title': 'Trigonometry', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS', 'BSBA'], 'year': 1, 'sem': 2, 'prereqs': ['MATH101']},
            {'code': 'NSTP102', 'title': 'National Service Training Program 2', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS', 'BSBA'], 'year': 1, 'sem': 2, 'prereqs': ['NSTP101']},
            {'code': 'PE102', 'title': 'Physical Education 2', 'units': 2,
             'programs': ['BSIT', 'BSIS', 'BSCS', 'BSBA'], 'year': 1, 'sem': 2, 'prereqs': ['PE101']},
            {'code': 'PROG102', 'title': 'Computer Programming 2', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS'], 'year': 1, 'sem': 2, 'prereqs': ['PROG101']},
            {'code': 'WEBDEV101', 'title': 'Web Development Fundamentals', 'units': 3,
             'programs': ['BSIT', 'BSIS'], 'year': 1, 'sem': 2, 'prereqs': ['CS101']},
            {'code': 'DISCRETE', 'title': 'Discrete Mathematics', 'units': 3,
             'programs': ['BSCS'], 'year': 1, 'sem': 2, 'prereqs': ['MATH101']},
            {'code': 'ACCT102', 'title': 'Financial Accounting', 'units': 3,
             'programs': ['BSBA'], 'year': 1, 'sem': 2, 'prereqs': ['ACCT101']},

            # ===== YEAR 2, SEMESTER 1 (Prerequisites from Y1S1, Y1S2) =====
            {'code': 'DATASTRUCT', 'title': 'Data Structures and Algorithms', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS'], 'year': 2, 'sem': 1, 'prereqs': ['PROG102']},
            {'code': 'DATABASE101', 'title': 'Database Management Systems', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS'], 'year': 2, 'sem': 1, 'prereqs': ['PROG102']},
            {'code': 'OOP101', 'title': 'Object-Oriented Programming', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS'], 'year': 2, 'sem': 1, 'prereqs': ['PROG102']},
            {'code': 'STATS101', 'title': 'Statistics and Probability', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS', 'BSBA'], 'year': 2, 'sem': 1, 'prereqs': ['MATH102']},
            {'code': 'WEBDEV201', 'title': 'Advanced Web Development', 'units': 3,
             'programs': ['BSIT', 'BSIS'], 'year': 2, 'sem': 1, 'prereqs': ['WEBDEV101']},
            {'code': 'MGT201', 'title': 'Organizational Management', 'units': 3,
             'programs': ['BSBA'], 'year': 2, 'sem': 1, 'prereqs': ['MGT101']},

            # ===== YEAR 2, SEMESTER 2 (Prerequisites from Y2S1 and earlier) =====
            {'code': 'SOFTENG', 'title': 'Software Engineering', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS'], 'year': 2, 'sem': 2, 'prereqs': ['DATASTRUCT']},
            {'code': 'NETADMIN', 'title': 'Network Administration', 'units': 3,
             'programs': ['BSIT', 'BSIS'], 'year': 2, 'sem': 2, 'prereqs': ['DATABASE101']},
            {'code': 'ALGO', 'title': 'Algorithm Design and Analysis', 'units': 3,
             'programs': ['BSCS'], 'year': 2, 'sem': 2, 'prereqs': ['DATASTRUCT', 'DISCRETE']},
            {'code': 'DATABASE201', 'title': 'Advanced Database Systems', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS'], 'year': 2, 'sem': 2, 'prereqs': ['DATABASE101']},
            {'code': 'MARKETING', 'title': 'Marketing Management', 'units': 3,
             'programs': ['BSBA'], 'year': 2, 'sem': 2, 'prereqs': ['MGT201']},

            # ===== YEAR 3, SEMESTER 1 (Prerequisites from Y2S2 and earlier) =====
            {'code': 'CAPSTONE1', 'title': 'Capstone Project 1', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS'], 'year': 3, 'sem': 1, 'prereqs': ['SOFTENG']},
            {'code': 'MOBDEV', 'title': 'Mobile Application Development', 'units': 3,
             'programs': ['BSIT', 'BSIS'], 'year': 3, 'sem': 1, 'prereqs': ['WEBDEV201', 'OOP101']},
            {'code': 'AI101', 'title': 'Artificial Intelligence', 'units': 3,
             'programs': ['BSCS'], 'year': 3, 'sem': 1, 'prereqs': ['ALGO']},
            {'code': 'SYSADMIN', 'title': 'Systems Administration', 'units': 3,
             'programs': ['BSIT', 'BSIS'], 'year': 3, 'sem': 1, 'prereqs': ['NETADMIN']},
            {'code': 'FINMGT', 'title': 'Financial Management', 'units': 3,
             'programs': ['BSBA'], 'year': 3, 'sem': 1, 'prereqs': ['ACCT102']},

            # ===== YEAR 3, SEMESTER 2 (Prerequisites from Y3S1 and earlier) =====
            {'code': 'CAPSTONE2', 'title': 'Capstone Project 2', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS'], 'year': 3, 'sem': 2, 'prereqs': ['CAPSTONE1']},
            {'code': 'SECURITY', 'title': 'Information Security', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS'], 'year': 3, 'sem': 2, 'prereqs': ['NETADMIN']},
            {'code': 'ML101', 'title': 'Machine Learning', 'units': 3,
             'programs': ['BSCS'], 'year': 3, 'sem': 2, 'prereqs': ['AI101']},
            {'code': 'CLOUD', 'title': 'Cloud Computing', 'units': 3,
             'programs': ['BSIT', 'BSIS'], 'year': 3, 'sem': 2, 'prereqs': ['SYSADMIN']},
            {'code': 'STRAT', 'title': 'Strategic Management', 'units': 3,
             'programs': ['BSBA'], 'year': 3, 'sem': 2, 'prereqs': ['FINMGT']},

            # ===== YEAR 4, SEMESTER 1 (Prerequisites from Y3S2 and earlier) =====
            {'code': 'PRACTICUM', 'title': 'On-the-Job Training', 'units': 6,
             'programs': ['BSIT', 'BSIS', 'BSCS', 'BSBA'], 'year': 4, 'sem': 1, 'prereqs': ['CAPSTONE2']},
            {'code': 'ETHICS', 'title': 'IT Ethics and Professionalism', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS'], 'year': 4, 'sem': 1, 'prereqs': []},
            {'code': 'BIZETHICS', 'title': 'Business Ethics', 'units': 3,
             'programs': ['BSBA'], 'year': 4, 'sem': 1, 'prereqs': []},

            # ===== YEAR 4, SEMESTER 2 (Final Semester) =====
            {'code': 'THESIS', 'title': 'Undergraduate Thesis', 'units': 6,
             'programs': ['BSIT', 'BSIS', 'BSCS', 'BSBA'], 'year': 4, 'sem': 2, 'prereqs': ['PRACTICUM']},
            {'code': 'REVIEW', 'title': 'Comprehensive Exam Review', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS', 'BSBA'], 'year': 4, 'sem': 2, 'prereqs': []},
        ]

        # Step 1: Create all subjects WITHOUT prerequisites first
        created_subjects = {}
        for subj_data in subjects_data:
            # Get programs for this subject
            subject_programs = [program_map[code] for code in subj_data['programs'] if code in program_map]
            if not subject_programs:
                continue

            primary_program = subject_programs[0]

            # Create or get subject
            subject, created = Subject.objects.get_or_create(
                code=subj_data['code'],
                defaults={
                    'title': subj_data['title'],
                    'units': subj_data['units'],
                    'program': primary_program,
                    'year_level': subj_data['year'],
                    'semester_number': subj_data['sem']
                }
            )

            # Add to all programs (multi-program support)
            subject.programs.set(subject_programs)

            created_subjects[subj_data['code']] = subject
            if created:
                programs_str = ', '.join([p.code for p in subject_programs])
                self.log(f'  [+] Created subject: {subject.code} - {subject.title} ({programs_str})')

        # Step 2: Add prerequisites in correct order (Y1S1 → Y1S2 → Y2S1 → ...)
        for subj_data in sorted(subjects_data, key=lambda x: (x['year'], x['sem'])):
            if subj_data['prereqs']:
                subject = created_subjects[subj_data['code']]
                prereq_objs = [created_subjects[code] for code in subj_data['prereqs'] if code in created_subjects]

                if prereq_objs:
                    subject.prerequisites.set(prereq_objs)
                    prereq_codes = ', '.join([p.code for p in prereq_objs])
                    self.log(f'  [+] Added prerequisites to {subject.code}: {prereq_codes}')

        self.log(f'  Total subjects: {Subject.objects.count()}')
        return list(created_subjects.values())

    def seed_curricula(self, programs, subjects):
        """Create curricula and curriculum subjects"""
        curricula = []

        for program in programs:
            curriculum, created = Curriculum.objects.get_or_create(
                program=program,
                year=2024,
                defaults={
                    'name': f'{program.code} Curriculum 2024',
                    'description': f'Standard curriculum for {program.name}'
                }
            )
            curricula.append(curriculum)
            if created:
                self.log(f'  [+] Created curriculum: {curriculum.name}')

            # Assign subjects to curriculum
            program_subjects = Subject.objects.filter(programs=program)
            for subject in program_subjects:
                CurriculumSubject.objects.get_or_create(
                    curriculum=curriculum,
                    subject=subject,
                    defaults={
                        'year_level': subject.year_level,
                        'semester_number': subject.semester_number
                    }
                )

            self.log(f'  [+] Assigned {program_subjects.count()} subjects to {program.code} curriculum')

        self.log(f'  Total curricula: {Curriculum.objects.count()}')
        return curricula

    def seed_sections(self, programs):
        """Create sections for active semester"""
        active_semester = Semester.objects.filter(status='ACTIVE').first()
        if not active_semester:
            self.log('  [!] No active semester found, skipping sections')
            return []

        sections = []
        section_letters = ['A', 'B', 'C']

        for program in programs:
            for year_level in [1, 2, 3, 4]:
                # Create 1-2 sections per (program, year_level)
                num_sections = 2 if year_level <= 2 else 1

                for i in range(num_sections):
                    section_name = f'{program.code}-{year_level}{section_letters[i]}'
                    section, created = Section.objects.get_or_create(
                        semester=active_semester,
                        program=program,
                        year_level=year_level,
                        name=section_name,
                        defaults={'capacity': 35}
                    )
                    sections.append(section)
                    if created:
                        self.log(f'  [+] Created section: {section.name}')

        self.log(f'  Total sections: {Section.objects.count()}')
        return sections

    def seed_section_subjects(self, sections, subjects):
        """Assign subjects to sections based on year/semester"""
        section_subjects = []
        active_semester = Semester.objects.filter(status='ACTIVE').first()
        current_sem_number = 2  # Assuming 2nd semester is active

        for section in sections:
            # Get subjects matching this section's program, year, and semester
            matching_subjects = Subject.objects.filter(
                programs=section.program,
                year_level=section.year_level,
                semester_number=current_sem_number
            )

            for subject in matching_subjects:
                section_subject, created = SectionSubject.objects.get_or_create(
                    section=section,
                    subject=subject
                )
                section_subjects.append(section_subject)
                if created:
                    self.log(f'  [+] Assigned {subject.code} to {section.name}')

        self.log(f'  Total section-subjects: {SectionSubject.objects.count()}')
        return section_subjects

    def seed_schedule_slots(self, section_subjects):
        """Create weekly schedules for each section-subject"""
        days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
        time_slots = [
            ('07:00', '08:30'), ('08:30', '10:00'), ('10:00', '11:30'),
            ('13:00', '14:30'), ('14:30', '16:00'), ('16:00', '17:30')
        ]
        rooms = ['RM101', 'RM102', 'RM201', 'RM202', 'LAB1', 'LAB2', 'LAB3']

        schedule_conflicts = {}  # Track (day, time, room) conflicts

        for section_subject in section_subjects:
            # Each subject gets 1-2 schedule slots per week
            num_slots = 2 if section_subject.subject.units >= 3 else 1

            for slot_num in range(num_slots):
                # Find available day/time/room combination
                for attempt in range(20):  # Try 20 times to find non-conflicting slot
                    day = random.choice(days)
                    time_slot = random.choice(time_slots)
                    room = random.choice(rooms)

                    conflict_key = (day, time_slot[0], room)
                    if conflict_key not in schedule_conflicts:
                        ScheduleSlot.objects.create(
                            section_subject=section_subject,
                            day=day,
                            start_time=time_slot[0],
                            end_time=time_slot[1],
                            room=room
                        )
                        schedule_conflicts[conflict_key] = True
                        break

        self.log(f'  Total schedule slots: {ScheduleSlot.objects.count()}')

    def seed_professor_assignments(self, section_subjects, professors):
        """Assign professors to section-subjects"""
        if not professors:
            self.log('  [!] No professors found')
            return

        for section_subject in section_subjects:
            # Assign 1 primary professor
            professor = random.choice(professors)
            SectionSubjectProfessor.objects.get_or_create(
                section_subject=section_subject,
                professor=professor,
                defaults={'is_primary': True}
            )

        self.log(f'  Total professor assignments: {SectionSubjectProfessor.objects.count()}')

    def seed_enrollments(self, students, sections, semesters):
        """Create enrollments for students in active semester"""
        active_semester = semesters.filter(status='ACTIVE').first()
        if not active_semester:
            self.log('  [!] No active semester')
            return []

        enrollments = []
        statuses = ['PENDING', 'PENDING_PAYMENT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED']
        status_weights = [10, 20, 15, 50, 5]  # Distribution percentages

        for student in students:
            # Find section matching student's program and year level
            section = Section.objects.filter(
                semester=active_semester,
                program=student.program,
                year_level=student.year_level
            ).first()

            if not section:
                continue

            # Randomly assign enrollment status
            status = random.choices(statuses, weights=status_weights)[0]

            enrollment, created = Enrollment.objects.get_or_create(
                student=student,
                semester=active_semester,
                section=section,
                defaults={
                    'status': status,
                    'payment_approved': status in ['APPROVED', 'PENDING_APPROVAL'],
                    'head_approved': status == 'APPROVED'
                }
            )
            enrollments.append(enrollment)
            if created:
                self.log(f'  [+] Enrolled {student.user.student_number} in {section.name} ({status})')

        self.log(f'  Total enrollments: {Enrollment.objects.count()}')
        return enrollments

    def seed_exam_schedules(self, semesters):
        """Create midterm and final exam schedules"""
        for semester in semesters:
            # Midterm exam
            ExamSchedule.objects.get_or_create(
                semester=semester,
                exam_period='MIDTERM',
                defaults={
                    'start_date': semester.start_date + timedelta(days=60),
                    'end_date': semester.start_date + timedelta(days=67)
                }
            )

            # Final exam
            ExamSchedule.objects.get_or_create(
                semester=semester,
                exam_period='FINAL',
                defaults={
                    'start_date': semester.end_date - timedelta(days=14),
                    'end_date': semester.end_date - timedelta(days=7)
                }
            )

        self.log(f'  Total exam schedules: {ExamSchedule.objects.count()}')

    def seed_enrollment_subjects(self, enrollments, section_subjects):
        """Link enrollments to section-subjects"""
        for enrollment in enrollments:
            # Get all section-subjects for this enrollment's section
            subjects_for_section = SectionSubject.objects.filter(section=enrollment.section)

            for section_subject in subjects_for_section:
                EnrollmentSubject.objects.get_or_create(
                    enrollment=enrollment,
                    section_subject=section_subject
                )

        self.log(f'  Total enrollment subjects: {EnrollmentSubject.objects.count()}')

    def seed_grades(self, enrollments, subjects, semesters):
        """Seed grades for CLOSED semesters only"""
        closed_semesters = semesters.filter(status='CLOSED')
        grades_list = ['1.0', '1.25', '1.5', '1.75', '2.0', '2.25', '2.5', '2.75', '3.0', 'INC', '5.0']
        grade_weights = [5, 10, 15, 15, 20, 15, 10, 5, 3, 1, 1]  # Distribution

        # Only create grades for past enrollments
        for student in StudentProfile.objects.all():
            for semester in closed_semesters:
                enrollment = Enrollment.objects.filter(
                    student=student,
                    semester=semester,
                    status='APPROVED'
                ).first()

                if enrollment:
                    enrollment_subjects = EnrollmentSubject.objects.filter(enrollment=enrollment)
                    for enr_subj in enrollment_subjects:
                        grade_value = random.choices(grades_list, weights=grade_weights)[0]

                        # Set expiry for INC grades
                        expiry = None
                        if grade_value == 'INC':
                            expiry = semester.end_date + timedelta(days=365)

                        Grade.objects.get_or_create(
                            enrollment=enrollment,
                            subject=enr_subj.section_subject.subject,
                            defaults={
                                'grade': grade_value,
                                'expiry_date': expiry
                            }
                        )

        self.log(f'  Total grades: {Grade.objects.count()}')

    def seed_payments(self, enrollments, semesters):
        """Create payment records for enrollments"""
        payments = []

        for enrollment in enrollments:
            amount = random.randint(15000, 25000)
            status_choices = ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE']
            status_weights = [20, 30, 45, 5]
            payment_status = random.choices(status_choices, weights=status_weights)[0]

            payment, created = Payment.objects.get_or_create(
                enrollment=enrollment,
                defaults={
                    'amount': amount,
                    'status': payment_status
                }
            )
            payments.append(payment)

        self.log(f'  Total payments: {Payment.objects.count()}')
        return payments

    def seed_exam_permits(self, students, semesters, payments):
        """Issue exam permits for students with PAID status"""
        active_semester = semesters.filter(status='ACTIVE').first()
        if not active_semester:
            return

        exam_schedules = ExamSchedule.objects.filter(semester=active_semester)

        for student in students:
            enrollment = Enrollment.objects.filter(
                student=student,
                semester=active_semester
            ).first()

            if not enrollment:
                continue

            payment = Payment.objects.filter(enrollment=enrollment, status='PAID').first()
            if payment:
                for exam_schedule in exam_schedules:
                    ExamPermit.objects.get_or_create(
                        student=student,
                        semester=active_semester,
                        exam_schedule=exam_schedule,
                        defaults={'issued_by': User.objects.filter(role='CASHIER').first()}
                    )

        self.log(f'  Total exam permits: {ExamPermit.objects.count()}')

    def seed_student_documents(self, students):
        """Upload student documents"""
        doc_types = ['BIRTH_CERTIFICATE', 'DIPLOMA', 'TOR', 'GOOD_MORAL', 'MEDICAL_CERT']

        for student in students[:10]:  # First 10 students
            for doc_type in random.sample(doc_types, 3):  # 3 random doc types
                StudentDocument.objects.get_or_create(
                    student=student,
                    document_type=doc_type,
                    defaults={'status': random.choice(['PENDING', 'APPROVED'])}
                )

        self.log(f'  Total student documents: {StudentDocument.objects.count()}')

    def seed_transfer_credits(self, students, subjects):
        """Create transfer credits for some transferee students"""
        transferees = random.sample(list(students), min(5, len(students)))

        for student in transferees:
            # Give 1-2 transfer credits
            transfer_subjects = random.sample(list(subjects), min(2, len(subjects)))
            for subject in transfer_subjects:
                TransferCredit.objects.get_or_create(
                    student=student,
                    subject=subject,
                    defaults={
                        'previous_school': 'Previous University',
                        'grade': random.choice(['1.5', '2.0', '2.5'])
                    }
                )

        self.log(f'  Total transfer credits: {TransferCredit.objects.count()}')

    def print_summary(self):
        """Print summary of seeded data"""
        self.log('\nData Summary:')
        self.log(f'  Users: {User.objects.count()}')
        self.log(f'  Programs: {Program.objects.count()}')
        self.log(f'  Semesters: {Semester.objects.count()}')
        self.log(f'  Subjects: {Subject.objects.count()}')
        self.log(f'  Sections: {Section.objects.count()}')
        self.log(f'  Enrollments: {Enrollment.objects.count()}')
