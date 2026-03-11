import pytest
from django.urls import reverse
from rest_framework import status

from tests.factories import AdminUserFactory


@pytest.mark.django_db
class TestAuthentication:
    def test_login_success(self, api_client):
        user = AdminUserFactory()
        url = reverse('login')
        response = api_client.post(url, {
            'username': user.username,
            'password': 'testpass123',
        }, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data

    def test_login_failure_wrong_password(self, api_client):
        user = AdminUserFactory()
        url = reverse('login')
        response = api_client.post(url, {
            'username': user.username,
            'password': 'wrongpassword',
        }, format='json')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_me_requires_authentication(self, api_client):
        url = reverse('me')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_me_returns_user_data_when_authenticated(self, authenticated_client, admin_user):
        url = reverse('me')
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['username'] == admin_user.username
        assert response.data['email'] == admin_user.email

    def test_protected_endpoint_rejects_invalid_token(self, api_client):
        url = reverse('me')
        api_client.credentials(HTTP_AUTHORIZATION='Bearer invalid-token')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_protected_endpoint_rejects_missing_token(self, api_client):
        url = reverse('me')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
