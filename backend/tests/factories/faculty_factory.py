import factory
from datetime import date
from apps.faculty.models import Professor
from tests.factories.user_factory import ProfessorUserFactory


class ProfessorFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Professor

    user = factory.SubFactory(ProfessorUserFactory)
    employee_id = factory.Sequence(lambda n: f'EMP-{n:03d}')
    department = 'IT'
    employment_status = 'FULL_TIME'
    date_of_birth = date(1980, 1, 1)
    is_active = True
