"""
seed_advising — Seeds 280 students across 4 year levels for manual sectioning testing.

Generates:
  - 280 Students  (70 per year level, Y1–Y4, advising APPROVED, is_advising_unlocked=True)
  - 16 Professors (4 dedicated per year level, assigned to correct semester subjects)
  - 20 Rooms      (lecture, computer lab, science lab, multi-purpose)
  - 1 Active Term (2026-1, 1st Semester)
  - 1 Past Term   (2025-2, used for historical grade records of Y2–Y4 students)
  - Standard Staff Users (admin, registrar, cashier, dean, programhead, etc.)

Year 1  → FRESHMAN type, no historical grades (starting fresh)
Year 2  → CURRENT type, historical PASSED grades from Y1 (both sems)
Year 3  → CURRENT type, historical PASSED grades from Y1–Y2 (all 4 sems)
Year 4  → CURRENT type, historical PASSED grades from Y1–Y3 (all 6 sems)

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
    create_past_term,
    create_rooms,
    create_professors,
    assign_students_to_sections,
    get_or_fail_program,
    get_or_fail_curriculum,
    get_subjects,
    generate_student,
    create_enrollment,
    create_grade_records,
    create_historical_passed_grades,
    update_system_sequence,
)

# ---------------------------------------------------------------------------
# Year-level configuration table
# Each entry: (year_level, student_type, count, id_offset, is_regular)
# id_offset: starting IDN index so each year level has a unique ID range
# ---------------------------------------------------------------------------
YEAR_LEVEL_CONFIG = [
    # (year_level, student_type, count,  id_start, is_regular)
    (1, 'FRESHMAN', 70,  1,    True),
    (2, 'CURRENT',  70,  71,   True),
    (3, 'CURRENT',  70,  141,  True),
    (4, 'CURRENT',  70,  211,  True),
]

TOTAL_STUDENTS = sum(cfg[2] for cfg in YEAR_LEVEL_CONFIG)


class Command(BaseCommand):
    """
    Seeds 280 students (70 per year level, Y1–Y4) with approved advising.
    All students have is_advising_unlocked=True so section generation can be tested
    immediately without waiting for Registrar approval.

    CURRENT students (Y2–Y4) come with historical PASSED grades to simulate
    a realistic academic history database.
    """

    help = (
        f'Seeds {TOTAL_STUDENTS} students across 4 year levels with approved advising, '
        '16 professors, and 20 rooms. Ready for manual Section Generation testing.'
    )

    def add_arguments(self, parser):
        parser.add_argument('--no-wipe', action='store_true', help='Skip wipe phase')

    def handle(self, *args, **options):
        if not options.get('no_wipe', False):
            wipe_all(self.stdout)

        with transaction.atomic():
            # ── Step 1: Staff Users ────────────────────────────────────────
            staff = create_staff_users(self.stdout)

            # ── Step 2: Terms ──────────────────────────────────────────────
            # Active term: 2026-1 (1st Semester) — current advising period
            active_term = create_term(self.stdout)

            # Past term: 2025-2 (2nd Semester) — used for historical grade records
            # NOTE: All prior-year grades are stored under this single past term.
            # This is sufficient to establish academic history; finer term granularity
            # (e.g. separate records for 2024-1, 2024-2, ...) is not needed for seeding.
            past_term = create_past_term(self.stdout)

            # ── Step 3: Rooms ──────────────────────────────────────────────
            create_rooms(self.stdout)

            # ── Step 4: Program & Curriculum ───────────────────────────────
            program   = get_or_fail_program()
            curriculum = get_or_fail_curriculum(program)

            # ── Step 5: Assign Program Head ────────────────────────────────
            program_head = staff.get('PROGRAM_HEAD')
            if program_head:
                program.program_head = program_head
                program.save()

            approver = staff.get('PROGRAM_HEAD') or staff.get('ADMIN')

            # ── Step 6: Professors per Year Level ──────────────────────────
            # Creates 4 professors per year level and assigns them to that
            # year's 1st-semester subjects.
            for yl in range(1, 5):
                create_professors(curriculum, self.stdout, with_availability=True, year_level=yl)

            # ── Step 7: Students per Year Level ───────────────────────────
            grand_total_historical = 0

            for (year_level, student_type, count, id_start, is_regular) in YEAR_LEVEL_CONFIG:
                self.stdout.write(
                    f'\n  Creating {count} Year {year_level} students ({student_type})...'
                )

                # Get subjects for the CURRENT (active) term for this year level
                current_subjects = get_subjects(curriculum, year_level=year_level, semester='1')
                if not current_subjects:
                    raise RuntimeError(
                        f'No subjects found for Y{year_level}S1. '
                        'Please upload your curriculum CSV first.'
                    )

                for offset in range(count):
                    idx  = id_start + offset
                    dob  = date(2005 - (year_level - 1), (idx % 12) + 1, (idx % 28) + 1)

                    # 7a: Create User + Student profile
                    student = generate_student(
                        idx, program, curriculum,
                        student_type=student_type,
                        status='ENROLLED',
                        dob=dob,
                        is_active_user=True,
                    )

                    # 7b: Unlock advising immediately (no Registrar step needed for seeding)
                    student.is_advising_unlocked = True
                    student.save(update_fields=['is_advising_unlocked'])

                    # 7c: Create StudentEnrollment for the active term (APPROVED)
                    create_enrollment(
                        student, active_term, approver,
                        year_level=year_level,
                        advising_status='APPROVED',
                        monthly_commitment=Decimal('5000.00'),
                        is_regular=is_regular,
                    )

                    # 7d: Create current-term Grade records (ENROLLED, advising APPROVED)
                    create_grade_records(
                        student, active_term, current_subjects,
                        grade_status='ENROLLED',
                        advising_status='APPROVED',
                    )

                    # 7e: Seed historical PASSED grades for Y2+ students
                    # Year 1 Freshmen have no prior academic history.
                    if year_level > 1:
                        added = create_historical_passed_grades(
                            student, past_term, curriculum,
                            up_to_year_level=year_level,
                        )
                        grand_total_historical += added

            # ── Step 8: Sync system sequence ───────────────────────────────
            update_system_sequence('27', TOTAL_STUDENTS)

        # ── Summary ─────────────────────────────────────────────────────────
        self.stdout.write(self.style.SUCCESS(
            f'\n{"=" * 60}\n'
            f'Seed completed successfully!\n'
            f'  Students:            {TOTAL_STUDENTS} (70 per year level, Y1–Y4)\n'
            f'  Historical grades:   {grand_total_historical} PASSED records\n'
            f'  Professors:          16 (4 per year level)\n'
            f'  Rooms:               20\n'
            f'  Active Term:         2026-1 (1st Sem)\n'
            f'  Past Term:           2025-2 (historical grades reference)\n'
            f'\n  NO sections generated — create them manually in the Dean UI.\n'
            f'\n  Student login format:\n'
            f'    Username: IDN (e.g. 270001)\n'
            f'    Password: IDN + MMDD of DOB (e.g. 2700010102)\n'
            f'{"=" * 60}'
        ))
