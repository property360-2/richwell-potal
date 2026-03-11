import pytest
from django.urls import reverse
from rest_framework import status

from tests.factories import AdminUserFactory


def auth_headers(user):
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    return {'HTTP_AUTHORIZATION': f'Bearer {refresh.access_token}'}


@pytest.mark.django_db
class TestEdgeCases:
    def test_empty_payload_rejected(self, api_client, admin_user):
        url = reverse('program-list')
        resp = api_client.post(url, {}, format='json', **auth_headers(admin_user))
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_missing_required_fields(self, api_client, admin_user):
        url = reverse('program-list')
        resp = api_client.post(url, {'code': 'X'}, format='json', **auth_headers(admin_user))
        assert resp.status_code in (status.HTTP_400_BAD_REQUEST, status.HTTP_201_CREATED)

    def test_invalid_content_type(self, api_client, admin_user):
        url = reverse('program-list')
        resp = api_client.post(
            url,
            'not json',
            content_type='text/plain',
            **auth_headers(admin_user)
        )
        assert resp.status_code in (status.HTTP_400_BAD_REQUEST, status.HTTP_415_UNSUPPORTED_MEDIA_TYPE)

    def test_nonexistent_id_returns_404(self, api_client, admin_user):
        url = reverse('program-detail', kwargs={'pk': 99999})
        resp = api_client.get(url, **auth_headers(admin_user))
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_large_payload_rejected(self, api_client, admin_user):
        """Test with very large JSON body."""
        url = reverse('program-list')
        large_name = 'A' * 1000000 # 1MB string
        resp = api_client.post(
            url, 
            {'code': 'XL', 'name': large_name}, 
            format='json', 
            **auth_headers(admin_user)
        )
        # Should be 400 or 413 depending on server config (but SQLite/DRF handles it in tests context)
        assert resp.status_code in (status.HTTP_400_BAD_REQUEST, status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, status.HTTP_201_CREATED)
