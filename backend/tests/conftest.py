import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

from tests.factories import (
    UserFactory,
    AdminUserFactory,
    RegistrarUserFactory,
    StudentUserFactory,
    ProfessorUserFactory,
    TermFactory,
    ProgramFactory,
    CurriculumVersionFactory,
    SubjectFactory,
    StudentFactory,
    StudentEnrollmentFactory,
    GradeFactory,
    SectionFactory,
    ProfessorFactory,
    RoomFactory,
    PaymentFactory,
)

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(db):
    return AdminUserFactory()


@pytest.fixture
def registrar_user(db):
    return RegistrarUserFactory()


@pytest.fixture
def student_user(db):
    return StudentUserFactory()


@pytest.fixture
def professor_user(db):
    return ProfessorUserFactory()


@pytest.fixture
def authenticated_client(api_client, admin_user):
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(admin_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return api_client


@pytest.fixture
def student_with_user(db, program, curriculum):
    return StudentFactory(program=program, curriculum=curriculum)


@pytest.fixture
def student_authenticated_client(api_client, student_with_user):
    from rest_framework_simplejwt.tokens import RefreshToken
    user = student_with_user.user
    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    api_client.user = user
    api_client.student = student_with_user
    return api_client


@pytest.fixture
def active_term(db):
    return TermFactory(is_active=True)


@pytest.fixture
def program(db):
    return ProgramFactory()


@pytest.fixture
def curriculum(program):
    return CurriculumVersionFactory(program=program)


@pytest.fixture
def subject(curriculum):
    return SubjectFactory(curriculum=curriculum)


@pytest.fixture
def student(program, curriculum):
    return StudentFactory(program=program, curriculum=curriculum)


@pytest.fixture
def enrollment(student, active_term):
    return StudentEnrollmentFactory(student=student, term=active_term)


@pytest.fixture
def grade(student, subject, active_term):
    return GradeFactory(
        student=student,
        subject=subject,
        term=active_term,
    )
