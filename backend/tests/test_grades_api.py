import pytest
from django.urls import reverse
from rest_framework import status
from tests.factories import (
    StudentFactory,
    StudentEnrollmentFactory,
    TermFactory,
    SubjectFactory,
    GradeFactory,
    ProgramHeadUserFactory,
    RegistrarUserFactory,
    ProfessorUserFactory,
    AdminUserFactory,
)

def get_auth_headers(user):
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    return {'HTTP_AUTHORIZATION': f'Bearer {refresh.access_token}'}

@pytest.mark.django_db
class TestGradesAPI:
    def test_auto_advise_student(self, api_client, active_term):
        student = StudentFactory()
        # Enrollment is required for advising
        StudentEnrollmentFactory(student=student, term=active_term)
        # We need a subject in the curriculum for the student's year level
        SubjectFactory(curriculum=student.curriculum, year_level=1, semester=active_term.semester_type)
        
        url = reverse('advising-auto-advise')
        resp = api_client.post(url, {}, **get_auth_headers(student.user))
        assert resp.status_code == status.HTTP_201_CREATED
        assert len(resp.data) >= 1

    def test_batch_approve_regular_ph(self, api_client, active_term):
        ph = ProgramHeadUserFactory()
        # Create pending enrollment
        StudentEnrollmentFactory(term=active_term, advising_status='PENDING', is_regular=True)
        
        url = reverse('advising-approvals-batch-approve-regular')
        resp = api_client.post(url, {}, **get_auth_headers(ph))
        assert resp.status_code == status.HTTP_200_OK
        assert 'successfully approved' in resp.data['message'].lower()

    def test_credit_subject_registrar(self, api_client, active_term):
        registrar = RegistrarUserFactory()
        student = StudentFactory()
        subject = SubjectFactory()
        url = reverse('subject-crediting-credit')
        data = {
            'student_id': student.id,
            'subject_id': subject.id,
            'final_grade': '1.5'
        }
        resp = api_client.post(url, data, format='json', **get_auth_headers(registrar))
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data['is_credited'] is True

    def test_submit_midterm_professor(self, api_client, active_term):
        prof = ProfessorUserFactory()
        grade = GradeFactory(term=active_term)
        url = reverse('grade-submission-submit-midterm', kwargs={'pk': grade.pk})
        resp = api_client.post(url, {'value': '2.0'}, format='json', **get_auth_headers(prof))
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['midterm_grade'] == '2.00'

    def test_resolution_workflow(self, api_client, active_term):
        prof = ProfessorUserFactory()
        registrar = RegistrarUserFactory()
        ph = ProgramHeadUserFactory()
        grade = GradeFactory(term=active_term, grade_status='INC')
        
        # 1. Request Resolution
        url_req = reverse('grade-resolution-request-resolution', kwargs={'pk': grade.pk})
        resp = api_client.post(url_req, {'reason': 'Completed project'}, format='json', **get_auth_headers(prof))
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['resolution_status'] == 'REQUESTED'
        
        # 2. Registrar Approve Request
        url_reg = reverse('grade-resolution-registrar-approve', kwargs={'pk': grade.pk})
        resp = api_client.post(url_reg, {}, **get_auth_headers(registrar))
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['resolution_status'] == 'APPROVED'
        
        # 3. Submit Grade
        url_sub = reverse('grade-resolution-submit-grade', kwargs={'pk': grade.pk})
        resp = api_client.post(url_sub, {'new_grade': '2.0'}, format='json', **get_auth_headers(prof))
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['resolution_new_grade'] == '2.00'
        assert resp.data['resolution_status'] == 'SUBMITTED'
        
        # 4. Head Approve
        url_head = reverse('grade-resolution-head-approve', kwargs={'pk': grade.pk})
        resp = api_client.post(url_head, {}, **get_auth_headers(ph))
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['resolution_status'] == 'COMPLETED'
        assert resp.data['final_grade'] == '2.00'
