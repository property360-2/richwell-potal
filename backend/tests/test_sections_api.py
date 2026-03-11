import pytest
from django.urls import reverse
from rest_framework import status
from tests.factories import (
    RegistrarUserFactory,
    StudentUserFactory,
    ProfessorUserFactory,
    SectionFactory,
    TermFactory,
    ProgramFactory,
    StudentFactory,
)

def get_auth_headers(user):
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    return {'HTTP_AUTHORIZATION': f'Bearer {refresh.access_token}'}

@pytest.mark.django_db
class TestSectionsAPI:
    def test_section_list(self, api_client, admin_user):
        SectionFactory.create_batch(2)
        url = reverse('section-list')
        resp = api_client.get(url, **get_auth_headers(admin_user))
        assert resp.status_code == status.HTTP_200_OK

    def test_generate_sections_registrar(self, api_client, active_term, program):
        registrar = RegistrarUserFactory()
        url = reverse('section-generate')
        data = {
            'term_id': active_term.id,
            'program_id': program.id,
            'year_level': 1
        }
        resp = api_client.post(url, data, format='json', **get_auth_headers(registrar))
        assert resp.status_code in (status.HTTP_201_CREATED, status.HTTP_200_OK)

    def test_section_stats(self, api_client, active_term):
        registrar = RegistrarUserFactory()
        url = reverse('section-stats')
        resp = api_client.get(url, {'term_id': active_term.id}, **get_auth_headers(registrar))
        assert resp.status_code == status.HTTP_200_OK

    def test_section_transfer_registrar(self, api_client, active_term):
        registrar = RegistrarUserFactory()
        section = SectionFactory(term=active_term)
        student = StudentFactory()
        url = reverse('section-transfer', kwargs={'pk': section.pk})
        data = {
            'student_id': student.id,
            'term_id': active_term.id
        }
        resp = api_client.post(url, data, format='json', **get_auth_headers(registrar))
        assert resp.status_code == status.HTTP_200_OK

    def test_section_roster(self, api_client, admin_user):
        section = SectionFactory()
        url = reverse('section-roster', kwargs={'pk': section.pk})
        resp = api_client.get(url, **get_auth_headers(admin_user))
        assert resp.status_code == status.HTTP_200_OK
        assert isinstance(resp.data, list)

    def test_my_sections_professor(self, api_client, active_term):
        from tests.factories import ProfessorFactory
        professor = ProfessorFactory()
        user = professor.user
        url = reverse('section-my-sections')
        # This action uses professor_profile, we need to ensure the profile exists
        # ProfessorFactory creates the profile and the user.
        resp = api_client.get(url, **get_auth_headers(user))
        assert resp.status_code == status.HTTP_200_OK
