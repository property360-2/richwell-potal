"""
Comprehensive realistic data seeder for Richwell Portal.
Strictly based on existing Django models - NO invented fields or models.

Creates:
- Programs
- Curricula with subjects
- Professors with qualified subjects
- Semesters
- Sections with schedules (with conflict validation)
- Students assigned to sections
- Student enrollments based on section schedules
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from datetime import date, datetime, timedelta, time
import random

from apps.accounts.models import User, StudentProfile, ProfessorProfile
from apps.academics.models import (
    Program, Subject, Section, ScheduleSlot, SectionSubject,
    Curriculum, CurriculumSubject, SectionSubjectProfessor
)
from apps.enrollment.models import (
    Semester, Enrollment, MonthlyPaymentBucket,
    PaymentTransaction, SubjectEnrollment
)


class ScheduleConflictValidator:
    """
    Validates schedule conflicts based on existing models.
    Prevents:
    - Same section + overlapping time
    - Same professor + overlapping time  
    - Same room + overlapping time
    """
    
    @staticmethod
    def time_overlaps(start1, end1, start2, end2):
        """Check if two time ranges overlap."""
        return start1 < end2 and end1 > start2
    
    @classmethod
    def validate_schedule(cls, section_subject, day, start_time, end_time, room, professor=None):
        """
        Validate a proposed schedule against existing schedules.
        Returns (is_valid, error_messages)
        """
        errors = []
        
        # Get all existing slots for this day
        existing_slots = ScheduleSlot.objects.filter(day=day)
        
        for slot in existing_slots:
            if not cls.time_overlaps(start_time, end_time, slot.start_time, slot.end_time):
                continue
                
            # Check section conflict
            if slot.section_subject.section_id == section_subject.section_id:
                errors.append(
                    f"Section {section_subject.section.name} already has {slot.section_subject.subject.code} "
                    f"on {day} at {slot.start_time}-{slot.end_time}"
                )
            
            # Check professor conflict
            if professor and slot.professor_id == professor.id:
                errors.append(
                    f"Professor {professor.get_full_name()} is already teaching "
                    f"{slot.section_subject.subject.code} on {day} at {slot.start_time}-{slot.end_time}"
                )
            
            # Check room conflict
            if room and slot.room == room:
                errors.append(
                    f"Room {room} is already occupied by {slot.section_subject.subject.code} "
                    f"on {day} at {slot.start_time}-{slot.end_time}"
                )
        
        return len(errors) == 0, errors


class Command(BaseCommand):
    help = 'Comprehensive data seeder - Model-driven with validation'

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('=' * 70))
        self.stdout.write(self.style.SUCCESS('  RICHWELL PORTAL - COMPREHENSIVE DATA SEEDER'))
        self.stdout.write(self.style.SUCCESS('=' * 70))

        # Step 1: Create Users
        self.stdout.write('\n[1/11] Creating Test Accounts...')
        users = self.create_users()

        # Step 2: Create Programs
        self.stdout.write('\n[2/11] Creating Academic Programs...')
        programs = self.create_programs()

        # Step 3: Create Semesters
        self.stdout.write('\n[3/11] Creating Semesters...')
        semesters = self.create_semesters()

        # Step 4: Create BSIS Curriculum
        self.stdout.write('\n[4/11] Creating BSIS Curriculum...')
        curriculum = self.create_bsis_curriculum(programs['BSIS'])

        # Step 5: Create BSIS Subjects
        self.stdout.write('\n[5/11] Creating BSIS Subjects...')
        subjects = self.create_bsis_subjects(programs['BSIS'], curriculum)

        # Step 6: Assign Subjects to Professors (Qualification)
        self.stdout.write('\n[6/11] Assigning Qualified Subjects to Professors...')
        self.assign_professor_qualifications(users['professors'], subjects)

        # Step 7: Create Sections for Current Semester
        self.stdout.write('\n[7/11] Creating Sections for Current Semester...')
        sections = self.create_sections(
            semesters['current'], 
            programs['BSIS'], 
            curriculum
        )

        # Step 8: Create Section Schedules with Validation
        self.stdout.write('\n[8/11] Creating Section Schedules (with conflict validation)...')
        self.create_section_schedules(
            sections, 
            subjects, 
            users['professors'],
            semesters['current']
        )

        # Step 9: Create Students and Assign to Sections
        self.stdout.write('\n[9/11] Creating Students and Assigning to Sections...')
        students = self.create_students(programs['BSIS'], curriculum, sections)

        # Step 10: Create Student Enrollments Based on Section Schedules
        self.stdout.write('\n[10/11] Creating Student Enrollments...')
        self.create_student_enrollments(students, semesters['current'])

        # Step 11: Summary
        self.stdout.write('\n[11/11] Summary')
        self.print_summary()

        self.stdout.write(self.style.SUCCESS('\n' + '=' * 70))
        self.stdout.write(self.style.SUCCESS('  DATA SEEDING COMPLETE!'))
        self.stdout.write(self.style.SUCCESS('=' * 70))

    def create_users(self):
        """Create all test accounts."""
        users = {'professors': [], 'students': []}

        # Admin
        admin, _ = User.objects.get_or_create(
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
        registrar, _ = User.objects.get_or_create(
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
        head, _ = User.objects.get_or_create(
            email='head@richwell.edu.ph',
            defaults={
                'username': 'head@richwell.edu.ph',
                'first_name': 'Department',
                'last_name': 'Head',
                'role': User.Role.DEPARTMENT_HEAD,
                'is_staff': True
            }
        )
        head.set_password('head123')
        head.save()
        self.stdout.write(f'  [+] Dept Head: head@richwell.edu.ph / head123')

        # Cashier
        cashier, _ = User.objects.get_or_create(
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
        self.stdout.write(f'  [+] Cashier: cashier@richwell.edu.ph / cashier123')

        # Professors with different specializations
        professors_data = [
            {'email': 'prof.santos@richwell.edu.ph', 'first': 'Juan', 'last': 'Santos', 'dept': 'BSIS', 'spec': 'Programming'},
            {'email': 'prof.garcia@richwell.edu.ph', 'first': 'Maria', 'last': 'Garcia', 'dept': 'BSIS', 'spec': 'Database Systems'},
            {'email': 'prof.reyes@richwell.edu.ph', 'first': 'Pedro', 'last': 'Reyes', 'dept': 'BSIS', 'spec': 'Information Systems'},
            {'email': 'prof.cruz@richwell.edu.ph', 'first': 'Ana', 'last': 'Cruz', 'dept': 'BSIS', 'spec': 'Networking'},
            {'email': 'prof.lopez@richwell.edu.ph', 'first': 'Carlos', 'last': 'Lopez', 'dept': 'BSIS', 'spec': 'Business Management'},
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
            
            # Create professor profile
            profile, _ = ProfessorProfile.objects.get_or_create(
                user=professor,
                defaults={
                    'department': prof_data['dept'],
                    'specialization': prof_data['spec'],
                    'max_teaching_hours': 24,
                    'is_active': True
                }
            )
            
            users['professors'].append(professor)
            self.stdout.write(f'  [+] Professor: {prof_data["email"]} / prof123 ({prof_data["spec"]})')

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
        """Create semesters."""
        semesters = {}

        # Previous Semester
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

        # Current Semester
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
        """Create all BSIS subjects."""
        
        # Year 1, Semester 1 subjects (7 subjects)
        bsis_subjects = [
            {"code": "CCP1101", "name": "Computer Programming 1", "units": 3, "year": 1, "semester": 1, "prerequisites": [], "is_major": True},
            {"code": "CIC1101", "name": "Introduction to Computing", "units": 3, "year": 1, "semester": 1, "prerequisites": [], "is_major": True},
            {"code": "CIS1101", "name": "Fundamentals of Information Systems", "units": 3, "year": 1, "semester": 1, "prerequisites": [], "is_major": True},
            {"code": "MLC1101", "name": "Literacy/Civic Welfare/Military Science 1", "units": 3, "year": 1, "semester": 1, "prerequisites": [], "is_major": False},
            {"code": "PPE1101", "name": "Physical Education 1", "units": 2, "year": 1, "semester": 1, "prerequisites": [], "is_major": False},
            {"code": "ZGE1102", "name": "The Contemporary World", "units": 3, "year": 1, "semester": 1, "prerequisites": [], "is_major": False},
            {"code": "ZGE1108", "name": "Understanding the Self", "units": 3, "year": 1, "semester": 1, "prerequisites": [], "is_major": False},
        ]

        subjects = {}

        # Create subjects
        for data in bsis_subjects:
            subject, created = Subject.objects.get_or_create(
                program=program,
                code=data['code'],
                defaults={
                    'title': data['name'],
                    'units': data['units'],
                    'is_major': data['is_major'],
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

        return subjects

    def assign_professor_qualifications(self, professors, subjects):
        """
        Assign subjects to professors based on their specialization.
        Uses ProfessorProfile.assigned_subjects (ManyToMany field).
        """
        # Map specializations to subject codes
        specialization_map = {
            'Programming': ['CCP1101', 'CIC1101'],
            'Database Systems': ['CIS1101'],
            'Information Systems': ['CIS1101', 'CIC1101'],
            'Networking': ['CIC1101'],
            'Business Management': ['MLC1101'],
        }
        
        for professor in professors:
            profile = professor.professor_profile
            spec = profile.specialization
            
            if spec in specialization_map:
                qualified_codes = specialization_map[spec]
                for code in qualified_codes:
                    if code in subjects:
                        profile.assigned_subjects.add(subjects[code])
                        self.stdout.write(f'  [+] {professor.get_full_name()} qualified for {code}')

    def create_sections(self, semester, program, curriculum):
        """Create sections for the semester."""
        sections = []
        
        # Create 2 sections for Year 1
        for section_letter in ['A', 'B']:
            section, created = Section.objects.get_or_create(
                semester=semester,
                name=f'BSIS-1{section_letter}',
                defaults={
                    'program': program,
                    'curriculum': curriculum,
                    'year_level': 1,
                    'capacity': 40,
                    'is_dissolved': False
                }
            )
            sections.append(section)
            status = '[+]' if created else '[o]'
            self.stdout.write(f'  {status} Section: {section.name}')
        
        return sections

    def create_section_schedules(self, sections, subjects, professors, semester):
        """
        Create schedules for sections with conflict validation.
        Only assigns professors to subjects they are qualified for.
        """
        days = ['MON', 'TUE', 'WED', 'THU', 'FRI']
        time_slots = [
            (time(7, 0), time(9, 0)),
            (time(9, 0), time(11, 0)),
            (time(11, 0), time(13, 0)),
            (time(13, 0), time(15, 0)),
            (time(15, 0), time(17, 0)),
        ]
        rooms = ['Room 101', 'Room 102', 'Room 103', 'Room 104', 'Room 105']
        
        validator = ScheduleConflictValidator()
        
        for section in sections:
            # Get subjects for this section's year/semester from curriculum
            curriculum_subjects = CurriculumSubject.objects.filter(
                curriculum=section.curriculum,
                year_level=section.year_level,
                semester_number=2  # Current semester is 2nd semester
            ).select_related('subject')
            
            day_idx = 0
            time_idx = 0
            room_idx = 0
            
            for curr_subject in curriculum_subjects:
                subject = curr_subject.subject
                
                # Find a qualified professor for this subject
                qualified_professors = professors
                for prof in qualified_professors:
                    if subject in prof.professor_profile.assigned_subjects.all():
                        assigned_professor = prof
                        break
                else:
                    # No qualified professor found, assign first professor
                    assigned_professor = professors[0]
                    self.stdout.write(
                        self.style.WARNING(
                            f'  [!] No qualified professor for {subject.code}, assigning {assigned_professor.get_full_name()}'
                        )
                    )
                
                # Create SectionSubject
                section_subject, ss_created = SectionSubject.objects.get_or_create(
                    section=section,
                    subject=subject,
                    defaults={
                        'professor': assigned_professor,
                        'is_tba': False
                    }
                )
                
                # Assign professor via junction table
                SectionSubjectProfessor.objects.get_or_create(
                    section_subject=section_subject,
                    professor=assigned_professor,
                    defaults={'is_primary': True}
                )
                
                # Try to create a schedule without conflicts
                max_attempts = 20
                for attempt in range(max_attempts):
                    day = days[day_idx % len(days)]
                    start_time, end_time = time_slots[time_idx % len(time_slots)]
                    room = rooms[room_idx % len(rooms)]
                    
                    # Validate schedule
                    is_valid, errors = validator.validate_schedule(
                        section_subject, day, start_time, end_time, room, assigned_professor
                    )
                    
                    if is_valid:
                        # Create schedule slot
                        schedule, sch_created = ScheduleSlot.objects.get_or_create(
                            section_subject=section_subject,
                            day=day,
                            defaults={
                                'start_time': start_time,
                                'end_time': end_time,
                                'room': room,
                                'professor': assigned_professor
                            }
                        )
                        
                        self.stdout.write(
                            f'  [+] {section.name} - {subject.code} ({day} {start_time}-{end_time}, {room}) - {assigned_professor.get_full_name()}'
                        )
                        break
                    else:
                        # Try next time slot/day/room
                        time_idx += 1
                        if time_idx % len(time_slots) == 0:
                            day_idx += 1
                        if day_idx % len(days) == 0:
                            room_idx += 1
                else:
                    self.stdout.write(
                        self.style.ERROR(
                            f'  [X] Could not schedule {section.name} - {subject.code} after {max_attempts} attempts'
                        )
                    )
                
                # Move to next slot for next subject
                time_idx += 1
                if time_idx % len(time_slots) == 0:
                    day_idx += 1

    def create_students(self, program, curriculum, sections):
        """Create students and assign them to sections."""
        students = []
        
        # Clear existing test students to avoid student_number conflicts
        User.objects.filter(email__icontains='student').filter(email__endswith='@richwell.edu.ph').delete()
        
        for i, section in enumerate(sections):
            # Create 5 students per section
            for j in range(5):
                student_num = f'2024-{(i * 5 + j + 1):05d}'
                email = f'student{i * 5 + j + 1}@richwell.edu.ph'
                
                # Try to find by student number first to be safe
                student = User.objects.filter(student_number=student_num).first()
                if not student:
                    student = User.objects.filter(email=email).first()

                if not student:
                    student = User.objects.create(
                        email=email,
                        username=email,
                        first_name=f'Student{i * 5 + j + 1}',
                        last_name='Test',
                        role=User.Role.STUDENT,
                        student_number=student_num,
                        is_staff=False
                    )
                    student.set_password('student123')
                    student.save()
                    status = '[+]'
                else:
                    # Update existing
                    student.email = email
                    student.username = email
                    student.role = User.Role.STUDENT
                    student.student_number = student_num
                    student.save()
                    status = '[o]'
                
                # Create/Update student profile with home_section
                profile, _ = StudentProfile.objects.get_or_create(
                    user=student,
                    defaults={
                        'program': program,
                        'curriculum': curriculum,
                        'year_level': 1,
                        'home_section': section,
                        'status': StudentProfile.Status.ACTIVE,
                        'academic_status': StudentProfile.AcademicStatus.REGULAR,
                        'birthdate': date(2005, 1, 1),
                        'address': '123 Test St, Manila',
                        'contact_number': '09171234567',
                        'is_transferee': False
                    }
                )
                
                # Ensure home section is correct
                if profile.home_section != section:
                    profile.home_section = section
                    profile.save()
                
                students.append(student)
                self.stdout.write(f'  {status} {student.get_full_name()} ({student_num}) -> {section.name}')
        
        return students

    def create_student_enrollments(self, students, semester):
        """
        Create student enrollments based on their home section's schedule.
        Students are enrolled in all subjects their section offers.
        """
        for student in students:
            profile = student.student_profile
            section = profile.home_section
            
            if not section:
                continue
            
            # Create enrollment record
            enrollment, created = Enrollment.objects.get_or_create(
                student=student,
                semester=semester,
                defaults={
                    'status': Enrollment.Status.ACTIVE,
                    'created_via': Enrollment.CreatedVia.MANUAL,
                    'monthly_commitment': Decimal('5000.00'),
                    'first_month_paid': True
                }
            )
            
            # Create payment buckets
            if created:
                for month in range(1, 7):
                    MonthlyPaymentBucket.objects.get_or_create(
                        enrollment=enrollment,
                        month_number=month,
                        defaults={
                            'required_amount': Decimal('5000.00'),
                            'paid_amount': Decimal('5000.00') if month == 1 else Decimal('0.00'),
                            'is_fully_paid': month == 1
                        }
                    )
            
            # Enroll in all subjects offered by the section
            section_subjects = SectionSubject.objects.filter(section=section)
            
            for section_subject in section_subjects:
                subject_enrollment, se_created = SubjectEnrollment.objects.get_or_create(
                    enrollment=enrollment,
                    subject=section_subject.subject,
                    defaults={
                        'section': section,
                        'enrollment_type': SubjectEnrollment.EnrollmentType.HOME,
                        'status': SubjectEnrollment.Status.ENROLLED,
                        'payment_approved': True,
                        'head_approved': True,
                        'registrar_approved': False,
                        'is_irregular': False,
                        'is_retake': False
                    }
                )
                
                if se_created:
                    self.stdout.write(
                        f'  [+] {student.get_full_name()} enrolled in {section_subject.subject.code}'
                    )

    def print_summary(self):
        """Print summary."""
        self.stdout.write('\n' + '=' * 70)
        self.stdout.write(self.style.SUCCESS('  SUMMARY'))
        self.stdout.write('=' * 70)
        self.stdout.write(f'  Programs: {Program.objects.count()}')
        self.stdout.write(f'  Curricula: {Curriculum.objects.count()}')
        self.stdout.write(f'  Subjects: {Subject.objects.count()}')
        self.stdout.write(f'  Professors: {User.objects.filter(role=User.Role.PROFESSOR).count()}')
        self.stdout.write(f'  Students: {User.objects.filter(role=User.Role.STUDENT).count()}')
        self.stdout.write(f'  Sections: {Section.objects.count()}')
        self.stdout.write(f'  Schedule Slots: {ScheduleSlot.objects.count()}')
        self.stdout.write(f'  Enrollments: {Enrollment.objects.count()}')
        self.stdout.write(f'  Subject Enrollments: {SubjectEnrollment.objects.count()}')
