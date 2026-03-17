from django.test import TestCase
from django.utils import timezone
from dateutil.relativedelta import relativedelta
from apps.grades.models import Grade
from apps.grades.services.grading_service import GradingService
from apps.terms.models import Term
from apps.accounts.models import User
from apps.students.models import Student
from apps.academics.models import Subject, Program, CurriculumVersion

class GradingRefinementTests(TestCase):
    def setUp(self):
        self.registrar = User.objects.create_user(username='registrar', role='REGISTRAR', email='reg@test.com')
        self.professor = User.objects.create_user(username='prof', role='FACULTY', email='prof@test.com')
        
        self.term = Term.objects.create(
            code='2026-1',
            academic_year='2026-2027',
            semester_type='1',
            start_date=timezone.now().date(),
            end_date=(timezone.now() + relativedelta(months=5)).date(),
            enrollment_start=timezone.now().date(),
            enrollment_end=timezone.now().date(),
            advising_start=timezone.now().date(),
            advising_end=timezone.now().date(),
            midterm_grade_start=(timezone.now() - relativedelta(days=5)).date(),
            midterm_grade_end=(timezone.now() - relativedelta(days=1)).date(), # Closed
            final_grade_start=(timezone.now() + relativedelta(days=1)).date(), # Not yet open
            final_grade_end=(timezone.now() + relativedelta(days=5)).date()
        )
        
        self.program = Program.objects.create(code='PROG1', name='Test Program')
        self.curriculum = CurriculumVersion.objects.create(program=self.program, version_name='V1')
        self.student = Student.objects.create(
            user=User.objects.create_user(username='student', role='STUDENT', email='stud@test.com'),
            curriculum=self.curriculum,
            program=self.program,
            idn='2026-0001',
            date_of_birth='2005-01-01',
            gender='MALE',
            student_type='FRESHMAN'
        )
        self.subject = Subject.objects.create(code='SUB1', description='Test Subject', curriculum=self.curriculum, year_level=1, semester='1', total_units=3)
        
        self.grade = Grade.objects.create(
            student=self.student,
            subject=self.subject,
            term=self.term,
            grade_status=Grade.STATUS_ENROLLED
        )
        self.service = GradingService()

    def test_midterm_window_enforcement(self):
        """Verify professor cannot submit midterm if window is closed."""
        with self.assertRaises(ValueError) as cm:
            self.service.submit_midterm(self.grade.id, 1.5, self.professor)
        self.assertIn("window is closed", str(cm.exception))

    def test_midterm_override_works(self):
        """Verify registrar override allows submission outside window."""
        updated = self.service.submit_midterm(self.grade.id, 1.5, self.professor, override_window=True)
        self.assertEqual(updated.midterm_grade, 1.5)

    def test_final_locking_prevents_edit(self):
        """Verify that once finalized, even an override cannot change the grade."""
        # 1. Finalize
        self.service.finalize_term_grades(self.term, self.registrar)
        
        # 2. Try to submit final with override
        with self.assertRaises(ValueError) as cm:
            self.service.submit_final(self.grade.id, 2.0, self.professor, override_window=True)
        self.assertIn("already finalized and locked", str(cm.exception))

    def test_mark_unsubmitted_as_inc(self):
        """Verify only unsubmitted enrolled grades are touched."""
        # Create a passed grade to ensure it's not touched
        sub2 = Subject.objects.create(code='SUB2', curriculum=self.curriculum, year_level=1, semester='1', total_units=3)
        passed_grade = Grade.objects.create(
            student=self.student,
            subject=sub2,
            term=self.term,
            grade_status=Grade.STATUS_PASSED,
            final_grade=2.0
        )
        
        count = self.service.mark_unsubmitted_as_inc(self.term, 'FINAL', self.registrar)
        
        self.grade.refresh_from_db()
        passed_grade.refresh_from_db()
        
        self.assertEqual(count, 1)
        self.assertEqual(self.grade.grade_status, Grade.STATUS_INC)
        self.assertEqual(passed_grade.grade_status, Grade.STATUS_PASSED) # Untouched
