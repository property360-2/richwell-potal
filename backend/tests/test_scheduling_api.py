import pytest
from django.urls import reverse
from rest_framework import status
from tests.factories import (
    AdminUserFactory,
    DeanUserFactory,
    StudentUserFactory,
    ScheduleFactory,
    TermFactory,
    ProfessorFactory,
    RoomFactory,
    SectionFactory,
)

def get_auth_headers(user):
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    return {'HTTP_AUTHORIZATION': f'Bearer {refresh.access_token}'}

@pytest.mark.django_db
class TestSchedulingAPI:
    def test_schedule_list(self, api_client, admin_user):
        ScheduleFactory.create_batch(3)
        url = reverse('schedule-list')
        resp = api_client.get(url, **get_auth_headers(admin_user))
        assert resp.status_code == status.HTTP_200_OK
        results = resp.data.get('results', resp.data)
        assert len(results) >= 3

    def test_assign_schedule_dean(self, api_client, active_term):
        dean = DeanUserFactory()
        schedule = ScheduleFactory(term=active_term, professor=None)
        professor = ProfessorFactory()
        room = RoomFactory()
        
        url = reverse('schedule-assign')
        data = {
            'id': schedule.pk,
            'professor_id': professor.pk,
            'room_id': room.pk,
            'days': ['M', 'W'],
            'start_time': '08:00',
            'end_time': '10:00'
        }
        resp = api_client.post(url, data, format='json', **get_auth_headers(dean))
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['professor_name'] is not None

    def test_publish_schedule_dean(self, api_client):
        dean = DeanUserFactory()
        term = TermFactory()
        url = reverse('schedule-publish')
        resp = api_client.post(url, {'term_id': term.id}, format='json', **get_auth_headers(dean))
        assert resp.status_code == status.HTTP_200_OK
        assert 'published' in resp.data['message'].lower()

    def test_status_matrix(self, api_client, active_term, program):
        url = reverse('schedule-status-matrix')
        params = {'term_id': active_term.id, 'program_id': program.id, 'year_level': 1}
        resp = api_client.get(url, params, **get_auth_headers(admin_user := AdminUserFactory()))
        assert resp.status_code == status.HTTP_200_OK
        assert isinstance(resp.data, list)

    def test_available_slots(self, api_client, active_term):
        professor = ProfessorFactory()
        url = reverse('schedule-available-slots')
        params = {'term_id': active_term.id, 'professor_id': professor.id}
        resp = api_client.get(url, params, **get_auth_headers(AdminUserFactory()))
        assert resp.status_code == status.HTTP_200_OK
