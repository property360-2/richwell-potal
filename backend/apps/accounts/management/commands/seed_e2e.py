from datetime import date
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model

from apps.accounts.models import User
from apps.academics.models import CurriculumVersion, Program, Subject
from apps.grades.models import Grade
from apps.students.models import Student, StudentEnrollment
from apps.terms.models import Term
from apps.sections.models import Section, SectionStudent
from apps.scheduling.models import Schedule
from apps.faculty.models import Professor, ProfessorSubject

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds a clean environment with stable E2E personas for Playwright testing.'

    def handle(self, *args, **options):
        self.stdout.write('GLOBAL PURGING and Seeding E2E personas...')
        
        # Deactivate all other terms to ensure E2E-TERM is the ONLY active one
        Term.objects.all().update(is_active=False)
        
        # Cleanup existing E2E data
        Grade.objects.filter(term__code='E2E-TERM').delete()
        SectionStudent.objects.filter(section__term__code='E2E-TERM').delete()
        Schedule.objects.filter(term__code='E2E-TERM').delete()
        Section.objects.filter(term__code='E2E-TERM').delete()
        StudentEnrollment.objects.filter(term__code='E2E-TERM').delete()
        Term.objects.filter(code='E2E-TERM').delete()
        
        default_pass = 'password123'

        # 1. Ensure Term exists
        term, _ = Term.objects.get_or_create(
            code='E2E-TERM',
            defaults={
                'academic_year': '2026-2027',
                'semester_type': '1',
                'start_date': date(2026, 1, 1),
                'end_date': date(2026, 12, 31),
                'enrollment_start': date(2026, 1, 1),
                'enrollment_end': date(2026, 12, 31),
                'advising_start': date(2026, 1, 1),
                'advising_end': date(2026, 12, 31),
                'is_active': True,
                'midterm_grade_start': date(2026, 1, 1),
                'midterm_grade_end': date(2026, 12, 31),
                'final_grade_start': date(2026, 1, 1),
                'final_grade_end': date(2026, 12, 31),
            }
        )
        term.is_active = True
        term.save()

        # 2. Setup Program and Curriculum
        program, _ = Program.objects.get_or_create(
            code='E2E_PROG',
            defaults={'name': 'E2E Testing Program'}
        )
        cv, _ = CurriculumVersion.objects.get_or_create(
            program=program,
            version_name='E2E-V1',
            defaults={'is_active': True}
        )

        # 3. Create a Subject
        subject, _ = Subject.objects.get_or_create(
            curriculum=cv,
            code='E2E101',
            defaults={
                'description': 'End-to-End Testing Basics',
                'year_level': 1,
                'semester': '1',
                'total_units': 3
            }
        )

        # 4. Create Section
        section, _ = Section.objects.get_or_create(
            name='E2E-SEC1',
            term=term,
            program=program,
            year_level=1,
            defaults={'section_number': 1, 'session': 'AM'}
        )

        # 5. Create Personas
        def create_user(username, role, first_name, last_name):
            user, created = User.objects.update_or_create(
                username=username,
                defaults={
                    'email': f'{username}@test.com', 
                    'role': role, 
                    'first_name': first_name, 
                    'last_name': last_name,
                    'is_active': True
                }
            )
            user.set_password(default_pass)
            user.save()
            self.stdout.write(f'  - User {username} ({role}) {"created" if created else "updated"} with password {default_pass}')
            return user

        reg_user = create_user('registrar_e2e', User.RoleChoices.REGISTRAR, 'E2E', 'Registrar')
        ph_user = create_user('program_head_e2e', User.RoleChoices.PROGRAM_HEAD, 'E2E', 'Program Head')
        prof_user = create_user('professor_e2e', User.RoleChoices.PROFESSOR, 'E2E', 'Professor')
        stud_user = create_user('student_e2e', User.RoleChoices.STUDENT, 'E2E', 'Student')
        enrollee_user = create_user('enrollee_e2e', User.RoleChoices.STUDENT, 'E2E', 'Enrollee')

        # Link PH
        program.program_head = ph_user
        program.save()

        # Professor Profile
        prof_profile, _ = Professor.objects.update_or_create(
            user=prof_user,
            defaults={'employee_id': 'E2E-PROF-001', 'date_of_birth': date(1980, 1, 1), 'department': 'E2E Dept'}
        )
        ProfessorSubject.objects.get_or_create(professor=prof_profile, subject=subject)
        
        # Schedule
        Schedule.objects.get_or_create(
            term=term, section=section, subject=subject,
            defaults={'professor': prof_profile, 'component_type': 'LEC', 'days': ["M", "W"], 'start_time': "08:00", 'end_time': "09:30"}
        )

        # Student Profile (Enrolled)
        student, _ = Student.objects.update_or_create(
            user=stud_user,
            defaults={'idn': 'E2E-1001', 'program': program, 'curriculum': cv, 'date_of_birth': date(2005, 1, 1), 'gender': 'MALE', 'status': 'ENROLLED', 'is_advising_unlocked': True}
        )
        SectionStudent.objects.update_or_create(section=section, student=student)
        StudentEnrollment.objects.get_or_create(student=student, term=term, defaults={'year_level': 1, 'is_regular': True, 'advising_status': 'APPROVED'})
        Grade.objects.get_or_create(student=student, subject=subject, term=term, defaults={'grade_status': 'ENROLLED', 'advising_status': 'APPROVED', 'section': section})

        # Enrollee Student Profile
        enrollee, _ = Student.objects.update_or_create(
            user=enrollee_user,
            defaults={
                'idn': 'E2E-2002', 'program': program, 'curriculum': cv, 'date_of_birth': date(2006, 1, 1), 'gender': 'FEMALE', 'status': 'APPROVED',
                'student_type': 'FRESHMAN',
                'is_advising_unlocked': False,
                'document_checklist': {
                    'Form 138': {'submitted': True, 'verified': False},
                    'Good Moral': {'submitted': True, 'verified': False},
                    'PSA Birth Certificate': {'submitted': True, 'verified': False}
                }
            }
        )
        StudentEnrollment.objects.get_or_create(student=enrollee, term=term, defaults={'year_level': 1, 'is_regular': True, 'advising_status': 'DRAFT'})

        self.stdout.write(self.style.SUCCESS('E2E Infrastructure Globally Purged and re-seeded successfully.'))
