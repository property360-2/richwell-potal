"""
seed_resolution — Seeds INC/retake grades from a past term for resolution testing.
Professors from those subjects are available. Various resolution stages.

Usage:
    python manage.py seed_resolution
    python manage.py seed_resolution --no-wipe
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
    create_past_term,
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
        'Seeds INC/retake/failed grades from a past term (2025-2) with professors assigned. '
        'Tests the multi-step resolution workflow.'
    )

    def add_arguments(self, parser):
        parser.add_argument('--no-wipe', action='store_true', help='Skip wipe phase')

    def handle(self, *args, **options):
        if not options.get('no_wipe', False):
            wipe_all(self.stdout)

        with transaction.atomic():
            staff = create_staff_users(self.stdout)

            # Create two terms: past (inactive) + active
            past_term = create_past_term(self.stdout)
            active_term = create_term(self.stdout)
            rooms = create_rooms(self.stdout)

            program = get_or_fail_program()
            curriculum = get_or_fail_curriculum(program)

            program_head = staff.get('PROGRAM_HEAD')
            if program_head:
                program.program_head = program_head
                program.save()

            # Use Y1S2 subjects for past term (semester 2)
            past_subjects = get_subjects(curriculum, year_level=1, semester='2')
            # Use Y1S1 subjects for active term (semester 1)
            # But if Y1S2 has no subjects, fallback to Y1S1
            if not past_subjects:
                self.stdout.write(self.style.WARNING(
                    '  No Y1S2 subjects found, using Y1S1 subjects for past term.'
                ))
                past_subjects = get_subjects(curriculum, year_level=1, semester='1')

            active_subjects = get_subjects(curriculum, year_level=1, semester='1')

            if not past_subjects:
                raise RuntimeError('No subjects found. Please upload curriculum CSV first.')

            # Create professors with past-term subject assignments
            professors = create_professors(curriculum, self.stdout, with_availability=True)

            # Also assign professors to past subjects
            from apps.faculty.models import ProfessorSubject
            for idx, (prof, _) in enumerate(professors):
                start_idx = idx * 3
                for subj in past_subjects[start_idx:start_idx + 3]:
                    ProfessorSubject.objects.get_or_create(professor=prof, subject=subj)

            # Build professor lookup
            prof_user_map = {}
            for prof, _ in professors:
                for ps in prof.assigned_subjects.all():
                    prof_user_map[ps.subject_id] = prof.user

            approver = staff.get('PROGRAM_HEAD') or staff.get('ADMIN')
            registrar = staff.get('REGISTRAR')

            # Create past-term sections
            past_sections = create_sections(
                past_term, program, year_level=1,
                num_students=20, subjects=past_subjects, stdout=self.stdout,
            )
            assign_schedules(past_sections, professors, rooms, self.stdout)

            # Create 20 students with past-term grades
            self.stdout.write('  Creating 20 students with past-term grades...')
            students = []
            now = timezone.now()

            for idx in range(1, 21):
                dob = date(2005, (idx % 12) + 1, (idx % 28) + 1)
                student = generate_student(
                    idx, program, curriculum,
                    status='APPROVED', dob=dob, is_active_user=True,
                )

                # Past-term enrollment (completed)
                create_enrollment(
                    student, past_term, approver,
                    year_level=1, advising_status='APPROVED',
                    monthly_commitment=Decimal('5000.00'),
                )

                # Past-term grade records
                create_grade_records(
                    student, past_term, past_subjects,
                    grade_status='ENROLLED', advising_status='APPROVED',
                )

                # Active-term enrollment
                if active_subjects:
                    create_enrollment(
                        student, active_term, approver,
                        year_level=1, advising_status='APPROVED',
                    )

                students.append(student)

            assign_students_to_sections(students, past_sections, past_term, self.stdout)

            # ── Set up grade states for past term ──
            self.stdout.write('  Configuring grade resolution scenarios...')
            resolution_counts = {
                'PASSED': 0, 'FAILED_RETAKE': 0, 'INC_REQUESTED': 0,
                'INC_APPROVED': 0, 'INC_SUBMITTED': 0, 'INC_COMPLETED': 0,
            }

            for idx, student in enumerate(students, start=1):
                grades = list(Grade.objects.filter(student=student, term=past_term))
                if not grades:
                    continue

                professor_user = prof_user_map.get(grades[0].subject_id)

                if 1 <= idx <= 5:
                    # PASSED (completed, for reference)
                    for g in grades:
                        g.midterm_grade = Decimal('2.00')
                        g.final_grade = Decimal('1.75')
                        g.grade_status = Grade.STATUS_PASSED
                        g.midterm_submitted_at = now
                        g.final_submitted_at = now
                        g.submitted_by = professor_user
                        g.finalized_by = registrar
                        g.finalized_at = now
                        g.save()
                    resolution_counts['PASSED'] += 1

                elif 6 <= idx <= 10:
                    # FAILED → creates retake scenario
                    for g in grades:
                        g.midterm_grade = Decimal('4.00')
                        g.final_grade = Decimal('5.00')
                        g.grade_status = Grade.STATUS_FAILED
                        g.midterm_submitted_at = now
                        g.final_submitted_at = now
                        g.submitted_by = professor_user
                        g.finalized_by = registrar
                        g.finalized_at = now
                        g.save()
                    resolution_counts['FAILED_RETAKE'] += 1

                elif 11 <= idx <= 13:
                    # INC — RESOLUTION_REQUESTED
                    for g in grades:
                        g.midterm_grade = Decimal('2.50')
                        g.grade_status = Grade.STATUS_INC
                        g.midterm_submitted_at = now
                        g.submitted_by = professor_user
                        g.finalized_by = registrar
                        g.finalized_at = now
                        months = 6 if g.subject.is_major else 12
                        g.inc_deadline = (now + relativedelta(months=months)).date()
                        g.resolution_status = 'REQUESTED'
                        g.resolution_reason = f'Student {idx} needs to complete requirements'
                        g.resolution_requested_by = professor_user
                        g.resolution_requested_at = now
                        g.save()
                    resolution_counts['INC_REQUESTED'] += 1

                elif 14 <= idx <= 16:
                    # INC — RESOLUTION_APPROVED (registrar approved, professor can submit grade)
                    for g in grades:
                        g.midterm_grade = Decimal('2.50')
                        g.grade_status = Grade.STATUS_INC
                        g.midterm_submitted_at = now
                        g.submitted_by = professor_user
                        g.finalized_by = registrar
                        g.finalized_at = now
                        g.inc_deadline = (now + relativedelta(months=6)).date()
                        g.resolution_status = 'APPROVED'
                        g.resolution_reason = f'Student {idx} completion approved'
                        g.resolution_requested_by = professor_user
                        g.resolution_requested_at = now
                        g.save()
                    resolution_counts['INC_APPROVED'] += 1

                elif 17 <= idx <= 18:
                    # INC — RESOLUTION_SUBMITTED (professor submitted grade, awaiting head approval)
                    for g in grades:
                        g.midterm_grade = Decimal('2.50')
                        g.grade_status = Grade.STATUS_INC
                        g.midterm_submitted_at = now
                        g.submitted_by = professor_user
                        g.finalized_by = registrar
                        g.finalized_at = now
                        g.inc_deadline = (now + relativedelta(months=6)).date()
                        g.resolution_status = 'SUBMITTED'
                        g.resolution_reason = f'Student {idx} completed course work'
                        g.resolution_requested_by = professor_user
                        g.resolution_requested_at = now
                        g.resolution_new_grade = Decimal('2.00')
                        g.save()
                    resolution_counts['INC_SUBMITTED'] += 1

                elif 19 <= idx <= 20:
                    # INC — RESOLUTION_COMPLETED (head approved, grade resolved)
                    for g in grades:
                        g.midterm_grade = Decimal('2.50')
                        g.final_grade = Decimal('2.00')
                        g.grade_status = Grade.STATUS_INC
                        g.midterm_submitted_at = now
                        g.final_submitted_at = now
                        g.submitted_by = professor_user
                        g.finalized_by = registrar
                        g.finalized_at = now
                        g.inc_deadline = (now + relativedelta(months=6)).date()
                        g.resolution_status = 'COMPLETED'
                        g.resolution_reason = f'Student {idx} resolution completed'
                        g.resolution_requested_by = professor_user
                        g.resolution_requested_at = now
                        g.resolution_new_grade = Decimal('2.00')
                        g.resolution_approved_by = program_head
                        g.resolution_approved_at = now
                        g.save()
                    resolution_counts['INC_COMPLETED'] += 1

            update_system_sequence('27', 20)

            self.stdout.write('')
            for label, count in resolution_counts.items():
                self.stdout.write(f'    {label}: {count} students')

        self.stdout.write(self.style.SUCCESS(
            '\nSeed completed: 20 students with past-term grades in various resolution stages.'
        ))
        self.stdout.write('')
        self.stdout.write('  Professor logins:')
        self.stdout.write('    prof1 / EMP0010101   (Prof One)')
        self.stdout.write('    prof2 / EMP0020515   (Prof Two)')
        self.stdout.write('    prof3 / EMP0031020   (Prof Three)')
