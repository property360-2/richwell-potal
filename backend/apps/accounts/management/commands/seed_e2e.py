from datetime import date
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from apps.accounts.models import User
from apps.academics.models import CurriculumVersion, Program, Subject
from apps.grades.models import Grade
from apps.students.models import Student, StudentEnrollment
from apps.terms.models import Term
from apps.sections.models import Section, SectionStudent
from apps.scheduling.models import Schedule
from apps.faculty.models import Professor, ProfessorSubject
from apps.finance.models import Payment

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds a clean environment with stable E2E personas for Playwright testing.'

    def handle(self, *args, **options):
        self.stdout.write('GLOBAL PURGING and Seeding E2E personas...')
        
        Term.objects.all().update(is_active=False)
        
        e2e_term_codes = ['E2E-TERM', 'E2E-LOCKED']
        Grade.objects.filter(term__code__in=e2e_term_codes).delete()
        Payment.objects.filter(term__code__in=e2e_term_codes).delete()
        SectionStudent.objects.filter(section__term__code__in=e2e_term_codes).delete()
        Schedule.objects.filter(term__code__in=e2e_term_codes).delete()
        Section.objects.filter(term__code__in=e2e_term_codes).delete()
        StudentEnrollment.objects.filter(term__code__in=e2e_term_codes).delete()
        Term.objects.filter(code__in=e2e_term_codes).delete()
        
        default_pass = 'password123'

        # 1. Ensure terms exist
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
                'schedule_picking_start': date(2026, 1, 1),
                'schedule_picking_end': date(2026, 12, 31),
                'schedule_published': True,
                'is_active': True,
                'midterm_grade_start': date(2026, 1, 1),
                'midterm_grade_end': date(2026, 12, 31),
                'final_grade_start': date(2026, 1, 1),
                'final_grade_end': date(2026, 12, 31),
            }
        )
        term.is_active = True
        term.save()

        locked_term, _ = Term.objects.get_or_create(
            code='E2E-LOCKED',
            defaults={
                'academic_year': '2026-2027',
                'semester_type': '2',
                'start_date': date(2026, 6, 1),
                'end_date': date(2026, 12, 31),
                'enrollment_start': date(2026, 6, 1),
                'enrollment_end': date(2026, 12, 31),
                'advising_start': date(2026, 6, 1),
                'advising_end': date(2026, 12, 31),
                'schedule_picking_start': date(2026, 6, 1),
                'schedule_picking_end': date(2026, 12, 31),
                'schedule_published': False,
                'is_active': False,
                'midterm_grade_start': date(2026, 6, 1),
                'midterm_grade_end': date(2026, 12, 31),
                'final_grade_start': date(2026, 6, 1),
                'final_grade_end': date(2026, 12, 31),
            }
        )

        # 2. Setup programs and curriculums
        program, _ = Program.objects.get_or_create(
            code='E2E_PROG',
            defaults={'name': 'E2E Testing Program'}
        )
        foreign_program, _ = Program.objects.get_or_create(
            code='E2E_FOR',
            defaults={'name': 'Foreign E2E Program'}
        )
        cv, _ = CurriculumVersion.objects.get_or_create(
            program=program,
            version_name='E2E-V1',
            defaults={'is_active': True}
        )
        foreign_cv, _ = CurriculumVersion.objects.get_or_create(
            program=foreign_program,
            version_name='E2E-V2',
            defaults={'is_active': True}
        )

        # 3. Create subjects
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
        irregular_subject_one, _ = Subject.objects.get_or_create(
            curriculum=cv,
            code='E2E201',
            defaults={
                'description': 'Conflict Testing I',
                'year_level': 1,
                'semester': '1',
                'total_units': 3
            }
        )
        irregular_subject_two, _ = Subject.objects.get_or_create(
            curriculum=cv,
            code='E2E202',
            defaults={
                'description': 'Conflict Testing II',
                'year_level': 1,
                'semester': '1',
                'total_units': 3
            }
        )
        foreign_subject, _ = Subject.objects.get_or_create(
            curriculum=foreign_cv,
            code='E2E301',
            defaults={
                'description': 'Foreign Program Subject',
                'year_level': 1,
                'semester': '1',
                'total_units': 3
            }
        )

        # 4. Create sections
        section, _ = Section.objects.get_or_create(
            name='E2E-SEC1',
            term=term,
            program=program,
            year_level=1,
            defaults={'section_number': 1, 'session': 'AM'}
        )
        irregular_section_one, _ = Section.objects.get_or_create(
            name='E2E-IRR1',
            term=term,
            program=program,
            year_level=1,
            defaults={'section_number': 2, 'session': 'AM'}
        )
        irregular_section_two, _ = Section.objects.get_or_create(
            name='E2E-IRR2',
            term=term,
            program=program,
            year_level=1,
            defaults={'section_number': 3, 'session': 'AM'}
        )
        foreign_section, _ = Section.objects.get_or_create(
            name='E2E-FSEC1',
            term=term,
            program=foreign_program,
            year_level=1,
            defaults={'section_number': 1, 'session': 'AM'}
        )
        locked_section, _ = Section.objects.get_or_create(
            name='E2E-LOCK1',
            term=locked_term,
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

        create_user('admin', User.RoleChoices.ADMIN, 'System', 'Admin')
        reg_user = create_user('registrar_e2e', User.RoleChoices.REGISTRAR, 'E2E', 'Registrar')
        ph_user = create_user('program_head_e2e', User.RoleChoices.PROGRAM_HEAD, 'E2E', 'Program Head')
        foreign_ph_user = create_user('program_head_foreign_e2e', User.RoleChoices.PROGRAM_HEAD, 'Foreign', 'Program Head')
        prof_user = create_user('professor_e2e', User.RoleChoices.PROFESSOR, 'E2E', 'Professor')
        foreign_prof_user = create_user('professor_foreign_e2e', User.RoleChoices.PROFESSOR, 'Foreign', 'Professor')
        stud_user = create_user('student_e2e', User.RoleChoices.STUDENT, 'E2E', 'Student')
        enrollee_user = create_user('enrollee_e2e', User.RoleChoices.STUDENT, 'E2E', 'Enrollee')
        irregular_user = create_user('irregular_e2e', User.RoleChoices.STUDENT, 'Iris', 'Regular')
        blocked_user = create_user('blocked_student_e2e', User.RoleChoices.STUDENT, 'Blocked', 'Student')
        foreign_student_user = create_user('foreign_enrollee_e2e', User.RoleChoices.STUDENT, 'Foreign', 'Enrollee')
        create_user('cashier_e2e', User.RoleChoices.CASHIER, 'Casey', 'Cashier')

        # Link PH
        program.program_head = ph_user
        program.save()
        foreign_program.program_head = foreign_ph_user
        foreign_program.save()

        # Professor Profile
        prof_profile, _ = Professor.objects.update_or_create(
            user=prof_user,
            defaults={'employee_id': 'E2E-PROF-001', 'date_of_birth': date(1980, 1, 1), 'department': 'E2E Dept'}
        )
        ProfessorSubject.objects.get_or_create(professor=prof_profile, subject=subject)
        ProfessorSubject.objects.get_or_create(professor=prof_profile, subject=irregular_subject_one)
        ProfessorSubject.objects.get_or_create(professor=prof_profile, subject=irregular_subject_two)
        foreign_prof_profile, _ = Professor.objects.update_or_create(
            user=foreign_prof_user,
            defaults={'employee_id': 'E2E-PROF-002', 'date_of_birth': date(1981, 2, 2), 'department': 'Foreign Dept'}
        )
        ProfessorSubject.objects.get_or_create(professor=foreign_prof_profile, subject=foreign_subject)
        
        # Schedules
        Schedule.objects.get_or_create(
            term=term, section=section, subject=subject,
            defaults={'professor': prof_profile, 'component_type': 'LEC', 'days': ["M", "W"], 'start_time': "08:00", 'end_time': "09:30"}
        )
        Schedule.objects.get_or_create(
            term=term, section=irregular_section_one, subject=irregular_subject_one,
            defaults={'professor': prof_profile, 'component_type': 'LEC', 'days': ["M"], 'start_time': "08:00", 'end_time': "09:30"}
        )
        Schedule.objects.get_or_create(
            term=term, section=irregular_section_two, subject=irregular_subject_two,
            defaults={'professor': prof_profile, 'component_type': 'LEC', 'days': ["M"], 'start_time': "09:00", 'end_time': "10:30"}
        )
        Schedule.objects.get_or_create(
            term=term, section=foreign_section, subject=foreign_subject,
            defaults={'professor': foreign_prof_profile, 'component_type': 'LEC', 'days': ["T", "TH"], 'start_time': "08:00", 'end_time': "09:30"}
        )
        Schedule.objects.get_or_create(
            term=locked_term, section=locked_section, subject=subject,
            defaults={'professor': prof_profile, 'component_type': 'LEC', 'days': ["W"], 'start_time': "10:00", 'end_time': "11:30"}
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

        irregular_student, _ = Student.objects.update_or_create(
            user=irregular_user,
            defaults={
                'idn': 'E2E-3003', 'program': program, 'curriculum': cv, 'date_of_birth': date(2004, 3, 3),
                'gender': 'FEMALE', 'status': 'ENROLLED', 'student_type': 'CURRENT', 'is_advising_unlocked': True
            }
        )
        StudentEnrollment.objects.update_or_create(
            student=irregular_student,
            term=term,
            defaults={'year_level': 1, 'is_regular': False, 'advising_status': 'APPROVED'}
        )
        Grade.objects.update_or_create(
            student=irregular_student,
            subject=irregular_subject_one,
            term=term,
            defaults={'grade_status': 'ENROLLED', 'advising_status': 'APPROVED'}
        )
        Grade.objects.update_or_create(
            student=irregular_student,
            subject=irregular_subject_two,
            term=term,
            defaults={'grade_status': 'ENROLLED', 'advising_status': 'APPROVED'}
        )

        blocked_student, _ = Student.objects.update_or_create(
            user=blocked_user,
            defaults={
                'idn': 'E2E-4004', 'program': program, 'curriculum': cv, 'date_of_birth': date(2005, 4, 4),
                'gender': 'MALE', 'status': 'ENROLLED', 'student_type': 'CURRENT', 'is_advising_unlocked': True
            }
        )
        StudentEnrollment.objects.update_or_create(
            student=blocked_student,
            term=locked_term,
            defaults={'year_level': 1, 'is_regular': True, 'advising_status': 'APPROVED'}
        )
        Grade.objects.update_or_create(
            student=blocked_student,
            subject=subject,
            term=locked_term,
            defaults={'grade_status': 'ENROLLED', 'advising_status': 'APPROVED'}
        )

        foreign_student, _ = Student.objects.update_or_create(
            user=foreign_student_user,
            defaults={
                'idn': 'E2E-5005', 'program': foreign_program, 'curriculum': foreign_cv, 'date_of_birth': date(2006, 5, 5),
                'gender': 'FEMALE', 'status': 'APPROVED', 'student_type': 'FRESHMAN', 'is_advising_unlocked': True
            }
        )
        StudentEnrollment.objects.update_or_create(
            student=foreign_student,
            term=term,
            defaults={'year_level': 1, 'is_regular': True, 'advising_status': 'PENDING'}
        )
        Grade.objects.update_or_create(
            student=foreign_student,
            subject=foreign_subject,
            term=term,
            defaults={'grade_status': 'ENROLLED', 'advising_status': 'APPROVED', 'section': foreign_section}
        )

        self.stdout.write(self.style.SUCCESS('E2E Infrastructure Globally Purged and re-seeded successfully.'))
