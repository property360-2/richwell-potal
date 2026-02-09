from django.test import TestCase
from apps.accounts.models import User, StudentProfile
from apps.academics.models import Program, Section, SectionSubject, Subject, Curriculum, CurriculumSubject
from apps.enrollment.models import Enrollment, Semester, SubjectEnrollment
from apps.academics.services_sectioning import SectioningEngine
import uuid

class SectioningEngineTest(TestCase):
    def setUp(self):
        # Setup Core Data
        self.program = Program.objects.create(code='BSIT', name='IT')
        self.semester = Semester.objects.create(
            academic_year='2024-2025',
            name='First Semester',
            is_current=True,
            enrollment_start_date='2024-01-01',
            enrollment_end_date='2024-02-01',
            start_date='2024-02-15',
            end_date='2024-06-15'
        )
        self.curriculum = Curriculum.objects.create(
            program=self.program,
            code='IT2024',
            name='IT 2024',
            effective_year=2024
        )
        self.subject = Subject.objects.create(
            program=self.program,
            code='CS101',
            title='Intro to CS',
            units=3,
            year_level=1,
            semester_number=1
        )
        CurriculumSubject.objects.create(
            curriculum=self.curriculum,
            subject=self.subject,
            year_level=1,
            semester_number=1
        )
        
        # Create Sections
        self.section_a = Section.objects.create(
            name='BSIT-1A',
            program=self.program,
            semester=self.semester,
            curriculum=self.curriculum,
            year_level=1,
            capacity=2 # Small capacity for testing overflow
        )
        self.section_b = Section.objects.create(
            name='BSIT-1B',
            program=self.program,
            semester=self.semester,
            curriculum=self.curriculum,
            year_level=1,
            capacity=2
        )
        SectionSubject.objects.create(section=self.section_a, subject=self.subject)
        SectionSubject.objects.create(section=self.section_b, subject=self.subject)

    def test_freshman_queue_assignment(self):
        # Create 3 freshmen
        students = []
        for i in range(3):
            u = User.objects.create_user(
                email=f'f{i}@test.com', username=f'f{i}@test.com', 
                password='p', role='STUDENT', first_name=f'F{i}', last_name='Test'
            )
            sp = StudentProfile.objects.create(
                user=u, program=self.program, year_level=1,
                birthdate='2005-01-01', address='Test Address', contact_number='09123456789'
            )
            Enrollment.objects.create(student=u, semester=self.semester, monthly_commitment=5000)
            students.append(u)

        # Process Queue
        count = SectioningEngine.process_freshman_queue(self.semester.id)
        self.assertEqual(count, 3)

        # Verify assignments (Section A has 2, Section B has 1)
        self.assertEqual(StudentProfile.objects.filter(home_section=self.section_a).count(), 2)
        self.assertEqual(StudentProfile.objects.filter(home_section=self.section_b).count(), 1)
        
        # Verify subject enrollment
        self.assertEqual(SubjectEnrollment.objects.filter(section=self.section_a).count(), 2)

    def test_rebalance_underfilled_sections(self):
        # Fill Section A completely
        for i in range(2):
            u = User.objects.create_user(
                email=f'a{i}@test.com', username=f'a{i}@test.com', 
                password='p', role='STUDENT', first_name=f'A{i}', last_name='Test'
            )
            StudentProfile.objects.create(
                user=u, program=self.program, year_level=1, home_section=self.section_a,
                birthdate='2005-01-01', address='Test Address', contact_number='09123456789'
            )
            enr = Enrollment.objects.create(student=u, semester=self.semester, monthly_commitment=5000)
            SectioningEngine._auto_enroll_subjects(enr, self.section_a)
            
        # Section B has 1 student
        self.section_b.capacity = 10
        self.section_b.save()
        
        u_b = User.objects.create_user(
            email='b1@test.com', username='b1@test.com', 
            password='p', role='STUDENT', first_name='B1', last_name='Test'
        )
        StudentProfile.objects.create(
            user=u_b, program=self.program, year_level=1, home_section=self.section_b,
            birthdate='2005-01-01', address='Test Address', contact_number='09123456789'
        )
        enr_b = Enrollment.objects.create(student=u_b, semester=self.semester, monthly_commitment=5000)
        SectioningEngine._auto_enroll_subjects(enr_b, self.section_b)
        
        # Verify Section B is underfilled
        self.assertTrue(self.section_b.enrolled_count / self.section_b.capacity < 0.3)
        
        # Run rebalance
        actions = SectioningEngine.rebalance_sections(self.semester.id)
        
        # Since Section A is full (2/2), B cannot merge into A.
        # Let's make Section A have space and NOT be underfilled.
        # Threshold is 30%. 2/5 = 40% > 30%.
        self.section_a.capacity = 5
        self.section_a.save()
        
        actions = SectioningEngine.rebalance_sections(self.semester.id)
        self.assertIn(f"Dissolved {self.section_b.name} into {self.section_a.name}", actions)
        
        # Verify student moved
        u_b.student_profile.refresh_from_db()
        self.assertEqual(u_b.student_profile.home_section, self.section_a)
        
        # Verify section dissolved
        self.section_b.refresh_from_db()
        self.assertTrue(self.section_b.is_dissolved)

    def test_ml_resectioning(self):
        # Create returning students (Year Level > 1)
        for i in range(4):
            u = User.objects.create_user(
                email=f'r{i}@test.com', username=f'r{i}@test.com', 
                password='p', role='STUDENT', first_name=f'R{i}', last_name='Test'
            )
            StudentProfile.objects.create(
                user=u, program=self.program, year_level=2,
                birthdate='2000-01-01', address='Addr', contact_number='123'
            )
            Enrollment.objects.create(student=u, semester=self.semester, monthly_commitment=5000)

        # Create sections for year level 2
        sec2a = Section.objects.create(
            name='BSIT-2A', program=self.program, semester=self.semester,
            curriculum=self.curriculum, year_level=2, capacity=40
        )
        sec2b = Section.objects.create(
            name='BSIT-2B', program=self.program, semester=self.semester,
            curriculum=self.curriculum, year_level=2, capacity=40
        )
        SectionSubject.objects.create(section=sec2a, subject=self.subject)
        SectionSubject.objects.create(section=sec2b, subject=self.subject)

        # Run ML Resectioning
        count = SectioningEngine.run_ml_resectioning(self.semester.id, self.program.id, 2)
        
        self.assertEqual(count, 4)
        
        # Verify all 4 students have a home section
        assigned_students = StudentProfile.objects.filter(
            year_level=2, home_section__isnull=False
        ).count()
        self.assertEqual(assigned_students, 4)
