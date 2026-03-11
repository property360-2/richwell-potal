import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from apps.accounts.models import User
from apps.academics.models import Program, CurriculumVersion, Subject, SubjectPrerequisite
from apps.terms.models import Term
from apps.students.models import Student, StudentEnrollment
from apps.grades.models import Grade
from apps.sections.models import Section, SectionStudent
from apps.facilities.models import Room
from apps.finance.models import Payment

from tests.factories import (
    UserFactory,
    TermFactory,
    ProgramFactory,
    CurriculumVersionFactory,
    SubjectFactory,
    StudentFactory,
    StudentEnrollmentFactory,
    GradeFactory,
    SectionFactory,
    RoomFactory,
    PaymentFactory,
)


@pytest.mark.django_db
class TestUserModel:
    def test_user_requires_valid_role(self):
        user = UserFactory()
        assert user.role in [c[0] for c in User.RoleChoices.choices]

    def test_user_unique_email(self):
        UserFactory(email='dup@test.com')
        with pytest.raises(IntegrityError):
            UserFactory(email='dup@test.com')

    def test_must_change_password_default(self):
        user = UserFactory()
        assert user.must_change_password is False


@pytest.mark.django_db
class TestStudentModel:
    def test_document_checklist_default_on_save(self):
        student = StudentFactory(document_checklist={})
        student.save()
        assert student.document_checklist != {}
        assert 'F138' in student.document_checklist

    def test_freshman_unlocked_by_default(self):
        student = StudentFactory(student_type='FRESHMAN')
        assert student.is_advising_unlocked is True

    def test_student_requires_required_fields(self):
        user = UserFactory(role='STUDENT')
        program = ProgramFactory()
        curriculum = CurriculumVersionFactory(program=program)
        with pytest.raises(IntegrityError):
            Student.objects.create(
                user=user,
                idn='270001',
                program=program,
                curriculum=curriculum,
            )


@pytest.mark.django_db
class TestStudentEnrollmentModel:
    def test_unique_together_student_term(self):
        enrollment = StudentEnrollmentFactory()
        with pytest.raises(IntegrityError):
            StudentEnrollment.objects.create(
                student=enrollment.student,
                term=enrollment.term,
                year_level=1,
            )

    def test_advising_status_choices(self):
        enrollment = StudentEnrollmentFactory(advising_status='APPROVED')
        assert enrollment.advising_status in ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED']


@pytest.mark.django_db
class TestGradeModel:
    def test_unique_together_student_subject_term(self):
        grade = GradeFactory()
        with pytest.raises(IntegrityError):
            Grade.objects.create(
                student=grade.student,
                subject=grade.subject,
                term=grade.term,
            )

    def test_grade_validator_rejects_invalid_range(self):
        grade = GradeFactory()
        grade.midterm_grade = 0.5
        with pytest.raises(ValidationError):
            grade.full_clean()

    def test_grade_validator_accepts_valid_range(self):
        grade = GradeFactory()
        grade.midterm_grade = 2.5
        grade.full_clean()


@pytest.mark.django_db
class TestSubjectModel:
    def test_unique_together_curriculum_code(self):
        subject = SubjectFactory()
        with pytest.raises(IntegrityError):
            Subject.objects.create(
                curriculum=subject.curriculum,
                code=subject.code,
                description='Other',
                year_level=1,
                semester='1',
                total_units=3,
            )


@pytest.mark.django_db
class TestTermModel:
    def test_only_one_active_term(self):
        term1 = TermFactory(is_active=True, code='2025-1')
        term2 = TermFactory(is_active=True, code='2025-2')
        term1.refresh_from_db()
        assert term1.is_active is False
        assert term2.is_active is True

    def test_clean_rejects_start_after_end(self):
        term = TermFactory()
        old_start, old_end = term.start_date, term.end_date
        term.start_date = old_end
        term.end_date = old_start
        with pytest.raises(ValidationError):
            term.clean()


@pytest.mark.django_db
class TestSectionModel:
    def test_unique_together(self):
        section = SectionFactory()
        with pytest.raises(IntegrityError):
            Section.objects.create(
                name='Other',
                term=section.term,
                program=section.program,
                year_level=section.year_level,
                section_number=section.section_number,
                session='PM',
            )


@pytest.mark.django_db
class TestRoomModel:
    def test_room_unique_name(self):
        RoomFactory(name='Room-1')
        with pytest.raises(IntegrityError):
            RoomFactory(name='Room-1')


@pytest.mark.django_db
class TestPaymentModel:
    def test_payment_creation(self):
        payment = PaymentFactory()
        assert payment.amount > 0
        assert payment.entry_type in ['PAYMENT', 'ADJUSTMENT']
