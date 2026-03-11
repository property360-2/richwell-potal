import factory
from apps.notifications.models import Notification
from tests.factories.user_factory import UserFactory


class NotificationFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Notification

    recipient = factory.SubFactory(UserFactory)
    type = Notification.NotificationType.GENERAL
    title = factory.Faker('sentence')
    message = factory.Faker('paragraph')
    is_read = False
