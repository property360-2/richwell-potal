"""
seed_advising — Seeds students through the full advising pipeline.
Students can log in, subjects approved, enrolled in sections.

Usage:
    python manage.py seed_advising
    python manage.py seed_advising --no-wipe
"""
from datetime import date
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.grades.models import Grade
from apps.students.models import StudentEnrollment

from core.management.commands._base_seeder import (
    wipe_all,
    create_staff_users,
    create_term,
    create_rooms,
    create_professors,
    create_sections,
    assign_students_to_sections,
    get_or_fail_program,
    get_or_fail_curriculum,
    get_subjects,
    generate_student,
    create_enrollment,
    create_grade_records,
    update_system_sequence,
)


class Command(BaseCommand):
    help = 'Seeds 150 students with approved advising, ready for manual sectioning.'

    def add_arguments(self, parser):
        parser.add_argument('--no-wipe', action='store_true', help='Skip wipe phase')

    def handle(self, *args, **options):
        if not options.get('no_wipe', False):
            wipe_all(self.stdout)

        with transaction.atomic():
            # Step 1: Create Staff Users (Dean, Registrar, Admin, etc.)
            staff = create_staff_users(self.stdout)

            # Step 2: Create Active Term (default 2026-1)
            active_term = create_term(self.stdout)

            # Step 3: Create Facilities/Rooms (Capacity set to 40)
            create_rooms(self.stdout)

            # Step 4: Get Program and Curriculum
            program = get_or_fail_program()
            curriculum = get_or_fail_curriculum(program)

            # Step 5: Assign Program Head to Program
            program_head = staff.get('PROGRAM_HEAD')
            if program_head:
                program.program_head = program_head
                program.save()

            # Step 6: Create Faculty Profiles & Availabilities
            create_professors(curriculum, self.stdout, with_availability=True)

            # Step 7: Get Subjects for Y1S1 (1st Year, 1st Sem)
            subjects = get_subjects(curriculum, year_level=1, semester='1')

            if not subjects:
                raise RuntimeError('No subjects found for Y1S1. Please upload curriculum CSV first.')

            approver = staff.get('PROGRAM_HEAD') or staff.get('ADMIN')

            # Step 8: Loop 150 times to generate Students
            self.stdout.write('  Creating 150 advised students...')
            students = []
            for idx in range(1, 151):
                dob = date(2005, (idx % 12) + 1, (idx % 28) + 1)
                stype = 'TRANSFEREE' if idx > 130 else 'FRESHMAN'

                # Step 8a: Generate Student User and Profile
                student = generate_student(
                    idx, program, curriculum,
                    student_type=stype,
                    status='ENROLLED',
                    dob=dob,
                    is_active_user=True,
                )

                # Step 8b: Setup Transferee special fields
                if stype == 'TRANSFEREE':
                    student.is_advising_unlocked = True
                    student.previous_school = f'Transfer School {idx}'
                    student.save()

                # Step 8c: Create Enrollment records (marked as APPROVED by Program Head)
                is_regular = stype == 'FRESHMAN'
                create_enrollment(
                    student, active_term, approver,
                    year_level=1,
                    advising_status='APPROVED',
                    monthly_commitment=Decimal('5000.00'),
                    is_regular=is_regular,
                )

                # Step 8d: Attach Grade records (ENROLLED status for active term subjects)
                create_grade_records(
                    student, active_term, subjects,
                    grade_status='ENROLLED',
                    advising_status='APPROVED',
                )

                students.append(student)

            # Step 9: Sync system sequences for unique IDs
            update_system_sequence('27', 150)

        self.stdout.write(self.style.SUCCESS(
            '\nSeed completed: 150 students enrolled with approved advising.\n'
            'NO sections were generated. You can now do it manually in the UI.\n'
            'Students can log in with: username={idn}, password={idn}{MMDD}'
        ))
