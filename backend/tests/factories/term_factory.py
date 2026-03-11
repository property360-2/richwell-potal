import factory
from datetime import date, timedelta
from apps.terms.models import Term


class TermFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Term

    code = factory.Sequence(lambda n: f'2025-{n}')
    academic_year = '2025-2026'
    semester_type = '1'
    start_date = factory.LazyFunction(lambda: date.today())
    end_date = factory.LazyFunction(lambda: date.today() + timedelta(days=120))
    enrollment_start = factory.LazyFunction(lambda: date.today() - timedelta(days=30))
    enrollment_end = factory.LazyFunction(lambda: date.today() + timedelta(days=7))
    advising_start = factory.LazyFunction(lambda: date.today())
    advising_end = factory.LazyFunction(lambda: date.today() + timedelta(days=14))
    midterm_grade_start = factory.LazyFunction(lambda: date.today())
    midterm_grade_end = factory.LazyFunction(lambda: date.today() + timedelta(days=60))
    final_grade_start = factory.LazyFunction(lambda: date.today() + timedelta(days=61))
    final_grade_end = factory.LazyFunction(lambda: date.today() + timedelta(days=90))
    schedule_picking_start = None
    schedule_picking_end = None
    schedule_published = False
    is_active = True
