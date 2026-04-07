"""
Richwell Portal — Notification Service

Centralized service for creating and managing in-app notifications.
All system-triggered notifications must go through this class.
Notifications cannot be created directly via the API — only this service creates them.

Usage:
    NotificationService.notify(recipient=user, notification_type=..., title=..., message=...)
    NotificationService.notify_session_redirection(student, preferred_session, assigned_session)
    NotificationService.mark_as_read(notification_id, requesting_user)
    NotificationService.mark_all_as_read(user)
"""

from ..models import Notification


class NotificationService:
    @staticmethod
    def notify(recipient, notification_type, title, message, link_url=None):
        """
        Creates and persists a single in-app notification for the given recipient.

        Args:
            recipient (User): The User model instance to receive the notification.
            notification_type (str): One of Notification.NotificationType choices
                                     (e.g., GRADE, ADVISING, FINANCE, SCHEDULE, GENERAL).
            title (str): Short heading displayed in the notification panel (max 255 chars).
            message (str): Full notification body text.
            link_url (str | None): Optional deep-link URL to the relevant portal page.

        Returns:
            Notification: The newly created Notification instance.
        """
        return Notification.objects.create(
            recipient=recipient,
            type=notification_type,
            title=title,
            message=message,
            link_url=link_url
        )

    @staticmethod
    def notify_session_redirection(student, preferred_session, assigned_session):
        """
        Notifies a student that their preferred AM/PM session was full and they were
        automatically placed in an alternate session during schedule picking.

        Called by PickingService.pick_schedule_regular() when redirected=True.

        Args:
            student (Student): The Student model instance being redirected.
            preferred_session (str): Session the student requested ('AM' or 'PM').
            assigned_session (str): Session the student was actually assigned to.
        """
        NotificationService.notify(
            recipient=student.user,
            notification_type=Notification.NotificationType.SCHEDULE,
            title="Session Assignment Changed",
            message=(
                f"Your preferred {preferred_session} session was fully booked. "
                f"You have been automatically assigned to an {assigned_session} section instead. "
                f"Please check your updated schedule."
            ),
            link_url="/student/schedule"
        )

    @staticmethod
    def mark_as_read(notification_id, user):
        """
        Marks a specific notification as read for the given user.
        Silently ignores the call if the notification does not exist or belongs to
        a different user.

        Args:
            notification_id (int): Primary key of the Notification to mark.
            user (User): The requesting user — they must own this notification.

        Returns:
            bool: True if the notification was found and marked, False otherwise.
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
        Marks all unread notifications for the given user as read in a single query.

        Args:
            user (User): The User whose notifications should be cleared.

        Returns:
            bool: Always True.
        """
        Notification.objects.filter(recipient=user, is_read=False).update(is_read=True)
        return True
