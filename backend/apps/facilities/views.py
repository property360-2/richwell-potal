"""
Richwell Portal — Facilities Views

This module provides API endpoints for managing campus facilities. 
Access is restricted to staff and administrative users.
"""

from rest_framework import viewsets
from core.permissions import IsAdmin, IsStaff
from .models import Room
from .serializers import RoomSerializer

class RoomViewSet(viewsets.ModelViewSet):
    """
    Standard CRUD viewset for Room management. 
    Allows staff to list, create, and update room records.
    """
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    permission_classes = [IsStaff]
    filterset_fields = ['is_active', 'room_type']
    search_fields = ['name']
    ordering_fields = ['name', 'capacity']
