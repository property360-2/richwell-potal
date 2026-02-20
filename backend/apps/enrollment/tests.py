"""
Unit tests for Subject Enrollment Service (EPIC 3).
Tests prerequisite validation, unit cap, payment hold, and schedule conflicts.
"""

from decimal import Decimal
from datetime import date, time
from uuid import uuid4

from django.test import TestCase
from django.contrib.auth import get_user_model

from apps.academics.models import Program, Subject, Section, SectionSubject, ScheduleSlot
from apps.enrollment.models import (
    Semester, Enrollment, MonthlyPaymentBucket, SubjectEnrollment
)
from apps.enrollment.services import SubjectEnrollmentService
from apps.core.exceptions import (
    PrerequisiteNotSatisfiedError, UnitCapExceededError,
    PaymentRequiredError, ScheduleConflictError, ConflictError,
    ValidationError
)

User = get_user_model()


class SubjectEnrollmentServiceTestCase(TestCase):
    """Base test case with common setup."""
    
    @classmethod
    def setUpTestData(cls):
        """Set up test data for the entire test class."""
        # Create program
        cls.program = Program.objects.create(
            code='BSIT',
            name='Bachelor of Science in Information Technology',
            duration_years=4
        )
        
        # Create semester
        cls.semester = Semester.objects.create(
            name='1st Semester',
            academic_year='2024-2025',
            start_date=date(2024, 8, 1),
            end_date=date(2024, 12, 15),
            is_current=True
        )
        
        # Create subjects
        cls.subject1 = Subject.objects.create(
            program=cls.program,
            code='IT101',
            title='Introduction to Computing',
            units=3,
            year_level=1,
            semester_number=1,
            is_major=False
        )
        
        cls.subject2 = Subject.objects.create(
            program=cls.program,
            code='IT102',
            title='Programming Fundamentals',
            units=3,
            year_level=1,
            semester_number=1,
            is_major=True
        )
        
        cls.subject3 = Subject.objects.create(
            program=cls.program,
            code='IT201',
            title='Data Structures',
            units=3,
            year_level=2,
            semester_number=1,
            is_major=True
        )
        # IT201 requires IT102 as prerequisite
        cls.subject3.prerequisites.add(cls.subject2)
        
        # Create section
        cls.section = Section.objects.create(
            name='BSIT-1A',
            program=cls.program,
            semester=cls.semester,
            year_level=1,
            capacity=40
        )
        
        # Create section subjects
        cls.section_subject1 = SectionSubject.objects.create(
            section=cls.section,
            subject=cls.subject1,
            is_tba=False
        )
        
        cls.section_subject2 = SectionSubject.objects.create(
            section=cls.section,
            subject=cls.subject2,
            is_tba=False
        )
        
        # Create schedule slots
        ScheduleSlot.objects.create(
            section_subject=cls.section_subject1,
            day='MON',
            start_time=time(8, 0),
            end_time=time(10, 0),
            room='Room 101'
        )
        
        ScheduleSlot.objects.create(
            section_subject=cls.section_subject2,
            day='MON',
            start_time=time(10, 0),
            end_time=time(12, 0),
            room='Room 101'
        )
    
    def setUp(self):
        """Set up test data for each test method."""
        from apps.accounts.models import StudentProfile
        
        # Create student user
        self.student = User.objects.create_user(
            email='student@example.com',
            password='testpass123',
            first_name='Test',
            last_name='Student',
            role='STUDENT',
            student_number='2024-00001'
        )
        
        # Create student profile
        self.student_profile = StudentProfile.objects.create(
            user=self.student,
            program=self.program,
            year_level=1,
            home_section=self.section,  # Assign home section
            birthdate=date(2000, 1, 1),
            address='123 Test St',
            contact_number='09123456789'
        )
        
        # Create enrollment
        self.enrollment = Enrollment.objects.create(
            student=self.student,
            semester=self.semester,
            status=Enrollment.Status.ACTIVE,
            monthly_commitment=Decimal('5000.00')
        )
        
        # Create payment buckets
        for month in range(1, 7):
            MonthlyPaymentBucket.objects.create(
                enrollment=self.enrollment,
                month_number=month,
                required_amount=Decimal('5000.00'),
                paid_amount=Decimal('0.00'),
                is_fully_paid=False
            )
        
        self.service = SubjectEnrollmentService()
    
    def tearDown(self):
        """Clean up after each test."""
        SubjectEnrollment.objects.filter(enrollment=self.enrollment).delete()
        self.enrollment.delete()
        self.student_profile.delete()
        self.student.delete()


class PrerequisiteValidationTests(SubjectEnrollmentServiceTestCase):
    """Tests for prerequisite validation."""
    
    def test_subject_without_prerequisites_passes(self):
        """Subject without prerequisites should pass validation."""
        met, missing = self.service.check_prerequisites(self.student, self.subject1)
        self.assertTrue(met)
        self.assertEqual(missing, [])
    
    def test_subject_with_unmet_prerequisites_fails(self):
        """Subject with unmet prerequisites should fail validation."""
        met, missing = self.service.check_prerequisites(self.student, self.subject3)
        self.assertFalse(met)
        self.assertIn('IT102', missing)
    
    def test_subject_with_passed_prerequisites_succeeds(self):
        """Subject with passed prerequisites should pass validation."""
        # Create a passed subject enrollment for IT102
        SubjectEnrollment.objects.create(
            enrollment=self.enrollment,
            subject=self.subject2,
            section=self.section,
            status=SubjectEnrollment.Status.PASSED
        )
        
        met, missing = self.service.check_prerequisites(self.student, self.subject3)
        self.assertTrue(met)
        self.assertEqual(missing, [])
    
    def test_credited_subject_satisfies_prerequisites(self):
        """Credited subjects should satisfy prerequisites."""
        # Create a credited subject enrollment for IT102
        SubjectEnrollment.objects.create(
            enrollment=self.enrollment,
            subject=self.subject2,
            section=None,
            status=SubjectEnrollment.Status.CREDITED
        )
        
        met, missing = self.service.check_prerequisites(self.student, self.subject3)
        self.assertTrue(met)
        self.assertEqual(missing, [])


class UnitCapValidationTests(SubjectEnrollmentServiceTestCase):
    """Tests for unit cap validation."""
    
    def test_enrollment_within_cap_passes(self):
        """Enrollment within unit cap should pass."""
        within_cap, current, max_units = self.service.check_unit_cap(
            self.student, self.semester, 3
        )
        self.assertTrue(within_cap)
        self.assertEqual(current, 0)
    
    def test_enrollment_exceeding_cap_fails(self):
        """Enrollment exceeding unit cap should fail."""
        # Enroll in many subjects first
        for i in range(10):
            subject = Subject.objects.create(
                program=self.program,
                code=f'TEST{i:03d}',
                title=f'Test Subject {i}',
                units=3,
                year_level=1,
                semester_number=1
            )
            SubjectEnrollment.objects.create(
                enrollment=self.enrollment,
                subject=subject,
                section=self.section,
                status=SubjectEnrollment.Status.ENROLLED
            )
        
        # Current units should be 30, cap is 30
        # Adding 3 more should fail
        within_cap, current, max_units = self.service.check_unit_cap(
            self.student, self.semester, 3
        )
        self.assertFalse(within_cap)
        self.assertEqual(current, 30)


class PaymentHoldValidationTests(SubjectEnrollmentServiceTestCase):
    """Tests for payment hold validation."""
    
    def test_unpaid_month1_fails(self):
        """Enrollment should fail when Month 1 is not paid."""
        is_paid = self.service.check_payment_status(self.enrollment)
        self.assertFalse(is_paid)
    
    def test_paid_month1_passes(self):
        """Enrollment should pass when Month 1 is paid."""
        # Mark Month 1 as paid
        month1 = self.enrollment.payment_buckets.get(month_number=1)
        month1.paid_amount = month1.required_amount
        month1.is_fully_paid = True
        month1.save()
        
        is_paid = self.service.check_payment_status(self.enrollment)
        self.assertTrue(is_paid)


class EnrollSubjectIntegrationTests(SubjectEnrollmentServiceTestCase):
    """Integration tests for the full enrollment flow."""
    
    def setUp(self):
        super().setUp()
        # Mark Month 1 as paid for integration tests
        month1 = self.enrollment.payment_buckets.get(month_number=1)
        month1.paid_amount = month1.required_amount
        month1.is_fully_paid = True
        month1.save()
    
    def test_successful_enrollment(self):
        """Test successful subject enrollment."""
        subject_enrollment = self.service.enroll_in_subject(
            student=self.student,
            enrollment=self.enrollment,
            subject=self.subject1,
            section=self.section
        )
        
        self.assertIsNotNone(subject_enrollment)
        # Standard enrollment now starts as PENDING_HEAD
        self.assertEqual(subject_enrollment.status, SubjectEnrollment.Status.PENDING_HEAD)
        self.assertEqual(subject_enrollment.subject, self.subject1)
    
    def test_enrollment_blocked_by_prerequisites(self):
        """Test enrollment blocked when prerequisites not met."""
        with self.assertRaises(PrerequisiteNotSatisfiedError):
            self.service.enroll_in_subject(
                student=self.student,
                enrollment=self.enrollment,
                subject=self.subject3,
                section=self.section
            )
    
    def test_enrollment_allowed_without_payment(self):
        """Test enrollment is allowed even if Month 1 not paid (new flow)."""
        # Unpay Month 1
        month1 = self.enrollment.payment_buckets.get(month_number=1)
        month1.paid_amount = Decimal('0.00')
        month1.is_fully_paid = False
        month1.save()
        
        # Should NOT raise PaymentRequiredError anymore
        se = self.service.enroll_in_subject(
            student=self.student,
            enrollment=self.enrollment,
            subject=self.subject1,
            section=self.section
        )
        
        self.assertEqual(se.status, SubjectEnrollment.Status.PENDING_HEAD)
        self.assertFalse(se.payment_approved)
    
    def test_duplicate_enrollment_blocked(self):
        """Test duplicate enrollment is blocked."""
        # First enrollment
        self.service.enroll_in_subject(
            student=self.student,
            enrollment=self.enrollment,
            subject=self.subject1,
            section=self.section
        )
        
        # Duplicate should fail
        with self.assertRaises(ConflictError):
            self.service.enroll_in_subject(
                student=self.student,
                enrollment=self.enrollment,
                subject=self.subject1,
                section=self.section
            )
    
    def test_drop_subject(self):
        """Test dropping a subject."""
        # First enroll
        subject_enrollment = self.service.enroll_in_subject(
            student=self.student,
            enrollment=self.enrollment,
            subject=self.subject1,
            section=self.section
        )
        
        # Then drop
        dropped = self.service.drop_subject(subject_enrollment, self.student)
        
        self.assertEqual(dropped.status, SubjectEnrollment.Status.DROPPED)


class RegistrarOverrideTests(SubjectEnrollmentServiceTestCase):
    """Tests for registrar override functionality."""
    
    def setUp(self):
        super().setUp()
        # Create registrar user
        self.registrar = User.objects.create_user(
            email='registrar@example.com',
            password='testpass123',
            first_name='Test',
            last_name='Registrar',
            role='REGISTRAR'
        )
    
    def tearDown(self):
        super().tearDown()
        self.registrar.delete()
    
    def test_registrar_override_populates_new_fields(self):
        """Verify that override tracking fields are correctly populated."""
        reason = 'Special academic exemption'
        subject_enrollment = self.service.registrar_override_enroll(
            registrar=self.registrar,
            student=self.student,
            enrollment=self.enrollment,
            subject=self.subject3,
            section=self.section,
            override_reason=reason
        )
        
        self.assertTrue(subject_enrollment.is_overridden)
        self.assertEqual(subject_enrollment.override_reason, reason)
        self.assertEqual(subject_enrollment.overridden_by, self.registrar)
        self.assertTrue(subject_enrollment.head_approved)
        self.assertTrue(subject_enrollment.payment_approved)

    def test_enroll_in_subject_with_override_integration(self):
        """Test the unified enroll_in_subject method with override flag."""
        reason = 'Dean Approved'
        subject_enrollment = self.service.enroll_in_subject(
            student=self.student,
            enrollment=self.enrollment,
            subject=self.subject3, # Fails prereqs normally
            section=self.section,
            override=True,
            override_reason=reason,
            actor=self.registrar
        )
        
        self.assertIsNotNone(subject_enrollment)
        self.assertTrue(subject_enrollment.is_overridden)
        self.assertEqual(subject_enrollment.override_reason, reason)

    def test_enroll_in_subject_with_override_unauthorized(self):
        """Test that students cannot bypass validation even if they send override=True."""
        from django.core.exceptions import PermissionDenied
        
        with self.assertRaises(PermissionDenied):
            self.service.enroll_in_subject(
                student=self.student,
                enrollment=self.enrollment,
                subject=self.subject3,
                section=self.section,
                override=True,
                override_reason='I want to bypass',
                actor=self.student # Unauthorized actor
            )

from rest_framework.test import APITestCase
from django.urls import reverse

class RegistrarOverrideAPITests(APITestCase):
    """Test suite for the Registrar Override API endpoint."""

    def setUp(self):
        from apps.accounts.models import User, StudentProfile
        from apps.enrollment.models import Enrollment, Semester, SubjectEnrollment
        from apps.academics.models import Subject, Section, Program, Curriculum, SectionSubject
        from datetime import date

        # 1. Setup Actor (Registrar)
        self.registrar = User.objects.create_user(
            username='registrar', email='registrar@test.com', password='password123',
            role='REGISTRAR', first_name='Reg', last_name='Istrar'
        )

        # 2. Setup Student
        self.student_user = User.objects.create_user(
            username='student', email='student@test.com', password='password123',
            role='STUDENT', first_name='John', last_name='Doe'
        )
        
        self.program = Program.objects.create(name='BSCS', code='BSCS')
        self.curr = Curriculum.objects.create(
            name='V1', 
            code='V1', 
            program=self.program,
            effective_year=2024
        )
        
        # 3. Setup Enrollment & Semester
        self.semester = Semester.objects.create(
            name='1st Semester 2024-25',
            academic_year='2024-2025',
            is_current=True,
            status=Semester.TermStatus.ENROLLMENT_OPEN,
            start_date=date(2024, 8, 1),
            end_date=date(2024, 12, 31)
        )

        self.section = Section.objects.create(
            name='CS1A', 
            year_level=1,
            program=self.program,
            semester=self.semester
        )
        
        self.profile = StudentProfile.objects.create(
            user=self.student_user,
            program=self.program,
            curriculum=self.curr,
            year_level=1,
            home_section=self.section,
            birthdate=date(2000, 1, 1),
            address='Test Addr',
            contact_number='123'
        )

        self.enrollment = Enrollment.objects.create(
            student=self.student_user,
            semester=self.semester,
            status=Enrollment.Status.ACTIVE,
            monthly_commitment=Decimal('0.00')
        )

        # 4. Setup Subject
        self.subject = Subject.objects.create(
            code='MATH101', 
            title='Math', 
            units=3,
            year_level=1,
            semester_number=1,
            program=self.program
        )
        self.section_subject = SectionSubject.objects.create(
            section=self.section,
            subject=self.subject,
            capacity=40
        )

    def test_registrar_override_success(self):
        """Test that a registrar can successfully override enrollment via API."""
        self.client.force_authenticate(user=self.registrar)
        
        url = reverse('enrollment:override-enroll', kwargs={'enrollment_id': self.enrollment.id})
        data = {
            'student_id': str(self.student_user.id),
            'subject_id': str(self.subject.id),
            'section_id': str(self.section.id),
            'override_reason': 'Force enrolling for testing'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['success'])
        self.assertTrue(response.data['data']['is_overridden'])
        
        # Verify DB
        from apps.enrollment.models import SubjectEnrollment
        se = SubjectEnrollment.objects.get(id=response.data['data']['id'])
        self.assertTrue(se.is_overridden)
        self.assertEqual(se.override_reason, 'Force enrolling for testing')
        self.assertEqual(se.overridden_by, self.registrar)

    def test_student_cannot_override(self):
        """Test that a student is blocked from the override endpoint."""
        self.client.force_authenticate(user=self.student_user)
        
        url = reverse('enrollment:override-enroll', kwargs={'enrollment_id': self.enrollment.id})
        data = {
            'student_id': str(self.student_user.id),
            'subject_id': str(self.subject.id),
            'section_id': str(self.section.id),
            'override_reason': 'I want to override myself'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, 403)
