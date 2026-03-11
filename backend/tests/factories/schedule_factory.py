import factory
from apps.scheduling.models import Schedule
from tests.factories.term_factory import TermFactory
from tests.factories.section_factory import SectionFactory
from tests.factories.academic_factory import SubjectFactory
from tests.factories.faculty_factory import ProfessorFactory
from tests.factories.facility_factory import RoomFactory


class ScheduleFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Schedule

    term = factory.SubFactory(TermFactory)
    section = factory.SubFactory(SectionFactory, term=factory.SelfAttribute('..term'))
    subject = factory.SubFactory(SubjectFactory)
    component_type = 'LEC'
    professor = factory.SubFactory(ProfessorFactory)
    room = factory.SubFactory(RoomFactory)
    days = factory.LazyFunction(lambda: ["M", "W", "F"])
    start_time = "08:00:00"
    end_time = "10:00:00"
