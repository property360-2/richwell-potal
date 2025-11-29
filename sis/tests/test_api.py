"""
REST API Tests for Richwell Colleges Portal.
Tests for Student, Cashier, and Public API endpoints.
"""
import pytest
import uuid
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
from decimal import Decimal

from sis.models import (
    Student, Program, Semester, Subject, Section, Enrollment,
    SubjectEnrollment, PaymentMonth, ExamPermit, Payment, ScheduleSlot
)

User = get_user_model()


def create_test_student(user, program, status='ACTIVE', enrollment_year=2025):
    """Helper function to create a student with all required fields."""
    student_id = f"STU-{uuid.uuid4().hex[:8].upper()}"
    return Student.objects.create(
        user=user,
        student_id=student_id,
        program=program,
        status=status,
        enrollment_year=enrollment_year
    )


@pytest.mark.django_db
class TestStudentProfileAPI:
    """Tests for Student Profile API endpoints."""

    def setup_method(self):
        """Set up test fixtures."""
        self.client = APIClient()

        # Create student user and token
        self.student_user = User.objects.create_user(
            username='teststudent',
            email='student@test.com',
            password='testpass123',
            role='STUDENT',
            first_name='Test',
            last_name='Student'
        )
        self.student_token = Token.objects.create(user=self.student_user)

        # Create student profile
        self.program = Program.objects.create(
            name='Computer Science',
            code='CS',
            duration_years=4,
            total_units_required=120
        )
        self.student = create_test_student(
            user=self.student_user,
            program=self.program,
            status='ACTIVE'
        )
        self.student.gpa = 3.5
        self.student.save()

    def test_get_student_profile_authenticated(self):
        """Test getting student profile with authentication."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.student_token.key}')
        response = self.client.get('/api/v1/student/profile/me/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['student_id'] == self.student.student_id
        assert response.data['gpa_display'] == '3.50'

    def test_get_student_profile_unauthenticated(self):
        """Test getting student profile without authentication."""
        response = self.client.get('/api/v1/student/profile/me/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_student_list_returns_only_own_profile(self):
        """Test that student can only see their own profile."""
        # Create another student
        other_user = User.objects.create_user(
            username='otherstudent',
            email='other@test.com',
            password='testpass123',
            role='STUDENT'
        )
        create_test_student(user=other_user, program=self.program, status='ACTIVE')

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.student_token.key}')
        response = self.client.get('/api/v1/student/profile/')

        assert response.status_code == status.HTTP_200_OK
        # Should only return this student's profile
        assert len(response.data['results']) == 1 or response.data[0]['user']['id'] == self.student_user.id


@pytest.mark.django_db
class TestEnrollmentAPI:
    """Tests for Student Enrollment API endpoints."""

    def setup_method(self):
        """Set up test fixtures."""
        self.client = APIClient()

        # Create student
        self.student_user = User.objects.create_user(
            username='enrollstudent',
            email='enroll@test.com',
            password='testpass123',
            role='STUDENT'
        )
        self.student_token = Token.objects.create(user=self.student_user)

        self.program = Program.objects.create(
            name='Information Technology',
            code='IT',
            duration_years=4,
            total_units_required=120
        )
        self.student = create_test_student(
            user=self.student_user,
            program=self.program,
            status='ACTIVE'
        )

        # Create semester
        self.semester = Semester.objects.create(
            year=2025,
            semester='FIRST',
            start_date='2025-06-01',
            end_date='2025-10-31',
            enrollment_start='2025-05-15',
            enrollment_end='2025-06-15',
            is_active=True
        )

        # Create enrollment
        self.enrollment = Enrollment.objects.create(
            student=self.student,
            semester=self.semester
        )

        # Create payment months
        from datetime import datetime, timedelta
        start_date = datetime(2025, 6, 1).date()
        for month in range(1, 7):
            due_date = start_date + timedelta(days=30 * (month - 1))
            PaymentMonth.objects.create(
                enrollment=self.enrollment,
                month_number=month,
                amount_due=Decimal('5000.00'),
                amount_paid=Decimal('0.00') if month > 1 else Decimal('5000.00'),
                due_date=due_date,
                is_paid=(month == 1)  # Only month 1 paid
            )

        # Create exam permit
        ExamPermit.objects.create(
            enrollment=self.enrollment,
            status='UNLOCKED'
        )

        # Create subject and section
        self.subject = Subject.objects.create(
            code='CS101',
            name='Introduction to Programming',
            units=3,
            subject_type='MAJOR',
            program=self.program
        )

        self.section = Section.objects.create(
            subject=self.subject,
            code='CS101-A',
            capacity=30,
            semester=self.semester,
            professor=User.objects.create_user(
                username='prof1',
                email='prof@test.com',
                password='testpass123',
                role='PROFESSOR'
            )
        )

        from datetime import time
        ScheduleSlot.objects.create(
            section=self.section,
            day='MON',
            start_time=time(8, 0),
            end_time=time(9, 30)
        )

    def test_get_enrollment_list(self):
        """Test getting list of enrollments."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.student_token.key}')
        response = self.client.get('/api/v1/student/enrollment/')

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) >= 1

    def test_get_payment_status(self):
        """Test getting payment status for enrollment."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.student_token.key}')
        response = self.client.get(f'/api/v1/student/enrollment/{self.enrollment.id}/payment_status/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['month_1_paid'] is True
        assert 'months' in response.data

    def test_get_exam_permit(self):
        """Test getting exam permit status."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.student_token.key}')
        response = self.client.get(f'/api/v1/student/enrollment/{self.enrollment.id}/exam_permit/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'UNLOCKED'

    def test_get_available_subjects(self):
        """Test getting available subjects for enrollment."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.student_token.key}')
        response = self.client.get(f'/api/v1/student/enrollment/{self.enrollment.id}/available_subjects/')

        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)

    def test_enroll_subject_success(self):
        """Test successful subject enrollment."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.student_token.key}')

        data = {
            'subject_id': self.subject.id,
            'section_id': self.section.id,
            'override_schedule_conflict': False
        }
        response = self.client.post(
            f'/api/v1/student/enrollment/{self.enrollment.id}/enroll_subject/',
            data,
            format='json'
        )

        assert response.status_code == status.HTTP_201_CREATED
        # Check that the subject was enrolled (section contains the subject ID)
        assert response.data['section']['subject'] == self.subject.id

    def test_enroll_subject_invalid_subject(self):
        """Test enrollment with invalid subject."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.student_token.key}')

        data = {
            'subject_id': 99999,  # Non-existent
            'override_schedule_conflict': False
        }
        response = self.client.post(
            f'/api/v1/student/enrollment/{self.enrollment.id}/enroll_subject/',
            data,
            format='json'
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestCashierPaymentAPI:
    """Tests for Cashier Payment API endpoints."""

    def setup_method(self):
        """Set up test fixtures."""
        self.client = APIClient()

        # Create cashier user
        self.cashier_user = User.objects.create_user(
            username='testcashier',
            email='cashier@test.com',
            password='testpass123',
            role='CASHIER'
        )
        self.cashier_token = Token.objects.create(user=self.cashier_user)

        # Create student for payment
        self.student_user = User.objects.create_user(
            username='paystudent',
            email='pay@test.com',
            password='testpass123',
            role='STUDENT'
        )

        self.program = Program.objects.create(
            name='Business Administration',
            code='BA',
            duration_years=4,
            total_units_required=120
        )
        self.student = create_test_student(
            user=self.student_user,
            program=self.program,
            status='ACTIVE'
        )

        self.semester = Semester.objects.create(
            year=2025,
            semester='FIRST',
            start_date='2025-06-01',
            end_date='2025-10-31',
            enrollment_start='2025-05-15',
            enrollment_end='2025-06-15',
            is_active=True
        )

        self.enrollment = Enrollment.objects.create(
            student=self.student,
            semester=self.semester
        )

        from datetime import datetime, timedelta
        start_date = datetime(2025, 6, 1).date()
        for month in range(1, 7):
            due_date = start_date + timedelta(days=30 * (month - 1))
            PaymentMonth.objects.create(
                enrollment=self.enrollment,
                month_number=month,
                amount_due=Decimal('5000.00'),
                amount_paid=Decimal('0.00'),
                due_date=due_date,
                is_paid=False
            )

    def test_cashier_cannot_access_student_api(self):
        """Test that cashier cannot access student endpoints."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.cashier_token.key}')
        response = self.client.get('/api/v1/student/profile/me/')

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_get_payment_methods(self):
        """Test getting available payment methods."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.cashier_token.key}')
        response = self.client.get('/api/v1/cashier/payment/payment_methods/')

        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)
        assert len(response.data) > 0

    def test_record_payment_success(self):
        """Test successful payment recording."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.cashier_token.key}')

        data = {
            'student_id': self.student.student_id,
            'amount': '2500.00',
            'method': 'CASH',
            'reference_number': f'PAY-{uuid.uuid4().hex[:8].upper()}',
            'notes': 'Test payment'
        }
        response = self.client.post(
            '/api/v1/cashier/payment/record_payment/',
            data,
            format='json'
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['amount'] == '2500.00'

    def test_record_payment_invalid_student(self):
        """Test payment recording with invalid student."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.cashier_token.key}')

        data = {
            'student_id': 'INVALID999',
            'amount': '2500.00',
            'method': 'CASH'
        }
        response = self.client.post(
            '/api/v1/cashier/payment/record_payment/',
            data,
            format='json'
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestPublicAPI:
    """Tests for Public/Admissions API endpoints."""

    def setup_method(self):
        """Set up test fixtures."""
        self.client = APIClient()

        self.program = Program.objects.create(
            name='Nursing',
            code='NURS',
            duration_years=4,
            total_units_required=130,
            is_active=True
        )

        self.subject = Subject.objects.create(
            code='NURS101',
            name='Fundamentals of Nursing',
            units=4,
            subject_type='MAJOR',
            program=self.program
        )

    def test_list_active_programs(self):
        """Test listing active programs."""
        response = self.client.get('/api/v1/public/programs/')

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) >= 1 or isinstance(response.data, list)

    def test_get_program_detail(self):
        """Test getting program detail."""
        response = self.client.get(f'/api/v1/public/programs/{self.program.id}/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['code'] == 'NURS'

    def test_get_program_subjects(self):
        """Test getting subjects for a program."""
        # Create section with subject to make it available
        prof = User.objects.create_user(
            username='prof2',
            email='prof2@test.com',
            password='testpass123',
            role='PROFESSOR'
        )
        semester = Semester.objects.create(
            year=2025,
            semester='FIRST',
            start_date='2025-06-01',
            end_date='2025-10-31',
            enrollment_start='2025-05-15',
            enrollment_end='2025-06-15',
            is_active=True
        )
        Section.objects.create(
            subject=self.subject,
            code='NURS101-A',
            capacity=30,
            professor=prof,
            semester=semester
        )

        response = self.client.get(f'/api/v1/public/programs/{self.program.id}/subjects/')

        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)

    def test_new_student_enrollment(self):
        """Test new student online enrollment."""
        data = {
            'email': 'newstudent@test.com',
            'first_name': 'New',
            'last_name': 'Student',
            'password': 'newpass123',
            'program_id': self.program.id
        }
        response = self.client.post(
            '/api/v1/public/enrollment/new_student/',
            data,
            format='json'
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['program'] == self.program.id

        # Verify user was created
        assert User.objects.filter(email='newstudent@test.com').exists()
        assert Student.objects.filter(user__email='newstudent@test.com').exists()

    def test_new_student_enrollment_invalid_program(self):
        """Test new student enrollment with invalid program."""
        data = {
            'email': 'another@test.com',
            'first_name': 'Another',
            'last_name': 'Student',
            'password': 'pass123',
            'program_id': 99999
        }
        response = self.client.post(
            '/api/v1/public/enrollment/new_student/',
            data,
            format='json'
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestAPIAuthentication:
    """Tests for API authentication and permissions."""

    def setup_method(self):
        """Set up test fixtures."""
        self.client = APIClient()

        self.user = User.objects.create_user(
            username='authtest',
            email='auth@test.com',
            password='testpass123',
            role='STUDENT'
        )

    def test_token_auth_endpoint(self):
        """Test obtaining authentication token."""
        response = self.client.post('/api-token-auth/', {
            'username': 'authtest',
            'password': 'testpass123'
        })

        assert response.status_code == status.HTTP_200_OK
        assert 'token' in response.data

    def test_invalid_credentials(self):
        """Test token endpoint with invalid credentials."""
        response = self.client.post('/api-token-auth/', {
            'username': 'authtest',
            'password': 'wrongpassword'
        })

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_endpoint_requires_authentication(self):
        """Test that protected endpoints require authentication."""
        response = self.client.get('/api/v1/student/profile/')

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_invalid_token(self):
        """Test request with invalid token."""
        self.client.credentials(HTTP_AUTHORIZATION='Token invalidtoken123')
        response = self.client.get('/api/v1/student/profile/')

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
