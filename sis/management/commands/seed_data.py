"""
Management command to seed test data for development and testing.

Creates:
- Academic years and semesters
- Programs and subjects
- Sections with schedules
- Test students with enrollments
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from sis.models import (
    AcademicYear,
    Semester,
    Program,
    Subject,
    Section,
    SectionSubject,
    ScheduleSlot,
)


class Command(BaseCommand):
    help = 'Seed database with test data for development'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting data seeding...'))

        # Create Academic Year
        current_year = timezone.now().year
        academic_year, created = AcademicYear.objects.get_or_create(
            year=f"{current_year}-{current_year + 1}",
            defaults={
                'start_date': f"{current_year}-06-01",
                'end_date': f"{current_year + 1}-05-31",
                'is_current': True,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'[OK] Created Academic Year: {academic_year.year}'))

        # Create Semesters
        semesters = {}
        for sem_num in [1, 2]:
            semester, created = Semester.objects.get_or_create(
                academic_year=academic_year,
                number=sem_num,
                defaults={
                    'start_date': f"{current_year}-{'06' if sem_num == 1 else '11'}-01",
                    'end_date': f"{current_year + (1 if sem_num == 2 else 0)}-{'10' if sem_num == 1 else '04'}-30",
                    'is_active': (sem_num == 1),
                }
            )
            semesters[sem_num] = semester
            if created:
                self.stdout.write(self.style.SUCCESS(f'[OK] Created Semester {sem_num}'))

        # Create Programs
        programs_data = [
            {'code': 'BSIT', 'name': 'Bachelor of Science in Information Technology'},
            {'code': 'BSCS', 'name': 'Bachelor of Science in Computer Science'},
            {'code': 'BSECE', 'name': 'Bachelor of Science in Electronics and Communications Engineering'},
        ]

        programs = {}
        for prog_data in programs_data:
            program, created = Program.objects.get_or_create(
                code=prog_data['code'],
                defaults={
                    'name': prog_data['name'],
                    'is_active': True,
                }
            )
            programs[prog_data['code']] = program
            if created:
                self.stdout.write(self.style.SUCCESS(f"[OK] Created Program: {program.code}"))

        # Create Subjects (sample courses for BSIT)
        bsit_subjects = [
            {'code': 'CS101', 'title': 'Introduction to Programming', 'units': 3, 'year_level': 1, 'semester': 1, 'is_major': True},
            {'code': 'CS102', 'title': 'Digital Logic Design', 'units': 3, 'year_level': 1, 'semester': 1, 'is_major': True},
            {'code': 'MATH101', 'title': 'Discrete Mathematics', 'units': 3, 'year_level': 1, 'semester': 1, 'is_major': False},
            {'code': 'CS201', 'title': 'Data Structures', 'units': 3, 'year_level': 2, 'semester': 1, 'is_major': True},
            {'code': 'CS202', 'title': 'Algorithms', 'units': 3, 'year_level': 2, 'semester': 1, 'is_major': True},
            {'code': 'ENGl101', 'title': 'English Composition', 'units': 3, 'year_level': 1, 'semester': 2, 'is_major': False},
            {'code': 'CS103', 'title': 'Object-Oriented Programming', 'units': 3, 'year_level': 1, 'semester': 2, 'is_major': True},
        ]

        subjects = {}
        for subj_data in bsit_subjects:
            subject, created = Subject.objects.get_or_create(
                program=programs['BSIT'],
                code=subj_data['code'],
                defaults={
                    'title': subj_data['title'],
                    'units': subj_data['units'],
                    'is_major': subj_data['is_major'],
                    'year_level': subj_data['year_level'],
                    'semester_number': subj_data['semester'],
                }
            )
            subjects[subj_data['code']] = subject
            if created:
                self.stdout.write(self.style.SUCCESS(f"[OK] Created Subject: {subject.code} - {subject.title}"))

        # Set up prerequisites (CS201 requires CS101)
        cs201 = subjects.get('CS201')
        cs101 = subjects.get('CS101')
        if cs201 and cs101:
            cs201.prerequisites.add(cs101)
            self.stdout.write(self.style.SUCCESS("[OK] Set prerequisites"))

        # Create Sections for Semester 1
        sections_data = [
            {'code': 'BSIT-1A', 'semester': 1, 'capacity': 30},
            {'code': 'BSIT-1B', 'semester': 1, 'capacity': 30},
            {'code': 'BSIT-2A', 'semester': 1, 'capacity': 25},
        ]

        sections = {}
        for sec_data in sections_data:
            section, created = Section.objects.get_or_create(
                code=sec_data['code'],
                semester=semesters[sec_data['semester']],
                defaults={
                    'capacity': sec_data['capacity'],
                    'is_open': True,
                }
            )
            sections[sec_data['code']] = section
            if created:
                self.stdout.write(self.style.SUCCESS(f"[OK] Created Section: {section.code}"))

        # Create SectionSubjects with Schedules
        section_subjects_data = [
            {'section': 'BSIT-1A', 'subject': 'CS101', 'day': 'MON', 'start': '08:00', 'end': '09:30', 'room': 'Room 101'},
            {'section': 'BSIT-1A', 'subject': 'CS102', 'day': 'WED', 'start': '10:00', 'end': '11:30', 'room': 'Room 101'},
            {'section': 'BSIT-1A', 'subject': 'MATH101', 'day': 'FRI', 'start': '14:00', 'end': '15:30', 'room': 'Room 102'},
            {'section': 'BSIT-1B', 'subject': 'CS101', 'day': 'TUE', 'start': '09:00', 'end': '10:30', 'room': 'Room 103'},
            {'section': 'BSIT-1B', 'subject': 'CS102', 'day': 'THU', 'start': '10:00', 'end': '11:30', 'room': 'Room 103'},
            {'section': 'BSIT-2A', 'subject': 'CS201', 'day': 'MON', 'start': '10:00', 'end': '11:30', 'room': 'Room 201'},
            {'section': 'BSIT-2A', 'subject': 'CS202', 'day': 'WED', 'start': '14:00', 'end': '15:30', 'room': 'Room 201'},
        ]

        for ssub_data in section_subjects_data:
            section = sections.get(ssub_data['section'])
            subject = subjects.get(ssub_data['subject'])

            if section and subject:
                section_subject, created = SectionSubject.objects.get_or_create(
                    section=section,
                    subject=subject,
                    defaults={
                        'is_tba': False,
                    }
                )

                if created:
                    # Create schedule slot
                    ScheduleSlot.objects.create(
                        section_subject=section_subject,
                        day=ssub_data['day'],
                        start_time=ssub_data['start'],
                        end_time=ssub_data['end'],
                        room=ssub_data['room'],
                    )
                    self.stdout.write(self.style.SUCCESS(
                        f"[OK] Created SectionSubject: {section.code} - {subject.code} "
                        f"({ssub_data['day']} {ssub_data['start']}-{ssub_data['end']} {ssub_data['room']})"
                    ))

        self.stdout.write(self.style.SUCCESS('[OK] Data seeding complete!'))
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('Summary:'))
        self.stdout.write(f'  - Academic Year: {academic_year.year}')
        self.stdout.write(f'  - Semesters: 2')
        self.stdout.write(f'  - Programs: {len(programs)}')
        self.stdout.write(f'  - Subjects: {len(subjects)}')
        self.stdout.write(f'  - Sections: {len(sections)}')
        self.stdout.write('')
        self.stdout.write('You can now:')
        self.stdout.write('  1. Visit http://localhost:8000/enroll to test enrollment')
        self.stdout.write('  2. Login to admin at http://localhost:8000/admin')
        self.stdout.write('  3. Create test students and enrollments manually')
