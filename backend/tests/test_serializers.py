import pytest
from rest_framework import serializers

from apps.accounts.serializers import ChangePasswordSerializer, StaffCreateSerializer, UserSerializer
from apps.academics.serializers import ProgramSerializer, CurriculumVersionSerializer, SubjectSerializer
from apps.grades.serializers import GradeSerializer, AdvisingSubmitSerializer, CreditingSerializer
from apps.students.serializers import StudentSerializer, StudentApplicationSerializer, StudentEnrollmentSerializer
from apps.finance.serializers import PaymentSerializer

from tests.factories import (
    UserFactory,
    ProgramFactory,
    CurriculumVersionFactory,
    SubjectFactory,
    StudentFactory,
    StudentEnrollmentFactory,
    GradeFactory,
    PaymentFactory,
)


@pytest.mark.django_db
class TestChangePasswordSerializer:
    def test_valid_data(self):
        data = {
            'old_password': 'old123',
            'new_password': 'new456',
            'confirm_password': 'new456',
        }
        serializer = ChangePasswordSerializer(data=data)
        assert serializer.is_valid()
        assert serializer.validated_data['new_password'] == 'new456'

    def test_password_mismatch(self):
        data = {
            'old_password': 'old123',
            'new_password': 'new456',
            'confirm_password': 'different',
        }
        serializer = ChangePasswordSerializer(data=data)
        assert not serializer.is_valid()
        assert 'confirm_password' in serializer.errors or 'non_field_errors' in str(serializer.errors)

    def test_missing_required_fields(self):
        serializer = ChangePasswordSerializer(data={})
        assert not serializer.is_valid()
        assert 'old_password' in serializer.errors or 'new_password' in serializer.errors


@pytest.mark.django_db
class TestProgramSerializer:
    def test_serialize_program(self):
        program = ProgramFactory()
        serializer = ProgramSerializer(program)
        data = serializer.data
        assert data['code'] == program.code
        assert data['name'] == program.name
        assert 'active_curriculum_id' in data


@pytest.mark.django_db
class TestCurriculumVersionSerializer:
    def test_serialize_curriculum(self):
        curriculum = CurriculumVersionFactory()
        serializer = CurriculumVersionSerializer(curriculum)
        data = serializer.data
        assert data['version_name'] == curriculum.version_name
        assert 'program_code' in data
        assert 'subject_count' in data


@pytest.mark.django_db
class TestSubjectSerializer:
    def test_serialize_subject(self):
        subject = SubjectFactory()
        serializer = SubjectSerializer(subject)
        data = serializer.data
        assert data['code'] == subject.code
        assert data['description'] == subject.description
        assert data['total_units'] == subject.total_units
        assert 'prerequisites' in data
        assert 'curriculum_name' in data


@pytest.mark.django_db
class TestGradeSerializer:
    def test_serialize_grade(self):
        grade = GradeFactory()
        serializer = GradeSerializer(grade)
        data = serializer.data
        assert 'student' in data
        assert 'subject' in data
        assert 'term' in data
        assert 'subject_details' in data
        assert 'student_name' in data
        assert 'student_idn' in data
        assert data['advising_status'] == grade.advising_status
        assert data['grade_status'] == grade.grade_status


@pytest.mark.django_db
class TestAdvisingSubmitSerializer:
    def test_valid_subject_ids(self):
        subject = SubjectFactory()
        serializer = AdvisingSubmitSerializer(data={'subject_ids': [subject.id]})
        assert serializer.is_valid()
        assert serializer.validated_data['subject_ids'] == [subject.id]

    def test_empty_subject_ids_rejected(self):
        serializer = AdvisingSubmitSerializer(data={'subject_ids': []})
        assert not serializer.is_valid()
        assert 'subject_ids' in serializer.errors

    def test_invalid_subject_ids_rejected(self):
        serializer = AdvisingSubmitSerializer(data={'subject_ids': [99999]})
        assert not serializer.is_valid()
        assert 'subject_ids' in serializer.errors


@pytest.mark.django_db
class TestCreditingSerializer:
    def test_valid_subject_id(self):
        subject = SubjectFactory()
        serializer = CreditingSerializer(data={'subject_id': subject.id})
        assert serializer.is_valid()
        assert serializer.validated_data['subject_id'] == subject.id


@pytest.mark.django_db
class TestStudentSerializer:
    def test_serialize_student(self):
        student = StudentFactory()
        serializer = StudentSerializer(student)
        data = serializer.data
        assert data['idn'] == student.idn
        assert 'user' in data
        assert 'program_details' in data
        assert 'curriculum_details' in data
        assert 'latest_enrollment' in data


@pytest.mark.django_db
class TestStudentApplicationSerializer:
    def test_valid_application_data(self, program, curriculum):
        data = {
            'first_name': 'Juan',
            'last_name': 'Dela Cruz',
            'email': 'juan@example.com',
            'date_of_birth': '2005-01-01',
            'gender': 'MALE',
            'program': program.id,
            'curriculum': curriculum.id,
            'student_type': 'FRESHMAN',
        }
        serializer = StudentApplicationSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_missing_required_fields(self):
        serializer = StudentApplicationSerializer(data={})
        assert not serializer.is_valid()
        assert 'first_name' in serializer.errors or 'email' in serializer.errors


@pytest.mark.django_db
class TestStudentEnrollmentSerializer:
    def test_serialize_enrollment(self):
        enrollment = StudentEnrollmentFactory()
        serializer = StudentEnrollmentSerializer(enrollment)
        data = serializer.data
        assert 'student' in data
        assert 'term' in data
        assert 'student_details' in data
        assert 'term_details' in data
        assert data['advising_status'] == enrollment.advising_status


@pytest.mark.django_db
class TestPaymentSerializer:
    def test_serialize_payment(self):
        payment = PaymentFactory()
        serializer = PaymentSerializer(payment)
        data = serializer.data
        assert 'student' in data
        assert 'term' in data
        assert float(data['amount']) == float(payment.amount)
        assert 'student_idn' in data
        assert 'student_name' in data
