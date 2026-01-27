import random
from datetime import time, date, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction, connection
from django.contrib.auth import get_user_model

# Import your models here
from apps.accounts.models import (
    StudentProfile, ProfessorProfile, 
    Permission, PermissionCategory, UserPermission
)
from apps.academics.models import (
    Program, Curriculum, Subject, Section, SectionSubject, 
    ScheduleSlot, Room, CurriculumSubject, CurriculumVersion
)
from apps.enrollment.models import (
    Enrollment, SubjectEnrollment, Semester, MonthlyPaymentBucket
)
# Assuming these exist based on requirements, if not we skip
# from apps.finance.models import ... 

from apps.audit.models import AuditLog

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds the database with a full set of initial data (WIPES EXISTING DATA)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Starting full system seed...'))
        
        with transaction.atomic():
            self.wipe_data()
            self.create_semesters()
            self.create_rooms()
            self.create_permissions() # New step
            self.create_users() # Admin, Heads, Profs
            self.create_academics() # Programs, Curricula, Subjects
            self.create_sections_and_schedule()
            self.create_students_and_enrollments()
            self.create_audit_logs() # New step
            
        self.stdout.write(self.style.SUCCESS('Successfully seeded full system!'))

    def wipe_data(self):
        self.stdout.write('Wiping data...')
        # Delete strictly in order of dependency to avoid protected errors
        AuditLog.objects.all().delete() # Delete logs first
        UserPermission.objects.all().delete()
        Permission.objects.all().delete()
        PermissionCategory.objects.all().delete()
        
        SubjectEnrollment.objects.all().delete()
        MonthlyPaymentBucket.objects.all().delete() # Delete buckets before Enrollment
        Enrollment.objects.all().delete()
        ScheduleSlot.objects.all().delete()
        SectionSubject.objects.all().delete()
        
        # Profiles must be deleted early as they PROTECT academic structures
        StudentProfile.objects.all().delete()
        ProfessorProfile.objects.all().delete()
        
        Section.objects.all().delete()
        CurriculumSubject.objects.all().delete() # Delete before Subject/Curriculum
        CurriculumVersion.objects.all().delete() # Delete versions
        Subject.objects.all().delete()
        Curriculum.objects.all().delete()
        Program.objects.all().delete()
        Room.objects.all().delete()
        Semester.objects.all().delete()

        # Delete users except superusers if you want, or just all
        User.objects.filter(email='admin@richwell.edu').delete() # Explicitly delete seeded admin
        User.objects.filter(is_superuser=False).delete()
        
    def create_permissions(self):
        self.stdout.write('Creating permissions...')
        
        # 1. Academic Management
        cat_academic = PermissionCategory.objects.create(
            name='Academic Management',
            code='academic_management',
            description='Manage programs, curricula, and subjects',
            icon='book-open',
            order=1
        )
        
        Permission.objects.create(
            category=cat_academic,
            name='View Programs',
            code='program.view',
            description='Can view academic programs',
            default_for_roles=['ADMIN', 'REGISTRAR', 'DEPARTMENT_HEAD']
        )
        Permission.objects.create(
            category=cat_academic,
            name='Manage Curricula',
            code='curriculum.manage',
            description='Can create and edit curricula',
            default_for_roles=['ADMIN', 'REGISTRAR']
        )

        # 2. Enrollment Management
        cat_enrollment = PermissionCategory.objects.create(
            name='Enrollment Management',
            code='enrollment_management',
            description='Manage student enrollments',
            icon='users',
            order=2
        )
        
        Permission.objects.create(
            category=cat_enrollment,
            name='Process Enrollment',
            code='enrollment.process',
            description='Can approve/reject enrollments',
            default_for_roles=['ADMIN', 'REGISTRAR', 'DEPARTMENT_HEAD']
        )
        
        # 3. User Management
        cat_users = PermissionCategory.objects.create(
            name='User Management',
            code='user_management',
            description='Manage system users',
            icon='user-group',
            order=3
        )
        
        Permission.objects.create(
            category=cat_users,
            name='View Users',
            code='user.view',
            description='Can view user list',
            default_for_roles=['ADMIN', 'REGISTRAR']
        )
        
    def create_semesters(self):
        self.stdout.write('Creating semesters...')
        self.active_semester = Semester.objects.create(
            name='1st Semester',
            academic_year='2024-2025',
            is_current=True,
            enrollment_start_date=timezone.now() - timedelta(days=30),
            enrollment_end_date=timezone.now() + timedelta(days=30),
            start_date=timezone.now() + timedelta(days=45),
            end_date=timezone.now() + timedelta(days=120)
        )

    def create_rooms(self):
        self.stdout.write('Creating rooms...')
        self.rooms = []
        for i in range(1, 11):
            self.rooms.append(Room.objects.create(
                name=f"Room {100+i}",
                capacity=40,
                room_type='LECTURE',
                is_active=True
            ))
            
    def create_users(self):
        self.stdout.write('Creating core users...')
        
        # 1. Registrar
        self.registrar = User.objects.create_user(
            email='registrar@richwell.edu',
            username='registrar@richwell.edu',
            password='password123',
            first_name='Reggie',
            last_name='Registrar',
            role=User.Role.REGISTRAR,
            is_staff=True
        )
        
        # 2. Dept Head
        self.dept_head = User.objects.create_user(
            email='head@richwell.edu',
            username='head@richwell.edu',
            password='password123',
            first_name='Harold',
            last_name='Head',
            role=User.Role.DEPARTMENT_HEAD,
            is_staff=True
        )

        # 3. Professors
        self.professors = []
        for i in range(1, 6):
            u = User.objects.create_user(
                email=f'prof{i}@richwell.edu',
                username=f'prof{i}@richwell.edu',
                password='password123',
                first_name=f'Professor',
                last_name=f'{i}',
                role=User.Role.PROFESSOR
            )
            # Create Profile (No Nulls)
            ProfessorProfile.objects.create(
                user=u,
                department='IT',
                office_location=f'Faculty Room {i}',
                specialization='General IT',
                max_teaching_hours=24,
                is_active=True
            )
            self.professors.append(u)

        # 4. Admin
        self.admin = User.objects.create_user(
            email='admin@richwell.edu',
            username='admin@richwell.edu',
            password='password123',
            first_name='System',
            last_name='Admin',
            role=User.Role.ADMIN,
            is_staff=True,
            is_superuser=True
        )

        # 5. Cashier
        self.cashier = User.objects.create_user(
            email='cashier@richwell.edu',
            username='cashier@richwell.edu',
            password='password123',
            first_name='Casey',
            last_name='Cashier',
            role=User.Role.CASHIER,
            is_staff=True
        )

        # 6. Admission Staff
        self.admission_staff = User.objects.create_user(
            email='admission@richwell.edu',
            username='admission@richwell.edu',
            password='password123',
            first_name='Addie',
            last_name='Admission',
            role=User.Role.ADMISSION_STAFF,
            is_staff=True
        )

        # 7. Head Registrar
        self.head_registrar = User.objects.create_user(
            email='head.registrar@richwell.edu',
            username='head.registrar@richwell.edu',
            password='password123',
            first_name='Helen',
            last_name='Head-Registrar',
            role=User.Role.HEAD_REGISTRAR,
            is_staff=True
        )

    def create_academics(self):
        self.stdout.write('Creating academic data...')
        
        # Program
        self.bsit = Program.objects.create(
            code='BSIT',
            name='Bachelor of Science in Information Technology',
            description='IT Program',
            duration_years=4,
            is_active=True
        )
        
        # Curriculum
        self.curriculum = Curriculum.objects.create(
            program=self.bsit,
            code='2024-REV',
            name='BSIT 2024 Revision',
            description='New Curriculum',
            effective_year=2024,
            is_active=True
        )
        
        # Subjects (No Nulls)
        # Year 1 Sem 1
        self.subjects = {}
        
        yr1_s1 = [
            ('CS101', 'Intro to Computing', 3),
            ('CS102', 'Computer Programming 1', 3),
            ('MATH101', 'Algebra', 3),
            ('ENG101', 'Communication Skills', 3),
        ]
        
        # Year 1 Sem 2
        yr1_s2 = [
            ('CS103', 'Computer Programming 2', 3, ['CS102']),
            ('IT101', 'IT Fundamentals', 3, ['CS101']),
        ]
        
        # Year 2 Sem 1
        yr2_s1 = [
            ('CS201', 'Data Structures', 3, ['CS103']),
            ('IT201', 'Networking 1', 3, ['IT101']),
            ('DB101', 'Database Systems', 3, ['CS103']),
        ]
        
        # Year 3 Sem 1
        yr3_s1 = [
            ('CS301', 'Software Engineering', 3, ['CS201']),
            ('IT301', 'Web Development', 3, ['db101', 'cs103']), # Lowercase to match check below
        ]

        all_subs = [(1, 1, yr1_s1), (1, 2, yr1_s2), (2, 1, yr2_s1), (3, 1, yr3_s1)]
        
        for year, sem, subs in all_subs:
            for item in subs:
                code, title, units = item[0], item[1], item[2]
                prereqs = item[3] if len(item) > 3 else []
                
                s = Subject.objects.create(
                    program=self.bsit,
                    code=code,
                    title=title,
                    description=f"{title} Description",
                    units=units,
                    is_major=True if 'CS' in code or 'IT' in code else False,
                    year_level=year,
                    semester_number=sem,
                    allow_multiple_sections=False,
                    # No nulls for optional file fields usually means leaving them empty/None is ok if strictly validation allows, 
                    # but request says "no null column". Django FileField is usually blank=True null=True. 
                    # We will skip assigning file to avoid IO, it is blank in DB.
                )
                self.subjects[code.lower()] = s
                
                # Create CurriculumSubject linkage
                CurriculumSubject.objects.create(
                    curriculum=self.curriculum,
                    subject=s,
                    year_level=year,
                    semester_number=sem,
                    is_required=True
                )
                
                # Assign prereqs
                for p_code in prereqs:
                    if p_code.lower() in self.subjects:
                        s.prerequisites.add(self.subjects[p_code.lower()])
                
                # Assign to professors (Randomly assign 2 profs per subject)
                # Prof MUST be assigned to subject to teach it
                assigned_profs = random.sample(self.professors, 2)
                for p in assigned_profs:
                    p.professor_profile.assigned_subjects.add(s)

        # Create Curriculum Version Snapshot
        self.stdout.write('Creating curriculum version snapshot...')
        CurriculumVersion.objects.create(
            program=self.bsit,
            semester=self.active_semester,
            version_number=1,
            subjects_snapshot={
                'curriculum_code': self.curriculum.code,
                'subjects': list(self.subjects.keys())
            },
            is_active=True,
            created_by=self.registrar
        )

    def create_sections_and_schedule(self):
        self.stdout.write('Creating sections and schedule...')
        
        # Sections
        sections_def = [
            ('BSIT-1A', 1),
            ('BSIT-1B', 1),
            ('BSIT-2A', 2),
            ('BSIT-3A', 3),
        ]
        
        self.sections_map = {}
        
        # Helper for conflict free scheduling
        # Track occupied slots: (day, hour, type, value)
        # Type: ROOM, PROF, SECTION
        occupied = set()

        days = ['MON', 'TUE', 'WED', 'THU', 'FRI']
        hours = range(7, 19) # 7am to 7pm
        
        for name, year in sections_def:
            sec = Section.objects.create(
                name=name,
                program=self.bsit,
                semester=self.active_semester,
                curriculum=self.curriculum,
                year_level=year,
                capacity=40,
                is_dissolved=False,
                parent_section=None
            )
            self.sections_map[name] = sec
            
            # Add subjects for this year level (and semester 1 only for now as active sem is 1)
            # Find subjects for this year/sem
            subjects_for_sec = Subject.objects.filter(year_level=year, semester_number=1)
            
            for subj in subjects_for_sec:
                # Find a qualified prof who is available
                # Get eligible profs
                eligible_profs = [p for p in self.professors if p.professor_profile.assigned_subjects.filter(pk=subj.pk).exists()]
                if not eligible_profs:
                    # Fallback assigning first prof if none qualified (shouldn't happen with our logic)
                    eligible_profs = [self.professors[0]]
                    eligible_profs[0].professor_profile.assigned_subjects.add(subj)
                
                assigned_prof = None
                assigned_room = None
                assigned_slot = None #(Day, StartHour) assume 1 hr blocks for simplicity
                
                # Find a valid slot
                # Strategy: Iterate random slots until one fits
                found = False
                attempts = 0
                while not found and attempts < 100:
                    attempts += 1
                    day = random.choice(days)
                    start_h = random.choice(hours)
                    prof = random.choice(eligible_profs)
                    room = random.choice(self.rooms)
                    
                    # Check conflicts
                    # 1. Prof busy?
                    if (day, start_h, 'PROF', prof.id) in occupied: continue
                    # 2. Room busy?
                    if (day, start_h, 'ROOM', room.id) in occupied: continue
                    # 3. Section busy?
                    if (day, start_h, 'SEC', sec.id) in occupied: continue
                    
                    # Found!
                    assigned_prof = prof
                    assigned_room = room
                    assigned_slot = (day, start_h)
                    
                    # Mark occupied (Assuming 3 unit subject = 3 hours? Let's do 1 hour slot for simplicity in seeder to fit all)
                    # Realistically 3 units = 3 hours. Let's try to book 1 hour for now to ensure we fit everything.
                    occupied.add((day, start_h, 'PROF', prof.id))
                    occupied.add((day, start_h, 'ROOM', room.id))
                    occupied.add((day, start_h, 'SEC', sec.id))
                    found = True
                
                if not found:
                    self.stdout.write(self.style.ERROR(f"Could not schedule {subj.code} for {sec.name}"))
                    continue
                    
                # Create SectionSubject
                ss = SectionSubject.objects.create(
                    section=sec,
                    subject=subj,
                    professor=assigned_prof,
                    capacity=40,
                    is_tba=False
                )
                
                # Create ScheduleSlot
                ScheduleSlot.objects.create(
                    section_subject=ss,
                    professor=assigned_prof,
                    day=assigned_slot[0],
                    start_time=time(assigned_slot[1], 0),
                    end_time=time(assigned_slot[1]+1, 0),
                    room=assigned_room.name
                )


    def create_students_and_enrollments(self):
        self.stdout.write('Creating students and enrollments...')
        
        # SCENARIO A: Regular 1st Year (Fully Enrolled & Paid)
        student_a = self._create_student(
            'student.a@richwell.edu', 'Student', 'A', '2024-00001', 
            email_verified=True, year_level=1, section=self.sections_map['BSIT-1A']
        )
        self._enroll_student(student_a, 'BSIT-1A', paid=True, head_approved=True)

        # SCENARIO B: Regular 1st Year (Unpaid)
        student_b = self._create_student(
            'student.b@richwell.edu', 'Student', 'B', '2024-00002', 
            email_verified=True, year_level=1, section=self.sections_map['BSIT-1A']
        )
        self._enroll_student(student_b, 'BSIT-1A', paid=False, head_approved=True) # Head approves, but payment pending

        # SCENARIO C: Irregular 2nd Year (Failures & Retakes)
        student_c = self._create_student(
            'student.c@richwell.edu', 'Student', 'C', '2023-00001', 
            email_verified=True, year_level=2, section=self.sections_map['BSIT-2A'],
            is_irregular=True
        )
        # Has failed CS101 in past
        self._add_past_enrollment(student_c, 'CS101', passed=False) # Failed
        self._add_past_enrollment(student_c, 'CS102', passed=False) # Cant take because prereq CS101 failed
        
        # Current Enrollment: Retake CS101 (from 1B since 1A schedule might conflict or just choice)
        # + Take Year 2 subjects (CS201 blocked due to CS103 prereq? CS103 needs CS102. CS102 needs CS101.)
        # Actually CS201 needs CS103.
        # Let's enroll in IT201 (Networking) which needs IT101 (passed implicitly? Need to add passed history)
        self._add_past_enrollment(student_c, 'IT101', passed=True)
        self._enroll_single_subject(student_c, 'IT201', 'BSIT-2A') # Regular subject
        self._enroll_single_subject(student_c, 'CS101', 'BSIT-1B', is_retake=True) # Retake

        # SCENARIO D: Overloaded 3rd Year
        student_d = self._create_student(
            'student.d@richwell.edu', 'Student', 'D', '2022-00001', 
            email_verified=True, year_level=3, section=self.sections_map['BSIT-3A'],
            overload_approved=True
        )
        # Enroll in all 3A subjects
        self._enroll_student(student_d, 'BSIT-3A', paid=True, head_approved=True)
        # Add an extra subject from Year 2 (e.g. they failed DB101 before?)
        self._add_past_enrollment(student_d, 'DB101', passed=False)
        self._enroll_single_subject(student_d, 'DB101', 'BSIT-2A', is_retake=True)


    def _create_student(self, email, first, last, student_number, email_verified=True, year_level=1, section=None, is_irregular=False, overload_approved=False):
        u = User.objects.create_user(
            email=email,
            username=email,
            password='password123',
            first_name=first,
            last_name=last,
            role=User.Role.STUDENT,
            student_number=student_number
        )
        StudentProfile.objects.create(
            user=u,
            program=self.bsit,
            curriculum=self.curriculum,
            year_level=year_level,
            home_section=section,
            is_irregular=is_irregular,
            overload_approved=overload_approved,
            status='ACTIVE',
            academic_status='REGULAR',
            middle_name='M', # No Null
            suffix='N/A', # No Null
            birthdate=date(2000, 1, 1),
            address='123 Campus Way',
            contact_number='09123456789',
            is_transferee=False,
            previous_school='N/A',
            previous_course='N/A',
            academic_standing='Good'
        )
        return u

    def _enroll_student(self, student, section_name, paid=False, head_approved=False):
        # Determine status
        if paid and head_approved:
            status = 'ACTIVE'
        elif head_approved and not paid:
            status = 'PENDING_PAYMENT'
        else:
            status = 'PENDING'

        # Create Enrollment Header
        enrol = Enrollment.objects.create(
            student=student,
            semester=self.active_semester,
            status=status,
            first_month_paid=paid,
            monthly_commitment=5000.00 # 5000 per month
        )
        
        # Create Payment Buckets (6 months)
        events = ['Upon Enrollment', 'Prelims', 'Midterms', 'Semi-Finals', 'Finals', 'Clearance']
        for i in range(1, 7):
            is_paid = paid # If paid=True, all buckets paid (simplified for Scenario A)
            
            MonthlyPaymentBucket.objects.create(
                enrollment=enrol,
                month_number=i,
                event_label=events[i-1],
                required_amount=5000.00,
                paid_amount=5000.00 if is_paid else 0.00,
                is_fully_paid=is_paid
            )
        
        # Add subjects from section
        sec = self.sections_map[section_name]
        section_subjects = SectionSubject.objects.filter(section=sec)
        
        for ss in section_subjects:
            SubjectEnrollment.objects.create(
                enrollment=enrol,
                subject=ss.subject,
                section=sec,
                # section_subject=ss, removed
                enrollment_type='HOME',
                status='ENROLLED' if paid and head_approved else 'PENDING',
                payment_approved=paid,
                head_approved=head_approved,
                is_irregular=student.student_profile.is_irregular
            )
            
    def _enroll_single_subject(self, student, subject_code, section_name, is_retake=False):
        # Find or create enrollment header
        enrol, created = Enrollment.objects.get_or_create(
            student=student,
            semester=self.active_semester,
            defaults={
                'status': 'PENDING',
                'monthly_commitment': 0
            }
        )

        if created:
            # Create buckets if new enrollment
            events = ['Upon Enrollment', 'Prelims', 'Midterms', 'Semi-Finals', 'Finals', 'Clearance']
            for i in range(1, 7):
                MonthlyPaymentBucket.objects.create(
                    enrollment=enrol,
                    month_number=i,
                    event_label=events[i-1],
                    required_amount=3000.00, # Simplified
                    paid_amount=0.00,
                    is_fully_paid=False
                )
        
        sec = self.sections_map[section_name]
        subj = self.subjects[subject_code.lower()]
        # Find offering
        ss = SectionSubject.objects.filter(section=sec, subject=subj).first()
        
        if ss:
            SubjectEnrollment.objects.create(
                enrollment=enrol,
                subject=subj,
                section=sec,
                # section_subject=ss, removed
                enrollment_type='RETAKE' if is_retake else 'OVERLOAD', # Was CROSS
                status='ENROLLED', # Auto enroll for logic demo
                payment_approved=True,
                head_approved=True,
                is_irregular=True,
                is_retake=is_retake
            )

    def _add_past_enrollment(self, student, subject_code, passed=True):
        # Create past semester
        past_sem, _ = Semester.objects.get_or_create(
            name='2nd Semester', academic_year='2023-2024', # Fixed
            defaults={
                'is_current': False,
                'start_date': date(2023, 1, 1), # Dummy
                'end_date': date(2023, 5, 1) # Dummy
            }
        )
        
        enrol, _ = Enrollment.objects.get_or_create(
            student=student,
            semester=past_sem,
            defaults={
                'status': 'COMPLETED',
                'monthly_commitment': 0
            }
        )
        
        subj = self.subjects[subject_code.lower()]
        SubjectEnrollment.objects.create(
            enrollment=enrol,
            subject=subj,
            status='PASSED' if passed else 'FAILED',
            grade=1.0 if passed else 5.0,
            payment_approved=True,
            head_approved=True
        )

    def create_audit_logs(self):
        self.stdout.write('Creating audit logs...')
        
        # Log User Creation
        for u in self.professors + [self.registrar, self.dept_head]:
             AuditLog.objects.create(
                actor=None, # System
                action=AuditLog.Action.USER_CREATED,
                target_model='User',
                target_id=u.id,
                payload={'email': u.email, 'role': u.role}
             )

        # Log Curriculum Creation
        AuditLog.objects.create(
            actor=self.registrar,
            action=AuditLog.Action.CURRICULUM_CREATED,
            target_model='Curriculum',
            target_id=self.curriculum.id,
            payload={'code': self.curriculum.code}
        )

        # Log Enrollments
        for e in Enrollment.objects.all():
            AuditLog.objects.create(
                actor=e.student,
                action=AuditLog.Action.ENROLLMENT_CREATED,
                target_model='Enrollment',
                target_id=e.id,
                payload={'semester': e.semester.name, 'status': e.status}
            )
            
            # Log specific status changes
            if e.status == 'ACTIVE':
                AuditLog.objects.create(
                    actor=self.dept_head,
                    action=AuditLog.Action.ENROLLMENT_STATUS_CHANGED,
                    target_model='Enrollment',
                    target_id=e.id,
                    payload={'old_status': 'PENDING', 'new_status': 'ACTIVE'}
                )
