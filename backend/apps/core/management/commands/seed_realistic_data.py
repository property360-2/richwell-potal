"""
Comprehensive realistic data seeder for Richwell Portal.
Creates BSIS curriculum with all subjects, multiple users, sections, and enrollments.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from decimal import Decimal
from datetime import date, datetime, timedelta
import random

from apps.accounts.models import User, StudentProfile
from apps.academics.models import (
    Program, Subject, Section, ScheduleSlot, SectionSubject,
    Curriculum, CurriculumVersion, CurriculumSubject, SectionSubjectProfessor
)
from apps.enrollment.models import (
    Semester, Enrollment, MonthlyPaymentBucket,
    PaymentTransaction, SubjectEnrollment
)


class Command(BaseCommand):
    help = 'Realistic data seeder - BSIS curriculum with comprehensive data'

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('=' * 70))
        self.stdout.write(self.style.SUCCESS('  RICHWELL PORTAL - REALISTIC DATA SEEDER'))
        self.stdout.write(self.style.SUCCESS('=' * 70))

        # Step 1: Create Users
        self.stdout.write('\n[1/10] Creating Test Accounts...')
        users = self.create_users()

        # Step 2: Create Programs
        self.stdout.write('\n[2/10] Creating Academic Programs...')
        programs = self.create_programs()

        # Step 3: Create Semesters
        self.stdout.write('\n[3/10] Creating Semesters...')
        semesters = self.create_semesters()

        # Step 4: Create BSIS Curriculum
        self.stdout.write('\n[4/10] Creating BSIS Curriculum...')
        curriculum = self.create_bsis_curriculum(programs['BSIS'])

        # Step 5: Create BSIS Subjects (from your data)
        self.stdout.write('\n[5/10] Creating BSIS Subjects...')
        subjects = self.create_bsis_subjects(programs['BSIS'], curriculum)

        # Step 6: Create Sections for Previous Semester
        self.stdout.write('\n[6/10] Creating Sections for Previous Semester...')
        prev_sections = self.create_sections(semesters['previous'], subjects, users['professors'], year_sem=1)

        # Step 7: Create Sections for Current Semester
        self.stdout.write('\n[7/10] Creating Sections for Current Semester...')
        curr_sections = self.create_sections(semesters['current'], subjects, users['professors'], year_sem=2)

        # Step 8: Create Student Profiles & Previous Enrollments
        self.stdout.write('\n[8/10] Creating Student Previous Enrollments...')
        self.create_previous_enrollment(users['students'][0], programs['BSIS'], semesters['previous'], subjects)

        # Step 9: Create Current Enrollments
        self.stdout.write('\n[9/10] Creating Student Current Enrollments...')
        self.create_current_enrollment(users['students'][0], programs['BSIS'], semesters['current'])

        # Step 10: Summary
        self.stdout.write('\n[10/10] Summary')
        self.print_summary()

        self.stdout.write(self.style.SUCCESS('\n' + '=' * 70))
        self.stdout.write(self.style.SUCCESS('  DATA SEEDING COMPLETE!'))
        self.stdout.write(self.style.SUCCESS('=' * 70))

    def create_users(self):
        """Create all test accounts."""
        users = {'professors': [], 'students': []}

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
        admin.set_password('admin123')
        admin.save()
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
        registrar.set_password('registrar123')
        registrar.save()
        self.stdout.write(f'  [+] Registrar: registrar@richwell.edu.ph / registrar123')

        # Department Head
        head, created = User.objects.get_or_create(
            email='jcentita@richwell.edu.ph',
            defaults={
                'username': 'jcentita@richwell.edu.ph',
                'first_name': 'Juan',
                'last_name': 'Centita',
                'role': User.Role.DEPARTMENT_HEAD,
                'is_staff': True
            }
        )
        head.set_password('head123')
        head.save()
        self.stdout.write(f'  [+] Dept Head: jcentita@richwell.edu.ph / head123')

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
        cashier.set_password('cashier123')
        cashier.save()
        users['cashier'] = cashier
        self.stdout.write(f'  [+] Cashier: cashier@richwell.edu.ph / cashier123')

        # Professors (Multiple)
        professors_data = [
            {'email': 'professor@richwell.edu.ph', 'first': 'Juan', 'last': 'Santos'},
            {'email': 'prof.maria@richwell.edu.ph', 'first': 'Maria', 'last': 'Garcia'},
            {'email': 'prof.pedro@richwell.edu.ph', 'first': 'Pedro', 'last': 'Reyes'},
        ]

        for prof_data in professors_data:
            professor, created = User.objects.get_or_create(
                email=prof_data['email'],
                defaults={
                    'username': prof_data['email'],
                    'first_name': prof_data['first'],
                    'last_name': prof_data['last'],
                    'role': User.Role.PROFESSOR,
                    'is_staff': False
                }
            )
            professor.set_password('prof123')
            professor.save()
            users['professors'].append(professor)
            self.stdout.write(f'  [+] Professor: {prof_data["email"]} / prof123')

        # Admission
        admission, created = User.objects.get_or_create(
            email='admission@richwell.edu.ph',
            defaults={
                'username': 'admission@richwell.edu.ph',
                'first_name': 'Admission',
                'last_name': 'Staff',
                'role': User.Role.ADMISSION_STAFF,
                'is_staff': True
            }
        )
        admission.set_password('admission123')
        admission.save()
        self.stdout.write(f'  [+] Admission: admission@richwell.edu.ph / admission123')

        # Students
        students_data = [
            {'email': 'student@richwell.edu.ph', 'num': '2024-00001', 'first': 'Maria', 'last': 'Dela Cruz'},
            {'email': 'student2@richwell.edu.ph', 'num': '2024-00002', 'first': 'Jose', 'last': 'Rizal'},
        ]

        for std_data in students_data:
            try:
                student = User.objects.get(email=std_data['email'])
            except User.DoesNotExist:
                student = User.objects.create(
                    email=std_data['email'],
                    username=std_data['email'],
                    first_name=std_data['first'],
                    last_name=std_data['last'],
                    role=User.Role.STUDENT,
                    student_number=std_data['num'],
                    is_staff=False
                )

            student.set_password('student123')
            student.save()
            users['students'].append(student)
            self.stdout.write(f'  [+] Student: {std_data["email"]} / student123')

        return users

    def create_programs(self):
        """Create academic programs."""
        programs_data = [
            {'code': 'BSIS', 'name': 'Bachelor of Science in Information Systems', 'duration_years': 4},
            {'code': 'BSIT', 'name': 'Bachelor of Science in Information Technology', 'duration_years': 4},
            {'code': 'BSCS', 'name': 'Bachelor of Science in Computer Science', 'duration_years': 4},
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

        # Previous Semester (1st Semester 2024-2025)
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
        self.stdout.write(f'  [+] {prev_sem.name} {prev_sem.academic_year} (Previous)')

        # Current Semester (2nd Semester 2024-2025)
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
        Semester.objects.exclude(id=curr_sem.id).update(is_current=False)
        self.stdout.write(f'  [+] {curr_sem.name} {curr_sem.academic_year} (Current)')

        return semesters

    def create_bsis_curriculum(self, program):
        """Create BSIS curriculum."""
        curriculum, created = Curriculum.objects.get_or_create(
            program=program,
            code='BSIS_UE_2019',
            defaults={
                'name': 'BSIS University of the East 2019',
                'description': 'BSIS curriculum based on UE 2019 version',
                'effective_year': 2019,
                'is_active': True
            }
        )

        status = '[+]' if created else '[o]'
        self.stdout.write(f'  {status} Curriculum: {curriculum.code}')
        return curriculum

    def create_bsis_subjects(self, program, curriculum):
        """Create all BSIS subjects from your provided data."""

        # Complete BSIS UE 2019 Curriculum (57 subjects)
        bsis_subjects = [
            # YEAR 1, SEMESTER 1 (7 subjects - 20 units)
            {"code": "CCP1101", "name": "Computer Programming 1", "units": 3, "year": 1, "semester": 1, "prerequisites": ["CIC1101"]},
            {"code": "CIC1101", "name": "Introduction to Computing", "units": 3, "year": 1, "semester": 1, "prerequisites": []},
            {"code": "CIS1101", "name": "Fundamentals of Information Systems", "units": 3, "year": 1, "semester": 1, "prerequisites": ["CIC1101"]},
            {"code": "MLC1101", "name": "Literacy/Civic Welfare/Military Science 1", "units": 3, "year": 1, "semester": 1, "prerequisites": []},
            {"code": "PPE1101", "name": "Physical Education 1", "units": 2, "year": 1, "semester": 1, "prerequisites": []},
            {"code": "ZGE1102", "name": "The Contemporary World", "units": 3, "year": 1, "semester": 1, "prerequisites": []},
            {"code": "ZGE1108", "name": "Understanding the Self", "units": 3, "year": 1, "semester": 1, "prerequisites": []},

            # YEAR 1, SEMESTER 2 (8 subjects - 23 units)
            {"code": "CCP1102", "name": "Computer Programming 2", "units": 3, "year": 1, "semester": 2, "prerequisites": ["CCP1101"]},
            {"code": "CDS1101", "name": "Data Structures and Algorithms", "units": 3, "year": 1, "semester": 2, "prerequisites": ["CCP1102"]},
            {"code": "CSP1101", "name": "Social and Professional Issues in Computing", "units": 3, "year": 1, "semester": 2, "prerequisites": []},
            {"code": "MLC1102", "name": "Literacy/Civic Welfare/Military Science 2", "units": 3, "year": 1, "semester": 2, "prerequisites": ["MLC1101"]},
            {"code": "PPE1102", "name": "Physical Education 2", "units": 2, "year": 1, "semester": 2, "prerequisites": ["PPE1101"]},
            {"code": "ZGE1101", "name": "Art Appreciation", "units": 3, "year": 1, "semester": 2, "prerequisites": []},
            {"code": "ZGE1104", "name": "Mathematics in the Modern World", "units": 3, "year": 1, "semester": 2, "prerequisites": []},
            {"code": "ZGE1106", "name": "Readings in Philippine History", "units": 3, "year": 1, "semester": 2, "prerequisites": []},

            # YEAR 2, SEMESTER 1 (7 subjects - 21 units)
            {"code": "CBM1101", "name": "Business Process Management", "units": 3, "year": 2, "semester": 1, "prerequisites": []},
            {"code": "CCP1103", "name": "Computer Programming 3", "units": 3, "year": 2, "semester": 1, "prerequisites": ["CCP1102"]},
            {"code": "CDM1101", "name": "Discrete Mathematics for ITE", "units": 3, "year": 2, "semester": 1, "prerequisites": ["ZGE1104"]},
            {"code": "CFD1101", "name": "Fundamentals of Database Systems", "units": 3, "year": 2, "semester": 1, "prerequisites": ["CCP1102"]},
            {"code": "CIS2101", "name": "Accounting for IS", "units": 3, "year": 2, "semester": 1, "prerequisites": []},
            {"code": "CIS2102", "name": "Enterprise Architecture", "units": 3, "year": 2, "semester": 1, "prerequisites": []},
            {"code": "CQM1101", "name": "Quantitative Methods (including Modeling and Simulation)", "units": 3, "year": 2, "semester": 1, "prerequisites": ["ZGE1104"]},

            # YEAR 2, SEMESTER 2 (8 subjects - 24 units)
            {"code": "CIM1101", "name": "Information Management", "units": 3, "year": 2, "semester": 2, "prerequisites": []},
            {"code": "CIP1101", "name": "Integrative Programming and Technologies 1", "units": 3, "year": 2, "semester": 2, "prerequisites": ["CCP1103"]},
            {"code": "CIS2201", "name": "Evaluation of Business Performance", "units": 3, "year": 2, "semester": 2, "prerequisites": []},
            {"code": "CSA1101", "name": "Systems Analysis, Design and Prototyping", "units": 3, "year": 2, "semester": 2, "prerequisites": ["CFD1101"]},
            {"code": "PPE1104", "name": "Physical Education 4", "units": 2, "year": 2, "semester": 2, "prerequisites": ["PPE1102"]},
            {"code": "ZGE1103", "name": "Ethics", "units": 3, "year": 2, "semester": 2, "prerequisites": []},
            {"code": "ZGE1105", "name": "Purposive Communication", "units": 3, "year": 2, "semester": 2, "prerequisites": []},
            {"code": "ZGE_EL01", "name": "GE Elective 1", "units": 3, "year": 2, "semester": 2, "prerequisites": []},

            # YEAR 3, SEMESTER 1 (8 subjects - 24 units)
            {"code": "CHC1101", "name": "Human Computer Interaction", "units": 3, "year": 3, "semester": 1, "prerequisites": ["CIM1101"]},
            {"code": "CIP1102", "name": "Integrative Programming and Technologies 2", "units": 3, "year": 3, "semester": 1, "prerequisites": ["CIP1101"]},
            {"code": "CIS3101", "name": "Financial Management", "units": 3, "year": 3, "semester": 1, "prerequisites": ["CIS2101"]},
            {"code": "CIS3102", "name": "IT Infrastructure and Network Technologies", "units": 3, "year": 3, "semester": 1, "prerequisites": ["CIM1101"]},
            {"code": "CIS3103", "name": "Management Information System", "units": 3, "year": 3, "semester": 1, "prerequisites": ["CIS2101"]},
            {"code": "CMR1101", "name": "Methods of Research for IT/IS", "units": 3, "year": 3, "semester": 1, "prerequisites": []},
            {"code": "ZGE1107", "name": "Science, Technology, and Society", "units": 3, "year": 3, "semester": 1, "prerequisites": []},
            {"code": "ZGE_EL02", "name": "GE Elective 2", "units": 3, "year": 3, "semester": 1, "prerequisites": []},

            # YEAR 3, SEMESTER 2 (7 subjects - 21 units)
            {"code": "CDE1101", "name": "Applications Development and Emerging Technologies", "units": 3, "year": 3, "semester": 2, "prerequisites": ["CIP1102"]},
            {"code": "CDT1101", "name": "Data Analytics", "units": 3, "year": 3, "semester": 2, "prerequisites": ["CFD1101"]},
            {"code": "CIS3201", "name": "IS Strategy Management and Acquisition", "units": 3, "year": 3, "semester": 2, "prerequisites": ["CIS3103"]},
            {"code": "CIS3202", "name": "Technopreneurship", "units": 3, "year": 3, "semester": 2, "prerequisites": []},
            {"code": "CIS_EL01", "name": "Professional Elective 1", "units": 3, "year": 3, "semester": 2, "prerequisites": []},
            {"code": "CPP4980", "name": "Capstone Project and Research 1", "units": 3, "year": 3, "semester": 2, "prerequisites": ["CMR1101"]},
            {"code": "ZGE1109", "name": "Life and Works of Rizal", "units": 3, "year": 3, "semester": 2, "prerequisites": []},

            # YEAR 3, SUMMER (3 subjects - 9 units)
            {"code": "CIS3001", "name": "Human Behavior in IS Organization", "units": 3, "year": 3, "semester": 3, "prerequisites": ["CIS3103"]},
            {"code": "CIS3002", "name": "Organization and Management Concepts", "units": 3, "year": 3, "semester": 3, "prerequisites": []},
            {"code": "CIS3003", "name": "Project Management", "units": 3, "year": 3, "semester": 3, "prerequisites": []},

            # YEAR 4, SEMESTER 1 (7 subjects - 21 units)
            {"code": "CIA1101", "name": "Information Assurance and Security 1", "units": 3, "year": 4, "semester": 1, "prerequisites": ["CIM1101"]},
            {"code": "CIS_EL02", "name": "Professional Elective 2", "units": 3, "year": 4, "semester": 1, "prerequisites": []},
            {"code": "CIS_EL03", "name": "Professional Elective 3", "units": 3, "year": 4, "semester": 1, "prerequisites": []},
            {"code": "CIS_EL04", "name": "Professional Elective 4", "units": 3, "year": 4, "semester": 1, "prerequisites": []},
            {"code": "CPD4990", "name": "Capstone Project and Research 2", "units": 3, "year": 4, "semester": 1, "prerequisites": ["CPP4980"]},
            {"code": "ZGE_EL03", "name": "GE Elective 3", "units": 3, "year": 4, "semester": 1, "prerequisites": []},
            {"code": "ZPD1102", "name": "Effective Communication with Personality Development", "units": 3, "year": 4, "semester": 1, "prerequisites": []},

            # YEAR 4, SEMESTER 2 (1 subject - 6 units)
            {"code": "CPR4970", "name": "Practicum for IT/IS", "units": 6, "year": 4, "semester": 2, "prerequisites": []},
        ]

        subjects = {}

        # First pass: Create all subjects
        for data in bsis_subjects:
            subject, created = Subject.objects.get_or_create(
                program=program,
                code=data['code'],
                defaults={
                    'title': data['name'],
                    'units': data['units'],
                    'is_major': not data['code'].startswith('ZGE') and not data['code'].startswith('PPE') and not data['code'].startswith('MLC'),
                    'year_level': data['year'],
                    'semester_number': data['semester']
                }
            )
            subjects[data['code']] = subject

            # Add to curriculum
            CurriculumSubject.objects.get_or_create(
                curriculum=curriculum,
                subject=subject,
                defaults={
                    'year_level': data['year'],
                    'semester_number': data['semester'],
                    'is_required': True
                }
            )

            status = '[+]' if created else '[o]'
            self.stdout.write(f'  {status} {data["code"]} - {data["name"]} (Y{data["year"]}S{data["semester"]})')

        # Second pass: Set up prerequisites
        self.stdout.write('\n  Setting up prerequisites...')
        for data in bsis_subjects:
            if data['prerequisites']:
                subject = subjects[data['code']]
                for prereq_code in data['prerequisites']:
                    if prereq_code in subjects:
                        subject.prerequisites.add(subjects[prereq_code])
                        self.stdout.write(f'    - {data["code"]} requires {prereq_code}')

        return subjects

    def create_sections(self, semester, subjects, professors, year_sem=1):
        """Create sections with schedules."""

        # Get subjects for the semester
        if year_sem == 1:
            # Year 1, Semester 1
            subject_codes = ['CIC1101', 'CCP1101', 'CIS1101', 'MLC1101', 'PPE1101', 'ZGE1102', 'ZGE1108']
        else:
            # Year 1, Semester 2
            subject_codes = ['CCP1102', 'CDS1101', 'CSP1101', 'MLC1102', 'PPE1102', 'ZGE1101', 'ZGE1104', 'ZGE1106']

        sections = []
        days = ['MON', 'TUE', 'WED', 'THU', 'FRI']
        times = [('07:00', '10:00'), ('10:00', '13:00'), ('13:00', '16:00')]

        for idx, subject_code in enumerate(subject_codes):
            if subject_code not in subjects:
                continue

            subject = subjects[subject_code]

            # Create section
            section, created = Section.objects.get_or_create(
                semester=semester,
                name=f'BSIS-1A',
                defaults={
                    'capacity': 40,
                    'year_level': 1,
                    'program': subject.program
                }
            )

            # Create SectionSubject link
            section_subject, ss_created = SectionSubject.objects.get_or_create(
                section=section,
                subject=subject
            )

            # Assign professor using junction table
            professor = professors[idx % len(professors)]
            SectionSubjectProfessor.objects.get_or_create(
                section_subject=section_subject,
                professor=professor,
                defaults={'is_primary': True}
            )

            # Create schedule slot
            day = days[idx % len(days)]
            start_time, end_time = times[idx % len(times)]

            schedule, sch_created = ScheduleSlot.objects.get_or_create(
                section_subject=section_subject,
                day=day,
                defaults={
                    'start_time': start_time,
                    'end_time': end_time,
                    'room': f'Room {201 + idx}'
                }
            )

            sections.append(section)
            status = '[+]' if created else '[o]'
            self.stdout.write(f'  {status} BSIS-1A - {subject.code} ({day} {start_time}-{end_time}) - {professor.get_full_name()}')

        return sections

    def create_previous_enrollment(self, student, program, semester, subjects):
        """Create student enrollment for previous semester with grades."""

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
        if profile.program != program:
            profile.program = program
            profile.save()

        # Create previous semester enrollment
        prev_enrollment, created = Enrollment.objects.get_or_create(
            student=student,
            semester=semester,
            defaults={
                'status': Enrollment.Status.ACTIVE,
                'monthly_commitment': Decimal('5000.00')
            }
        )

        # Create payment buckets (all paid)
        if created or MonthlyPaymentBucket.objects.filter(enrollment=prev_enrollment).count() == 0:
            for month in range(1, 7):
                MonthlyPaymentBucket.objects.get_or_create(
                    enrollment=prev_enrollment,
                    month_number=month,
                    defaults={
                        'required_amount': Decimal('5000.00'),
                        'paid_amount': Decimal('5000.00'),
                        'is_fully_paid': True
                    }
                )

        # Enroll in Year 1 Sem 1 subjects with passing grades
        sem1_subjects = ['CIC1101', 'CCP1101', 'CIS1101', 'MLC1101', 'PPE1101', 'ZGE1102', 'ZGE1108']
        grades = [1.75, 2.0, 1.5, 2.25, 1.0, 1.25, 2.0]

        self.stdout.write(f'\n  Enrolling {student.get_full_name()} in {len(sem1_subjects)} subjects:')

        for subject_code, grade in zip(sem1_subjects, grades):
            if subject_code not in subjects:
                continue

            subject = subjects[subject_code]
            section = Section.objects.filter(
                semester=semester,
                section_subjects__subject=subject
            ).first()

            if not section:
                continue

            SubjectEnrollment.objects.get_or_create(
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

            self.stdout.write(f'    [+] {subject_code}: {grade} (PASSED)')

    def create_current_enrollment(self, student, program, semester):
        """Create student enrollment for current semester (no payment yet)."""

        enrollment, created = Enrollment.objects.get_or_create(
            student=student,
            semester=semester,
            defaults={
                'status': Enrollment.Status.ACTIVE,
                'monthly_commitment': Decimal('5000.00')
            }
        )

        # Create 6 payment buckets - NO PAYMENT YET
        if created or MonthlyPaymentBucket.objects.filter(enrollment=enrollment).count() == 0:
            for month in range(1, 7):
                MonthlyPaymentBucket.objects.get_or_create(
                    enrollment=enrollment,
                    month_number=month,
                    defaults={
                        'required_amount': Decimal('5000.00'),
                        'paid_amount': Decimal('0.00'),
                        'is_fully_paid': False
                    }
                )
            self.stdout.write(f'  [+] Created 6 payment buckets (NOT PAID)')

    def print_summary(self):
        """Print summary."""
        self.stdout.write('\n' + '=' * 70)
        self.stdout.write(self.style.SUCCESS('  TEST ACCOUNTS'))
        self.stdout.write('=' * 70)
        self.stdout.write('  Admin:      admin@richwell.edu.ph / admin123')
        self.stdout.write('  Registrar:  registrar@richwell.edu.ph / registrar123')
        self.stdout.write('  Dept Head:  jcentita@richwell.edu.ph / head123')
        self.stdout.write('  Cashier:    cashier@richwell.edu.ph / cashier123')
        self.stdout.write('  Professor:  professor@richwell.edu.ph / prof123')
        self.stdout.write('  Student:    student@richwell.edu.ph / student123')
        self.stdout.write('  Admission:  admission@richwell.edu.ph / admission123')

        self.stdout.write('\n' + '=' * 70)
        self.stdout.write(self.style.SUCCESS('  TEST DATA'))
        self.stdout.write('=' * 70)
        self.stdout.write('  [+] BSIS Curriculum (UE 2019) created')
        self.stdout.write('  [+] 57 BSIS subjects created (All 4 years + Summer)')
        self.stdout.write('  [+] Student passed Year 1 Semester 1 (7 subjects)')
        self.stdout.write('  [+] Student enrolled in Year 1 Semester 2 (not paid)')
        self.stdout.write('  [+] Student can now enroll in Year 1 Sem 2 subjects')
