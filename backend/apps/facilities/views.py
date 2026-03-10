from rest_framework import viewsets
from core.permissions import IsAdmin, IsStaff
from .models import Room
from .serializers import RoomSerializer

class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    permission_classes = [IsStaff]
    filterset_fields = ['is_active', 'room_type']
    search_fields = ['name']
    ordering_fields = ['name', 'capacity']
