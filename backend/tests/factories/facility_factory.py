import factory
from apps.facilities.models import Room


class RoomFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Room

    name = factory.Sequence(lambda n: f'Room {n}')
    room_type = 'LECTURE'
    capacity = 40
    is_active = True
