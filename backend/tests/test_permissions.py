import pytest
from django.urls import reverse
from rest_framework import status

from tests.factories import (
    AdminUserFactory,
    RegistrarUserFactory,
    StudentUserFactory,
    ProfessorUserFactory,
    StudentFactory,
)


def get_auth_headers(user):
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    return {'HTTP_AUTHORIZATION': f'Bearer {refresh.access_token}'}


@pytest.mark.django_db
class TestStaffPermissions:
    def test_admin_can_access_staff_list(self, api_client):
        admin = AdminUserFactory()
        url = reverse('staff-list')
        response = api_client.get(url, **get_auth_headers(admin))
        assert response.status_code == status.HTTP_200_OK

    def test_registrar_cannot_access_staff_list(self, api_client):
        registrar = RegistrarUserFactory()
        url = reverse('staff-list')
        response = api_client.get(url, **get_auth_headers(registrar))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_student_cannot_access_staff_list(self, api_client):
        student_user = StudentUserFactory()
        url = reverse('staff-list')
        response = api_client.get(url, **get_auth_headers(student_user))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_professor_cannot_access_staff_list(self, api_client):
        professor = ProfessorUserFactory()
        url = reverse('staff-list')
        response = api_client.get(url, **get_auth_headers(professor))
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestStudentPermissions:
    def test_student_can_access_own_record(self, api_client, student_with_user):
        student = student_with_user
        url = reverse('student-detail', kwargs={'pk': student.pk})
        response = api_client.get(url, **get_auth_headers(student.user))
        assert response.status_code == status.HTTP_200_OK
        assert response.data['idn'] == student.idn

    def test_student_queryset_filtered_to_self(self, api_client, student_with_user):
        other_student = StudentFactory()
        url = reverse('student-list')
        response = api_client.get(url, **get_auth_headers(student_with_user.user))
        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        if isinstance(results, list):
            student_ids = [s['id'] for s in results]
            assert student_with_user.id in student_ids
            assert other_student.id not in student_ids
