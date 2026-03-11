import pytest
from django.urls import reverse
from rest_framework import status
from tests.factories import (
    AdminUserFactory,
    CashierUserFactory,
    StudentFactory,
    TermFactory,
)

def get_auth_headers(user):
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    return {'HTTP_AUTHORIZATION': f'Bearer {refresh.access_token}'}

@pytest.mark.django_db
class TestValidationAPI:
    def test_payment_missing_required(self, api_client):
        cashier = CashierUserFactory()
        url = reverse('payment-list')
        # Missing fields: student, term, month, amount
        resp = api_client.post(url, {}, format='json', **get_auth_headers(cashier))
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        # DRF error response can be nested or flat depending on renderer/exception handler
        errors = str(resp.data)
        assert 'student' in errors
        assert 'amount' in errors

    def test_payment_negative_amount_validation(self, api_client, active_term, student):
        cashier = CashierUserFactory()
        url = reverse('payment-list')
        data = {
            'student': student.id,
            'term': active_term.id,
            'month': 1,
            'amount': '-100.00'
        }
        # The service or serializer should catch negative amount if not adjust
        resp = api_client.post(url, data, format='json', **get_auth_headers(cashier))
        # Depending on implementation, this might be 400
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_invalid_type_email(self, api_client):
        url = reverse('student-apply')
        data = {
            'first_name': 'Juan',
            'last_name': 'Dela Cruz',
            'email': 'not-an-email',
            'date_of_birth': '2010-01-01',
            'gender': 'MALE'
        }
        resp = api_client.post(url, data, format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert 'email' in resp.data

    def test_duplicate_subject_code_curriculum(self, api_client, active_term):
        admin = AdminUserFactory()
        from tests.factories import SubjectFactory
        existing = SubjectFactory()
        url = reverse('subject-list')
        data = {
            'curriculum': existing.curriculum.id,
            'code': existing.code,
            'description': 'Description',
            'year_level': 1,
            'semester': '1',
            'total_units': 3
        }
        resp = api_client.post(url, data, format='json', **get_auth_headers(admin))
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
