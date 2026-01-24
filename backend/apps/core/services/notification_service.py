"""
Notification Service
Helper functions to create and send notifications to users.
"""

from apps.core.models import Notification


class NotificationService:
    """Service for creating and managing notifications"""
    
    @staticmethod
    def create_notification(user, notification_type, title, message, link=None):
        """
        Create a notification for a user.
        
        Args:
            user: User instance
            notification_type: One of the NOTIFICATION_TYPES choices
            title: Notification title
            message: Notification message
            link: Optional link to related resource
            
        Returns:
            Notification instance
        """
        notification = Notification.objects.create(
            user=user,
            notification_type=notification_type,
            title=title,
            message=message,
            link=link
        )
        return notification
    
    @staticmethod
    def notify_payment_received(payment):
        """
        Notify student when payment is recorded.
        
        Args:
            payment: Payment instance
        """
        if not payment.student:
            return None
            
        title = "Payment Received"
        message = f"Your payment of ₱{payment.amount:,.2f} has been recorded for {payment.payment_for}."
        link = "/soa.html"
        
        return NotificationService.create_notification(
            user=payment.student,
            notification_type='PAYMENT',
            title=title,
            message=message,
            link=link
        )
    
    @staticmethod
    def notify_enrollment_approved(enrollment):
        """
        Notify student when enrollment is approved.
        
        Args:
            enrollment: Enrollment instance
        """
        if not enrollment.student:
            return None
            
        title = "Enrollment Approved"
        message = f"Your enrollment for {enrollment.semester.name if hasattr(enrollment, 'semester') else 'the semester'} has been approved."
        link = "/subject-enrollment.html"
        
        return NotificationService.create_notification(
            user=enrollment.student,
            notification_type='ENROLLMENT',
            title=title,
            message=message,
            link=link
        )
    
    @staticmethod
    def notify_document_released(document_release):
        """
        Notify student when document is released.
        
        Args:
            document_release: DocumentRelease instance
        """
        if not hasattr(document_release, 'student') or not document_release.student:
            return None
            
        doc_type = document_release.get_document_type_display() if hasattr(document_release, 'get_document_type_display') else document_release.document_type
        
        title = "Document Released"
        message = f"Your {doc_type} is now ready for pickup. Document code: {document_release.document_code}"
        link = "/student-documents.html"
        
        return NotificationService.create_notification(
            user=document_release.student,
            notification_type='DOCUMENT',
            title=title,
            message=message,
            link=link
        )
    
    @staticmethod
    def notify_grade_posted(grade):
        """
        Notify student when grade is posted.
        
        Args:
            grade: Grade instance
        """
        if not hasattr(grade, 'student') or not grade.student:
            return None
            
        subject_name = grade.subject.name if hasattr(grade, 'subject') else 'a subject'
        
        title = "Grade Posted"
        message = f"Your grade for {subject_name} has been posted."
        link = "/grades.html"
        
        return NotificationService.create_notification(
            user=grade.student,
            notification_type='GRADE',
            title=title,
            message=message,
            link=link
        )
    
    @staticmethod
    def notify_announcement(user, title, message, link=None):
        """
        Send an announcement notification to a user.
        
        Args:
            user: User instance
            title: Announcement title
            message: Announcement message
            link: Optional link
        """
        return NotificationService.create_notification(
            user=user,
            notification_type='ANNOUNCEMENT',
            title=title,
            message=message,
            link=link
        )
    
    @staticmethod
    def notify_system(user, title, message, link=None):
        """
        Send a system notification to a user.
        
        Args:
            user: User instance
            title: System notification title
            message: System notification message
            link: Optional link
        """
        return NotificationService.create_notification(
            user=user,
            notification_type='SYSTEM',
            title=title,
            message=message,
            link=link
        )
