"""
Bug-reproducing tests. These tests validate that known bugs are fixed.
They may fail until the corresponding fixes are applied.
"""
import pytest
from django.urls import reverse
from rest_framework import status

from tests.factories import (
    AdminUserFactory,
    RegistrarUserFactory,
    StudentFactory,
    StudentEnrollmentFactory,
    GradeFactory,
    SectionFactory,
    TermFactory,
)


def auth_headers(user):
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    return {'HTTP_AUTHORIZATION': f'Bearer {refresh.access_token}'}


@pytest.mark.django_db
class TestBugReproducing:
    def test_audit_export_csv_has_json_import(self, api_client, admin_user):
        """Bug: auditing/views.py uses json.dumps without import."""
        url = reverse('auditlog-export-csv')
        resp = api_client.get(url, **auth_headers(admin_user))
        assert resp.status_code == status.HTTP_200_OK
        assert 'text/csv' in resp.get('Content-Type', '')

    def test_reports_stats_registrar_no_attribute_error(self, api_client):
        """Bug: reports/views.py uses is_verified, is_finalized which don't exist."""
        registrar = RegistrarUserFactory()
        url = reverse('report-stats')
        resp = api_client.get(url, **auth_headers(registrar))
        assert resp.status_code == status.HTTP_200_OK

    def test_finalize_uses_section_not_subject(self, api_client, admin_user):
        """Bug: grades/views.py line 233 uses Subject.objects.get for section_id."""
        from apps.grades.models import Grade
        from apps.sections.models import Section
        term = TermFactory(is_active=True)
        student = StudentFactory()
        from tests.factories import SubjectFactory, CurriculumVersionFactory
        curriculum = student.curriculum
        subject = SubjectFactory(curriculum=curriculum)
        section = SectionFactory(term=term, program=student.program)
        grade = GradeFactory(
            student=student,
            subject=subject,
            term=term,
            section=section,
        )
        url = reverse('grade-submission-finalize-section')
        resp = api_client.post(
            url,
            {
                'term_id': term.id,
                'subject_id': subject.id,
                'section_id': section.id,
            },
            format='json',
            **auth_headers(admin_user)
        )
        assert resp.status_code in (status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST)
