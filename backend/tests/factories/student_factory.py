import factory
from datetime import date
from apps.students.models import Student, StudentEnrollment
from tests.factories.user_factory import StudentUserFactory
from tests.factories.academic_factory import ProgramFactory, CurriculumVersionFactory
from tests.factories.term_factory import TermFactory


class StudentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Student

    user = factory.SubFactory(StudentUserFactory)
    idn = factory.Sequence(lambda n: f'27{str(n).zfill(4)}')
    middle_name = ''
    date_of_birth = date(2000, 1, 1)
    gender = 'MALE'
    address_municipality = None
    address_barangay = None
    address_full = None
    contact_number = None
    guardian_name = None
    guardian_contact = None
    program = factory.SubFactory(ProgramFactory)
    curriculum = factory.SubFactory(
        CurriculumVersionFactory,
        program=factory.SelfAttribute('..program')
    )
    student_type = 'FRESHMAN'
    previous_school = None
    is_advising_unlocked = True
    status = 'APPROVED'
    appointment_date = None
    document_checklist = factory.LazyFunction(lambda: {})


class StudentEnrollmentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = StudentEnrollment

    student = factory.SubFactory(StudentFactory)
    term = factory.SubFactory(TermFactory)
    advising_status = 'DRAFT'
    advising_approved_by = None
    advising_approved_at = None
    is_regular = True
    year_level = 1
    monthly_commitment = None
    enrolled_by = None
