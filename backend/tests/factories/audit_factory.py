import factory
from apps.auditing.models import AuditLog
from tests.factories.user_factory import UserFactory


class AuditLogFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = AuditLog

    user = factory.SubFactory(UserFactory)
    action = 'CREATE'
    model_name = 'Student'
    object_id = '1'
    object_repr = 'Juan Dela Cruz'
    changes = factory.LazyFunction(lambda: {})
    ip_address = '127.0.0.1'
