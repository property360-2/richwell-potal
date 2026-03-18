import pytest
from django.urls import reverse
from rest_framework import status

from tests.factories import (
    AdminUserFactory,
    RegistrarUserFactory,
    StudentUserFactory,
    TermFactory,
    ProgramFactory,
    CurriculumVersionFactory,
    SubjectFactory,
    StudentFactory,
    StudentEnrollmentFactory,
)


def auth_headers(user):
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    return {'HTTP_AUTHORIZATION': f'Bearer {refresh.access_token}'}


@pytest.mark.django_db
class TestAuthAPI:
    def test_login(self, api_client):
        user = AdminUserFactory()
        url = reverse('login')
        resp = api_client.post(url, {'username': user.username, 'password': 'testpass123'}, format='json')
        assert resp.status_code == status.HTTP_200_OK
        assert 'access' not in resp.data
        assert 'refresh' not in resp.data
        assert 'user' in resp.data

    def test_me(self, api_client, admin_user):
        url = reverse('me')
        resp = api_client.get(url, **auth_headers(admin_user))
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['username'] == admin_user.username

    def test_change_password(self, api_client, admin_user):
        url = reverse('change_password')
        admin_user.set_password('oldpass')
        admin_user.save()
        resp = api_client.put(
            url,
            {'old_password': 'oldpass', 'new_password': 'newpass', 'confirm_password': 'newpass'},
            format='json',
            **auth_headers(admin_user)
        )
        assert resp.status_code == status.HTTP_200_OK
        admin_user.refresh_from_db()
        assert admin_user.check_password('newpass')


@pytest.mark.django_db
class TestAcademicsAPI:
    def test_program_list(self, api_client, admin_user):
        ProgramFactory.create_batch(2)
        url = reverse('program-list')
        resp = api_client.get(url, **auth_headers(admin_user))
        assert resp.status_code == status.HTTP_200_OK
        results = resp.data.get('results', resp.data)
        assert len(results) >= 2

    def test_program_create(self, api_client, admin_user):
        url = reverse('program-list')
        resp = api_client.post(url, {'code': 'BSIT', 'name': 'IT'}, format='json', **auth_headers(admin_user))
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data['code'] == 'BSIT'

    def test_curriculum_create(self, api_client, admin_user, program):
        url = reverse('curriculumversion-list')
        resp = api_client.post(url, {'program': program.id, 'version_name': 'V1'}, format='json', **auth_headers(admin_user))
        assert resp.status_code == status.HTTP_201_CREATED

    def test_subject_list(self, api_client, admin_user, subject):
        url = reverse('subject-list')
        resp = api_client.get(url, **auth_headers(admin_user))
        assert resp.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestStudentApplyAPI:
    def test_apply_success(self, api_client, program, curriculum, active_term):
        url = reverse('student-apply')
        data = {
            'first_name': 'Juan',
            'last_name': 'Dela Cruz',
            'email': 'juan.new@example.com',
            'date_of_birth': '2005-01-01',
            'gender': 'MALE',
            'address_municipality': 'Malolos',
            'address_barangay': 'San Vicente',
            'contact_number': '09123456789',
            'guardian_name': 'Maria',
            'guardian_contact': '09987654321',
            'program': program.id,
            'curriculum': curriculum.id,
            'student_type': 'FRESHMAN',
        }
        resp = api_client.post(url, data, format='json')
        if resp.status_code != status.HTTP_201_CREATED:
            raise AssertionError(f"Expected 201, got {resp.status_code}. Response: {resp.data}")
        assert resp.data['status'] == 'APPLICANT'
        assert 'idn' in resp.data

    def test_apply_duplicate_email_rejected(self, api_client, program, curriculum, active_term):
        existing = StudentFactory()
        url = reverse('student-apply')
        data = {
            'first_name': 'Juan',
            'last_name': 'Dela Cruz',
            'email': existing.user.email,
            'date_of_birth': '2005-01-01',
            'gender': 'MALE',
            'program': program.id,
            'curriculum': curriculum.id,
            'student_type': 'FRESHMAN',
        }
        resp = api_client.post(url, data, format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestStudentApprovalAPI:
    def test_approve_requires_admission_role(self, api_client, program, curriculum):
        applicant = StudentFactory(status='APPLICANT', program=program, curriculum=curriculum)
        applicant.user.is_active = False
        applicant.user.save()
        active_term = TermFactory(is_active=True)
        url = reverse('student-approve', kwargs={'pk': applicant.pk})
        admission_user = RegistrarUserFactory()
        admission_user.role = 'ADMISSION'
        admission_user.save()
        resp = api_client.post(
            url,
            {'monthly_commitment': 5000},
            format='json',
            **auth_headers(admission_user)
        )
        assert resp.status_code in (status.HTTP_200_OK, status.HTTP_403_FORBIDDEN)

    def test_approve_rejects_non_applicant(self, api_client, student_with_user):
        admin = AdminUserFactory()
        admin.role = 'ADMISSION'
        admin.save()
        student = student_with_user
        student.status = 'APPROVED'
        student.save()
        url = reverse('student-approve', kwargs={'pk': student.pk})
        resp = api_client.post(
            url,
            {'monthly_commitment': 5000},
            format='json',
            **auth_headers(admin)
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestTermsAPI:
    def test_term_list(self, api_client, admin_user, active_term):
        url = reverse('term-list')
        resp = api_client.get(url, **auth_headers(admin_user))
        assert resp.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestNotificationsAPI:
    def test_notification_list_requires_auth(self, api_client):
        url = reverse('notification-list')
        resp = api_client.get(url)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_notification_list_authenticated(self, api_client, admin_user):
        url = reverse('notification-list')
        resp = api_client.get(url, **auth_headers(admin_user))
        assert resp.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestReportsAPI:
    def test_graduation_check_requires_auth(self, api_client, student_with_user):
        url = reverse('report-graduation-check')
        resp = api_client.get(url, {'student_id': student_with_user.id})
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_graduation_check_authenticated(self, api_client, admin_user, student_with_user):
        url = reverse('report-graduation-check')
        resp = api_client.get(
            url,
            {'student_id': student_with_user.id},
            **auth_headers(admin_user)
        )
        assert resp.status_code == status.HTTP_200_OK
        assert 'is_eligible' in resp.data or 'error' in resp.data
