import pytest
from rest_framework.test import APIClient
from apps.terms.models import Term
from apps.academics.models import Program, CurriculumVersion
from django.utils import timezone
from datetime import timedelta

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def active_term(db):
    today = timezone.now().date()
    return Term.objects.create(
        code="2027-1",
        academic_year="2027-2028",
        semester_type="1",
        start_date=today,
        end_date=today + timedelta(days=120),
        enrollment_start=today - timedelta(days=30),
        enrollment_end=today + timedelta(days=7),
        advising_start=today,
        advising_end=today + timedelta(days=14),
        is_active=True
    )

@pytest.fixture
def bscs_program(db):
    return Program.objects.create(code="BSCS", name="BS Computer Science")

@pytest.fixture
def bscs_curriculum(db, bscs_program):
    return CurriculumVersion.objects.create(program=bscs_program, version_name="V1")
