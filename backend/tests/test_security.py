import pytest
from django.urls import reverse
from rest_framework import status

from tests.factories import (
    AdminUserFactory,
    StudentFactory,
    GradeFactory,
    PaymentFactory,
)


def auth_headers(user):
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    return {'HTTP_AUTHORIZATION': f'Bearer {refresh.access_token}'}


@pytest.mark.django_db
class TestSecurity:
    def test_unauthenticated_cannot_access_protected(self, api_client):
        url = reverse('me')
        resp = api_client.get(url)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_invalid_token_rejected(self, api_client):
        url = reverse('program-list')
        api_client.credentials(HTTP_AUTHORIZATION='Bearer invalid-token-here')
        resp = api_client.get(url)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_student_cannot_access_admin_staff_list(self, api_client, student_with_user):
        url = reverse('staff-list')
        resp = api_client.get(url, **auth_headers(student_with_user.user))
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_student_cannot_access_other_student_detail(self, api_client, student_with_user):
        other_student = StudentFactory()
        url = reverse('student-detail', kwargs={'pk': other_student.pk})
        resp = api_client.get(url, **auth_headers(student_with_user.user))
        assert resp.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND)
