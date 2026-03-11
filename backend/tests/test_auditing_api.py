import pytest
from django.urls import reverse
from rest_framework import status
from tests.factories import AuditLogFactory, AdminUserFactory, StudentUserFactory

def get_auth_headers(user):
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    return {'HTTP_AUTHORIZATION': f'Bearer {refresh.access_token}'}

@pytest.mark.django_db
class TestAuditingAPI:
    def test_audit_log_list_admin(self, api_client):
        admin = AdminUserFactory()
        AuditLogFactory.create_batch(2)
        url = reverse('auditlog-list')
        resp = api_client.get(url, **get_auth_headers(admin))
        assert resp.status_code == status.HTTP_200_OK
        results = resp.data.get('results', resp.data)
        assert len(results) >= 2

    def test_audit_log_list_student_forbidden(self, api_client):
        student = StudentUserFactory()
        url = reverse('auditlog-list')
        resp = api_client.get(url, **get_auth_headers(student))
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_audit_log_export_csv_admin(self, api_client):
        admin = AdminUserFactory()
        AuditLogFactory()
        url = reverse('auditlog-export-csv')
        resp = api_client.get(url, **get_auth_headers(admin))
        assert resp.status_code == status.HTTP_200_OK
        assert resp.get('Content-Type') == 'text/csv'
        assert 'attachment' in resp.get('Content-Disposition')
