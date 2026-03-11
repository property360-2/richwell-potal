import pytest
from django.urls import reverse
from rest_framework import status
from tests.factories import TermFactory, AdminUserFactory

def get_auth_headers(user):
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    return {'HTTP_AUTHORIZATION': f'Bearer {refresh.access_token}'}

@pytest.mark.django_db
class TestTermsAPI:
    def test_term_list(self, api_client):
        TermFactory.create_batch(2)
        url = reverse('term-list')
        resp = api_client.get(url)
        assert resp.status_code == status.HTTP_200_OK

    def test_term_detail(self, api_client):
        term = TermFactory()
        url = reverse('term-detail', kwargs={'pk': term.pk})
        resp = api_client.get(url)
        assert resp.status_code == status.HTTP_200_OK

    def test_term_activate_admin(self, api_client):
        admin = AdminUserFactory()
        term1 = TermFactory(is_active=False)
        term2 = TermFactory(is_active=True)
        url = reverse('term-activate', kwargs={'pk': term1.pk})
        resp = api_client.post(url, {}, **get_auth_headers(admin))
        assert resp.status_code == status.HTTP_200_OK
        
        term1.refresh_from_db()
        term2.refresh_from_db()
        assert term1.is_active is True
        assert term2.is_active is False
