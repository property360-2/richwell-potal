import pytest
from datetime import date, timedelta, time

from django.urls import reverse
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from tests.factories import (
    CashierUserFactory,
    GradeFactory,
    PaymentFactory,
    ProfessorFactory,
    ProgramFactory,
    ProgramHeadUserFactory,
    RegistrarUserFactory,
    ScheduleFactory,
    SectionFactory,
    StudentEnrollmentFactory,
    StudentFactory,
    StudentUserFactory,
    SubjectFactory,
    TermFactory,
)


def auth_headers(user):
    refresh = RefreshToken.for_user(user)
    return {'HTTP_AUTHORIZATION': f'Bearer {refresh.access_token}'}


@pytest.mark.django_db
class TestReadScopes:
    def test_professor_cannot_list_students(self, api_client):
        professor = ProfessorFactory().user
        response = api_client.get(reverse('student-list'), **auth_headers(professor))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_cashier_cannot_list_students(self, api_client):
        cashier = CashierUserFactory()
        response = api_client.get(reverse('student-list'), **auth_headers(cashier))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_cashier_can_check_arbitrary_permit_status(self, api_client):
        cashier = CashierUserFactory()
        student = StudentFactory()
        term = TermFactory()
        response = api_client.get(
            reverse('permits-status'),
            {'student_id': student.id, 'term_id': term.id},
            **auth_headers(cashier)
        )
        assert response.status_code == status.HTTP_200_OK

    def test_student_cannot_check_arbitrary_permit_status(self, api_client):
        student = StudentFactory()
        other_student = StudentFactory()
        term = TermFactory()
        response = api_client.get(
            reverse('permits-status'),
            {'student_id': other_student.id, 'term_id': term.id},
            **auth_headers(student.user)
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestMutationOwnership:
    def test_professor_cannot_submit_grade_for_foreign_assignment(self, api_client):
        term = TermFactory(
            midterm_grade_start=date.today() - timedelta(days=1),
            midterm_grade_end=date.today() + timedelta(days=1),
            final_grade_start=date.today() - timedelta(days=1),
            final_grade_end=date.today() + timedelta(days=1),
        )
        foreign_professor = ProfessorFactory()
        other_professor = ProfessorFactory()
        section = SectionFactory(term=term)
        student = StudentFactory(program=section.program, curriculum=SubjectFactory().curriculum)
        subject = SubjectFactory(curriculum=student.curriculum)
        grade = GradeFactory(
            student=student,
            subject=subject,
            term=term,
            section=section,
            advising_status='APPROVED',
            grade_status='ENROLLED',
        )
        ScheduleFactory(term=term, section=section, subject=subject, professor=foreign_professor)

        response = api_client.post(
            reverse('grade-submission-submit-final', kwargs={'pk': grade.pk}),
            {'value': 1.5},
            format='json',
            **auth_headers(other_professor.user)
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_program_head_cannot_approve_other_program_enrollment(self, api_client):
        owner_head = ProgramHeadUserFactory()
        foreign_head = ProgramHeadUserFactory()
        owner_program = ProgramFactory(program_head=owner_head)
        foreign_program = ProgramFactory(program_head=foreign_head)
        student = StudentFactory(program=foreign_program)
        enrollment = StudentEnrollmentFactory(
            student=student,
            term=TermFactory(),
            advising_status='PENDING',
            is_regular=True,
        )

        response = api_client.post(
            reverse('advising-approvals-approve', kwargs={'pk': enrollment.pk}),
            format='json',
            **auth_headers(owner_head)
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestSchedulePickingHardening:
    def test_regular_picking_requires_published_schedule(self, api_client):
        term = TermFactory(
            schedule_published=False,
            schedule_picking_start=date.today() - timedelta(days=1),
            schedule_picking_end=date.today() + timedelta(days=1),
        )
        student = StudentFactory()
        StudentEnrollmentFactory(student=student, term=term, advising_status='APPROVED', is_regular=True)
        SectionFactory(term=term, program=student.program, year_level=1, session='AM')

        response = api_client.post(
            reverse('schedule-pick-regular'),
            {'term_id': term.id, 'session': 'AM'},
            format='json',
            **auth_headers(student.user)
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_irregular_picking_rejects_section_for_wrong_subject(self, api_client):
        term = TermFactory(
            schedule_published=True,
            schedule_picking_start=date.today() - timedelta(days=1),
            schedule_picking_end=date.today() + timedelta(days=1),
        )
        student = StudentFactory()
        StudentEnrollmentFactory(student=student, term=term, advising_status='APPROVED', is_regular=False)
        approved_subject = SubjectFactory(curriculum=student.curriculum)
        foreign_subject = SubjectFactory(curriculum=student.curriculum)
        grade = GradeFactory(
            student=student,
            subject=approved_subject,
            term=term,
            advising_status='APPROVED',
            grade_status='ENROLLED',
        )
        section = SectionFactory(term=term, program=student.program)
        ScheduleFactory(term=term, section=section, subject=foreign_subject)

        response = api_client.post(
            reverse('schedule-pick-irregular'),
            {'term_id': term.id, 'selections': [{'subject_id': approved_subject.id, 'section_id': section.id}]},
            format='json',
            **auth_headers(student.user)
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_irregular_picking_rejects_conflicting_sections(self, api_client):
        term = TermFactory(
            schedule_published=True,
            schedule_picking_start=date.today() - timedelta(days=1),
            schedule_picking_end=date.today() + timedelta(days=1),
        )
        student = StudentFactory()
        StudentEnrollmentFactory(student=student, term=term, advising_status='APPROVED', is_regular=False)
        subject_one = SubjectFactory(curriculum=student.curriculum)
        subject_two = SubjectFactory(curriculum=student.curriculum)
        GradeFactory(student=student, subject=subject_one, term=term, advising_status='APPROVED', grade_status='ENROLLED')
        GradeFactory(student=student, subject=subject_two, term=term, advising_status='APPROVED', grade_status='ENROLLED')
        section_one = SectionFactory(term=term, program=student.program)
        section_two = SectionFactory(term=term, program=student.program, section_number=99)
        ScheduleFactory(term=term, section=section_one, subject=subject_one, days=['M'], start_time=time(8, 0), end_time=time(9, 0))
        ScheduleFactory(term=term, section=section_two, subject=subject_two, days=['M'], start_time=time(8, 30), end_time=time(9, 30))

        response = api_client.post(
            reverse('schedule-pick-irregular'),
            {
                'term_id': term.id,
                'selections': [
                    {'subject_id': subject_one.id, 'section_id': section_one.id},
                    {'subject_id': subject_two.id, 'section_id': section_two.id},
                ]
            },
            format='json',
            **auth_headers(student.user)
        )

        assert response.status_code == status.HTTP_409_CONFLICT
