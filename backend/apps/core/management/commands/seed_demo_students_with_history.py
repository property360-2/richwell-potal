import random
from decimal import Decimal
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.academics.models import (
    Program, Curriculum, CurriculumSubject, Section, 
    SectionSubject, SectionSubjectProfessor, Room, ScheduleSlot
)
from apps.accounts.models import User, StudentProfile
from apps.enrollment.models import Semester, Enrollment, SubjectEnrollment

class Command(BaseCommand):
    help = 'Seed demo students with past grade history and professors'

    def handle(self, *args, **options):
        self.stdout.write("🚀 Seeding demo students with academic history...")

        with transaction.atomic():
            # 1. Fetch dependencies
            active_semester = Semester.objects.filter(is_current=True).first()
            if not active_semester:
                self.stdout.write(self.style.ERROR("No active semester found. Aborting."))
                return

            program = Program.objects.filter(code='BS_Information_Systems').first()
            if not program:
                self.stdout.write(self.style.ERROR("BS_Information_Systems program not found."))
                return

            curriculum = Curriculum.objects.filter(program=program).first()

            professors = list(User.objects.filter(role='PROFESSOR'))
            if not professors:
                self.stdout.write(self.style.ERROR("No professors found. Run seed_demo_sections first."))
                return

            # 2. Create Past Semesters (Y1S1, Y1S2, Y2S1, Y2S2)
            past_semesters_data = [
                ('1st Semester', '2023-2024', 1, 1),
                ('2nd Semester', '2023-2024', 1, 2),
                ('1st Semester', '2024-2025', 2, 1),
                ('2nd Semester', '2024-2025', 2, 2)
            ]
            past_sems = []
            start_date_base = date(2023, 8, 1)

            for name, acad_year, year_lvl, sem_num in past_semesters_data:
                sem, created = Semester.objects.get_or_create(
                    name=name,
                    academic_year=acad_year,
                    defaults={
                        'start_date': start_date_base,
                        'end_date': start_date_base + timedelta(days=120),
                        'status': Semester.TermStatus.ARCHIVED
                    }
                )
                start_date_base += timedelta(days=150)
                past_sems.append({
                    'semester': sem,
                    'year_level': year_lvl,
                    'semester_number': sem_num
                })

            # 3. Create 2 Demo Students
            student_data = [
                ('student3rdyear@richwell.edu', 'Thirdy', 'Passed'),
                ('studentinc@richwell.edu', 'Incy', 'Wincy')
            ]
            
            created_students = []
            for email, fname, lname in student_data:
                user, created = User.objects.get_or_create(
                    email=email,
                    defaults={
                        'first_name': fname,
                        'last_name': lname,
                        'role': 'STUDENT',
                        'username': email.split('@')[0],
                        'student_number': f"2023-{random.randint(10000, 99999)}"
                    }
                )
                if created:
                    user.set_password('password123')
                    user.save()

                profile, _ = StudentProfile.objects.get_or_create(
                    user=user,
                    defaults={
                        'program': program,
                        'curriculum': curriculum,
                        'year_level': 3,
                        'status': 'ACTIVE',
                        'academic_status': 'REGULAR'
                    }
                )
                # Keep them in 3rd year and assign home section
                profile.year_level = 3
                
                # Try to find a section for them (e.g. BSIS-3A)
                from apps.academics.models import Section
                home_section = Section.objects.filter(
                    semester=active_semester,
                    program=program,
                    year_level=3
                ).first()
                if home_section:
                    profile.home_section = home_section
                
                profile.save()
                created_students.append(user)

            self.stdout.write(f"👨‍🎓 Created students: {[u.email for u in created_students]}")

            # 4. Generate Past History for Each Student
            for user in created_students:
                self.stdout.write(f"  -> Generating history for {user.email}")
                is_inc_student = 'studentinc' in user.email
                inc_assigned = False

                for sem_info in past_sems:
                    past_sem = sem_info['semester']
                    y_lvl = sem_info['year_level']
                    s_num = sem_info['semester_number']

                    # Create Enrollment record
                    status = Enrollment.Status.COMPLETED if not past_sem.is_current else Enrollment.Status.ACTIVE
                    enrollment, _ = Enrollment.objects.get_or_create(
                        student=user,
                        semester=past_sem,
                        defaults={
                            'status': status,
                            'created_via': Enrollment.CreatedVia.ONLINE,
                            'monthly_commitment': Decimal('1500.00'),
                            'first_month_paid': not past_sem.is_current
                        }
                    )
                    enrollment.status = status
                    if past_sem.is_current:
                        enrollment.first_month_paid = False
                    enrollment.save()

                    # Only generate subjects for ARCHIVED/PAST semesters
                    if past_sem.is_current:
                        continue

                    # Create past Section
                    section_name = f"{program.code}-{y_lvl}A"
                    past_section, _ = Section.objects.get_or_create(
                        name=section_name,
                        semester=past_sem,
                        program=program,
                        defaults={
                            'year_level': y_lvl,
                            'curriculum': curriculum,
                            'capacity': 40
                        }
                    )

                    # Get subjects for that year/sem
                    curriculum_subjects = CurriculumSubject.objects.filter(
                        curriculum=curriculum,
                        year_level=y_lvl,
                        semester_number=s_num
                    )

                    for cs in curriculum_subjects:
                        # Link subject to section
                        section_subject, _ = SectionSubject.objects.get_or_create(
                            section=past_section,
                            subject=cs.subject
                        )

                        # Assign random professor
                        if not SectionSubjectProfessor.objects.filter(section_subject=section_subject).exists():
                            SectionSubjectProfessor.objects.create(
                                section_subject=section_subject,
                                professor=random.choice(professors),
                                is_primary=True
                            )

                        # Determine Grade
                        grade = '1.50'
                        status = SubjectEnrollment.Status.PASSED

                        if is_inc_student and not inc_assigned and y_lvl == 2 and s_num == 2:
                            # Apply an INC to one subject in Year 2 Sem 2
                            grade = 'INC'
                            status = SubjectEnrollment.Status.INC
                            inc_assigned = True

                        # Create SubjectEnrollment
                        se, _ = SubjectEnrollment.objects.get_or_create(
                            enrollment=enrollment,
                            subject=cs.subject,
                            defaults={
                                'section': past_section,
                                'status': status,
                                'grade': grade,
                                'is_finalized': True
                            }
                        )
                        se.status = status
                        se.grade = grade
                        se.is_finalized = True
                        if status == SubjectEnrollment.Status.INC:
                            se.inc_marked_at = past_sem.end_date
                        se.save()

            self.stdout.write(self.style.SUCCESS("✅ Demo students with complete histories successfully seeded!"))
