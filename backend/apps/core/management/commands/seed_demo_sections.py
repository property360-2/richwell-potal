import random
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.timezone import now

from apps.academics.models import (
    Program, Section, SectionSubject, SectionSubjectProfessor, ScheduleSlot, Subject, CurriculumSubject, Room
)
from apps.accounts.models import User, ProfessorProfile
from apps.enrollment.models import Semester

class Command(BaseCommand):
    help = 'Seed demo sections, professors, and conflict-free schedules for existing programs'

    def handle(self, *args, **options):
        self.stdout.write("🚀 Seeding sections, professors, and schedules...")

        with transaction.atomic():
            # 1. Get Active Semester
            active_semester = Semester.objects.filter(is_current=True).first()
            if not active_semester:
                self.stdout.write(self.style.ERROR("No active semester found. Aborting."))
                return
            
            # 2. Wipe existing section data for this semester
            self.stdout.write(f"🧹 Wiping existing section subjects for {active_semester.name}...")
            SectionSubject.objects.filter(section__semester=active_semester).delete()
            
            # 3. Add Professors
            self.stdout.write("👨‍🏫 Ensuring Professors exist...")
            prof_data = [
                ('prof1@richwell.edu', 'Maria', 'Santos'),
                ('prof2@richwell.edu', 'Juan', 'Dela Cruz'),
                ('prof3@richwell.edu', 'Jose', 'Rizal'),
                ('prof4@richwell.edu', 'Andres', 'Bonifacio'),
                ('prof5@richwell.edu', 'Emilio', 'Aguinaldo'),
            ]
            professor_users = []
            for email, fname, lname in prof_data:
                user, created = User.objects.get_or_create(
                    email=email,
                    defaults={
                        'first_name': fname,
                        'last_name': lname,
                        'role': 'PROFESSOR',
                        'username': email.split('@')[0]
                    }
                )
                if created:
                    user.set_password('password123')
                    user.save()
                ProfessorProfile.objects.get_or_create(user=user, defaults={'department': 'General'})
                professor_users.append(user)

            # Determine current semester number (1 or 2)
            active_sem_num = 1 if "1st" in active_semester.name else 2
            if "Summer" in active_semester.name: active_sem_num = 3

            # 3. Create Sections for all year levels (1-4) for every program
            sections = []
            programs = Program.objects.all()
            for obj in programs:
                for yl in range(1, 5): # Years 1 to 4
                    section_name = f"{obj.code}-{yl}A"
                    section, created = Section.objects.get_or_create(
                        semester=active_semester,
                        program=obj,
                        year_level=yl,
                        name=section_name,
                        defaults={'capacity': 40}
                    )
                    sections.append(section)
                    if created:
                        self.stdout.write(f"  [+] Created Section: {section_name}")

            # 4. Map subjects for these sections and Assign Professors
            section_subjects_list = []
            self.stdout.write(f"📚 Assigning subjects for {active_semester.name} (Sem {active_sem_num})...")
            for section in sections:
                # Based on the CSV seeder, subjects are assigned to curricula. Let's find subjects purely by program
                # Fetch subjects linked to this program via any CurriculumSubject of Year Y and Semester S
                curr_subs = CurriculumSubject.objects.filter(
                    curriculum__program=section.program,
                    year_level=section.year_level,
                    semester_number=active_sem_num
                )
                
                for cs in curr_subs:
                    ss, created = SectionSubject.objects.get_or_create(
                        section=section,
                        subject=cs.subject
                    )
                    section_subjects_list.append(ss)
                    
                    # Assign Professor
                    if not SectionSubjectProfessor.objects.filter(section_subject=ss).exists():
                        SectionSubjectProfessor.objects.create(
                            section_subject=ss,
                            professor=random.choice(professor_users),
                            is_primary=True
                        )

            # 5. Build Schedules with STRICT Conflict Checking
            self.stdout.write("📅 Generating conflict-free schedules...")
            ScheduleSlot.objects.all().delete() # Wipe previous schedules just in case
            
            time_blocks = [
                ('07:00:00', '08:00:00'), ('08:00:00', '09:00:00'), ('09:00:00', '10:00:00'),
                ('10:00:00', '11:00:00'), ('11:00:00', '12:00:00'),
                ('13:00:00', '14:00:00'), ('14:00:00', '15:00:00'), ('15:00:00', '16:00:00'),
                ('16:00:00', '17:00:00'), ('17:00:00', '18:00:00')
            ]
            rooms_data = [
                ('RM-101', 'LECTURE'),
                ('RM-102', 'LECTURE'),
                ('RM-103', 'LECTURE'),
                ('LAB-1', 'COMPUTER_LAB'),
                ('LAB-2', 'COMPUTER_LAB')
            ]
            rooms = []
            for name, r_type in rooms_data:
                Room.objects.get_or_create(name=name, defaults={'room_type': r_type, 'capacity': 40})
                rooms.append(name)
            patterns = [
                ['MON', 'WED', 'FRI'],
                ['TUE', 'THU'],
                ['MON', 'WED'],
                ['TUE', 'FRI'],
                ['SAT']
            ]
            
            # Tracking maps to avoid constraints
            professor_occupied = set() # (prof_id, day, start_time)
            room_occupied = set()      # (room, day, start_time)
            section_occupied = set()   # (section_id, day, start_time)

            created_count = 0
            for ss in section_subjects_list:
                ssp = SectionSubjectProfessor.objects.filter(section_subject=ss, is_primary=True).first()
                if not ssp: continue
                prof_id = ssp.professor.id
                section_id = ss.section.id

                # Try to find a free slot
                slot_assigned = False
                random.shuffle(patterns) # randomize patterns
                
                for pattern in patterns:
                    if slot_assigned: break
                    
                    for time_slot in time_blocks:
                        if slot_assigned: break
                        
                        start_time = time_slot[0]
                        end_time = time_slot[1]
                        
                        # Check availability across all days in pattern
                        can_use_pattern = True
                        for day in pattern:
                            if (prof_id, day, start_time) in professor_occupied or \
                               (section_id, day, start_time) in section_occupied:
                                can_use_pattern = False
                                break
                        
                        if can_use_pattern:
                            # Find a free room
                            for room in rooms:
                                room_free = True
                                for day in pattern:
                                    if (room, day, start_time) in room_occupied:
                                        room_free = False
                                        break
                                
                                if room_free:
                                    # Book it!
                                    for day in pattern:
                                        ScheduleSlot.objects.create(
                                            section_subject=ss,
                                            day=day,
                                            start_time=start_time,
                                            end_time=end_time,
                                            room=room
                                        )
                                        professor_occupied.add((prof_id, day, start_time))
                                        room_occupied.add((room, day, start_time))
                                        section_occupied.add((section_id, day, start_time))
                                        created_count += 1
                                    
                                    slot_assigned = True
                                    break

            self.stdout.write(self.style.SUCCESS(f"✅ Generated {created_count} schedule slots without conflicts!"))
