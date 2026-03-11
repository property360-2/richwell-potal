import factory
from apps.grades.models import Grade
from tests.factories.student_factory import StudentFactory, StudentEnrollmentFactory
from tests.factories.academic_factory import SubjectFactory, CurriculumVersionFactory
from tests.factories.term_factory import TermFactory
from tests.factories.section_factory import SectionFactory


class GradeFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Grade

    student = factory.SubFactory(StudentFactory)
    subject = factory.SubFactory(
        SubjectFactory,
        curriculum=factory.SelfAttribute('..student.curriculum'),
    )
    term = factory.SubFactory(TermFactory)
    section = None
    advising_status = Grade.ADVISING_PENDING
    grade_status = Grade.STATUS_ADVISING
    midterm_grade = None
    final_grade = None
    is_credited = False
    is_retake = False
    submitted_by = None
    midterm_submitted_at = None
    final_submitted_at = None
    finalized_by = None
    finalized_at = None
    resolution_status = None
    resolution_new_grade = None
    resolution_reason = None
    resolution_requested_by = None
    resolution_requested_at = None
    resolution_approved_by = None
    resolution_approved_at = None
    rejection_reason = ''
    inc_deadline = None
