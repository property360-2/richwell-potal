"""
seed_grade_submission — Professors see sections with students needing grades.
Professors can log in and submit midterm/final grades.

Usage:
    python manage.py seed_grade_submission
    python manage.py seed_grade_submission --no-wipe
"""
from datetime import date
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from core.management.commands._base_seeder import (
    wipe_all,
    create_staff_users,
    create_term,
    create_rooms,
    create_professors,
    create_sections,
    assign_students_to_sections,
    assign_schedules,
    get_or_fail_program,
    get_or_fail_curriculum,
    get_subjects,
    generate_student,
    create_enrollment,
    create_grade_records,
    update_system_sequence,
)


class Command(BaseCommand):
    help = (
        'Seeds sections with enrolled students, schedules assigned to professors. '
        'Professors can log in and submit grades.'
    )

    def add_arguments(self, parser):
        parser.add_argument('--no-wipe', action='store_true', help='Skip wipe phase')

    def handle(self, *args, **options):
        if not options.get('no_wipe', False):
            wipe_all(self.stdout)

        with transaction.atomic():
            staff = create_staff_users(self.stdout)
            active_term = create_term(self.stdout)
            rooms = create_rooms(self.stdout)

            program = get_or_fail_program()
            curriculum = get_or_fail_curriculum(program)

            # Assign program head
            program_head = staff.get('PROGRAM_HEAD')
            if program_head:
                program.program_head = program_head
                program.save()

            # Mark schedule as published so students can see it
            active_term.schedule_published = True
            active_term.save()

            professors = create_professors(curriculum, self.stdout, with_availability=True)
            subjects = get_subjects(curriculum, year_level=1, semester='1')

            if not subjects:
                raise RuntimeError('No subjects found for Y1S1. Please upload curriculum CSV first.')

            approver = staff.get('PROGRAM_HEAD') or staff.get('ADMIN')

            # Create 4 sections (2 AM, 2 PM) for 40 students
            sections = create_sections(
                active_term, program, year_level=1,
                num_students=40, subjects=subjects, stdout=self.stdout,
            )

            # Assign professors, rooms, and times to schedule slots
            assign_schedules(sections, professors, rooms, self.stdout)

            # Create 40 enrolled students assigned to sections
            # Grade status: ENROLLED, no midterm/final grades yet
            self.stdout.write('  Creating 40 enrolled students (no grades submitted)...')
            students = []
            for idx in range(1, 41):
                dob = date(2005, (idx % 12) + 1, (idx % 28) + 1)
                student = generate_student(
                    idx, program, curriculum,
                    student_type='FRESHMAN',
                    status='APPROVED',
                    dob=dob,
                    is_active_user=True,
                )

                create_enrollment(
                    student, active_term, approver,
                    year_level=1,
                    advising_status='APPROVED',
                    monthly_commitment=Decimal('5000.00'),
                )

                # Create grade records — ENROLLED, section will be assigned below
                create_grade_records(
                    student, active_term, subjects,
                    grade_status='ENROLLED',
                    advising_status='APPROVED',
                )

                students.append(student)

            # Assign students to sections (updates Grade.section)
            assign_students_to_sections(students, sections, active_term, self.stdout)

            update_system_sequence('27', 40)

        # Print login info for professors
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('Seed completed: 40 students in 4 sections, ready for grading.'))
        self.stdout.write('')
        self.stdout.write('  Professor logins:')
        self.stdout.write('    prof1 / EMP0010101   (Prof One)')
        self.stdout.write('    prof2 / EMP0020515   (Prof Two)')
        self.stdout.write('    prof3 / EMP0031020   (Prof Three)')
        self.stdout.write('')
        self.stdout.write('  Staff logins (password: password123):')
        self.stdout.write('    admin, headreg, registrar, admission, cashier, dean, programhead')
