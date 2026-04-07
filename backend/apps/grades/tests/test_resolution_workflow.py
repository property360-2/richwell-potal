from django.test import TestCase, Client
from django.utils import timezone
from apps.grades.models import Grade
from apps.grades.services.resolution_service import ResolutionService
from apps.terms.models import Term
from apps.accounts.models import User
from apps.students.models import Student, StudentEnrollment
from apps.academics.models import Subject, Program, CurriculumVersion
from apps.faculty.models import Professor
from apps.sections.models import Section
from apps.scheduling.models import Schedule
from rest_framework import status

class ResolutionWorkflowTests(TestCase):
    def setUp(self):
        # 1. Setup Roles
        self.registrar = User.objects.create_user(username='reg', role='REGISTRAR', email='reg@test.com')
        self.head = User.objects.create_user(username='head', role='PROGRAM_HEAD', email='head@test.com')
        self.prof_user = User.objects.create_user(username='prof', role='PROFESSOR', email='prof@test.com')
        self.other_head = User.objects.create_user(username='other_head', role='PROGRAM_HEAD', email='other_head@test.com')

        # 2. Setup Academics & Program Head mapping
        self.program = Program.objects.create(code='BSIT', name='IT', program_head=self.head)
        self.cv = CurriculumVersion.objects.create(program=self.program, version_name='V1')
        self.sub = Subject.objects.create(code='IT101', total_units=3, curriculum=self.cv, year_level=1, semester='1')
        
        # 3. Setup Professor Profile
        self.prof_profile = Professor.objects.create(
            user=self.prof_user, employee_id='EMP-001', department='IT', 
            date_of_birth='1980-01-01', employment_status='FULL_TIME'
        )

        # 4. Setup Term
        today = timezone.now().date()
        self.term = Term.objects.create(
            code='2026-T1', academic_year='2026-2027', semester_type='1',
            start_date=today, end_date=today + timezone.timedelta(days=120),
            enrollment_start=today-timezone.timedelta(days=30), enrollment_end=today,
            advising_start=today-timezone.timedelta(days=30), advising_end=today
        )

        # 5. Setup Section & Schedule (Required for professor self-management check)
        self.section = Section.objects.create(name='IT1A', term=self.term, program=self.program, year_level=1)
        self.schedule = Schedule.objects.create(
            term=self.term, section=self.section, subject=self.sub, 
            professor=self.prof_profile, component_type='LEC'
        )

        # 6. Setup Student & Grade
        self.student = Student.objects.create(
            user=User.objects.create_user(username='stud', role='STUDENT', email='stud@test.com'),
            idn='1001', curriculum=self.cv, program=self.program,
            date_of_birth='2000-01-01', gender='MALE', student_type='FRESHMAN'
        )
        self.grade = Grade.objects.create(
            student=self.student, subject=self.sub, term=self.term, section=self.section,
            grade_status=Grade.STATUS_INC, resolution_status=None
        )
        
        self.service = ResolutionService()
        self.client = Client()

    def test_resolution_visibility_and_workflow(self):
        # Step 1: Professor requests resolution
        # Now it should bypass the PermissionDenied because Section and Schedule exist
        self.service.request_resolution(self.grade.id, self.prof_user, "Mistake in encoding")
        self.grade.refresh_from_db()
        self.assertEqual(self.grade.resolution_status, 'REQUESTED')

        # Step 2: Test Filter for REQUESTED (Registrar Review)
        self.client.force_login(self.registrar)
        response = self.client.get('/api/grades/advising/?resolution_status=REQUESTED')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)

        # Step 3: Registrar approves the request
        response = self.client.post(f'/api/grades/resolution/{self.grade.id}/registrar-approve/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.grade.refresh_from_db()
        self.assertEqual(self.grade.resolution_status, 'APPROVED')

        # Step 4: Professor submits the numeric grade
        self.service.submit_resolved_grade(self.grade.id, self.prof_user, 1.75)
        self.grade.refresh_from_db()
        self.assertEqual(self.grade.resolution_status, 'SUBMITTED')

        # Step 5: Test Program Head Permissions
        self.client.force_login(self.other_head)
        response = self.client.post(f'/api/grades/resolution/{self.grade.id}/head-approve/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_login(self.head)
        response = self.client.post(f'/api/grades/resolution/{self.grade.id}/head-approve/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.grade.refresh_from_db()
        self.assertEqual(self.grade.resolution_status, 'HEAD_APPROVED')

        # Step 6: Test Filter for HEAD_APPROVED (Registrar Finalization)
        # This tests the bug fix where Registrar couldn't see approved items.
        self.client.force_login(self.registrar)
        response = self.client.get('/api/grades/advising/?resolution_status=HEAD_APPROVED')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)

        # Step 7: Registrar Finalizes
        response = self.client.post(f'/api/grades/resolution/{self.grade.id}/registrar-finalize/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.grade.refresh_from_db()
        self.assertEqual(self.grade.resolution_status, 'COMPLETED')
        self.assertEqual(self.grade.final_grade, 1.75)
        self.assertEqual(self.grade.grade_status, Grade.STATUS_PASSED)

    def test_head_rejection_workflow(self):
        # Setup to SUBMITTED state
        self.service.request_resolution(self.grade.id, self.prof_user, "Reason")
        self.service.registrar_approve_request(self.grade.id, self.registrar)
        self.service.submit_resolved_grade(self.grade.id, self.prof_user, 5.0)
        
        # Head rejects
        self.client.force_login(self.head)
        response = self.client.post(f'/api/grades/resolution/{self.grade.id}/head-reject/', {'reason': 'Incorrect computation'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.grade.refresh_from_db()
        self.assertEqual(self.grade.resolution_status, 'APPROVED')
        self.assertEqual(self.grade.rejection_reason, 'Incorrect computation')
