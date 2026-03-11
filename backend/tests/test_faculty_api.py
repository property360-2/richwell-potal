import pytest
from django.urls import reverse
from rest_framework import status
from tests.factories import (
    ProfessorFactory,
    RegistrarUserFactory,
    SubjectFactory,
    AdminUserFactory,
)

def get_auth_headers(user):
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    return {'HTTP_AUTHORIZATION': f'Bearer {refresh.access_token}'}

@pytest.mark.django_db
class TestFacultyAPI:
    def test_professor_list(self, api_client, admin_user):
        ProfessorFactory.create_batch(2)
        url = reverse('professor-list')
        resp = api_client.get(url, **get_auth_headers(admin_user))
        assert resp.status_code == status.HTTP_200_OK

    def test_professor_retrieve(self, api_client, admin_user):
        professor = ProfessorFactory()
        url = reverse('professor-detail', kwargs={'pk': professor.pk})
        resp = api_client.get(url, **get_auth_headers(admin_user))
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['employee_id'] == professor.employee_id

    def test_professor_subjects_get(self, api_client, admin_user):
        professor = ProfessorFactory()
        url = reverse('professor-subjects', kwargs={'pk': professor.pk})
        resp = api_client.get(url, **get_auth_headers(admin_user))
        assert resp.status_code == status.HTTP_200_OK
        assert isinstance(resp.data, list)

    def test_professor_subjects_post(self, api_client, admin_user):
        professor = ProfessorFactory()
        subject = SubjectFactory()
        url = reverse('professor-subjects', kwargs={'pk': professor.pk})
        resp = api_client.post(url, {'subject_ids': [subject.id]}, format='json', **get_auth_headers(admin_user))
        assert resp.status_code == status.HTTP_200_OK
        assert 'Added 1 subjects' in resp.data['status']

    def test_professor_availability_post(self, api_client, admin_user):
        professor = ProfessorFactory()
        url = reverse('professor-availability', kwargs={'pk': professor.pk})
        data = {
            'availabilities': [
                {'day': 'M', 'session': 'AM'},
                {'day': 'W', 'session': 'AM'}
            ]
        }
        resp = api_client.post(url, data, format='json', **get_auth_headers(admin_user))
        assert resp.status_code == status.HTTP_200_OK
        assert 'Updated 2 availability slots' in resp.data['status']
