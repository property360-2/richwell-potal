"""
seed_applicants — Seeds students in various admission statuses.

Usage:
    python manage.py seed_applicants
    python manage.py seed_applicants --no-wipe
"""
from datetime import date
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from core.management.commands._base_seeder import (
    wipe_all,
    create_staff_users,
    create_term,
    get_or_fail_program,
    get_or_fail_curriculum,
    generate_student,
    create_enrollment,
    update_system_sequence,
)


class Command(BaseCommand):
    help = 'Seeds applicants in various admission statuses (APPLICANT, APPROVED, REJECTED, ENROLLED)'

    def add_arguments(self, parser):
        parser.add_argument('--no-wipe', action='store_true', help='Skip wipe phase')

    def handle(self, *args, **options):
        if not options.get('no_wipe', False):
            wipe_all(self.stdout)

        with transaction.atomic():
            staff = create_staff_users(self.stdout)
            active_term = create_term(self.stdout)

            program = get_or_fail_program()
            curriculum = get_or_fail_curriculum(program)

            # Assign program head
            program_head = staff.get('PROGRAM_HEAD')
            if program_head:
                program.program_head = program_head
                program.save()

            approver = staff.get('ADMISSION') or staff.get('ADMIN')

            self.stdout.write('  Creating applicants...')

            idx = 1
            student_counts = {
                'APPLICANT': 0,
                'APPROVED': 0,
                'REJECTED': 0,
                'ENROLLED': 0,
            }

            # ── 10 Applicants (User.is_active=False, IDN = APP-{id}) ──
            for i in range(10):
                dob = date(2005, (i % 12) + 1, (i % 28) + 1)
                stype = 'TRANSFEREE' if i >= 7 else 'FRESHMAN'
                student = generate_student(
                    idx, program, curriculum,
                    student_type=stype,
                    status='APPLICANT',
                    dob=dob,
                    is_active_user=False,
                )

                # Partial document checklists for testing
                if i < 3:
                    # Some documents submitted but not verified
                    checklist = student.document_checklist.copy()
                    checklist['F138']['submitted'] = True
                    checklist['PSA']['submitted'] = True
                    checklist['PSA']['verified'] = True
                    student.document_checklist = checklist
                    student.save()

                # Transferees get previous_school
                if stype == 'TRANSFEREE':
                    student.previous_school = f'Previous School {i}'
                    student.is_advising_unlocked = False
                    student.save()

                student_counts['APPLICANT'] += 1
                idx += 1

            # ── 5 Approved (User.is_active=True, proper IDN, enrollment created) ──
            for i in range(5):
                dob = date(2004, (i % 12) + 1, (i % 28) + 1)
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
                    advising_status='DRAFT',
                    monthly_commitment=Decimal('5000.00'),
                )

                # Complete document checklist for approved students
                checklist = student.document_checklist.copy()
                for key in checklist:
                    checklist[key]['submitted'] = True
                    checklist[key]['verified'] = True
                student.document_checklist = checklist
                student.save()

                student_counts['APPROVED'] += 1
                idx += 1

            # ── 3 Rejected ──
            for i in range(3):
                dob = date(2005, (i % 12) + 1, 15)
                student = generate_student(
                    idx, program, curriculum,
                    student_type='FRESHMAN',
                    status='REJECTED',
                    dob=dob,
                    is_active_user=False,
                )
                student_counts['REJECTED'] += 1
                idx += 1

            # ── 2 Enrolled (fully through the pipeline) ──
            for i in range(2):
                dob = date(2004, 6, (i % 28) + 1)
                student = generate_student(
                    idx, program, curriculum,
                    student_type='FRESHMAN',
                    status='ENROLLED',
                    dob=dob,
                    is_active_user=True,
                )
                create_enrollment(
                    student, active_term, approver,
                    year_level=1,
                    advising_status='APPROVED',
                )

                # Complete checklist
                checklist = student.document_checklist.copy()
                for key in checklist:
                    checklist[key]['submitted'] = True
                    checklist[key]['verified'] = True
                student.document_checklist = checklist
                student.save()

                student_counts['ENROLLED'] += 1
                idx += 1

            # Update SystemSequence to reflect the highest IDN we created
            update_system_sequence('27', idx - 1)

            self.stdout.write('')
            for status_name, count in student_counts.items():
                self.stdout.write(f'    {status_name}: {count}')

        self.stdout.write(self.style.SUCCESS(
            f'\nSeed completed: {sum(student_counts.values())} applicants created.'
        ))
