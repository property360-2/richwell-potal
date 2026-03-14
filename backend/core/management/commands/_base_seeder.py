"""
Shared helpers for all test scenario seeders.
This is NOT a Django management command — it's imported by the actual seeders.
"""
import math
from datetime import date, time
from decimal import Decimal

from django.db import transaction

from apps.accounts.models import User
from apps.academics.models import CurriculumVersion, Program, Subject
from apps.facilities.models import Room
from apps.faculty.models import Professor, ProfessorAvailability, ProfessorSubject
from apps.finance.models import Payment
from apps.grades.models import Grade
from apps.notifications.models import Notification
from apps.scheduling.models import Schedule
from apps.sections.models import Section, SectionStudent
from apps.students.models import Student, StudentEnrollment
from apps.terms.models import Term
from core.models import SystemSequence


# ──────────────────────────────────────────────
# Wipe helpers
# ──────────────────────────────────────────────

MODELS_DELETE_ORDER = [
    Schedule,
    Grade,
    SectionStudent,
    Section,
    ProfessorAvailability,
    ProfessorSubject,
    Professor,
    Payment,
    Notification,
    StudentEnrollment,
    Student,
    Room,
    Term,
    SystemSequence,
]


def wipe_all(stdout):
    """Delete seeded data in correct FK order. Preserves superadmin and academic data."""
    stdout.write('Wiping seeded data (preserving superadmin & curricula)...')
    with transaction.atomic():
        for model in MODELS_DELETE_ORDER:
            cnt, _ = model.objects.all().delete()
            if cnt:
                stdout.write(f'  Deleted {cnt} {model.__name__}')

        # Delete non-superadmin users (students, staff created by seeders)
        cnt, _ = User.objects.filter(is_superuser=False).delete()
        if cnt:
            stdout.write(f'  Deleted {cnt} User (non-superadmin)')

    stdout.write('Wipe completed.')


# ──────────────────────────────────────────────
# Staff / Auth helpers
# ──────────────────────────────────────────────

DEFAULT_PASSWORD = 'password123'

STAFF_CONFIG = [
    ('admin', 'Admin', 'User', 'admin@richwell.edu', User.RoleChoices.ADMIN),
    ('headreg', 'Head', 'Registrar', 'headreg@richwell.edu', User.RoleChoices.HEAD_REGISTRAR),
    ('registrar', 'Registrar', 'Staff', 'registrar@richwell.edu', User.RoleChoices.REGISTRAR),
    ('admission', 'Admission', 'Staff', 'admission@richwell.edu', User.RoleChoices.ADMISSION),
    ('cashier', 'Cashier', 'Staff', 'cashier@richwell.edu', User.RoleChoices.CASHIER),
    ('dean', 'Dean', 'Faculty', 'dean@richwell.edu', User.RoleChoices.DEAN),
    ('programhead', 'Program', 'Head', 'programhead@richwell.edu', User.RoleChoices.PROGRAM_HEAD),
]


def create_staff_users(stdout):
    """Create all staff roles. Returns dict { role_value -> User }."""
    staff = {}
    for username, first, last, email, role in STAFF_CONFIG:
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': email,
                'first_name': first,
                'last_name': last,
                'role': role,
            },
        )
        if created:
            user.set_password(DEFAULT_PASSWORD)
            user.save()
        staff[role] = user
    stdout.write(f'  Staff users created: {len(staff)}')
    return staff


# ──────────────────────────────────────────────
# Academic helpers
# ──────────────────────────────────────────────

def get_or_fail_program(code='BS_Information_Systems'):
    """Returns Program or raises RuntimeError."""
    try:
        return Program.objects.get(code=code)
    except Program.DoesNotExist:
        raise RuntimeError(
            f'Program "{code}" not found. Please upload your curriculum CSV first '
            f'via the admin panel or the existing seed_test_sectioning command.'
        )


def get_or_fail_curriculum(program):
    """Returns the active CurriculumVersion for a program, or raises RuntimeError."""
    cv = CurriculumVersion.objects.filter(program=program, is_active=True).first()
    if not cv:
        raise RuntimeError(
            f'No active curriculum found for program "{program.code}". '
            f'Please upload your curriculum CSV first.'
        )
    return cv


def get_subjects(curriculum, year_level=1, semester='1'):
    """Returns non-practicum subjects for the given year/semester."""
    return list(
        Subject.objects.filter(
            curriculum=curriculum,
            year_level=year_level,
            semester=semester,
            is_practicum=False,
        ).order_by('code')
    )


# ──────────────────────────────────────────────
# Term helpers
# ──────────────────────────────────────────────

def create_term(stdout, code='2026-1', semester_type='1', academic_year='2026-2027',
                start=date(2026, 6, 1), end=date(2026, 10, 31), is_active=True):
    """Create a term with all date windows."""
    term, _ = Term.objects.get_or_create(
        code=code,
        defaults={
            'academic_year': academic_year,
            'semester_type': semester_type,
            'start_date': start,
            'end_date': end,
            'enrollment_start': date(2026, 5, 1),
            'enrollment_end': date(2026, 6, 15),
            'advising_start': date(2026, 5, 1),
            'advising_end': date(2026, 6, 30),
            'schedule_picking_start': date(2026, 7, 1),
            'schedule_picking_end': date(2026, 7, 15),
            'midterm_grade_start': date(2026, 8, 15),
            'midterm_grade_end': date(2026, 8, 31),
            'final_grade_start': date(2026, 10, 1),
            'final_grade_end': date(2026, 10, 15),
            'is_active': is_active,
        },
    )
    if is_active:
        term.is_active = True
        term.save()
    stdout.write(f'  Term: {term.code} (active={term.is_active})')
    return term


def create_past_term(stdout):
    """Create an inactive past term (2025-2)."""
    return create_term(
        stdout,
        code='2025-2',
        semester_type='2',
        academic_year='2025-2026',
        start=date(2025, 11, 1),
        end=date(2026, 3, 31),
        is_active=False,
    )


# ──────────────────────────────────────────────
# Room helpers
# ──────────────────────────────────────────────

ROOM_CONFIG = [
    ('Room 101', 'LECTURE', 40),
    ('Room 102', 'LECTURE', 40),
    ('Room 103', 'LECTURE', 40),
    ('Room 104', 'LECTURE', 40),
    ('Room 105', 'LECTURE', 40),
    ('Lab 201', 'COMPUTER_LAB', 40),
    ('Lab 202', 'COMPUTER_LAB', 40),
    ('Lab 203', 'COMPUTER_LAB', 40),
    ('Sci Lab 1', 'SCIENCE_LAB', 40),
    ('Sci Lab 2', 'SCIENCE_LAB', 40),
]


def create_rooms(stdout):
    """Create standard rooms."""
    rooms = []
    for name, rtype, cap in ROOM_CONFIG:
        room, _ = Room.objects.get_or_create(
            name=name, defaults={'room_type': rtype, 'capacity': cap}
        )
        rooms.append(room)
    stdout.write(f'  Rooms: {len(rooms)}')
    return rooms


# ──────────────────────────────────────────────
# Professor helpers
# ──────────────────────────────────────────────

PROFESSOR_CONFIG = [
    ('prof1', 'Prof', 'One', date(1985, 1, 1)),
    ('prof2', 'Prof', 'Two', date(1986, 5, 15)),
    ('prof3', 'Prof', 'Three', date(1987, 10, 20)),
    ('prof4', 'Prof', 'Four', date(1988, 2, 10)),
    ('prof5', 'Prof', 'Five', date(1989, 3, 20)),
    ('prof6', 'Prof', 'Six', date(1990, 4, 15)),
    ('prof7', 'Prof', 'Seven', date(1991, 5, 25)),
    ('prof8', 'Prof', 'Eight', date(1992, 6, 30)),
]

DAY_SESSION_AVAILABILITY = [
    ('M', 'AM'), ('M', 'PM'),
    ('T', 'AM'), ('T', 'PM'),
    ('W', 'AM'), ('W', 'PM'),
    ('TH', 'AM'), ('TH', 'PM'),
    ('F', 'AM'), ('F', 'PM'),
]


def create_professors(curriculum, stdout, with_availability=False):
    """
    Create professors, assign Y1S1 subjects (distributed).
    Returns list of (Professor, [Subject]) tuples.
    """
    subjects = get_subjects(curriculum, year_level=1, semester='1')
    
    professors = []
    for idx, (username, first, last, dob) in enumerate(PROFESSOR_CONFIG):
        emp_id = f'EMP{str(idx + 1).zfill(3)}'
        pw = f'{emp_id}{dob.strftime("%m%d")}'

        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': f'{username}@richwell.edu',
                'first_name': first,
                'last_name': last,
                'role': User.RoleChoices.PROFESSOR,
            },
        )
        if created:
            user.set_password(pw)
            user.save()

        # Some are part-time
        estatus = 'PART_TIME' if idx >= 6 else 'FULL_TIME'

        prof, _ = Professor.objects.get_or_create(
            user=user,
            defaults={
                'employee_id': emp_id,
                'department': 'Information Systems',
                'employment_status': estatus,
                'date_of_birth': dob,
            },
        )

        # Assign subjects (distribute subjects among professors)
        # Each professor gets 2 subjects round-robin style
        assigned_subjects = []
        if subjects:
            s1 = subjects[(idx * 2) % len(subjects)]
            s2 = subjects[(idx * 2 + 1) % len(subjects)]
            assigned_subjects = [s1, s2]
            for subj in assigned_subjects:
                ProfessorSubject.objects.get_or_create(professor=prof, subject=subj)

        # Set varied availability
        if with_availability:
            avail_days = ['M', 'T', 'W', 'TH', 'F']
            sessions = ['AM', 'PM']
            
            if username in ['prof3', 'prof4']:
                avail_days = ['M', 'W', 'F']
            elif username in ['prof5', 'prof6']:
                avail_days = ['T', 'TH']
            elif username in ['prof7', 'prof8']:
                sessions = ['AM']
                
            for day in avail_days:
                for session in sessions:
                    ProfessorAvailability.objects.get_or_create(
                        professor=prof, day=day, session=session
                    )

        professors.append((prof, assigned_subjects))

    stdout.write(f'  Professors: {len(professors)} (varied availability={with_availability})')
    return professors


# ──────────────────────────────────────────────
# Student helpers
# ──────────────────────────────────────────────

def generate_student(idx, program, curriculum, student_type='FRESHMAN',
                     status='APPROVED', dob=date(2005, 1, 1), is_active_user=True):
    """
    Create a User + Student pair.
    Password: {idn}{MMDD} for approved students, 'password123' for applicants.
    Returns Student instance.
    """
    idn = f'27{str(idx).zfill(4)}'
    username = idn if status != 'APPLICANT' else f'APP-{idx}'

    if status == 'APPLICANT':
        idn = f'APP-{idx}'

    user, created = User.objects.get_or_create(
        username=username,
        defaults={
            'email': f'student{idx}@example.com',
            'first_name': 'Student',
            'last_name': str(idx),
            'role': User.RoleChoices.STUDENT,
            'is_active': is_active_user,
        },
    )
    if created:
        if status == 'APPLICANT':
            user.set_password(DEFAULT_PASSWORD)
        else:
            user.set_password(f'{idn}{dob.strftime("%m%d")}')
        user.save()

    student, _ = Student.objects.get_or_create(
        user=user,
        defaults={
            'idn': idn,
            'program': program,
            'curriculum': curriculum,
            'student_type': student_type,
            'status': status,
            'date_of_birth': dob,
            'gender': 'MALE' if idx % 2 == 0 else 'FEMALE',
            'is_advising_unlocked': student_type == 'FRESHMAN',
            'contact_number': f'0917{str(idx).zfill(7)}',
            'guardian_name': f'Guardian of Student {idx}',
            'guardian_contact': f'0918{str(idx).zfill(7)}',
            'address_municipality': 'Meycauayan',
            'address_barangay': 'Pandayan',
        },
    )

    return student


def create_enrollment(student, term, approver, year_level=1, advising_status='APPROVED',
                      monthly_commitment=Decimal('5000.00'), is_regular=True):
    """Create a StudentEnrollment record."""
    enrollment, _ = StudentEnrollment.objects.get_or_create(
        student=student,
        term=term,
        defaults={
            'advising_status': advising_status,
            'is_regular': is_regular,
            'year_level': year_level,
            'advising_approved_by': approver if advising_status == 'APPROVED' else None,
            'monthly_commitment': monthly_commitment,
            'enrolled_by': approver,
        },
    )
    return enrollment


def create_grade_records(student, term, subjects, grade_status='ENROLLED',
                         advising_status='APPROVED', section=None):
    """Create Grade records for a student's subjects."""
    grades = []
    for subj in subjects:
        grade, _ = Grade.objects.get_or_create(
            student=student,
            subject=subj,
            term=term,
            defaults={
                'advising_status': advising_status,
                'grade_status': grade_status,
                'section': section,
            },
        )
        grades.append(grade)
    return grades


def update_system_sequence(year_prefix, last_value):
    """Keep SystemSequence in sync with the IDNs we created."""
    seq, _ = SystemSequence.objects.get_or_create(key=f'idn_{year_prefix}')
    if seq.last_value < last_value:
        seq.last_value = last_value
        seq.save()


# ──────────────────────────────────────────────
# Section helpers
# ──────────────────────────────────────────────

def create_sections(term, program, year_level, num_students, subjects, stdout):
    """
    Create sections and empty schedule slots (matching SectioningService logic).
    Returns list of Section instances.
    """
    if num_students == 0:
        return []

    num_sections = math.ceil(num_students / 40.0)
    target_capacity = math.ceil(num_students / num_sections) if num_sections > 0 else 40
    num_am = math.ceil(num_sections / 2.0)

    created_sections = []
    for i in range(1, num_sections + 1):
        session = 'AM' if i <= num_am else 'PM'
        section_name = f'{program.code} {year_level}-{i} ({term.code})'

        section, _ = Section.objects.update_or_create(
            term=term,
            program=program,
            year_level=year_level,
            section_number=i,
            defaults={
                'name': section_name,
                'session': session,
                'target_students': target_capacity,
                'max_students': 40,
            },
        )
        created_sections.append(section)

        # Create empty schedule slots for each subject
        for subj in subjects:
            if subj.lec_units > 0:
                Schedule.objects.get_or_create(
                    term=term, section=section, subject=subj, component_type='LEC',
                    defaults={'days': [], 'start_time': None, 'end_time': None},
                )
            if subj.lab_units > 0:
                Schedule.objects.get_or_create(
                    term=term, section=section, subject=subj, component_type='LAB',
                    defaults={'days': [], 'start_time': None, 'end_time': None},
                )

    stdout.write(f'  Sections: {len(created_sections)} (Y{year_level})')
    return created_sections


def assign_students_to_sections(students, sections, term, stdout):
    """
    Distribute students evenly across sections.
    Updates Grade.section and creates SectionStudent records.
    """
    if not sections:
        return

    for idx, student in enumerate(students):
        section = sections[idx % len(sections)]

        # Create home section assignment
        SectionStudent.objects.get_or_create(
            section=section,
            student=student,
            defaults={'is_home_section': True},
        )

        # Update all grade records for this term to point to this section
        Grade.objects.filter(
            student=student, term=term, section__isnull=True
        ).update(section=section)

    stdout.write(f'  Students assigned to sections: {len(students)}')


def assign_schedules(sections, professors, rooms, stdout):
    """
    Assign professors, rooms, and times to schedule slots.
    Maps professor subjects to matching schedule slots.
    """
    am_hours = list(range(7, 12))
    pm_hours = list(range(13, 18))

    # Build professor -> subjects map
    prof_subjects = {}
    for prof, subjects in professors:
        for subj in subjects:
            prof_subjects[subj.id] = prof

    room_idx = 0
    for section in sections:
        hours = am_hours if section.session == 'AM' else pm_hours
        hour_idx = 0

        schedules = Schedule.objects.filter(section=section)
        for sched in schedules:
            # Assign professor if they teach this subject
            prof = prof_subjects.get(sched.subject_id)
            if prof:
                sched.professor = prof

            # Assign room (round-robin)
            if rooms:
                sched.room = rooms[room_idx % len(rooms)]
                room_idx += 1

            # Assign time slot
            if hour_idx < len(hours):
                num_hours = sched.subject.lec_units if sched.component_type == 'LEC' else sched.subject.lab_units
                num_hours = max(num_hours, 1)
                start_h = hours[hour_idx % len(hours)]
                end_h = min(start_h + num_hours, hours[-1] + 1)

                sched.days = ['M', 'W'] if sched.component_type == 'LEC' else ['T', 'TH']
                sched.start_time = time(start_h, 0)
                sched.end_time = time(end_h, 0)
                hour_idx += 1

            sched.save()

    stdout.write(f'  Schedules assigned for {len(sections)} sections')
