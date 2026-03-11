import pytest
from django.urls import reverse
from rest_framework import status
from tests.factories import (
    AdminUserFactory,
    StudentUserFactory,
    CashierUserFactory,
    RegistrarUserFactory,
    DeanUserFactory,
    AdmissionUserFactory,
    PaymentFactory,
    TermFactory,
    ProgramFactory,
    SectionFactory,
    StudentFactory,
    ScheduleFactory,
    StudentEnrollmentFactory,
)

def get_auth_headers(user):
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    return {'HTTP_AUTHORIZATION': f'Bearer {refresh.access_token}'}

@pytest.mark.django_db
class TestPermissionEscalation:
    
    # --- Finance Permissions ---
    def test_student_cannot_create_payment(self, api_client):
        student = StudentUserFactory()
        url = reverse('payment-list')
        resp = api_client.post(url, {}, **get_auth_headers(student))
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_cashier_can_create_payment(self, api_client, active_term, student):
        cashier = CashierUserFactory()
        url = reverse('payment-list')
        data = {
            'student': student.id,
            'term': active_term.id,
            'month': 1,
            'amount': '1000.00'
        }
        resp = api_client.post(url, data, format='json', **get_auth_headers(cashier))
        assert resp.status_code == status.HTTP_201_CREATED

    def test_student_cannot_adjust_payment(self, api_client):
        student = StudentUserFactory()
        url = reverse('payment-adjust')
        resp = api_client.post(url, {}, **get_auth_headers(student))
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    # --- Sections Permissions ---
    def test_student_cannot_generate_sections(self, api_client):
        student = StudentUserFactory()
        url = reverse('section-generate')
        resp = api_client.post(url, {}, **get_auth_headers(student))
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_registrar_can_generate_sections(self, api_client, active_term, program):
        registrar = RegistrarUserFactory()
        url = reverse('section-generate')
        data = {'term_id': active_term.id, 'program_id': program.id, 'year_level': 1}
        resp = api_client.post(url, data, format='json', **get_auth_headers(registrar))
        assert resp.status_code in (status.HTTP_201_CREATED, status.HTTP_200_OK)

    def test_student_cannot_transfer_section(self, api_client):
        student = StudentUserFactory()
        section = SectionFactory()
        url = reverse('section-transfer', kwargs={'pk': section.pk})
        resp = api_client.post(url, {}, **get_auth_headers(student))
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    # --- Scheduling Permissions ---
    def test_student_cannot_assign_schedule(self, api_client):
        student = StudentUserFactory()
        url = reverse('schedule-assign')
        resp = api_client.post(url, {}, **get_auth_headers(student))
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_dean_can_assign_schedule(self, api_client):
        dean = DeanUserFactory()
        url = reverse('schedule-assign')
        # We don't need full data, just check if it gets past permission check
        resp = api_client.post(url, {}, **get_auth_headers(dean))
        assert resp.status_code != status.HTTP_403_FORBIDDEN

    def test_student_cannot_publish_schedule(self, api_client):
        student = StudentUserFactory()
        url = reverse('schedule-publish')
        resp = api_client.post(url, {}, **get_auth_headers(student))
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    # --- Student Permissions ---
    def test_student_cannot_approve_student(self, api_client):
        student = StudentUserFactory()
        applicant = StudentFactory(status='APPLICANT')
        url = reverse('student-approve', kwargs={'pk': applicant.pk})
        resp = api_client.post(url, {}, **get_auth_headers(student))
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_admission_can_approve_student(self, api_client, active_term):
        admission = AdmissionUserFactory()
        applicant = StudentFactory(status='APPLICANT')
        url = reverse('student-approve', kwargs={'pk': applicant.pk})
        data = {'monthly_commitment': 5000}
        resp = api_client.post(url, data, format='json', **get_auth_headers(admission))
        assert resp.status_code != status.HTTP_403_FORBIDDEN

    def test_student_cannot_unlock_advising(self, api_client):
        student_user = StudentUserFactory()
        target_student = StudentFactory()
        url = reverse('student-unlock-advising', kwargs={'pk': target_student.pk})
        resp = api_client.post(url, {}, **get_auth_headers(student_user))
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_student_cannot_manual_add_student(self, api_client):
        student = StudentUserFactory()
        url = reverse('student-manual-add')
        resp = api_client.post(url, {}, **get_auth_headers(student))
        assert resp.status_code == status.HTTP_403_FORBIDDEN
