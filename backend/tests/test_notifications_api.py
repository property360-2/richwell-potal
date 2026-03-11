import pytest
from django.urls import reverse
from rest_framework import status
from tests.factories import NotificationFactory, StudentUserFactory

def get_auth_headers(user):
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    return {'HTTP_AUTHORIZATION': f'Bearer {refresh.access_token}'}

@pytest.mark.django_db
class TestNotificationsAPI:
    def test_notification_list_user_sees_own(self, api_client):
        student = StudentUserFactory()
        notif1 = NotificationFactory(recipient=student)
        notif2 = NotificationFactory() # another user
        
        url = reverse('notification-list')
        resp = api_client.get(url, **get_auth_headers(student))
        assert resp.status_code == status.HTTP_200_OK
        results = resp.data.get('results', resp.data)
        ids = [n['id'] for n in results]
        assert notif1.id in ids
        assert notif2.id not in ids

    def test_mark_read(self, api_client):
        student = StudentUserFactory()
        notif = NotificationFactory(recipient=student)
        url = reverse('notification-mark-read', kwargs={'pk': notif.pk})
        resp = api_client.post(url, {}, **get_auth_headers(student))
        assert resp.status_code == status.HTTP_200_OK
        notif.refresh_from_db()
        assert notif.is_read is True

    def test_unread_count(self, api_client):
        student = StudentUserFactory()
        NotificationFactory.create_batch(3, recipient=student, is_read=False)
        url = reverse('notification-unread-count')
        resp = api_client.get(url, **get_auth_headers(student))
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['unread_count'] == 3

    def test_direct_create_update_forbidden(self, api_client):
        student = StudentUserFactory()
        url_list = reverse('notification-list')
        resp = api_client.post(url_list, {'title': 'X'}, format='json', **get_auth_headers(student))
        assert resp.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
        
        notif = NotificationFactory(recipient=student)
        url_detail = reverse('notification-detail', kwargs={'pk': notif.pk})
        resp = api_client.put(url_detail, {'title': 'X'}, format='json', **get_auth_headers(student))
        assert resp.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
