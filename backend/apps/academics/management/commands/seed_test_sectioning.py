import csv
import re
from datetime import date
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import User
from apps.academics.models import CurriculumVersion, Program, Subject, SubjectPrerequisite
from apps.facilities.models import Room
from apps.faculty.models import Professor, ProfessorAvailability, ProfessorSubject
from apps.grades.models import Grade
from apps.finance.models import Payment
from apps.notifications.models import Notification
from apps.scheduling.models import Schedule
from apps.sections.models import Section, SectionStudent
from apps.students.models import Student, StudentEnrollment
from apps.terms.models import Term


class Command(BaseCommand):
    help = 'Full reset-and-seed: wipes data (optional), creates staff, professors, BSIS curriculum, term, rooms, students'

    def add_arguments(self, parser):
        parser.add_argument(
            '--no-wipe',
            action='store_true',
            help='Skip wipe phase; seed only (assumes base data exists)',
        )

    def handle(self, *args, **options):
        wipe = not options.get('no_wipe', False)

        if wipe:
            self._wipe_all()
        else:
            self.stdout.write(self.style.WARNING('Skipping wipe (--no-wipe).'))

        with transaction.atomic():
            staff = self._create_staff_users()
            program, curriculum = self._load_bsis_curriculum()
            if not program or not curriculum:
                raise RuntimeError('Failed to load BSIS curriculum from CSV')
            active_term = self._create_term()
            self._create_rooms()
            self._create_professors(program, curriculum, staff)
            self._create_students(program, curriculum, active_term, staff)

        self.stdout.write(self.style.SUCCESS('Seed completed successfully.'))

    def _wipe_all(self):
        """Delete all data in reverse FK order."""
        self.stdout.write('Wiping all data...')
        models_order = [
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
            SubjectPrerequisite,
            Subject,
            CurriculumVersion,
            Program,
            User,
        ]
        with transaction.atomic():
            for model in models_order:
                cnt, _ = model.objects.all().delete()
                if cnt:
                    self.stdout.write(f'  Deleted {cnt} {model.__name__}')
        self.stdout.write(self.style.SUCCESS('Wipe completed.'))

    def _create_staff_users(self):
        """Create staff users. Returns dict role -> User."""
        default_pass = 'password123'
        staff_config = [
            ('admin', 'Admin', 'User', 'admin@richwell.edu', User.RoleChoices.ADMIN),
            ('headreg', 'Head', 'Registrar', 'headreg@richwell.edu', User.RoleChoices.HEAD_REGISTRAR),
            ('registrar', 'Registrar', 'Staff', 'registrar@richwell.edu', User.RoleChoices.REGISTRAR),
            ('admission', 'Admission', 'Staff', 'admission@richwell.edu', User.RoleChoices.ADMISSION),
            ('cashier', 'Cashier', 'Staff', 'cashier@richwell.edu', User.RoleChoices.CASHIER),
            ('dean', 'Dean', 'Faculty', 'dean@richwell.edu', User.RoleChoices.DEAN),
            ('programhead', 'Program', 'Head', 'programhead@richwell.edu', User.RoleChoices.PROGRAM_HEAD),
        ]
        staff = {}
        for username, first, last, email, role in staff_config:
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
                user.set_password(default_pass)
                user.save()
            staff[role] = user
        self.stdout.write(f'  Staff users: {len(staff)}')
        return staff

    def _load_bsis_curriculum(self):
        """Load BS_Information_Systems program, curriculum, subjects from CSV."""
        csv_path = Path(settings.BASE_DIR) / 'data' / 'curriculum.csv'
        if not csv_path.exists():
            self.stdout.write(self.style.ERROR(f'CSV not found: {csv_path}'))
            return None, None

        program, _ = Program.objects.get_or_create(
            code='BS_Information_Systems',
            defaults={'name': 'BS in Information Systems'},
        )
        curriculum, _ = CurriculumVersion.objects.get_or_create(
            program=program,
            version_name='V1',
            defaults={'is_active': True},
        )
        curriculum.is_active = True
        curriculum.save()

        subject_map = {}
        with open(csv_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            reader.fieldnames = [n.strip() for n in reader.fieldnames or []]
            rows = [row for row in reader if (row.get('Program') or '').strip() == 'BS_Information_Systems']

        for row in rows:
            row = {k.strip(): (v.strip() if v else '') for k, v in row.items() if k}
            yr_sem = row.get('Year_Semester', '')
            year_level = 1
            semester = '1'
            if 'Summer' in yr_sem:
                semester = 'S'
            else:
                if '1st Year' in yr_sem:
                    year_level = 1
                elif '2nd Year' in yr_sem:
                    year_level = 2
                elif '3rd Year' in yr_sem:
                    year_level = 3
                elif '4th Year' in yr_sem:
                    year_level = 4
                if '1st Semester' in yr_sem:
                    semester = '1'
                elif '2nd Semester' in yr_sem:
                    semester = '2'

            subject_code = row.get('Program_Code', '').strip()
            if not subject_code:
                continue

            lec_units = int(row.get('Lec_Units') or 0)
            lab_units = int(row.get('Lab_Units') or 0)
            total_units = int(row.get('Total_Units') or 0)
            desc = row.get('Subject_Description', '')

            subject, _ = Subject.objects.update_or_create(
                curriculum=curriculum,
                code=subject_code,
                defaults={
                    'description': desc,
                    'year_level': year_level,
                    'semester': semester,
                    'lec_units': lec_units,
                    'lab_units': lab_units,
                    'total_units': total_units,
                    'is_practicum': 'Practicum' in desc or 'practicum' in desc.lower(),
                },
            )
            subject_map[(curriculum.id, subject_code)] = subject

        for row in rows:
            row = {k.strip(): (v.strip() if v else '') for k, v in row.items() if k}
            prereq_str = row.get('Prerequisites', '')
            if not prereq_str or prereq_str.lower() in ['none', 'n/a', '-']:
                continue
            subject_code = row.get('Program_Code', '').strip()
            subject = subject_map.get((curriculum.id, subject_code))
            if not subject:
                continue
            prereq_codes = [p.strip() for p in re.split(r'[,;]', prereq_str) if p.strip()]
            for p_code in prereq_codes:
                p_subject = Subject.objects.filter(curriculum=curriculum, code=p_code).first()
                if p_subject:
                    SubjectPrerequisite.objects.get_or_create(
                        subject=subject,
                        prerequisite_type='SPECIFIC',
                        prerequisite_subject=p_subject,
                    )
                elif 'Year Standing' in p_code:
                    m = re.search(r'(\d)', p_code)
                    if m:
                        SubjectPrerequisite.objects.get_or_create(
                            subject=subject,
                            prerequisite_type='YEAR_STANDING',
                            standing_year=int(m.group(1)),
                        )

        self.stdout.write(f'  BSIS: {Subject.objects.filter(curriculum=curriculum).count()} subjects')
        return program, curriculum

    def _create_term(self):
        """Create active term 2026-1."""
        base = date(2026, 6, 1)
        term, _ = Term.objects.get_or_create(
            code='2026-1',
            defaults={
                'academic_year': '2026-2027',
                'semester_type': '1',
                'start_date': base,
                'end_date': date(2026, 10, 31),
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
                'is_active': True,
            },
        )
        term.is_active = True
        term.save()
        self.stdout.write(f'  Term: {term.code}')
        return term

    def _create_rooms(self):
        """Create 5 rooms."""
        rooms = [
            ('Room 101', 'LECTURE', 40),
            ('Room 102', 'LECTURE', 40),
            ('Room 103', 'LECTURE', 35),
            ('Lab 201', 'COMPUTER_LAB', 25),
            ('Lab 202', 'COMPUTER_LAB', 25),
        ]
        for name, rtype, cap in rooms:
            Room.objects.get_or_create(name=name, defaults={'room_type': rtype, 'capacity': cap})
        self.stdout.write(f'  Rooms: {len(rooms)}')

    def _create_professors(self, program, curriculum, staff):
        """Create 3 professors with assigned subjects (1st Year 1st Sem)."""
        program_head = staff.get(User.RoleChoices.PROGRAM_HEAD)
        subjects_qs = Subject.objects.filter(
            curriculum=curriculum,
            year_level=1,
            semester='1',
            is_practicum=False,
        ).order_by('code')

        subj_list = list(subjects_qs)
        if len(subj_list) < 9:
            self.stdout.write(self.style.WARNING('Not enough 1st Year 1st Sem subjects for 3 professors'))
            return

        assignments = [
            (subj_list[0:3], 'Prof', 'One', date(1985, 1, 1)),
            (subj_list[3:6], 'Prof', 'Two', date(1986, 5, 15)),
            (subj_list[6:9], 'Prof', 'Three', date(1987, 10, 20)),
        ]

        for idx, (subjs, first, last, dob) in enumerate(assignments, start=1):
            emp_id = f'EMP{str(idx).zfill(3)}'
            pw = f'{emp_id}{dob.strftime("%m%d")}'
            user, created = User.objects.get_or_create(
                username=f'prof{idx}',
                defaults={
                    'email': f'prof{idx}@richwell.edu',
                    'first_name': first,
                    'last_name': last,
                    'role': User.RoleChoices.PROFESSOR,
                },
            )
            if created:
                user.set_password(pw)
                user.save()

            prof, _ = Professor.objects.get_or_create(
                user=user,
                defaults={
                    'employee_id': emp_id,
                    'department': 'Information Systems',
                    'employment_status': 'FULL_TIME',
                    'date_of_birth': dob,
                },
            )

            for subj in subjs:
                ProfessorSubject.objects.get_or_create(professor=prof, subject=subj)

        self.stdout.write(f'  Professors: 3 with assigned subjects')

    def _create_students(self, program, curriculum, term, staff):
        """Create 150 sample students: mostly regular, some transferee."""
        approver = staff.get(User.RoleChoices.PROGRAM_HEAD) or staff.get(User.RoleChoices.ADMIN)
        subjects = list(
            Subject.objects.filter(
                curriculum=curriculum,
                year_level=1,
                semester=term.semester_type,
                is_practicum=False,
            )
        )
        if not subjects:
            self.stdout.write(self.style.WARNING('No subjects for students; skipping.'))
            return

        self.stdout.write(f'  Creating 150 students...')
        for idx in range(1, 151):
            idn = f'27{str(idx).zfill(4)}'  # e.g., 270001 to 270150
            username = f'student{idx}'
            first = f'Student'
            last = str(idx)
            
            # Mix student types: 80% Freshman/Regular, 20% Transferee/Irregular
            is_transferee = idx > 120
            stype = 'TRANSFEREE' if is_transferee else 'FRESHMAN'
            regular = not is_transferee

            pw = f'{idn}0101'
            user, _ = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': f'{username}@example.com',
                    'first_name': first,
                    'last_name': last,
                    'role': User.RoleChoices.STUDENT,
                },
            )
            user.set_password(pw)
            user.save()

            student, _ = Student.objects.get_or_create(
                user=user,
                defaults={
                    'idn': idn,
                    'program': program,
                    'curriculum': curriculum,
                    'student_type': stype,
                    'status': 'APPROVED',
                    'date_of_birth': date(2005, 1, 1),
                    'gender': 'MALE' if idx % 2 == 0 else 'FEMALE',
                    'is_advising_unlocked': True,
                },
            )

            enrollment, _ = StudentEnrollment.objects.get_or_create(
                student=student,
                term=term,
                defaults={
                    'advising_status': 'APPROVED',
                    'is_regular': regular,
                    'year_level': 1,
                    'advising_approved_by': approver,
                },
            )

            for subj in subjects:
                Grade.objects.get_or_create(
                    student=student,
                    subject=subj,
                    term=term,
                    defaults={
                        'advising_status': 'APPROVED',
                        'grade_status': 'ADVISING',
                    },
                )

        self.stdout.write(self.style.SUCCESS(f'  Successfully created 150 students (Approved & Ready for Sectioning)'))
