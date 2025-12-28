"""
Seed subjects with proper prerequisite ordering.
CRITICAL: No prerequisite within the same year/semester!

Usage:
    python manage.py seed_subjects_with_prereqs
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from apps.academics.models import Program, Subject


class Command(BaseCommand):
    help = 'Seed subjects with proper prerequisite ordering (no same year/sem prereqs)'

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('=' * 70))
        self.stdout.write(self.style.SUCCESS('  SEEDING SUBJECTS WITH PROPER PREREQUISITE ORDERING'))
        self.stdout.write(self.style.SUCCESS('=' * 70))

        # Get programs
        programs = {p.code: p for p in Program.objects.all()}
        if not programs:
            self.stdout.write(self.style.ERROR('No programs found! Run seed_all_data first.'))
            return

        # Define all subjects with proper ordering
        subjects_data = [
            # ===== YEAR 1, SEMESTER 1 (Foundation - NO Prerequisites) =====
            {'code': 'ENG101', 'title': 'English Communication 1', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS', 'BSBA'], 'year': 1, 'sem': 1, 'prereqs': []},
            {'code': 'MATH101', 'title': 'College Algebra', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS', 'BSBA'], 'year': 1, 'sem': 1, 'prereqs': []},
            {'code': 'NSTP101', 'title': 'National Service Training Program 1', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS', 'BSBA'], 'year': 1, 'sem': 1, 'prereqs': []},
            {'code': 'PE101', 'title': 'Physical Education 1', 'units': 2,
             'programs': ['BSIT', 'BSIS', 'BSCS', 'BSBA'], 'year': 1, 'sem': 1, 'prereqs': []},
            {'code': 'CS101', 'title': 'Introduction to Computing', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS'], 'year': 1, 'sem': 1, 'prereqs': []},
            {'code': 'PROG101', 'title': 'Computer Programming 1', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS'], 'year': 1, 'sem': 1, 'prereqs': []},
            {'code': 'ACCT101', 'title': 'Fundamentals of Accounting', 'units': 3,
             'programs': ['BSBA'], 'year': 1, 'sem': 1, 'prereqs': []},
            {'code': 'MGT101', 'title': 'Introduction to Business', 'units': 3,
             'programs': ['BSBA'], 'year': 1, 'sem': 1, 'prereqs': []},

            # ===== YEAR 1, SEMESTER 2 (Prerequisites from Y1S1 only) =====
            {'code': 'ENG102', 'title': 'English Communication 2', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS', 'BSBA'], 'year': 1, 'sem': 2, 'prereqs': ['ENG101']},
            {'code': 'MATH102', 'title': 'Trigonometry', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS', 'BSBA'], 'year': 1, 'sem': 2, 'prereqs': ['MATH101']},
            {'code': 'NSTP102', 'title': 'National Service Training Program 2', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS', 'BSBA'], 'year': 1, 'sem': 2, 'prereqs': ['NSTP101']},
            {'code': 'PE102', 'title': 'Physical Education 2', 'units': 2,
             'programs': ['BSIT', 'BSIS', 'BSCS', 'BSBA'], 'year': 1, 'sem': 2, 'prereqs': ['PE101']},
            {'code': 'PROG102', 'title': 'Computer Programming 2', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS'], 'year': 1, 'sem': 2, 'prereqs': ['PROG101']},
            {'code': 'WEBDEV101', 'title': 'Web Development Fundamentals', 'units': 3,
             'programs': ['BSIT', 'BSIS'], 'year': 1, 'sem': 2, 'prereqs': ['CS101']},
            {'code': 'DISCRETE', 'title': 'Discrete Mathematics', 'units': 3,
             'programs': ['BSCS'], 'year': 1, 'sem': 2, 'prereqs': ['MATH101']},
            {'code': 'ACCT102', 'title': 'Financial Accounting', 'units': 3,
             'programs': ['BSBA'], 'year': 1, 'sem': 2, 'prereqs': ['ACCT101']},

            # ===== YEAR 2, SEMESTER 1 (Prerequisites from Y1 only) =====
            {'code': 'DATASTRUCT', 'title': 'Data Structures and Algorithms', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS'], 'year': 2, 'sem': 1, 'prereqs': ['PROG102']},
            {'code': 'DATABASE101', 'title': 'Database Management Systems', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS'], 'year': 2, 'sem': 1, 'prereqs': ['PROG102']},
            {'code': 'OOP101', 'title': 'Object-Oriented Programming', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS'], 'year': 2, 'sem': 1, 'prereqs': ['PROG102']},
            {'code': 'STATS101', 'title': 'Statistics and Probability', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS', 'BSBA'], 'year': 2, 'sem': 1, 'prereqs': ['MATH102']},
            {'code': 'WEBDEV201', 'title': 'Advanced Web Development', 'units': 3,
             'programs': ['BSIT', 'BSIS'], 'year': 2, 'sem': 1, 'prereqs': ['WEBDEV101']},
            {'code': 'MGT201', 'title': 'Organizational Management', 'units': 3,
             'programs': ['BSBA'], 'year': 2, 'sem': 1, 'prereqs': ['MGT101']},

            # ===== YEAR 2, SEMESTER 2 (Prerequisites from Y2S1 and earlier) =====
            {'code': 'SOFTENG', 'title': 'Software Engineering', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS'], 'year': 2, 'sem': 2, 'prereqs': ['DATASTRUCT']},
            {'code': 'NETADMIN', 'title': 'Network Administration', 'units': 3,
             'programs': ['BSIT', 'BSIS'], 'year': 2, 'sem': 2, 'prereqs': ['DATABASE101']},
            {'code': 'ALGO', 'title': 'Algorithm Design and Analysis', 'units': 3,
             'programs': ['BSCS'], 'year': 2, 'sem': 2, 'prereqs': ['DATASTRUCT', 'DISCRETE']},
            {'code': 'DATABASE201', 'title': 'Advanced Database Systems', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS'], 'year': 2, 'sem': 2, 'prereqs': ['DATABASE101']},
            {'code': 'MARKETING', 'title': 'Marketing Management', 'units': 3,
             'programs': ['BSBA'], 'year': 2, 'sem': 2, 'prereqs': ['MGT201']},

            # ===== YEAR 3, SEMESTER 1 (Prerequisites from Y2S2 and earlier) =====
            {'code': 'CAPSTONE1', 'title': 'Capstone Project 1', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS'], 'year': 3, 'sem': 1, 'prereqs': ['SOFTENG']},
            {'code': 'MOBDEV', 'title': 'Mobile Application Development', 'units': 3,
             'programs': ['BSIT', 'BSIS'], 'year': 3, 'sem': 1, 'prereqs': ['WEBDEV201', 'OOP101']},
            {'code': 'AI101', 'title': 'Artificial Intelligence', 'units': 3,
             'programs': ['BSCS'], 'year': 3, 'sem': 1, 'prereqs': ['ALGO']},
            {'code': 'SYSADMIN', 'title': 'Systems Administration', 'units': 3,
             'programs': ['BSIT', 'BSIS'], 'year': 3, 'sem': 1, 'prereqs': ['NETADMIN']},
            {'code': 'FINMGT', 'title': 'Financial Management', 'units': 3,
             'programs': ['BSBA'], 'year': 3, 'sem': 1, 'prereqs': ['ACCT102']},

            # ===== YEAR 3, SEMESTER 2 (Prerequisites from Y3S1 and earlier) =====
            {'code': 'CAPSTONE2', 'title': 'Capstone Project 2', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS'], 'year': 3, 'sem': 2, 'prereqs': ['CAPSTONE1']},
            {'code': 'SECURITY', 'title': 'Information Security', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS'], 'year': 3, 'sem': 2, 'prereqs': ['NETADMIN']},
            {'code': 'ML101', 'title': 'Machine Learning', 'units': 3,
             'programs': ['BSCS'], 'year': 3, 'sem': 2, 'prereqs': ['AI101']},
            {'code': 'CLOUD', 'title': 'Cloud Computing', 'units': 3,
             'programs': ['BSIT', 'BSIS'], 'year': 3, 'sem': 2, 'prereqs': ['SYSADMIN']},
            {'code': 'STRAT', 'title': 'Strategic Management', 'units': 3,
             'programs': ['BSBA'], 'year': 3, 'sem': 2, 'prereqs': ['FINMGT']},

            # ===== YEAR 4, SEMESTER 1 (Prerequisites from Y3S2 and earlier) =====
            {'code': 'PRACTICUM', 'title': 'On-the-Job Training', 'units': 6,
             'programs': ['BSIT', 'BSIS', 'BSCS', 'BSBA'], 'year': 4, 'sem': 1, 'prereqs': ['CAPSTONE2']},
            {'code': 'ETHICS', 'title': 'IT Ethics and Professionalism', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS'], 'year': 4, 'sem': 1, 'prereqs': []},
            {'code': 'BIZETHICS', 'title': 'Business Ethics', 'units': 3,
             'programs': ['BSBA'], 'year': 4, 'sem': 1, 'prereqs': []},

            # ===== YEAR 4, SEMESTER 2 (Final Semester) =====
            {'code': 'THESIS', 'title': 'Undergraduate Thesis', 'units': 6,
             'programs': ['BSIT', 'BSIS', 'BSCS', 'BSBA'], 'year': 4, 'sem': 2, 'prereqs': ['PRACTICUM']},
            {'code': 'REVIEW', 'title': 'Comprehensive Exam Review', 'units': 3,
             'programs': ['BSIT', 'BSIS', 'BSCS', 'BSBA'], 'year': 4, 'sem': 2, 'prereqs': []},
        ]

        self.stdout.write('\n[Step 1/2] Creating subjects without prerequisites...')
        created_subjects = {}

        for subj_data in subjects_data:
            # Get programs for this subject
            subject_programs = [programs[code] for code in subj_data['programs'] if code in programs]
            if not subject_programs:
                continue

            primary_program = subject_programs[0]

            # Create or get subject
            subject, created = Subject.objects.get_or_create(
                code=subj_data['code'],
                defaults={
                    'title': subj_data['title'],
                    'units': subj_data['units'],
                    'program': primary_program,
                    'year_level': subj_data['year'],
                    'semester_number': subj_data['sem']
                }
            )

            # Add to all programs (multi-program support)
            subject.programs.set(subject_programs)

            created_subjects[subj_data['code']] = subject
            if created:
                programs_str = ', '.join([p.code for p in subject_programs])
                self.stdout.write(f'  [+] {subject.code} - {subject.title} ({programs_str})')

        self.stdout.write(f'\n  Created {len(created_subjects)} subjects')

        # Step 2: Add prerequisites in correct order
        self.stdout.write('\n[Step 2/2] Adding prerequisites (ordered by year/semester)...')
        prereq_count = 0

        for subj_data in sorted(subjects_data, key=lambda x: (x['year'], x['sem'])):
            if subj_data['prereqs']:
                subject = created_subjects[subj_data['code']]
                prereq_objs = [created_subjects[code] for code in subj_data['prereqs'] if code in created_subjects]

                if prereq_objs:
                    subject.prerequisites.set(prereq_objs)
                    prereq_codes = ', '.join([p.code for p in prereq_objs])
                    self.stdout.write(f'  [+] {subject.code} requires: {prereq_codes}')
                    prereq_count += 1

        self.stdout.write(f'\n  Added {prereq_count} prerequisite relationships')

        # Validation: Verify no same year/sem prerequisites
        self.stdout.write('\n[Validation] Checking prerequisite ordering...')
        errors = []

        for subject in Subject.objects.all():
            for prereq in subject.prerequisites.all():
                # Check if prerequisite is from same or later year/sem
                if (prereq.year_level > subject.year_level or
                    (prereq.year_level == subject.year_level and prereq.semester_number >= subject.semester_number)):
                    errors.append(
                        f'  [ERROR] {subject.code} (Y{subject.year_level}S{subject.semester_number}) '
                        f'has prerequisite {prereq.code} (Y{prereq.year_level}S{prereq.semester_number})'
                    )

        if errors:
            self.stdout.write(self.style.ERROR('\nPrerequisite ordering errors found:'))
            for error in errors:
                self.stdout.write(self.style.ERROR(error))
        else:
            self.stdout.write(self.style.SUCCESS('\n[OK] All prerequisites correctly ordered!'))
            self.stdout.write(self.style.SUCCESS('  No subject has prerequisites from the same or later year/semester'))

        self.stdout.write('\n' + '=' * 70)
        self.stdout.write(self.style.SUCCESS(f'Successfully seeded {Subject.objects.count()} subjects'))
        self.stdout.write('=' * 70)
