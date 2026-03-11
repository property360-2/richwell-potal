import factory
from decimal import Decimal
from apps.finance.models import Payment
from tests.factories.student_factory import StudentFactory
from tests.factories.term_factory import TermFactory
from tests.factories.user_factory import AdminUserFactory


class PaymentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Payment

    student = factory.SubFactory(StudentFactory)
    term = factory.SubFactory(TermFactory)
    month = 1
    amount = Decimal('5000.00')
    entry_type = Payment.EntryType.PAYMENT
    is_promissory = False
    remarks = None
    processed_by = factory.SubFactory(AdminUserFactory)
