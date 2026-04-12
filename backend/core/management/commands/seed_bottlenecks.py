"""
seed_bottlenecks — Seeds students with approved advising but NO section assignments.
This is used specifically to test the Capacity Monitoring alerts and automated resolution.

Generates:
  - 15 Year 1 Students (FRESHMAN)
  - 20 Year 2 Students (CURRENT)
  - 30 Year 3 Students (CURRENT)
  - 25 Year 4 Students (CURRENT)
  - All students have advising_status='APPROVED' but no section assigned.

Usage:
    python manage.py seed_bottlenecks
"""
from datetime import date
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from core.management.commands._base_seeder import (
    create_staff_users,
    create_term,
    create_past_term,
    get_or_fail_program,
    get_or_fail_curriculum,
    get_subjects,
    generate_student,
    create_enrollment,
    create_grade_records,
    create_historical_passed_grades,
    update_system_sequence,
)

# counts per year level
BOTTLENECK_CONFIG = [
    # (year_level, student_type, count, id_start)
    (1, 'FRESHMAN', 15, 1001),
    (2, 'CURRENT',  20, 1016),
    (3, 'CURRENT',  30, 1036),
    (4, 'CURRENT',  25, 1066),
]

TOTAL_STUDENTS = sum(cfg[2] for cfg in BOTTLENECK_CONFIG)

class Command(BaseCommand):
    help = f'Seeds {TOTAL_STUDENTS} students with approved advising but no sections to test capacity monitoring.'

    def handle(self, *args, **options):
        self.stdout.write(f'Seeding {TOTAL_STUDENTS} students for capacity bottleneck testing...')

        with transaction.atomic():
            # Ensure prerequisites exist
            staff = create_staff_users(self.stdout)
            active_term = create_term(self.stdout)
            past_term = create_past_term(self.stdout)
            program = get_or_fail_program()
            curriculum = get_or_fail_curriculum(program)
            approver = staff.get('PROGRAM_HEAD') or staff.get('ADMIN')

            grand_total_students = 0
            
            for (year_level, student_type, count, id_start) in BOTTLENECK_CONFIG:
                self.stdout.write(f'  Creating {count} Year {year_level} students...')
                
                # Get subjects for the active term
                current_subjects = get_subjects(curriculum, year_level=year_level, semester='1')
                if not current_subjects:
                    self.stdout.write(self.style.WARNING(f'    Warning: No subjects found for Y{year_level}S1.'))
                    continue

                for offset in range(count):
                    idx = id_start + offset
                    dob = date(2005 - (year_level - 1), (idx % 12) + 1, (idx % 28) + 1)

                    # 1. Create Student
                    student = generate_student(
                        idx, program, curriculum,
                        student_type=student_type,
                        status='ENROLLED',
                        dob=dob,
                    )
                    
                    # 2. Unlock advising
                    student.is_advising_unlocked = True
                    student.save(update_fields=['is_advising_unlocked'])

                    # 3. Create Enrollment (APPROVED)
                    create_enrollment(
                        student, active_term, approver,
                        year_level=year_level,
                        advising_status='APPROVED',
                        monthly_commitment=Decimal('5000.00'),
                        is_regular=True,
                    )

                    # 4. Create current-term Grade records (APPROVED, section=None)
                    create_grade_records(
                        student, active_term, current_subjects,
                        grade_status='ENROLLED',
                        advising_status='APPROVED',
                        section=None  # Explicitly None to trigger bottleneck
                    )

                    # 5. Seed historical grades for Y2+
                    if year_level > 1:
                        create_historical_passed_grades(
                            student, past_term, curriculum,
                            up_to_year_level=year_level,
                        )
                    
                    grand_total_students += 1

            # Sync sequence to prevent ID conflicts with Registrar's manual student creation
            update_system_sequence('27', 1100) # High enough buffer

        self.stdout.write(self.style.SUCCESS(
            f'\nSuccessfully seeded {grand_total_students} students for bottleneck testing.\n'
            f'Range: IDN 271001 - 271090\n'
            f'Check the Registrar "Capacity Status" widget to verify deficits.'
        ))
