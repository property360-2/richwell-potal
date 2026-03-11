import pytest
from django.urls import reverse
from rest_framework import status
from tests.factories import RoomFactory, AdminUserFactory

def get_auth_headers(user):
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    return {'HTTP_AUTHORIZATION': f'Bearer {refresh.access_token}'}

@pytest.mark.django_db
class TestFacilitiesAPI:
    def test_room_list(self, api_client, admin_user):
        RoomFactory.create_batch(2)
        url = reverse('room-list')
        resp = api_client.get(url, **get_auth_headers(admin_user))
        assert resp.status_code == status.HTTP_200_OK
        results = resp.data.get('results', resp.data)
        assert len(results) >= 2

    def test_room_create(self, api_client, admin_user):
        url = reverse('room-list')
        data = {
            'name': 'F-1234',
            'room_type': 'LECTURE',
            'capacity': 50
        }
        resp = api_client.post(url, data, format='json', **get_auth_headers(admin_user))
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data['name'] == 'F-1234'
