"""
seed_full_cycle — End-to-end data covering the entire system lifecycle.
100 students, all entities populated, represents a mid-semester snapshot.

Usage:
    python manage.py seed_full_cycle
    python manage.py seed_full_cycle --no-wipe
"""
from datetime import date
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from dateutil.relativedelta import relativedelta

from apps.grades.models import Grade
from apps.finance.models import Payment
from apps.notifications.models import Notification
from apps.notifications.services.notification_service import NotificationService

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
    help = 'Seeds end-to-end data: 100 students across all statuses, schedules, grades, payments, notifications.'

    def add_arguments(self, parser):
        parser.add_argument('--no-wipe', action='store_true', help='Skip wipe phase')

    def handle(self, *args, **options):
        if not options.get('no_wipe', False):
            wipe_all(self.stdout)

        with transaction.atomic():
            staff = create_staff_users(self.stdout)

            past_term = create_past_term(self.stdout)
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

            # Also assign professors to Y1S2 subjects for past term
            past_subjects = get_subjects(curriculum, year_level=1, semester='2')
            if not past_subjects:
                past_subjects = get_subjects(curriculum, year_level=1, semester='1')

            from apps.faculty.models import ProfessorSubject
            for idx, (prof, _) in enumerate(professors):
                start_idx = idx * 3
                for subj in past_subjects[start_idx:start_idx + 3]:
                    ProfessorSubject.objects.get_or_create(professor=prof, subject=subj)

            active_subjects = get_subjects(curriculum, year_level=1, semester='1')
            if not active_subjects:
                raise RuntimeError('No Y1S1 subjects found.')

            approver = staff.get('PROGRAM_HEAD') or staff.get('ADMIN')
            registrar = staff.get('REGISTRAR')
            cashier = staff.get('CASHIER')
            now = timezone.now()

            # Build professor lookup
            prof_user_map = {}
            for prof, _ in professors:
                for ps in prof.assigned_subjects.all():
                    prof_user_map[ps.subject_id] = prof.user

            # ── Create sections for active and past terms ──
            active_sections = create_sections(
                active_term, program, year_level=1,
                num_students=60, subjects=active_subjects, stdout=self.stdout,
            )
            past_sections = create_sections(
                past_term, program, year_level=1,
                num_students=30, subjects=past_subjects, stdout=self.stdout,
            )
            assign_schedules(active_sections, professors, rooms, self.stdout)
            assign_schedules(past_sections, professors, rooms, self.stdout)

            # ── Create 100 students in various scenarios ──
            self.stdout.write('  Creating 100 students across all scenarios...')
            counts = {}
            all_active_students = []
            all_past_students = []
            idx = 1

            # ── Group 1: 10 Applicants (not yet approved) ──
            for _ in range(10):
                dob = date(2005, (idx % 12) + 1, (idx % 28) + 1)
                stype = 'TRANSFEREE' if idx > 7 else 'FRESHMAN'
                generate_student(
                    idx, program, curriculum,
                    student_type=stype, status='APPLICANT',
                    dob=dob, is_active_user=False,
                )
                idx += 1
            counts['Applicants'] = 10

            # ── Group 2: 10 Approved (not yet advised) ──
            for _ in range(10):
                dob = date(2005, (idx % 12) + 1, (idx % 28) + 1)
                student = generate_student(
                    idx, program, curriculum,
                    status='APPROVED', dob=dob, is_active_user=True,
                )
                create_enrollment(
                    student, active_term, approver,
                    year_level=1, advising_status='DRAFT',
                )
                idx += 1
            counts['Approved (not advised)'] = 10

            # ── Group 3: 30 Enrolled in current term ──
            for _ in range(30):
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
                    student, active_term, active_subjects,
                    grade_status='ENROLLED', advising_status='APPROVED',
                )
                all_active_students.append(student)
                idx += 1
            counts['Enrolled (current)'] = 30

            # ── Group 4: 20 Graded from past term (various statuses) ──
            for i in range(20):
                dob = date(2004, (idx % 12) + 1, (idx % 28) + 1)
                student = generate_student(
                    idx, program, curriculum,
                    status='APPROVED', dob=dob, is_active_user=True,
                )
                create_enrollment(
                    student, past_term, approver,
                    year_level=1, advising_status='APPROVED',
                    monthly_commitment=Decimal('5000.00'),
                )
                create_grade_records(
                    student, past_term, past_subjects,
                    grade_status='ENROLLED', advising_status='APPROVED',
                )
                all_past_students.append(student)

                # Also enroll in current term
                create_enrollment(
                    student, active_term, approver,
                    year_level=1, advising_status='APPROVED',
                )

                idx += 1
            counts['Graded (past term)'] = 20

            # ── Group 5: 10 with INC from past term (resolution scenarios) ──
            for i in range(10):
                dob = date(2004, (idx % 12) + 1, (idx % 28) + 1)
                student = generate_student(
                    idx, program, curriculum,
                    status='APPROVED', dob=dob, is_active_user=True,
                )
                create_enrollment(
                    student, past_term, approver,
                    year_level=1, advising_status='APPROVED',
                )
                create_grade_records(
                    student, past_term, past_subjects,
                    grade_status='ENROLLED', advising_status='APPROVED',
                )
                all_past_students.append(student)
                idx += 1
            counts['INC (resolutions)'] = 10

            # ── Group 6: 10 with payments ──
            for i in range(10):
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
                    student, active_term, active_subjects,
                    grade_status='ENROLLED', advising_status='APPROVED',
                )
                all_active_students.append(student)
                idx += 1
            counts['With payments'] = 10

            # ── Group 7: 10 Graduated ──
            for i in range(10):
                dob = date(2001, (idx % 12) + 1, (idx % 28) + 1)
                student = generate_student(
                    idx, program, curriculum,
                    student_type='CURRENT',
                    status='GRADUATED', dob=dob, is_active_user=True,
                )
                idx += 1
            counts['Graduated'] = 10

            # ── Assign current-term students to sections ──
            assign_students_to_sections(all_active_students, active_sections, active_term, self.stdout)
            assign_students_to_sections(all_past_students, past_sections, past_term, self.stdout)

            # ── Set past-term grade statuses ──
            self.stdout.write('  Configuring past-term grade data...')
            for i, student in enumerate(all_past_students):
                grades = list(Grade.objects.filter(student=student, term=past_term))
                professor_user = prof_user_map.get(grades[0].subject_id) if grades else None

                if i < 10:
                    # First 10: mix of PASSED and FAILED
                    for g in grades:
                        if i % 2 == 0:
                            g.midterm_grade = Decimal('2.00')
                            g.final_grade = Decimal('1.75')
                            g.grade_status = Grade.STATUS_PASSED
                        else:
                            g.midterm_grade = Decimal('4.00')
                            g.final_grade = Decimal('5.00')
                            g.grade_status = Grade.STATUS_FAILED
                        g.submitted_by = professor_user
                        g.midterm_submitted_at = now
                        g.final_submitted_at = now
                        g.finalized_by = registrar
                        g.finalized_at = now
                        g.save()
                elif i < 20:
                    # Last 10: INC with various resolution statuses
                    for g in grades:
                        g.midterm_grade = Decimal('2.50')
                        g.grade_status = Grade.STATUS_INC
                        g.submitted_by = professor_user
                        g.midterm_submitted_at = now
                        g.finalized_by = registrar
                        g.finalized_at = now
                        g.inc_deadline = (now + relativedelta(months=6)).date()

                        # Distribute resolution statuses
                        stage_idx = (i - 10) % 4
                        if stage_idx == 0:
                            g.resolution_status = 'REQUESTED'
                            g.resolution_reason = 'Needs to complete requirements'
                            g.resolution_requested_by = professor_user
                            g.resolution_requested_at = now
                        elif stage_idx == 1:
                            g.resolution_status = 'APPROVED'
                            g.resolution_reason = 'Approved for resolution'
                            g.resolution_requested_by = professor_user
                            g.resolution_requested_at = now
                        elif stage_idx == 2:
                            g.resolution_status = 'SUBMITTED'
                            g.resolution_reason = 'Grade submitted'
                            g.resolution_requested_by = professor_user
                            g.resolution_requested_at = now
                            g.resolution_new_grade = Decimal('2.00')
                        else:
                            g.resolution_status = 'COMPLETED'
                            g.final_grade = Decimal('2.00')
                            g.resolution_reason = 'Completed'
                            g.resolution_requested_by = professor_user
                            g.resolution_requested_at = now
                            g.resolution_new_grade = Decimal('2.00')
                            g.resolution_approved_by = program_head
                            g.resolution_approved_at = now
                        g.save()
                elif i < 30:
                    # Students 21-30: INC resolution scenarios
                    for g in grades:
                        g.midterm_grade = Decimal('2.50')
                        g.grade_status = Grade.STATUS_INC
                        g.submitted_by = professor_user
                        g.midterm_submitted_at = now
                        g.finalized_by = registrar
                        g.finalized_at = now
                        g.inc_deadline = (now + relativedelta(months=6)).date()
                        g.resolution_status = 'REQUESTED'
                        g.resolution_reason = 'Awaiting resolution'
                        g.resolution_requested_by = professor_user
                        g.resolution_requested_at = now
                        g.save()

            # ── Create payments for Group 6 ──
            self.stdout.write('  Creating payment records...')
            payment_students = all_active_students[-10:]  # Last 10 from active students
            for pi, student in enumerate(payment_students):
                if pi < 3:
                    # Fully paid (all 6 months)
                    for month in range(1, 7):
                        Payment.objects.get_or_create(
                            student=student, term=active_term, month=month,
                            defaults={
                                'amount': Decimal('5000.00'),
                                'entry_type': 'PAYMENT',
                                'processed_by': cashier,
                            },
                        )
                elif pi < 7:
                    # Partially paid (first 2-3 months)
                    for month in range(1, (pi % 3) + 2):
                        Payment.objects.get_or_create(
                            student=student, term=active_term, month=month,
                            defaults={
                                'amount': Decimal('5000.00'),
                                'entry_type': 'PAYMENT',
                                'processed_by': cashier,
                            },
                        )
                else:
                    # Promissory
                    Payment.objects.get_or_create(
                        student=student, term=active_term, month=1,
                        defaults={
                            'amount': Decimal('5000.00'),
                            'entry_type': 'PAYMENT',
                            'is_promissory': True,
                            'remarks': 'Promissory note - payment deferred',
                            'processed_by': cashier,
                        },
                    )
            self.stdout.write(f'  Payments created for {len(payment_students)} students')

            # ── Create sample notifications ──
            self.stdout.write('  Creating sample notifications...')
            admin_user = staff.get('ADMIN')
            if admin_user:
                notification_samples = [
                    (Notification.NotificationType.ADVISING, 'Advising Approved',
                     '10 students have been approved for advising.', '/admin/advising'),
                    (Notification.NotificationType.GRADE, 'Grades Submitted',
                     '3 professors submitted final grades for review.', '/registrar/grades'),
                    (Notification.NotificationType.ENROLLMENT, 'New Applicants',
                     '5 new applications pending review.', '/admission/applicants'),
                    (Notification.NotificationType.SCHEDULE, 'Schedule Published',
                     'Term 2026-1 schedule has been published.', '/dean/schedules'),
                    (Notification.NotificationType.FINANCE, 'Payment Reminder',
                     '3 students have outstanding payments.', '/cashier/payments'),
                    (Notification.NotificationType.GENERAL, 'System Update',
                     'System maintenance scheduled for this weekend.', None),
                ]
                for ntype, title, msg, link in notification_samples:
                    Notification.objects.get_or_create(
                        recipient=admin_user,
                        type=ntype,
                        title=title,
                        defaults={'message': msg, 'link_url': link},
                    )

            update_system_sequence('27', idx - 1)

            self.stdout.write('')
            for label, count in counts.items():
                self.stdout.write(f'    {label}: {count}')

        self.stdout.write(self.style.SUCCESS(
            f'\nSeed completed: {sum(counts.values())} students total (full-cycle).'
        ))
        self.stdout.write('')
        self.stdout.write('  Staff logins (password: password123):')
        self.stdout.write('    admin, headreg, registrar, admission, cashier, dean, programhead')
        self.stdout.write('  Professor logins:')
        self.stdout.write('    prof1 / EMP0010101, prof2 / EMP0020515, prof3 / EMP0031020')
        self.stdout.write('  Student logins: {idn}{MMDD} (e.g., 270001 / 2700010201)')
