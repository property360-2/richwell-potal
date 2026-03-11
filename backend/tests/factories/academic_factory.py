import factory
from apps.academics.models import Program, CurriculumVersion, Subject


class ProgramFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Program

    code = factory.Sequence(lambda n: f'PROG{n}')
    name = factory.Sequence(lambda n: f'Program {n}')
    effective_year = None
    has_summer = False
    is_active = True


class CurriculumVersionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = CurriculumVersion

    program = factory.SubFactory(ProgramFactory)
    version_name = factory.Sequence(lambda n: f'V{n}')
    is_active = True


class SubjectFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Subject

    curriculum = factory.SubFactory(CurriculumVersionFactory)
    code = factory.Sequence(lambda n: f'SUB{n}')
    description = factory.Sequence(lambda n: f'Subject {n}')
    year_level = 1
    semester = '1'
    lec_units = 3
    lab_units = 0
    total_units = 3
    hrs_per_week = None
    is_major = False
    is_practicum = False
