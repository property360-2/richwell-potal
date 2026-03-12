"""
seed_grading — Grades already submitted by professors, waiting for registrar review/finalization.

Usage:
    python manage.py seed_grading
    python manage.py seed_grading --no-wipe
"""
from datetime import date
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from dateutil.relativedelta import relativedelta

from apps.grades.models import Grade

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
        'Seeds grades already submitted by professors (PASSED/FAILED/INC/NO_GRADE/DROPPED). '
        'Ready for registrar to review and finalize.'
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

            program_head = staff.get('PROGRAM_HEAD')
            if program_head:
                program.program_head = program_head
                program.save()

            active_term.schedule_published = True
            active_term.save()

            professors = create_professors(curriculum, self.stdout, with_availability=True)
            subjects = get_subjects(curriculum, year_level=1, semester='1')

            if not subjects:
                raise RuntimeError('No subjects found for Y1S1.')

            approver = staff.get('PROGRAM_HEAD') or staff.get('ADMIN')

            # Create 4 sections for 40 students
            sections = create_sections(
                active_term, program, year_level=1,
                num_students=40, subjects=subjects, stdout=self.stdout,
            )
            assign_schedules(sections, professors, rooms, self.stdout)

            # Build professor lookup (subject_id -> professor User)
            prof_user_map = {}
            for prof, assigned_subjects in professors:
                for subj in assigned_subjects:
                    prof_user_map[subj.id] = prof.user

            # Create 40 students with grade data
            self.stdout.write('  Creating 40 students with submitted grades...')

            # Grade distribution:
            # Students 1-15:  PASSED (midterm 1.5-2.5, final 1.0-3.0)
            # Students 16-25: FAILED (midterm 3.0-5.0, final 5.0)
            # Students 26-30: INC   (midterm set, final NULL, inc_deadline set)
            # Students 31-35: NO_GRADE (no midterm/final)
            # Students 36-40: DROPPED

            students = []
            grade_counts = {'PASSED': 0, 'FAILED': 0, 'INC': 0, 'NO_GRADE': 0, 'DROPPED': 0}

            for idx in range(1, 41):
                dob = date(2005, (idx % 12) + 1, (idx % 28) + 1)
                student = generate_student(
                    idx, program, curriculum,
                    status='APPROVED', dob=dob, is_active_user=True,
                )
                create_enrollment(
                    student, active_term, approver,
                    year_level=1, advising_status='APPROVED',
                    monthly_commitment=Decimal('5000.00'),
                )
                create_grade_records(
                    student, active_term, subjects,
                    grade_status='ENROLLED', advising_status='APPROVED',
                )
                students.append(student)

            assign_students_to_sections(students, sections, active_term, self.stdout)

            # Now update grades with submitted data
            now = timezone.now()
            for idx, student in enumerate(students, start=1):
                grades = Grade.objects.filter(student=student, term=active_term)

                for grade in grades:
                    professor_user = prof_user_map.get(grade.subject_id)

                    if 1 <= idx <= 15:
                        # PASSED
                        grade.midterm_grade = Decimal('2.00')
                        grade.final_grade = Decimal('1.75')
                        grade.grade_status = Grade.STATUS_PASSED
                        grade.midterm_submitted_at = now
                        grade.final_submitted_at = now
                        grade.submitted_by = professor_user
                        grade_counts['PASSED'] += 1

                    elif 16 <= idx <= 25:
                        # FAILED
                        grade.midterm_grade = Decimal('4.00')
                        grade.final_grade = Decimal('5.00')
                        grade.grade_status = Grade.STATUS_FAILED
                        grade.midterm_submitted_at = now
                        grade.final_submitted_at = now
                        grade.submitted_by = professor_user
                        grade_counts['FAILED'] += 1

                    elif 26 <= idx <= 30:
                        # INC — midterm set, no final, deadline set
                        grade.midterm_grade = Decimal('2.50')
                        grade.final_grade = None
                        grade.grade_status = Grade.STATUS_INC
                        grade.midterm_submitted_at = now
                        grade.submitted_by = professor_user
                        months = 6 if grade.subject.is_major else 12
                        grade.inc_deadline = (now + relativedelta(months=months)).date()
                        grade_counts['INC'] += 1

                    elif 31 <= idx <= 35:
                        # NO_GRADE
                        grade.grade_status = Grade.STATUS_NO_GRADE
                        grade.submitted_by = professor_user
                        grade.final_submitted_at = now
                        grade_counts['NO_GRADE'] += 1

                    elif 36 <= idx <= 40:
                        # DROPPED
                        grade.grade_status = Grade.STATUS_DROPPED
                        grade.section = None
                        grade_counts['DROPPED'] += 1

                    grade.save()

            update_system_sequence('27', 40)

            self.stdout.write('')
            for status_name, count in grade_counts.items():
                self.stdout.write(f'    {status_name}: {count} grade records')

        self.stdout.write(self.style.SUCCESS(
            '\nSeed completed: 40 students with submitted grades, ready for registrar finalization.'
        ))
