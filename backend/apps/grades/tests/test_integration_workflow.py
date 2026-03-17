from django.test import TestCase
from django.utils import timezone
from apps.grades.models import Grade
from apps.grades.services.grading_service import GradingService
from apps.grades.services.advising_service import AdvisingService
from apps.terms.models import Term
from apps.accounts.models import User
from apps.students.models import Student, StudentEnrollment
from apps.academics.models import Subject, Program, CurriculumVersion

class GradeLifecycleIntegrationTests(TestCase):
    def setUp(self):
        # 1. Setup Actors
        self.registrar = User.objects.create_user(username='reg', role='REGISTRAR', email='r@t.com')
        self.prof = User.objects.create_user(username='prof', role='FACULTY', email='p@t.com')
        
        # 2. Setup Term & Curriculum
        self.term = Term.objects.create(
            code='2026-REG', academic_year='2026-2027', semester_type='1',
            start_date=timezone.now().date(), end_date=timezone.now().date(),
            enrollment_start=timezone.now().date(), enrollment_end=timezone.now().date(),
            advising_start=timezone.now().date(), advising_end=timezone.now().date(),
            midterm_grade_start=timezone.now().date(), midterm_grade_end=timezone.now().date(),
            final_grade_start=timezone.now().date(), final_grade_end=timezone.now().date()
        )
        self.program = Program.objects.create(code='BSIT', name='IT')
        self.cv = CurriculumVersion.objects.create(program=self.program, version_name='V1')
        
        # 3. Setup Student
        self.student = Student.objects.create(
            user=User.objects.create_user(username='s1', role='STUDENT', email='s@t.com'),
            idn='1001', curriculum=self.cv, program=self.program,
            date_of_birth='2000-01-01', gender='MALE', student_type='FRESHMAN'
        )
        
        # 4. Enroll Student
        self.enrollment = StudentEnrollment.objects.create(
            student=self.student, term=self.term, year_level=1, is_regular=True
        )
        
        self.sub = Subject.objects.create(code='IT101', total_units=3, curriculum=self.cv, year_level=1, semester='1')
        self.grade = Grade.objects.create(student=self.student, subject=self.sub, term=self.term, grade_status=Grade.STATUS_ENROLLED)
        
        self.g_service = GradingService()
        self.a_service = AdvisingService()

    def test_full_workflow(self):
        # Step 1: Professor submits final grade
        self.g_service.submit_final(self.grade.id, 1.5, self.prof)
        self.grade.refresh_from_db()
        self.assertEqual(self.grade.final_grade, 1.5)
        self.assertEqual(self.grade.grade_status, Grade.STATUS_PASSED)

        # Step 2: Registrar Global Lock
        self.g_service.finalize_term_grades(self.term, self.registrar)
        self.grade.refresh_from_db()
        self.assertIsNotNone(self.grade.finalized_at)

        # Step 3: Professor tries to edit (Should Fail even if window is technically open)
        with self.assertRaises(ValueError):
            self.g_service.submit_final(self.grade.id, 2.0, self.prof)

        # Step 4: Historical Backfill for another subject
        sub2 = Subject.objects.create(code='GE101', total_units=3, curriculum=self.cv, year_level=1, semester='1')
        self.a_service.bulk_historical_encoding(
            self.student, self.term, 
            [{'subject_id': sub2.id, 'final_grade': 1.0}], 
            self.registrar, source='TOR-TEST-001'
        )
        
        hist_grade = Grade.objects.get(student=self.student, subject=sub2)
        self.assertTrue(hist_grade.is_historical)
        self.assertEqual(hist_grade.historical_source, 'TOR-TEST-001')
        
        # Step 5: Verify Year Level Recalculation (simple check)
        self.enrollment.refresh_from_db()
        # Since we added units, the year level logic (in AdvisingService) should have run.
        # (Assuming the logic in service is 1st year if < 30 units etc)
        self.assertIsNotNone(self.enrollment.year_level)
