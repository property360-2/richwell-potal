"""
Complete Demo Seeder — seed_complete.py
Wipes all data (except superusers) and re-seeds a full demo environment:
  - Permissions and semester
  - Admin, Registrar, Cashier, Admission, Department Head accounts
  - 5 Professors with profiles
  - Curriculum from CSV (all programs)
  - Sections for all programs (Year 1-4) with assigned subjects and professors
  - Conflict-free class schedules
  - Demo students with full grade history
    - studentpassed@richwell.edu  — All subjects passed
    - studentinc@richwell.edu     — Has 1 active INC (CC223, prof: prof1@richwell.edu)

Usage:
    python manage.py seed_complete
"""

import csv, random, re
from decimal import Decimal
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User, StudentProfile, ProfessorProfile, Permission, PermissionCategory
from apps.academics.models import (
    Program, Subject, Curriculum, CurriculumSubject,
    Section, SectionSubject, SectionSubjectProfessor,
    ScheduleSlot, Room
)
from apps.enrollment.models import Semester, Enrollment, SubjectEnrollment


class Command(BaseCommand):
    help = 'Complete wipe + reseed of demo environment (run this to reset everything)'

    CSV_PATH = 'C:/Users/Administrator/Desktop/richwell-potal/documentation/curriculum.csv'

    PERMISSION_STRUCTURE = {
        'program_management': {
            'name': 'Program Management', 'icon': 'graduation-cap', 'order': 1,
            'permissions': [
                {'code': 'program.view', 'name': 'View Programs', 'default_roles': ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR']},
                {'code': 'program.create', 'name': 'Create Programs', 'default_roles': ['ADMIN', 'HEAD_REGISTRAR']},
                {'code': 'program.edit', 'name': 'Edit Programs', 'default_roles': ['ADMIN', 'HEAD_REGISTRAR']},
                {'code': 'program.delete', 'name': 'Delete Programs', 'default_roles': ['ADMIN']},
            ]
        },
        'subject_management': {
            'name': 'Subject Management', 'icon': 'book-open', 'order': 2,
            'permissions': [
                {'code': 'subject.view', 'name': 'View Subjects', 'default_roles': ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR', 'PROFESSOR']},
                {'code': 'subject.create', 'name': 'Create Subjects', 'default_roles': ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR']},
                {'code': 'subject.edit', 'name': 'Edit Subjects', 'default_roles': ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR']},
                {'code': 'subject.delete', 'name': 'Delete Subjects', 'default_roles': ['ADMIN', 'HEAD_REGISTRAR']},
            ]
        },
        'enrollment_management': {
            'name': 'Enrollment Management', 'icon': 'user-plus', 'order': 3,
            'permissions': [
                {'code': 'enrollment.view', 'name': 'View Enrollments', 'default_roles': ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR']},
                {'code': 'enrollment.approve', 'name': 'Approve Enrollments', 'default_roles': ['ADMIN', 'HEAD_REGISTRAR', 'DEPARTMENT_HEAD']},
            ]
        },
    }

    def parse_year_semester(self, text):
        year_map = {'1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5}
        sem_map = {'1st': 1, '2nd': 2, 'Summer': 3}
        year_match = re.search(r'(\d\w+)\s+Year', text)
        sem_match = re.search(r'(\d\w+|Summer)\s+Semester', text)
        year = year_map.get(year_match.group(1)) if year_match else 1
        semester = sem_map.get(sem_match.group(1)) if sem_match else 1
        if 'Summer' in text:
            semester = 3
        return year, semester

    def log(self, msg):
        self.stdout.write(msg)

    def ok(self, msg):
        self.stdout.write(self.style.SUCCESS(msg))

    def err(self, msg):
        self.stdout.write(self.style.ERROR(msg))

    def handle(self, *args, **options):
        self.log('=' * 60)
        self.log(' RICHWELL PORTAL — COMPLETE DEMO SEEDER')
        self.log('=' * 60)

        with transaction.atomic():
            self._wipe()
            self._seed_permissions()
            active_semester = self._seed_semester()
            self._seed_staff_accounts()
            professors = self._seed_professors()
            self._seed_curriculum()
            sections = self._seed_sections(active_semester, professors)
            self._seed_schedules(sections, active_semester)
            self._seed_students(active_semester, professors)

        self.ok('\n' + '=' * 60)
        self.ok(' SEEDING COMPLETE!')
        self.ok('=' * 60)

    # ─── Step 1: Wipe ──────────────────────────────────────────────
    def _wipe(self):
        self.log('\n[1/7] Wiping all data (except superusers)...')
        from django.db import connection
        from django.apps import apps
        with connection.cursor() as cursor:
            cursor.execute("SET session_replication_role = 'replica';")
            for app_label in ['enrollment', 'academics', 'accounts', 'core', 'audit']:
                app_config = apps.get_app_config(app_label)
                for model in app_config.get_models():
                    if model._meta.model_name == 'user':
                        cursor.execute(f'DELETE FROM "{model._meta.db_table}" WHERE is_superuser = False;')
                    else:
                        cursor.execute(f'DELETE FROM "{model._meta.db_table}";')
            cursor.execute("SET session_replication_role = 'origin';")
        self.ok('    Wipe complete.')

    # ─── Step 2: Permissions ────────────────────────────────────────
    def _seed_permissions(self):
        self.log('\n[2/7] Seeding permissions...')
        for cat_code, cat_data in self.PERMISSION_STRUCTURE.items():
            cat, _ = PermissionCategory.objects.update_or_create(
                code=cat_code,
                defaults={'name': cat_data['name'], 'icon': cat_data['icon'], 'order': cat_data['order']}
            )
            for p_data in cat_data['permissions']:
                Permission.objects.update_or_create(
                    code=p_data['code'],
                    defaults={'category': cat, 'name': p_data['name'], 'default_for_roles': p_data['default_roles']}
                )
        self.ok('    Permissions seeded.')

    # ─── Step 3: Semester ───────────────────────────────────────────
    def _seed_semester(self):
        self.log('\n[3/7] Seeding current semester...')
        today = date.today()
        sem, _ = Semester.objects.get_or_create(
            academic_year='2024-2025',
            name='2nd Semester',
            defaults={
                'start_date': today - timedelta(days=30),
                'end_date': today + timedelta(days=120),
                'enrollment_start_date': today - timedelta(days=60),
                'enrollment_end_date': today + timedelta(days=30),
                'status': Semester.TermStatus.ENROLLMENT_OPEN,
                'is_current': True,
            }
        )
        self.ok(f'    Active semester: {sem.name} {sem.academic_year}')
        return sem

    # ─── Step 4: Staff Accounts ─────────────────────────────────────
    def _seed_staff_accounts(self):
        self.log('\n[4/7] Creating staff accounts...')
        accounts = [
            ('admin@richwell.edu', 'System', 'Administrator', 'ADMIN', True),
            ('registrar@richwell.edu', 'Regina', 'Reyes', 'REGISTRAR', False),
            ('cashier@richwell.edu', 'Carlos', 'Bautista', 'CASHIER', False),
            ('admission@richwell.edu', 'Ana', 'Mendoza', 'ADMISSION', False),
            ('head@richwell.edu', 'Rodrigo', 'Duterte', 'DEPARTMENT_HEAD', False),
        ]
        for email, fname, lname, role, is_admin in accounts:
            if is_admin:
                if not User.objects.filter(email=email).exists():
                    User.objects.create_superuser(email=email, password='password123', first_name=fname, last_name=lname)
            else:
                user, created = User.objects.get_or_create(
                    email=email,
                    defaults={
                        'first_name': fname, 'last_name': lname,
                        'role': role, 'username': email.split('@')[0],
                    }
                )
                if created:
                    user.set_password('password123')
                    user.save()
            self.log(f'    + {role}: {email}')
        self.ok('    Staff accounts ready.')

    # ─── Step 5: Professors ─────────────────────────────────────────
    def _seed_professors(self):
        self.log('\n[5/7] Creating professor accounts...')
        prof_data = [
            ('prof1@richwell.edu', 'Maria', 'Santos'),
            ('prof2@richwell.edu', 'Juan', 'Dela Cruz'),
            ('prof3@richwell.edu', 'Jose', 'Rizal'),
            ('prof4@richwell.edu', 'Andres', 'Bonifacio'),
            ('prof5@richwell.edu', 'Emilio', 'Aguinaldo'),
        ]
        professors = []
        for email, fname, lname in prof_data:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': fname, 'last_name': lname,
                    'role': 'PROFESSOR', 'username': email.split('@')[0],
                }
            )
            if created:
                user.set_password('password123')
                user.save()
            ProfessorProfile.objects.get_or_create(user=user, defaults={'department': 'General'})
            professors.append(user)
            self.log(f'    + PROFESSOR: {email}')
        self.ok('    Professors ready.')
        return professors

    # ─── Step 6: Curriculum from CSV ────────────────────────────────
    def _seed_curriculum(self):
        self.log('\n[6/7] Importing curriculum from CSV...')
        try:
            with open(self.CSV_PATH, mode='r', encoding='utf-8') as f:
                rows = list(csv.DictReader(f))

            programs, curricula = {}, {}
            for code in set(row['Program'] for row in rows):
                p, _ = Program.objects.get_or_create(code=code, defaults={'name': code.replace('_', ' ')})
                programs[code] = p
                c, _ = Curriculum.objects.get_or_create(
                    program=p, code='2024-STD',
                    defaults={'name': f'{code} Standard Curriculum 2024', 'effective_year': 2024}
                )
                curricula[code] = c

            for row in rows:
                code = row['Program_Code'].strip()
                title = row['Subject_Description'].strip()
                units = int(float(row['Total_Units'].strip() or '3'))
                year, semester = self.parse_year_semester(row['Year_Semester'])
                s, _ = Subject.objects.update_or_create(
                    code=code,
                    defaults={
                        'program': programs[row['Program']], 'title': title,
                        'units': units if units > 0 else 3, 'year_level': year, 'semester_number': semester
                    }
                )
                CurriculumSubject.objects.update_or_create(
                    curriculum=curricula[row['Program']], subject=s,
                    defaults={'year_level': year, 'semester_number': semester}
                )
            self.ok(f'    Imported {len(rows)} curriculum entries across {len(programs)} programs.')
        except Exception as e:
            self.err(f'    CSV import failed: {e}')

    # ─── Step 7a: Sections + Subject Assignments ─────────────────────
    def _seed_sections(self, active_semester, professors):
        self.log('\n[7/7] Creating sections & assigning professors...')
        active_sem_num = 1 if '1st' in active_semester.name else (3 if 'Summer' in active_semester.name else 2)
        sections_with_subjects = []

        for program in Program.objects.all():
            curriculum = Curriculum.objects.filter(program=program).first()
            if not curriculum:
                continue
            for year_level in range(1, 5):
                section_name = f'{program.code}-{year_level}A'
                section, _ = Section.objects.get_or_create(
                    semester=active_semester, program=program, year_level=year_level, name=section_name,
                    defaults={'capacity': 40, 'curriculum': curriculum}
                )
                curr_subs = CurriculumSubject.objects.filter(
                    curriculum=curriculum, year_level=year_level, semester_number=active_sem_num
                )
                for cs in curr_subs:
                    ss, _ = SectionSubject.objects.get_or_create(section=section, subject=cs.subject)
                    if not SectionSubjectProfessor.objects.filter(section_subject=ss).exists():
                        SectionSubjectProfessor.objects.create(
                            section_subject=ss, professor=random.choice(professors), is_primary=True
                        )
                    sections_with_subjects.append(ss)

        self.ok(f'    Created sections with {len(sections_with_subjects)} subject assignments.')
        return sections_with_subjects

    # ─── Step 7b: Schedules ─────────────────────────────────────────
    def _seed_schedules(self, section_subjects, active_semester):
        self.log('    Building conflict-free schedules...')
        ScheduleSlot.objects.all().delete()

        for name, r_type in [('RM-101', 'LECTURE'), ('RM-102', 'LECTURE'), ('RM-103', 'LECTURE'), ('LAB-1', 'COMPUTER_LAB'), ('LAB-2', 'COMPUTER_LAB')]:
            Room.objects.get_or_create(name=name, defaults={'room_type': r_type, 'capacity': 40})
        rooms = list(Room.objects.values_list('name', flat=True))

        time_blocks = [
            ('07:00:00', '08:00:00'), ('08:00:00', '09:00:00'), ('09:00:00', '10:00:00'),
            ('10:00:00', '11:00:00'), ('11:00:00', '12:00:00'),
            ('13:00:00', '14:00:00'), ('14:00:00', '15:00:00'), ('15:00:00', '16:00:00'),
            ('16:00:00', '17:00:00'), ('17:00:00', '18:00:00'),
        ]
        patterns = [['MON', 'WED', 'FRI'], ['TUE', 'THU'], ['MON', 'WED'], ['TUE', 'FRI'], ['SAT']]

        prof_occ, room_occ, sec_occ = set(), set(), set()
        created_count = 0
        for ss in section_subjects:
            ssp = SectionSubjectProfessor.objects.filter(section_subject=ss, is_primary=True).first()
            if not ssp:
                continue
            prof_id, sec_id = ssp.professor.id, ss.section.id
            random.shuffle(patterns)
            for pattern in patterns:
                for start, end in time_blocks:
                    ok = all((prof_id, d, start) not in prof_occ and (sec_id, d, start) not in sec_occ for d in pattern)
                    if not ok:
                        continue
                    for room in rooms:
                        if any((room, d, start) in room_occ for d in pattern):
                            continue
                        for day in pattern:
                            ScheduleSlot.objects.create(section_subject=ss, day=day, start_time=start, end_time=end, room=room)
                            prof_occ.add((prof_id, day, start))
                            room_occ.add((room, day, start))
                            sec_occ.add((sec_id, day, start))
                        created_count += 1
                        break
                    else:
                        continue
                    break
                else:
                    continue
                break

        self.ok(f'    Generated {created_count} schedule slots.')

    # ─── Step 7c: Demo Students ─────────────────────────────────────
    def _seed_students(self, active_semester, professors):
        self.log('    Creating demo students with grade history...')
        program = Program.objects.filter(code='BS_Information_Systems').first()
        curriculum = Curriculum.objects.filter(program=program).first()
        home_section = Section.objects.filter(semester=active_semester, program=program, year_level=3).first()

        # The INC professor is explicitly prof1
        inc_professor = next((p for p in professors if 'prof1' in p.email), professors[0])

        students_data = [
            {
                'email': 'studentpassed@richwell.edu',
                'first_name': 'Thirdy',
                'last_name': 'Passed',
                'student_number': '2022-10001',
                'give_inc': False,
            },
            {
                'email': 'studentinc@richwell.edu',
                'first_name': 'Carlo',
                'last_name': 'dela Cruz',
                'student_number': '2022-10002',
                'give_inc': True,
            },
        ]

        # Past sems use old academic years to avoid colliding with the current active semester (2024-2025 2nd Sem)
        past_sems_data = [
            ('1st Semester', '2022-2023', 1, 1),
            ('2nd Semester', '2022-2023', 1, 2),
            ('1st Semester', '2023-2024', 2, 1),
            ('2nd Semester', '2023-2024', 2, 2),  # <-- INC lives here
        ]
        start_date = date(2022, 8, 1)
        past_sems = []
        for name, ay, yl, sn in past_sems_data:
            sem, created = Semester.objects.get_or_create(
                name=name, academic_year=ay,
                defaults={'start_date': start_date, 'end_date': start_date + timedelta(days=120), 'status': Semester.TermStatus.ARCHIVED}
            )
            if not created:
                # Ensure it stays archived, not the current one
                sem.status = Semester.TermStatus.ARCHIVED
                sem.is_current = False
                sem.save()
            start_date += timedelta(days=150)
            past_sems.append({'semester': sem, 'year_level': yl, 'semester_number': sn})

        for sdata in students_data:
            user, created = User.objects.get_or_create(
                email=sdata['email'],
                defaults={
                    'first_name': sdata['first_name'], 'last_name': sdata['last_name'],
                    'role': 'STUDENT', 'username': sdata['email'].split('@')[0],
                    'student_number': sdata['student_number'],
                }
            )
            if created:
                user.set_password('password123')
                user.save()

            profile, _ = StudentProfile.objects.get_or_create(
                user=user,
                defaults={
                    'program': program, 'curriculum': curriculum,
                    'year_level': 3, 'status': 'ACTIVE', 'academic_status': 'REGULAR',
                    'home_section': home_section,
                }
            )
            profile.year_level = 3
            profile.home_section = home_section
            profile.save()

            inc_assigned = False
            for sem_info in past_sems:
                past_sem = sem_info['semester']
                y_lvl, s_num = sem_info['year_level'], sem_info['semester_number']

                enrollment, _ = Enrollment.objects.get_or_create(
                    student=user, semester=past_sem,
                    defaults={'status': Enrollment.Status.COMPLETED, 'created_via': Enrollment.CreatedVia.ONLINE, 'monthly_commitment': Decimal('1500.00'), 'first_month_paid': True}
                )
                enrollment.status = Enrollment.Status.COMPLETED
                enrollment.save()

                section_name = f'BSIS-{y_lvl}A-HIST'
                past_section, _ = Section.objects.get_or_create(
                    name=section_name, semester=past_sem, program=program,
                    defaults={'year_level': y_lvl, 'curriculum': curriculum, 'capacity': 40}
                )

                curr_subs = CurriculumSubject.objects.filter(curriculum=curriculum, year_level=y_lvl, semester_number=s_num)

                for i, cs in enumerate(curr_subs):
                    ss, _ = SectionSubject.objects.get_or_create(section=past_section, subject=cs.subject)

                    # Assign professor; force inc_professor for the INC subject
                    is_inc_subject = sdata['give_inc'] and not inc_assigned and y_lvl == 2 and s_num == 2 and i == 0
                    assigned_prof = inc_professor if is_inc_subject else random.choice(professors)
                    if is_inc_subject:
                        # Always force the correct professor on the INC subject
                        SectionSubjectProfessor.objects.filter(section_subject=ss).delete()
                        SectionSubjectProfessor.objects.create(section_subject=ss, professor=assigned_prof, is_primary=True)
                    elif not SectionSubjectProfessor.objects.filter(section_subject=ss).exists():
                        SectionSubjectProfessor.objects.create(section_subject=ss, professor=assigned_prof, is_primary=True)

                    grade = 'INC' if is_inc_subject else '1.75'
                    status = SubjectEnrollment.Status.INC if is_inc_subject else SubjectEnrollment.Status.PASSED

                    se, _ = SubjectEnrollment.objects.get_or_create(
                        enrollment=enrollment, subject=cs.subject,
                        defaults={'section': past_section, 'status': status, 'grade': grade, 'is_finalized': True}
                    )
                    se.status = status
                    se.grade = grade
                    se.is_finalized = True
                    if is_inc_subject:
                        # Use a recent date so the INC is ACTIVE (not expired) when the seeder runs
                        from datetime import datetime
                        recent_inc_date = timezone.make_aware(
                            datetime.combine(date.today() - timedelta(days=60), datetime.min.time())
                        )
                        se.inc_marked_at = recent_inc_date
                        inc_assigned = True
                    se.save()

            self.log(f'    + STUDENT: {sdata["email"]} (INC={sdata["give_inc"]})')

        self.ok('    Students seeded.')
