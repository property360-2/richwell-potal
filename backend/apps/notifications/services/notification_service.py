from ..models import Notification

class NotificationService:
    @staticmethod
    def notify(recipient, notification_type, title, message, link_url=None):
        """
        Creates a notification for a user.
        """
        return Notification.objects.create(
            recipient=recipient,
            type=notification_type,
            title=title,
            message=message,
            link_url=link_url
        )

    @staticmethod
    def mark_as_read(notification_id, user):
        """
        Marks a specific notification as read.
        """
        notification = Notification.objects.filter(id=notification_id, recipient=user).first()
        if notification:
            notification.is_read = True
            notification.save()
            return True
        return False

    @staticmethod
    def mark_all_as_read(user):
        """
        Marks all notifications for a user as read.
        """
        Notification.objects.filter(recipient=user, is_read=False).update(is_read=True)
        return True
