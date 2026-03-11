import factory
from apps.sections.models import Section, SectionStudent
from tests.factories.term_factory import TermFactory
from tests.factories.academic_factory import ProgramFactory
from tests.factories.student_factory import StudentFactory


class SectionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Section

    name = factory.Sequence(lambda n: f'Section {n}')
    term = factory.SubFactory(TermFactory)
    program = factory.SubFactory(ProgramFactory)
    year_level = 1
    section_number = factory.Sequence(lambda n: n)
    session = 'AM'
    target_students = 35
    max_students = 40
    is_active = True


class SectionStudentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = SectionStudent

    section = factory.SubFactory(SectionFactory)
    student = factory.SubFactory(StudentFactory)
    is_home_section = True
