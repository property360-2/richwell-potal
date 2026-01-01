"""
Schedule Seeder - Seeds realistic schedule data for existing sections.

Usage:
    python manage.py seed_schedules            # Seed schedules for existing sections
    python manage.py seed_schedules --clear    # Clear existing schedules first
"""

from django.core.management.base import BaseCommand
from django.db import transaction
import random

from apps.academics.models import (
    Section, SectionSubject, SectionSubjectProfessor, ScheduleSlot, Subject
)
from apps.accounts.models import User, ProfessorProfile


class Command(BaseCommand):
    help = 'Seed realistic schedule data for existing sections'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing schedule slots before seeding'
        )

    def handle(self, *args, **options):
        try:
            with transaction.atomic():
                if options['clear']:
                    self.stdout.write('Clearing existing schedule slots...')
                    count = ScheduleSlot.objects.all().delete()[0]
                    self.stdout.write(f'  Deleted {count} schedule slots')

                self.stdout.write('=' * 60)
                self.stdout.write('SEEDING SCHEDULE DATA')
                self.stdout.write('=' * 60)

                # Check if sections exist
                sections = Section.objects.all()
                if not sections.exists():
                    self.stdout.write(self.style.WARNING('No sections found. Please run seed_complete_data first.'))
                    return

                # Ensure section-subjects exist
                self.stdout.write('\n[Step 1] Ensuring section-subjects exist...')
                section_subjects = self.ensure_section_subjects(sections)

                # Assign professors
                self.stdout.write('[Step 2] Assigning professors to section-subjects...')
                self.assign_professors(section_subjects)

                # Create schedule slots
                self.stdout.write('[Step 3] Creating schedule slots...')
                self.create_schedule_slots(section_subjects)

                self.stdout.write('\n' + '=' * 60)
                self.stdout.write(self.style.SUCCESS('SCHEDULE SEEDING COMPLETED!'))
                self.stdout.write('=' * 60)
                self.print_summary()

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error: {str(e)}'))
            raise

    def ensure_section_subjects(self, sections):
        """Create section-subject records for each section based on program/year/semester."""
        section_subjects = []

        for section in sections:
            # Get current semester number (assuming 2nd semester for now)
            current_sem = 2

            # Get subjects matching this section's program, year, and semester
            matching_subjects = Subject.objects.filter(
                programs=section.program,
                year_level=section.year_level,
                semester_number=current_sem
            )

            for subject in matching_subjects:
                ss, created = SectionSubject.objects.get_or_create(
                    section=section,
                    subject=subject
                )
                section_subjects.append(ss)
                if created:
                    self.stdout.write(f'  [+] Created: {section.name} - {subject.code}')

        self.stdout.write(f'  Total section-subjects: {len(section_subjects)}')
        return section_subjects

    def assign_professors(self, section_subjects):
        """Assign professors to section-subjects."""
        professors = list(ProfessorProfile.objects.all())

        if not professors:
            self.stdout.write(self.style.WARNING('  No professors found. Creating default professors...'))
            # Create some default professors
            prof_data = [
                ('prof.santos@richwell.edu.ph', 'Juan', 'Santos'),
                ('prof.garcia@richwell.edu.ph', 'Maria', 'Garcia'),
                ('prof.reyes@richwell.edu.ph', 'Pedro', 'Reyes'),
                ('prof.cruz@richwell.edu.ph', 'Ana', 'Cruz'),
                ('prof.lopez@richwell.edu.ph', 'Jose', 'Lopez'),
            ]
            for email, first, last in prof_data:
                user, _ = User.objects.get_or_create(
                    email=email,
                    defaults={
                        'first_name': first,
                        'last_name': last,
                        'role': 'PROFESSOR',
                        'is_verified': True
                    }
                )
                if not hasattr(user, 'professor_profile'):
                    prof = ProfessorProfile.objects.create(user=user)
                    professors.append(prof)
                else:
                    professors.append(user.professor_profile)

        assigned_count = 0
        for ss in section_subjects:
            if not SectionSubjectProfessor.objects.filter(section_subject=ss).exists():
                professor = random.choice(professors)
                SectionSubjectProfessor.objects.create(
                    section_subject=ss,
                    professor=professor,
                    is_primary=True
                )
                assigned_count += 1

        self.stdout.write(f'  Assigned {assigned_count} professors')

    def create_schedule_slots(self, section_subjects):
        """Create realistic weekly schedules using 1-hour blocks."""

        # 1-hour time blocks from 7am to 9pm
        time_blocks = [
            ('07:00', '08:00'), ('08:00', '09:00'), ('09:00', '10:00'),
            ('10:00', '11:00'), ('11:00', '12:00'),
            # Skip lunch 12:00-13:00
            ('13:00', '14:00'), ('14:00', '15:00'), ('15:00', '16:00'),
            ('16:00', '17:00'), ('17:00', '18:00'), ('18:00', '19:00'),
            ('19:00', '20:00'), ('20:00', '21:00')
        ]

        # Room types
        lecture_rooms = ['Room 101', 'Room 102', 'Room 103', 'Room 104', 'Room 105',
                        'Room 201', 'Room 202', 'Room 203', 'Room 204', 'Room 205']
        lab_rooms = ['Lab 1', 'Lab 2', 'Lab 3', 'Lab 4', 'Lab 5']

        # Schedule patterns
        patterns = {
            'MWF': ['MON', 'WED', 'FRI'],
            'TTH': ['TUE', 'THU'],
            'MW': ['MON', 'WED'],
            'TF': ['TUE', 'FRI'],
        }

        # Track occupied slots per section
        section_occupied = {}
        room_occupied = {}

        # Group by section
        sections_map = {}
        for ss in section_subjects:
            section_id = ss.section.id
            if section_id not in sections_map:
                sections_map[section_id] = []
            sections_map[section_id].append(ss)

        created_count = 0
        pattern_list = ['MWF', 'TTH', 'MW', 'TF']

        for section_id, section_subs in sections_map.items():
            section_subs.sort(key=lambda x: x.subject.code)
            current_slot_idx = 0
            current_pattern_idx = 0

            for section_subject in section_subs:
                # Skip if already has schedule
                if ScheduleSlot.objects.filter(section_subject=section_subject).exists():
                    continue

                subject = section_subject.subject
                units = subject.units

                # Determine room type
                is_lab = any(kw in subject.code.upper() for kw in ['LAB', 'PROG', 'WEBDEV', 'DATABASE'])
                available_rooms = lab_rooms if is_lab else lecture_rooms

                # Choose pattern based on units
                if units >= 3:
                    pattern_key = pattern_list[current_pattern_idx % len(pattern_list)]
                    days = patterns[pattern_key]
                else:
                    pattern_key = 'TTH' if current_pattern_idx % 2 == 0 else 'MW'
                    days = patterns[pattern_key]

                current_pattern_idx += 1

                # Find available time slot
                slot_found = False
                for time_idx in range(len(time_blocks)):
                    adjusted_idx = (current_slot_idx + time_idx) % len(time_blocks)
                    time_slot = time_blocks[adjusted_idx]

                    # Check availability for this section
                    all_days_available = True
                    for day in days:
                        key = (section_id, day, time_slot[0])
                        if key in section_occupied:
                            all_days_available = False
                            break

                    if all_days_available:
                        # Find available room
                        room_found = None
                        for room in available_rooms:
                            room_available = True
                            for day in days:
                                room_key = (day, time_slot[0], room)
                                if room_key in room_occupied:
                                    room_available = False
                                    break
                            if room_available:
                                room_found = room
                                break

                        if room_found:
                            # Create slots for all days
                            for day in days:
                                ScheduleSlot.objects.create(
                                    section_subject=section_subject,
                                    day=day,
                                    start_time=time_slot[0],
                                    end_time=time_slot[1],
                                    room=room_found
                                )
                                created_count += 1
                                section_occupied[(section_id, day, time_slot[0])] = True
                                room_occupied[(day, time_slot[0], room_found)] = True

                            slot_found = True
                            current_slot_idx = (adjusted_idx + 1) % len(time_blocks)
                            break

                if not slot_found:
                    # Fallback to Saturday
                    for time_slot in time_blocks[:8]:
                        room = random.choice(available_rooms)
                        room_key = ('SAT', time_slot[0], room)
                        if room_key not in room_occupied:
                            ScheduleSlot.objects.create(
                                section_subject=section_subject,
                                day='SAT',
                                start_time=time_slot[0],
                                end_time=time_slot[1],
                                room=room
                            )
                            created_count += 1
                            room_occupied[room_key] = True
                            self.stdout.write(f'    [!] Fallback SAT: {subject.code}')
                            break

        self.stdout.write(f'  Created {created_count} schedule slots')

    def print_summary(self):
        """Print summary statistics."""
        self.stdout.write('\nSummary:')
        self.stdout.write(f'  Sections: {Section.objects.count()}')
        self.stdout.write(f'  Section-Subjects: {SectionSubject.objects.count()}')
        self.stdout.write(f'  Professor Assignments: {SectionSubjectProfessor.objects.count()}')
        self.stdout.write(f'  Schedule Slots: {ScheduleSlot.objects.count()}')

        # Show sample schedules
        self.stdout.write('\nSample Schedule (first 10):')
        for slot in ScheduleSlot.objects.select_related('section_subject__subject', 'section_subject__section')[:10]:
            self.stdout.write(f'  {slot.section_subject.section.name} | {slot.section_subject.subject.code} | '
                            f'{slot.day} {slot.start_time}-{slot.end_time} | {slot.room}')
