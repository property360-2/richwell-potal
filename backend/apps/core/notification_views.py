"""
Notification API Views
Handles CRUD operations for user notifications.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q

from apps.core.models import Notification
from apps.core.api_responses import success_response, error_response


class NotificationPagination(PageNumberPagination):
    """Custom pagination for notifications"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_notifications(request):
    """
    List user's notifications with pagination.
    Query params:
    - page: Page number (default: 1)
    - page_size: Items per page (default: 20, max: 100)
    - unread_only: Filter to show only unread notifications (default: false)
    """
    user = request.user
    
    # Get query params
    unread_only = request.GET.get('unread_only', 'false').lower() == 'true'
    
    # Build queryset
    queryset = Notification.objects.filter(user=user)
    
    if unread_only:
        queryset = queryset.filter(is_read=False)
    
    # Paginate
    paginator = NotificationPagination()
    page = paginator.paginate_queryset(queryset, request)
    
    # Serialize
    notifications_data = [
        {
            'id': n.id,
            'type': n.notification_type,
            'title': n.title,
            'message': n.message,
            'link': n.link,
            'is_read': n.is_read,
            'created_at': n.created_at.isoformat(),
        }
        for n in page
    ]
    
    return paginator.get_paginated_response({
        'success': True,
        'notifications': notifications_data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_unread_count(request):
    """Get count of unread notifications for the current user"""
    user = request.user
    
    unread_count = Notification.objects.filter(
        user=user,
        is_read=False
    ).count()
    
    return success_response({
        'unread_count': unread_count
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    """Mark a specific notification as read"""
    user = request.user
    
    try:
        notification = Notification.objects.get(id=notification_id, user=user)
        notification.mark_as_read()
        
        return success_response({
            'message': 'Notification marked as read',
            'notification_id': notification_id
        })
    except Notification.DoesNotExist:
        return error_response(
            'Notification not found',
            status_code=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_read(request):
    """Mark all notifications as read for the current user"""
    user = request.user
    
    updated_count = Notification.objects.filter(
        user=user,
        is_read=False
    ).update(is_read=True)
    
    return success_response({
        'message': f'{updated_count} notifications marked as read',
        'updated_count': updated_count
    })


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_notification(request, notification_id):
    """Delete a specific notification"""
    user = request.user
    
    try:
        notification = Notification.objects.get(id=notification_id, user=user)
        notification.delete()
        
        return success_response({
            'message': 'Notification deleted',
            'notification_id': notification_id
        })
    except Notification.DoesNotExist:
        return error_response(
            'Notification not found',
            status_code=status.HTTP_404_NOT_FOUND
        )
