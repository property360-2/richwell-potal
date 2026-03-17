from datetime import date
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from apps.academics.models import Program, Subject
from apps.faculty.models import Professor
from apps.grades.models import Grade
from apps.sections.models import Section
from apps.students.models import Student
from apps.terms.models import Term
from dateutil.relativedelta import relativedelta

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
        'Seeds current grading context (40 students) and past term resolution context (20 students). '
        'Tests professor grade entry, registrar finalization, and INC resolution workflow.'
    )

    def add_arguments(self, parser):
        parser.add_argument('--no-wipe', action='store_true', help='Skip wipe phase')

    def handle(self, *args, **options):
        if not options.get('no_wipe', False):
            wipe_all(self.stdout)

        now = timezone.now()

        with transaction.atomic():
            staff = create_staff_users(self.stdout)
            active_term = create_term(self.stdout)
            past_term = create_past_term(self.stdout)
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
            
            # Use Y1S1 subjects for active term
            active_subjects = get_subjects(curriculum, year_level=1, semester='1')
            # Use Y1S2 subjects for past term
            past_subjects = get_subjects(curriculum, year_level=1, semester='2')
            if not past_subjects:
                past_subjects = active_subjects

            if not active_subjects:
                raise RuntimeError('No subjects found. Please upload curriculum CSV first.')

            # Assign professors to past subjects too
            from apps.faculty.models import ProfessorSubject
            for idx, (prof, prof_subj_list) in enumerate(professors):
                start_idx = idx * 3
                for subj in past_subjects[start_idx:start_idx + 3]:
                    ProfessorSubject.objects.get_or_create(professor=prof, subject=subj)
                    # IMPORTANT: Add to the local list so assign_schedules() finds them!
                    if subj not in prof_subj_list:
                        prof_subj_list.append(subj)

            # Build professor lookup
            prof_user_map = {}
            for prof, _ in professors:
                for ps in prof.assigned_subjects.all():
                    prof_user_map[ps.subject_id] = prof.user

            approver = staff.get('PROGRAM_HEAD') or staff.get('ADMIN')
            registrar = staff.get('REGISTRAR')

            # --- 1. CURRENT TERM GRADING (40 Students) ---
            self.stdout.write('  Creating 40 enrolled students for current grading...')
            current_sections = create_sections(
                active_term, program, year_level=1,
                num_students=40, subjects=active_subjects, stdout=self.stdout,
            )
            assign_schedules(current_sections, professors, rooms, self.stdout)

            current_students = []
            for idx in range(1, 41):
                dob = date(2005, (idx % 12) + 1, (idx % 28) + 1)
                student = generate_student(
                    idx, program, curriculum,
                    student_type='FRESHMAN', status='APPROVED', dob=dob, is_active_user=True,
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
                current_students.append(student)

            assign_students_to_sections(current_students, current_sections, active_term, self.stdout)

            # --- 2. PAST TERM RESOLUTIONS (20 Students) ---
            self.stdout.write('  Creating 20 students for INC resolution workflow...')
            past_sections = create_sections(
                past_term, program, year_level=1,
                num_students=20, subjects=past_subjects, stdout=self.stdout,
            )
            assign_schedules(past_sections, professors, rooms, self.stdout)

            resolution_students = []
            for idx in range(41, 61):
                dob = date(2005, (idx % 12) + 1, (idx % 28) + 1)
                student = generate_student(
                    idx, program, curriculum,
                    status='APPROVED', dob=dob, is_active_user=True,
                )
                # Past-term enrollment
                create_enrollment(
                    student, past_term, approver,
                    year_level=1, advising_status='APPROVED',
                )
                # Past-term grades
                create_grade_records(
                    student, past_term, past_subjects,
                    grade_status='ENROLLED', advising_status='APPROVED',
                )
                # Active-term enrollment (returning for resolution)
                create_enrollment(
                    student, active_term, approver,
                    year_level=1, advising_status='APPROVED',
                )
                resolution_students.append(student)

            assign_students_to_sections(resolution_students, past_sections, past_term, self.stdout)

            # Set resolution states
            for idx, student in enumerate(resolution_students, start=1):
                grades = list(Grade.objects.filter(student=student, term=past_term))
                if not grades: continue
                
                subj_idx = (idx - 1) % len(past_subjects)
                target_grade = grades[subj_idx]
                professor_user = prof_user_map.get(target_grade.subject_id)

                # Default others to PASSED
                for g in grades:
                    if g.id != target_grade.id:
                        g.midterm_grade, g.final_grade = Decimal('2.25'), Decimal('2.00')
                        g.grade_status = Grade.STATUS_PASSED
                        g.midterm_submitted_at = g.final_submitted_at = now
                        g.submitted_by, g.finalized_by, g.finalized_at = prof_user_map.get(g.subject_id), registrar, now
                        g.save()

                if 1 <= idx <= 5: # INC - READY FOR MANUAL REQUEST (User wants to click themselves)
                    target_grade.midterm_grade, target_grade.grade_status = Decimal('3.00'), Grade.STATUS_INC
                    target_grade.midterm_submitted_at = target_grade.finalized_at = now
                    target_grade.finalized_by = registrar
                    # Vary deadlines for testing badges
                    if idx == 1: # Student 41
                        target_grade.inc_deadline = (now + relativedelta(days=15)).date()
                    else:
                        target_grade.inc_deadline = (now + relativedelta(months=6)).date()
                    target_grade.save()

                elif 6 <= idx <= 10: # FAILED (Pure failure)
                    for g in grades:
                        g.midterm_grade, g.final_grade = Decimal('4.00'), Decimal('5.00')
                        g.grade_status = Grade.STATUS_FAILED
                        g.midterm_submitted_at = g.final_submitted_at = now
                        g.submitted_by, g.finalized_by, g.finalized_at = prof_user_map.get(g.subject_id), registrar, now
                        g.save()

                elif 11 <= idx <= 13: # INC REQUESTED (Already requested)
                    target_grade.midterm_grade, target_grade.grade_status = Decimal('2.50'), Grade.STATUS_INC
                    target_grade.midterm_submitted_at = target_grade.finalized_at = now
                    target_grade.finalized_by = registrar
                    target_grade.inc_deadline = (now + relativedelta(months=6)).date()
                    target_grade.resolution_status, target_grade.resolution_reason = 'REQUESTED', 'Needs completion'
                    target_grade.resolution_requested_by, target_grade.resolution_requested_at = professor_user, now
                    target_grade.save()
                elif 14 <= idx <= 16: # INC APPROVED (Prof can submit grade)
                    target_grade.midterm_grade, target_grade.grade_status = Decimal('2.50'), Grade.STATUS_INC
                    target_grade.midterm_submitted_at = target_grade.finalized_at = now
                    target_grade.finalized_by = registrar
                    # Vary deadline for testing (Warning badge)
                    if idx == 14: # Student 54
                        target_grade.inc_deadline = (now + relativedelta(days=45)).date()
                    else:
                        target_grade.inc_deadline = (now + relativedelta(months=6)).date()
                elif 17 <= idx <= 18: # INC SUBMITTED (Needs PH Finalization)
                    target_grade.midterm_grade, target_grade.grade_status = Decimal('2.50'), Grade.STATUS_INC
                    target_grade.midterm_submitted_at = target_grade.finalized_at = now
                    target_grade.finalized_by = registrar
                    target_grade.inc_deadline = (now + relativedelta(months=6)).date()
                    target_grade.resolution_status, target_grade.resolution_reason = 'SUBMITTED', 'Work completed'
                    target_grade.resolution_requested_by, target_grade.resolution_requested_at = professor_user, now
                    target_grade.resolution_new_grade = Decimal('2.00')
                    target_grade.save()
                elif 19 <= idx <= 20: # INC COMPLETED (Chain viewable)
                    target_grade.midterm_grade, target_grade.final_grade = Decimal('2.50'), Decimal('2.00')
                    target_grade.grade_status = Grade.STATUS_INC
                    target_grade.midterm_submitted_at = target_grade.final_submitted_at = now
                    target_grade.finalized_by, target_grade.finalized_at = registrar, now
                    target_grade.inc_deadline = (now + relativedelta(months=6)).date()
                    target_grade.resolution_status, target_grade.resolution_reason = 'COMPLETED', 'Resolved'
                    target_grade.resolution_requested_by, target_grade.resolution_requested_at = professor_user, now
                    target_grade.resolution_new_grade, target_grade.resolution_approved_by, target_grade.resolution_approved_at = Decimal('2.00'), program_head, now
                    target_grade.save()

            update_system_sequence('27', 60)

        self.stdout.write(self.style.SUCCESS('\nSeed completed: Unified Grading & Resolution context ready.'))
        self.stdout.write('\n' + '='*60)
        self.stdout.write('     SCENARIO-BASED LOGIN CREDENTIALS (PASSWORD = username + MMDD of DOB)')
        self.stdout.write('='*60)
        
        def get_student_cred(s):
            return f"{s.idn} / {s.idn}{s.date_of_birth.strftime('%m%d')}"
        
        def get_prof_cred(p):
            return f"{p.user.username} / {p.employee_id}{p.date_of_birth.strftime('%m%d')}"

        self.stdout.write('\n[ PROFESSOR FLOW ]')
        p1 = Professor.objects.get(user__username='prof1')
        self.stdout.write(f'  {get_prof_cred(p1)} (Prof One)')
        self.stdout.write('    - Scenario: Request Resolution for Student 51 (INC REQUESTED)')
        self.stdout.write('    - Scenario: Submit New Grade for Student 54 (INC APPROVED)')
        
        p2 = Professor.objects.get(user__username='prof2')
        self.stdout.write(f'\n  {get_prof_cred(p2)} (Prof Two)')
        self.stdout.write('    - Scenario: Has resolved INC for Student 60 (COMPLETED)')

        self.stdout.write('\n[ REGISTRAR / STAFF FLOW ]')
        self.stdout.write('  Staff Login (Password: password123):')
        self.stdout.write('    - registrar: Review/Approve Resolution for Student 51')
        self.stdout.write('    - programhead: Finalize Resolution for Student 57 (SUBMITTED)')

        self.stdout.write('\n[ STUDENT FLOW (View SOG & Chain) ]')
        for idx in [51, 60]:
            s = Student.objects.get(idn=f'27{str(idx).zfill(4)}')
            role = "REQUESTED phase" if idx == 51 else "COMPLETED phase"
            self.stdout.write(f'  {get_student_cred(s)} (Student {idx}) - {role}')
        
        self.stdout.write('='*60 + '\n')
