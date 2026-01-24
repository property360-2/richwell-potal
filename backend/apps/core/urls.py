from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SystemConfigViewSet
from . import notification_views

router = DefaultRouter()
router.register(r'config', SystemConfigViewSet, basename='system-config')

urlpatterns = [
    # Router URLs
    path('', include(router.urls)),
    
    # Notifications
    path('notifications/', notification_views.list_notifications, name='list_notifications'),
    path('notifications/unread-count/', notification_views.get_unread_count, name='unread_count'),
    path('notifications/<int:notification_id>/mark-read/', notification_views.mark_notification_read, name='mark_notification_read'),
    path('notifications/mark-all-read/', notification_views.mark_all_read, name='mark_all_read'),
    path('notifications/<int:notification_id>/', notification_views.delete_notification, name='delete_notification'),
]
