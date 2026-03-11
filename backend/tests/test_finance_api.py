import pytest
from django.urls import reverse
from rest_framework import status
from decimal import Decimal
from tests.factories import (
    StudentUserFactory,
    CashierUserFactory,
    PaymentFactory,
    StudentFactory,
    TermFactory,
)

def get_auth_headers(user):
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    return {'HTTP_AUTHORIZATION': f'Bearer {refresh.access_token}'}

@pytest.mark.django_db
class TestFinanceAPI:
    def test_payment_list_student_sees_own(self, api_client):
        student = StudentFactory()
        payment1 = PaymentFactory(student=student)
        payment2 = PaymentFactory() # belongs to another student
        
        url = reverse('payment-list')
        resp = api_client.get(url, **get_auth_headers(student.user))
        assert resp.status_code == status.HTTP_200_OK
        results = resp.data.get('results', resp.data)
        ids = [p['id'] for p in results]
        assert payment1.id in ids
        assert payment2.id not in ids

    def test_payment_create_cashier(self, api_client, active_term, student):
        cashier = CashierUserFactory()
        url = reverse('payment-list')
        data = {
            'student': student.id,
            'term': active_term.id,
            'month': 1,
            'amount': '2500.00',
            'remarks': 'Tuition'
        }
        resp = api_client.post(url, data, format='json', **get_auth_headers(cashier))
        assert resp.status_code == status.HTTP_201_CREATED
        assert Decimal(resp.data['amount']) == Decimal('2500.00')

    def test_payment_adjust_cashier(self, api_client, active_term, student):
        cashier = CashierUserFactory()
        url = reverse('payment-adjust')
        data = {
            'student': student.id,
            'term': active_term.id,
            'month': 1,
            'amount': '-500.00',
            'entry_type': 'ADJUSTMENT',
            'remarks': 'Correction'
        }
        resp = api_client.post(url, data, format='json', **get_auth_headers(cashier))
        assert resp.status_code == status.HTTP_201_CREATED
        assert Decimal(resp.data['amount']) == Decimal('-500.00')

    def test_permit_status(self, api_client, active_term, student):
        cashier = CashierUserFactory()
        url = reverse('permits-status')
        params = {'student_id': student.id, 'term_id': active_term.id}
        resp = api_client.get(url, params, **get_auth_headers(cashier))
        assert resp.status_code == status.HTTP_200_OK
        assert 'prelim' in resp.data
        assert 'midterm' in resp.data

    def test_append_only_enforcement(self, api_client):
        cashier = CashierUserFactory()
        payment = PaymentFactory()
        url = reverse('payment-detail', kwargs={'pk': payment.pk})
        
        # Try update
        resp = api_client.put(url, {'amount': '1.00'}, format='json', **get_auth_headers(cashier))
        assert resp.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
        
        # Try delete
        resp = api_client.delete(url, **get_auth_headers(cashier))
        assert resp.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
