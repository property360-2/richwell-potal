"""
Richwell Portal — Notifications Views

This module provides API endpoints for users to view and interact with their 
notifications. It enforces strict ownership of notification records.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Notification
from .serializers import NotificationSerializer
from .services.notification_service import NotificationService

class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing user-specific notifications. 
    Restricts access to own records and disables direct creation/modification.
    """
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Users only see their own notifications.
        """
        return self.queryset.filter(recipient=self.request.user)

    @action(detail=True, methods=['POST'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        """
        Marks a specific notification as read.
        """
        success = NotificationService.mark_as_read(pk, request.user)
        if success:
            return Response({'status': 'marked as read'})
        return Response({'detail': 'Notification not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['POST'], url_path='mark-all-read')
    def mark_all_read(self, request):
        """
        Marks all unread notifications for the current user as read.
        """
        NotificationService.mark_all_as_read(request.user)
        return Response({'status': 'all marked as read'})

    @action(detail=False, methods=['GET'], url_path='unread-count')
    def unread_count(self, request):
        """
        Returns the total number of unread notifications for the user.
        """
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({'unread_count': count})

    # Disable generic create/update from API client (triggers only from services)
    def create(self, request, *args, **kwargs):
        return Response({'detail': 'Use system triggers to create notifications.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
    
    def update(self, request, *args, **kwargs):
        return Response({'detail': 'Direct updates not allowed.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def partial_update(self, request, *args, **kwargs):
        return Response({'detail': 'Direct updates not allowed.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
