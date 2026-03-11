import pytest
from decimal import Decimal
from django.core.exceptions import ValidationError

from apps.grades.services.advising_service import AdvisingService
from apps.grades.services.resolution_service import ResolutionService
from apps.finance.services.payment_service import PaymentService
from apps.reports.services.report_service import ReportService

from apps.grades.models import Grade
from tests.factories import (
    StudentFactory,
    StudentEnrollmentFactory,
    GradeFactory,
    SubjectFactory,
    TermFactory,
    AdminUserFactory,
)


@pytest.mark.django_db
class TestAdvisingService:
    def test_get_year_level_no_grades(self, student, subject, active_term):
        level = AdvisingService.get_year_level(student)
        assert level == 1

    def test_get_year_level_with_passed_subject(self, student, subject, active_term):
        GradeFactory(
            student=student,
            subject=subject,
            term=active_term,
            grade_status=Grade.STATUS_PASSED,
        )
        level = AdvisingService.get_year_level(student)
        assert level == subject.year_level

    def test_auto_advise_regular_creates_grades(self, student, subject, active_term):
        StudentEnrollmentFactory(student=student, term=active_term, year_level=1)
        grades = AdvisingService.auto_advise_regular(student, active_term)
        assert len(grades) >= 1

    def test_manual_advise_validates_units_limit(self, student, active_term):
        StudentEnrollmentFactory(student=student, term=active_term)
        many_subjects = [
            SubjectFactory(
                curriculum=student.curriculum,
                year_level=1,
                semester=active_term.semester_type,
                total_units=3,
                code=f'SUB{i}',
            )
            for i in range(11)
        ]
        subject_ids = [s.id for s in many_subjects]
        with pytest.raises(ValidationError, match="limit"):
            AdvisingService.manual_advise_irregular(student, active_term, subject_ids)


@pytest.mark.django_db
class TestResolutionService:
    def test_request_resolution_sets_status(self, grade):
        """Bug-reproducing: resolution_status should be set to REQUESTED."""
        grade.grade_status = Grade.STATUS_INC
        grade.save()
        from tests.factories import ProfessorUserFactory
        prof = ProfessorUserFactory()
        result = ResolutionService().request_resolution(grade.id, prof, "Reason")
        assert result.resolution_status == 'REQUESTED'


@pytest.mark.django_db
class TestPaymentService:
    def test_record_payment_success(self, student_with_user, active_term):
        admin = AdminUserFactory()
        payment = PaymentService.record_payment(
            student_with_user,
            active_term,
            month=1,
            amount=Decimal('5000'),
            processed_by=admin,
        )
        assert payment.amount == Decimal('5000')
        assert payment.month == 1

    def test_record_adjustment_requires_negative(self, student_with_user, active_term):
        admin = AdminUserFactory()
        with pytest.raises(ValidationError, match="negative"):
            PaymentService.record_adjustment(
                student_with_user,
                active_term,
                month=1,
                amount=Decimal('100'),
                processed_by=admin,
                remarks='Test',
            )


@pytest.mark.django_db
class TestReportService:
    def test_graduation_check_returns_structure(self, student_with_user):
        result = ReportService.graduation_check(student_with_user.id)
        assert 'is_eligible' in result
        assert 'total_units_required' in result
        assert 'total_units_earned' in result
        assert 'missing_subjects' in result
