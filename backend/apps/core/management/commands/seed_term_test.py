from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from datetime import timedelta, time
from apps.academics.models import Program, Curriculum, Subject, Section, SectionSubject, ScheduleSlot, Room, CurriculumSubject
from apps.enrollment.models import Semester

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds a specific testing scenario for Term Management: one active but closed term and one setup term.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Initiating Term Management Test Scenario seed...'))

        # 1. Wipe Database
        self.stdout.write('Wiping database...')
        call_command('flush', '--no-input')
        self.stdout.write(self.style.SUCCESS('Database wiped successfully.'))

        with transaction.atomic():
            # 2. Create Users
            self.stdout.write('Creating users...')
            User.objects.create_superuser(
                username='admin',
                email='admin@richwell.edu.ph',
                password='password123',
                first_name='Admin',
                last_name='User'
            )
            User.objects.create_user(
                username='registrar',
                email='registrar@richwell.edu.ph',
                password='password123',
                first_name='Reggie',
                last_name='Registrar',
                role='REGISTRAR'
            )
            self.stdout.write(self.style.SUCCESS('Users created: admin, registrar / password123'))

            # 3. Create Basic Academic Layout
            self.stdout.write('Setting up academic foundation...')
            Room.objects.create(name='Room 101', capacity=45)
            Room.objects.create(name='Lab 1', capacity=30)
            Room.objects.create(name='Lab 2', capacity=30)
            
            programs_data = [
                {
                    'code': 'BSIS',
                    'name': 'Bachelor of Science in Information Systems',
                    'curricula': ['REV-2023', 'REV-2024']
                },
                {
                    'code': 'BSCS',
                    'name': 'Bachelor of Science in Computer Science',
                    'curricula': ['REV-2023', 'REV-2024']
                }
            ]

            for p_data in programs_data:
                program = Program.objects.create(
                    code=p_data['code'],
                    name=p_data['name'],
                    duration_years=4
                )
                
                # Create subjects for the program first (shared by curricula)
                subjects_by_code = {}
                self.stdout.write(f"  Creating subjects for {program.code}...")
                for year in range(1, 5):
                    for sem in range(1, 3):
                        for i in range(1, 6):
                            code = f"{p_data['code']}{year}{sem}0{i}"
                            title = f"{p_data['code']} Subject Y{year}S{sem} - {i}"
                            
                            subject = Subject.objects.create(
                                program=program,
                                code=code,
                                title=title,
                                units=3,
                                year_level=year,
                                semester_number=sem,
                                classification='MAJOR' if i <= 3 else 'MINOR',
                                is_major=i <= 3
                            )
                            subjects_by_code[code] = subject
                            
                            # Add Prerequisite
                            if year > 1 or (year == 1 and sem == 2):
                                prev_year = year
                                prev_sem = sem - 1
                                if prev_sem == 0:
                                    prev_year -= 1
                                    prev_sem = 2
                                
                                prev_code = f"{p_data['code']}{prev_year}{prev_sem}0{i}"
                                if prev_code in subjects_by_code:
                                    subject.prerequisites.add(subjects_by_code[prev_code])

                # Now create curricula and link subjects
                for curr_code in p_data['curricula']:
                    curriculum = Curriculum.objects.create(
                        program=program,
                        code=f"{p_data['code']}-{curr_code}",
                        name=f"{p_data['name']} {curr_code}",
                        effective_year=int(curr_code.split('-')[1])
                    )
                    
                    self.stdout.write(f"  Linking subjects to {curriculum.code}...")
                    for subject in subjects_by_code.values():
                        CurriculumSubject.objects.create(
                            curriculum=curriculum,
                            subject=subject,
                            year_level=subject.year_level,
                            semester_number=subject.semester_number
                        )

            # 4. Create Past Semester (Ended Yesterday, Current=True)
            self.stdout.write('Creating Past Semester scenario...')
            today = timezone.now().date()
            yesterday = today - timedelta(days=1)
            six_months_ago = today - timedelta(days=180)

            past_sem = Semester.objects.create(
                name='1st Semester',
                academic_year='2024-2025',
                start_date=six_months_ago,
                end_date=yesterday,
                status=Semester.TermStatus.GRADING_CLOSED,
                is_current=True,
                enrollment_start_date=six_months_ago,
                enrollment_end_date=six_months_ago + timedelta(days=30),
                grading_start_date=yesterday - timedelta(days=15),
                grading_end_date=yesterday
            )

            # 5. Seed Past Semester Data (Sections for Year 1-4)
            bsis = Program.objects.get(code='BSIS')
            curr_bsis = Curriculum.objects.get(code='BSIS-REV-2024')
            
            for y in range(1, 5):
                section = Section.objects.create(
                    name=f'BSIS{y}-1',
                    program=bsis,
                    semester=past_sem,
                    curriculum=curr_bsis,
                    year_level=y,
                    capacity=40
                )
                
                # Assign one subject to the section
                subject_code = f'BSIS{y}101'
                subject = Subject.objects.get(code=subject_code, program=bsis)
                
                sec_subject = SectionSubject.objects.create(
                    section=section,
                    subject=subject,
                    is_tba=False
                )
                
                ScheduleSlot.objects.create(
                    section_subject=sec_subject,
                    day=ScheduleSlot.Day.MON,
                    start_time=time(8 + y, 0),
                    end_time=time(10 + y, 0),
                    room='Room 101'
                )
            
            self.stdout.write(self.style.SUCCESS(f'Past Semester "{past_sem.name}" seeded with sections for all years.'))

            # 6. Create Upcoming Semester (Starts Today, Current=False)
            four_months_later = today + timedelta(days=120)

            Semester.objects.create(
                name='2nd Semester',
                academic_year='2024-2025',
                start_date=today,
                end_date=four_months_later,
                status=Semester.TermStatus.SETUP,
                is_current=False,
                enrollment_start_date=today + timedelta(days=7),
                enrollment_end_date=today + timedelta(days=21),
                grading_start_date=four_months_later - timedelta(days=15),
                grading_end_date=four_months_later
            )
            
            self.stdout.write(self.style.SUCCESS('Planned Upcoming Semester created.'))

        self.stdout.write(self.style.SUCCESS('Term Management Scenario Seed completed!'))
