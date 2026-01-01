"""
Complete data seeder for all models in the system.
Seeds realistic data with proper prerequisite ordering and relationships.

Usage:
    python manage.py seed_complete_data            # Seed with existing data
    python manage.py seed_complete_data --flush    # Clear all data first
    python manage.py seed_complete_data --quiet    # Minimal output

BSIS TEST STUDENTS (for testing curriculum-based enrollment):
===============================================================
All BSIS students are assigned to BSIS_UE_2019 curriculum

1. 2025BSIS0001 - Juan Dela Cruz (Year 1)
   - Test Case: Clean freshman with no grades yet
   - Purpose: Test first-year enrollment with no prerequisites

2. 2024BSIS0002 - Maria Santos (Year 2)
   - Test Case: Has INC grade in PROG101
   - Purpose: Test prerequisite blocking (cannot enroll in PROG102, DATASTRUCT, OOP101)
   - Email: maria.santos@student.richwell.edu.ph
   - Password: password123

3. 2024BSIS0003 - Jose Reyes (Year 2)
   - Test Case: Completed all Year 1 subjects successfully
   - Purpose: Test normal progression to Year 2
   - Email: jose.reyes@student.richwell.edu.ph
   - Password: password123

4. 2023BSIS0004 - Ana Garcia (Year 3)
   - Test Case: Failed DATASTRUCT (5.0), then passed on retake (2.0)
   - Purpose: Test retake functionality and grade history
   - Email: ana.garcia@student.richwell.edu.ph
   - Password: password123

5. 2023BSIS0005 - Pedro Gonzales (Year 3)
   - Test Case: Mixed grades (ENG101=1.5, MATH101=3.0, PROG101=INC, CS101=5.0)
   - Purpose: Test complex grade scenarios (passed, barely passed, INC, failed)
   - Email: pedro.gonzales@student.richwell.edu.ph
   - Password: password123

6. 2022BSIS0006 - Carmen Rodriguez (Year 4)
   - Test Case: Senior with most subjects completed
   - Purpose: Test curriculum completion tracking and progress visualization
   - Email: carmen.rodriguez@student.richwell.edu.ph
   - Password: password123

All passwords: password123
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
    Section, SectionSubject, SectionSubjectProfessor, ScheduleSlot
)
from apps.enrollment.models import (
    Semester, Enrollment, SubjectEnrollment, MonthlyPaymentBucket,
    ExamMonthMapping, ExamPermit, PaymentTransaction, GradeHistory
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

        # Seed students (23 students - 6 BSIS + 17 others)
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

            # Preserve test_case attribute for later use
            user.test_case = data.get('test_case', 'regular')
            users['STUDENT'] = users.get('STUDENT', []) + [user]

        self.log(f'  Total users: {User.objects.count()}')
        return users

    def generate_student_data(self):
        """Generate students with specific BSIS test cases for curriculum testing"""
        students = []

        # ============================================
        # BSIS TEST STUDENTS (Comprehensive Test Cases)
        # ============================================

        # BSIS Year 1 - Freshman with clean record
        students.append({
            'student_number': '2025BSIS0001',
            'email': 'juan.delacruz@student.richwell.edu.ph',
            'first_name': 'Juan',
            'last_name': 'Dela Cruz',
            'program_code': 'BSIS',
            'year_level': 1,
            'test_case': 'clean_freshman'
        })

        # BSIS Year 2 - Has INC grade in PROG101 prerequisite
        students.append({
            'student_number': '2024BSIS0002',
            'email': 'maria.santos@student.richwell.edu.ph',
            'first_name': 'Maria',
            'last_name': 'Santos',
            'program_code': 'BSIS',
            'year_level': 2,
            'test_case': 'has_inc_prereq'
        })

        # BSIS Year 2 - Has completed Y1 subjects, ready for Y2
        students.append({
            'student_number': '2024BSIS0003',
            'email': 'jose.reyes@student.richwell.edu.ph',
            'first_name': 'Jose',
            'last_name': 'Reyes',
            'program_code': 'BSIS',
            'year_level': 2,
            'test_case': 'completed_year1'
        })

        # BSIS Year 3 - Has retake subject (failed DATASTRUCT, now passed)
        students.append({
            'student_number': '2023BSIS0004',
            'email': 'ana.garcia@student.richwell.edu.ph',
            'first_name': 'Ana',
            'last_name': 'Garcia',
            'program_code': 'BSIS',
            'year_level': 3,
            'test_case': 'has_retake'
        })

        # BSIS Year 3 - Mixed grades (some passed, some INC, some failed)
        students.append({
            'student_number': '2023BSIS0005',
            'email': 'pedro.gonzales@student.richwell.edu.ph',
            'first_name': 'Pedro',
            'last_name': 'Gonzales',
            'program_code': 'BSIS',
            'year_level': 3,
            'test_case': 'mixed_grades'
        })

        # BSIS Year 4 - Senior with almost completed curriculum
        students.append({
            'student_number': '2022BSIS0006',
            'email': 'carmen.rodriguez@student.richwell.edu.ph',
            'first_name': 'Carmen',
            'last_name': 'Rodriguez',
            'program_code': 'BSIS',
            'year_level': 4,
            'test_case': 'senior_almost_done'
        })

        # ============================================
        # OTHER PROGRAMS (Keep original distribution)
        # ============================================

        other_students_data = [
            # BSIT Students
            ('2025BSIT0007', 'Luis', 'Fernandez', 'BSIT', 1),
            ('2025BSIT0008', 'Rosa', 'Lopez', 'BSIT', 1),
            ('2024BSIT0009', 'Carlos', 'Martinez', 'BSIT', 2),
            ('2024BSIT0010', 'Elena', 'Torres', 'BSIT', 2),
            ('2023BSIT0011', 'Miguel', 'Flores', 'BSIT', 3),
            ('2022BSIT0012', 'Sofia', 'Ramos', 'BSIT', 4),
            ('2022BSIT0013', 'Ricardo', 'Morales', 'BSIT', 4),

            # BSCS Students
            ('2025BSCS0014', 'Isabel', 'Santiago', 'BSCS', 1),
            ('2025BSCS0015', 'Fernando', 'Navarro', 'BSCS', 1),
            ('2024BSCS0016', 'Teresa', 'Castro', 'BSCS', 2),
            ('2023BSCS0017', 'Antonio', 'Ramirez', 'BSCS', 3),
            ('2023BSCS0018', 'Gloria', 'Mendoza', 'BSCS', 3),
            ('2022BSCS0019', 'Ramon', 'Alvarez', 'BSCS', 4),

            # BSBA Students
            ('2025BSBA0020', 'Linda', 'Romero', 'BSBA', 1),
            ('2024BSBA0021', 'Mario', 'Diaz', 'BSBA', 2),
            ('2023BSBA0022', 'Beatriz', 'Herrera', 'BSBA', 3),
            ('2022BSBA0023', 'Victor', 'Jimenez', 'BSBA', 4),
        ]

        for student_num, first, last, prog, year in other_students_data:
            students.append({
                'student_number': student_num,
                'email': f'{first.lower()}.{last.lower().replace(" ", "")}@student.richwell.edu.ph',
                'first_name': first,
                'last_name': last,
                'program_code': prog,
                'year_level': year,
                'test_case': 'regular'
            })

        return students

    def seed_user_extensions(self, users, programs):
        """Create StudentProfile, ProfessorProfile, UserPermission records"""
        students = []
        professors = []

        # Create StudentProfile records
        program_map = {p.code: p for p in programs}

        # Get BSIS curriculum (will be created in seed_curricula)
        # For now, we'll assign it after curricula are created

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

            # Assign curriculum after it's created (will be done in Layer 4)
            # Store test_case info for later use in grade seeding
            if hasattr(user, 'test_case'):
                student.test_case = user.test_case

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
            # Create curriculum with proper field names (code, effective_year)
            curriculum_code = f'{program.code}_UE_2019'  # Use 2019 as base year
            curriculum, created = Curriculum.objects.get_or_create(
                code=curriculum_code,
                defaults={
                    'program': program,
                    'effective_year': 2019,
                    'description': f'Unified Entrance Curriculum for {program.name} (2019)',
                    'is_active': True
                }
            )
            curricula.append(curriculum)
            if created:
                self.log(f'  [+] Created curriculum: {curriculum.code}')

            # Assign subjects to curriculum
            program_subjects = Subject.objects.filter(programs=program)
            for subject in program_subjects:
                CurriculumSubject.objects.get_or_create(
                    curriculum=curriculum,
                    subject=subject,
                    defaults={
                        'year_level': subject.year_level,
                        'semester_number': subject.semester_number,
                        'is_required': True  # Mark all as required by default
                    }
                )

            self.log(f'  [+] Assigned {program_subjects.count()} subjects to {program.code} curriculum')

        # ASSIGN CURRICULA TO STUDENTS
        self.log('[Curricula] Assigning curricula to students...')
        for student in StudentProfile.objects.all():
            program_code = student.program.code
            curriculum_code = f'{program_code}_UE_2019'
            curriculum = Curriculum.objects.filter(code=curriculum_code).first()

            if curriculum:
                student.curriculum = curriculum
                student.save()
                self.log(f'  [+] Assigned curriculum {curriculum.code} to {student.user.student_number}')

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
        """
        Create realistic weekly schedules for each section-subject.
        Uses 1-hour blocks (7:00 AM - 9:00 PM) and Monday-Sunday.
        Avoids room and professor conflicts within the same section.
        """
        # 1-hour time blocks from 7am to 9pm
        time_blocks = [
            ('07:00', '08:00'), ('08:00', '09:00'), ('09:00', '10:00'),
            ('10:00', '11:00'), ('11:00', '12:00'), ('12:00', '13:00'),
            ('13:00', '14:00'), ('14:00', '15:00'), ('15:00', '16:00'),
            ('16:00', '17:00'), ('17:00', '18:00'), ('18:00', '19:00'),
            ('19:00', '20:00'), ('20:00', '21:00')
        ]

        # Room types
        lecture_rooms = ['Room 101', 'Room 102', 'Room 103', 'Room 104', 'Room 105',
                        'Room 201', 'Room 202', 'Room 203', 'Room 204', 'Room 205']
        lab_rooms = ['Lab 1', 'Lab 2', 'Lab 3', 'Lab 4', 'Lab 5']

        # Common schedule patterns (days of week)
        patterns = {
            'MWF': ['MON', 'WED', 'FRI'],      # 3 days/week (typical for 3-unit lecture)
            'TTH': ['TUE', 'THU'],              # 2 days/week (typical for 2-unit or labs)
            'MW': ['MON', 'WED'],               # 2 days/week
            'TF': ['TUE', 'FRI'],               # 2 days/week
            'SAT': ['SAT'],                     # Saturday only (weekend classes)
            'SUN': ['SUN'],                     # Sunday only (makeup classes)
            'DAILY': ['MON', 'TUE', 'WED', 'THU', 'FRI'],  # Daily (intensive)
        }

        # Track occupied slots per section: (section_id, day, time_slot) -> True
        section_occupied = {}
        # Track room usage globally: (day, time_slot, room) -> True
        room_occupied = {}

        # Group section_subjects by section for better scheduling
        sections_map = {}
        for ss in section_subjects:
            section_id = ss.section.id
            if section_id not in sections_map:
                sections_map[section_id] = []
            sections_map[section_id].append(ss)

        created_count = 0

        for section_id, section_subs in sections_map.items():
            # Sort by subject code for consistency
            section_subs.sort(key=lambda x: x.subject.code)

            # Assign time slots sequentially for this section
            current_slot_idx = 0  # Start at 7am
            current_pattern_idx = 0
            pattern_list = ['MWF', 'TTH', 'MW', 'TF', 'MWF', 'TTH']  # Rotate through patterns

            for section_subject in section_subs:
                subject = section_subject.subject
                units = subject.units

                # Determine if it's a lab subject (needs lab room)
                is_lab = 'LAB' in subject.code.upper() or 'PROG' in subject.code.upper() or 'WEBDEV' in subject.code.upper()
                available_rooms = lab_rooms if is_lab else lecture_rooms

                # Choose pattern based on units
                if units >= 3:
                    # 3+ units: MWF pattern (3 meetings per week, 1 hour each)
                    pattern_key = pattern_list[current_pattern_idx % len(pattern_list)]
                    days = patterns.get(pattern_key, ['MON', 'WED', 'FRI'])
                else:
                    # 2 units or less: TTH or MW pattern (2 meetings per week)
                    pattern_key = 'TTH' if current_pattern_idx % 2 == 0 else 'MW'
                    days = patterns[pattern_key]

                current_pattern_idx += 1

                # Find an available time slot
                slot_found = False
                for time_idx in range(len(time_blocks)):
                    adjusted_idx = (current_slot_idx + time_idx) % len(time_blocks)
                    time_slot = time_blocks[adjusted_idx]

                    # Skip lunch hour (12:00-13:00)
                    if time_slot[0] == '12:00':
                        continue

                    # Check if all days in pattern are available for this section
                    all_days_available = True
                    for day in days:
                        key = (section_id, day, time_slot[0])
                        if key in section_occupied:
                            all_days_available = False
                            break

                    if all_days_available:
                        # Find an available room
                        room_found = None
                        for room in available_rooms:
                            room_available = True
                            for day in days:
                                room_key = (day, time_slot[0], room)
                                if room_key in room_occupied:
                                    room_available = False
                                    break
                            if room_available:
                                room_found = room
                                break

                        if room_found:
                            # Create schedule slots for all days in pattern
                            for day in days:
                                ScheduleSlot.objects.create(
                                    section_subject=section_subject,
                                    day=day,
                                    start_time=time_slot[0],
                                    end_time=time_slot[1],
                                    room=room_found
                                )
                                created_count += 1

                                # Mark as occupied
                                section_occupied[(section_id, day, time_slot[0])] = True
                                room_occupied[(day, time_slot[0], room_found)] = True

                            slot_found = True
                            current_slot_idx = (adjusted_idx + 1) % len(time_blocks)
                            break

                if not slot_found:
                    # Fallback: Create a single slot on Saturday if no regular slot available
                    for time_idx, time_slot in enumerate(time_blocks[:10]):  # Morning/afternoon only
                        room = random.choice(available_rooms)
                        room_key = ('SAT', time_slot[0], room)
                        if room_key not in room_occupied:
                            ScheduleSlot.objects.create(
                                section_subject=section_subject,
                                day='SAT',
                                start_time=time_slot[0],
                                end_time=time_slot[1],
                                room=room
                            )
                            created_count += 1
                            room_occupied[room_key] = True
                            self.log(f'    [!] Fallback SAT schedule for {subject.code}')
                            break

        self.log(f'  Total schedule slots: {created_count}')

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
        """Seed grades for CLOSED semesters and test cases"""
        # First, seed BSIS test case grades
        self.seed_bsis_test_grades(semesters)

        # Then seed regular random grades for other students
        closed_semesters = semesters.filter(status='CLOSED')
        grades_list = ['1.0', '1.25', '1.5', '1.75', '2.0', '2.25', '2.5', '2.75', '3.0', 'INC', '5.0']
        grade_weights = [5, 10, 15, 15, 20, 15, 10, 5, 3, 1, 1]  # Distribution

        # Only create grades for past enrollments (skip BSIS test students)
        bsis_test_numbers = ['2025BSIS0001', '2024BSIS0002', '2024BSIS0003', '2023BSIS0004', '2023BSIS0005', '2022BSIS0006']

        for student in StudentProfile.objects.all():
            # Skip BSIS test students (already handled)
            if student.user.student_number in bsis_test_numbers:
                continue

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

    def seed_bsis_test_grades(self, semesters):
        """Seed specific test case grades for BSIS students"""
        from apps.enrollment.models import SubjectEnrollment

        self.log('  [BSIS Test Cases] Seeding specific grade scenarios...')

        # Get BSIS subjects
        bsis_subjects = {
            # Year 1, Sem 1
            'ENG101': Subject.objects.filter(code='ENG101').first(),
            'MATH101': Subject.objects.filter(code='MATH101').first(),
            'NSTP101': Subject.objects.filter(code='NSTP101').first(),
            'PE101': Subject.objects.filter(code='PE101').first(),
            'CS101': Subject.objects.filter(code='CS101').first(),
            'PROG101': Subject.objects.filter(code='PROG101').first(),
            # Year 1, Sem 2
            'ENG102': Subject.objects.filter(code='ENG102').first(),
            'MATH102': Subject.objects.filter(code='MATH102').first(),
            'NSTP102': Subject.objects.filter(code='NSTP102').first(),
            'PE102': Subject.objects.filter(code='PE102').first(),
            'PROG102': Subject.objects.filter(code='PROG102').first(),
            'WEBDEV101': Subject.objects.filter(code='WEBDEV101').first(),
            # Year 2, Sem 1
            'DATASTRUCT': Subject.objects.filter(code='DATASTRUCT').first(),
            'DATABASE101': Subject.objects.filter(code='DATABASE101').first(),
            'OOP101': Subject.objects.filter(code='OOP101').first(),
            'STATS101': Subject.objects.filter(code='STATS101').first(),
        }

        # Get past semesters for historical data
        past_semesters = list(semesters.filter(status='CLOSED').order_by('start_date'))

        # TEST CASE 1: 2024BSIS0002 - Has INC in PROG101 (prerequisite for many Y2 subjects)
        student_inc = User.objects.filter(student_number='2024BSIS0002').first()
        if student_inc:
            profile_inc = student_inc.student_profile
            self.log(f'    [Test Case] {student_inc.student_number} - INC in prerequisite PROG101')

            # Create Y1S1 grades (all passed except normal grades)
            if len(past_semesters) >= 2:
                self._create_test_grade(profile_inc, past_semesters[0], 'ENG101', '2.0', bsis_subjects)
                self._create_test_grade(profile_inc, past_semesters[0], 'MATH101', '2.25', bsis_subjects)
                self._create_test_grade(profile_inc, past_semesters[0], 'NSTP101', '1.75', bsis_subjects)
                self._create_test_grade(profile_inc, past_semesters[0], 'PE101', '1.5', bsis_subjects)
                self._create_test_grade(profile_inc, past_semesters[0], 'CS101', '2.0', bsis_subjects)
                self._create_test_grade(profile_inc, past_semesters[0], 'PROG101', 'INC', bsis_subjects, has_expiry=True)  # INC!

        # TEST CASE 2: 2024BSIS0003 - Completed all Y1 subjects (clean record)
        student_clean = User.objects.filter(student_number='2024BSIS0003').first()
        if student_clean:
            profile_clean = student_clean.student_profile
            self.log(f'    [Test Case] {student_clean.student_number} - All Y1 subjects passed')

            if len(past_semesters) >= 2:
                # Y1S1 - All passed with good grades
                self._create_test_grade(profile_clean, past_semesters[0], 'ENG101', '1.75', bsis_subjects)
                self._create_test_grade(profile_clean, past_semesters[0], 'MATH101', '2.0', bsis_subjects)
                self._create_test_grade(profile_clean, past_semesters[0], 'NSTP101', '1.5', bsis_subjects)
                self._create_test_grade(profile_clean, past_semesters[0], 'PE101', '1.25', bsis_subjects)
                self._create_test_grade(profile_clean, past_semesters[0], 'CS101', '1.75', bsis_subjects)
                self._create_test_grade(profile_clean, past_semesters[0], 'PROG101', '2.0', bsis_subjects)

                # Y1S2 - All passed
                self._create_test_grade(profile_clean, past_semesters[1], 'ENG102', '1.75', bsis_subjects)
                self._create_test_grade(profile_clean, past_semesters[1], 'MATH102', '2.0', bsis_subjects)
                self._create_test_grade(profile_clean, past_semesters[1], 'NSTP102', '1.5', bsis_subjects)
                self._create_test_grade(profile_clean, past_semesters[1], 'PE102', '1.5', bsis_subjects)
                self._create_test_grade(profile_clean, past_semesters[1], 'PROG102', '1.75', bsis_subjects)
                self._create_test_grade(profile_clean, past_semesters[1], 'WEBDEV101', '2.0', bsis_subjects)

        # TEST CASE 3: 2023BSIS0004 - Has retake (failed DATASTRUCT, then passed)
        student_retake = User.objects.filter(student_number='2023BSIS0004').first()
        if student_retake:
            profile_retake = student_retake.student_profile
            self.log(f'    [Test Case] {student_retake.student_number} - Failed DATASTRUCT (5.0), then passed (2.0)')

            if len(past_semesters) >= 3:
                # Y1 subjects all passed
                self._create_test_grade(profile_retake, past_semesters[0], 'PROG101', '2.0', bsis_subjects)
                self._create_test_grade(profile_retake, past_semesters[0], 'PROG102', '2.25', bsis_subjects)

                # Y2S1 - Failed DATASTRUCT first time
                self._create_test_grade(profile_retake, past_semesters[1], 'DATASTRUCT', '5.0', bsis_subjects)  # FAILED
                self._create_test_grade(profile_retake, past_semesters[1], 'DATABASE101', '2.0', bsis_subjects)
                self._create_test_grade(profile_retake, past_semesters[1], 'OOP101', '1.75', bsis_subjects)

                # Y2S1 (retake) - Passed DATASTRUCT on second attempt
                self._create_test_grade(profile_retake, past_semesters[2], 'DATASTRUCT', '2.0', bsis_subjects)  # PASSED on retake

        # TEST CASE 4: 2023BSIS0005 - Mixed grades (some passed, one INC, one failed)
        student_mixed = User.objects.filter(student_number='2023BSIS0005').first()
        if student_mixed:
            profile_mixed = student_mixed.student_profile
            self.log(f'    [Test Case] {student_mixed.student_number} - Mixed grades (passed, INC, failed)')

            if len(past_semesters) >= 2:
                # Y1 - Mix of grades
                self._create_test_grade(profile_mixed, past_semesters[0], 'ENG101', '1.5', bsis_subjects)  # Good
                self._create_test_grade(profile_mixed, past_semesters[0], 'MATH101', '3.0', bsis_subjects)  # Barely passed
                self._create_test_grade(profile_mixed, past_semesters[0], 'PROG101', 'INC', bsis_subjects, has_expiry=True)  # INC
                self._create_test_grade(profile_mixed, past_semesters[0], 'CS101', '5.0', bsis_subjects)  # FAILED

                # Y1S2 - Some passed
                self._create_test_grade(profile_mixed, past_semesters[1], 'PROG102', '2.5', bsis_subjects)
                self._create_test_grade(profile_mixed, past_semesters[1], 'WEBDEV101', '2.0', bsis_subjects)

        # TEST CASE 5: 2022BSIS0006 - Senior with most subjects completed
        student_senior = User.objects.filter(student_number='2022BSIS0006').first()
        if student_senior:
            profile_senior = student_senior.student_profile
            self.log(f'    [Test Case] {student_senior.student_number} - Senior with most subjects completed')

            # Give comprehensive passing grades for Y1, Y2, Y3 subjects
            if len(past_semesters) >= 3:
                # Y1 subjects
                for subj_code in ['ENG101', 'MATH101', 'NSTP101', 'PE101', 'CS101', 'PROG101']:
                    self._create_test_grade(profile_senior, past_semesters[0], subj_code, '1.75', bsis_subjects)

                # Y1S2 and Y2 subjects
                for subj_code in ['ENG102', 'PROG102', 'WEBDEV101', 'DATASTRUCT', 'DATABASE101', 'OOP101']:
                    self._create_test_grade(profile_senior, past_semesters[1], subj_code, '2.0', bsis_subjects)

        self.log(f'  [BSIS Test Cases] Completed seeding test grades')

    def _create_test_grade(self, student_profile, semester, subject_code, grade_value, subjects_dict, has_expiry=False):
        """Helper to create a test grade for a specific student"""
        from apps.enrollment.models import SubjectEnrollment

        subject = subjects_dict.get(subject_code)
        if not subject:
            return

        # Create or get enrollment for this student in this semester
        section = Section.objects.filter(
            semester=semester,
            program=student_profile.program,
            year_level=student_profile.year_level
        ).first()

        if not section:
            return

        enrollment, _ = Enrollment.objects.get_or_create(
            student=student_profile,
            semester=semester,
            section=section,
            defaults={'status': 'APPROVED', 'payment_approved': True, 'head_approved': True}
        )

        # Create subject enrollment
        section_subject, _ = SectionSubject.objects.get_or_create(
            section=section,
            subject=subject
        )

        enrollment_subject, _ = EnrollmentSubject.objects.get_or_create(
            enrollment=enrollment,
            section_subject=section_subject
        )

        # Create the grade
        expiry_date = None
        if has_expiry and grade_value == 'INC':
            expiry_date = semester.end_date + timedelta(days=365)

        SubjectEnrollment.objects.get_or_create(
            enrollment=enrollment,
            subject=subject,
            defaults={
                'grade': grade_value,
                'status': 'PASSED' if grade_value not in ['INC', '5.0'] else ('INC' if grade_value == 'INC' else 'FAILED'),
                'expiry_date': expiry_date
            }
        )

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
