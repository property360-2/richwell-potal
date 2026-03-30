import logging
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)

class EmailService:
    """
    A unified service for sending HTML emails from the system.
    """
    @classmethod
    def send_html_email(cls, subject, template_name, context, recipient_list):
        """
        Render an HTML template with context and send as a multipart email.
        """
        try:
            html_content = render_to_string(template_name, context)
            text_content = strip_tags(html_content)
            
            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@richwellpo.edu.ph')
            
            msg = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=from_email,
                to=recipient_list
            )
            msg.attach_alternative(html_content, "text/html")
            
            sent = msg.send()
            
            # For easier debugging in development terminal
            if settings.DEBUG:
                print(f"\n{'='*20} EMAIL FOR {recipient_list} {'='*20}")
                print(f"Subject: {subject}")
                print(f"Template: {template_name}")
                print(f"{'='*60}\n")
                
            logger.info(f"Email '{subject}' sent to {recipient_list}. Result: {sent}")
            return sent
        except Exception as e:
            logger.error(f"Failed to send email '{subject}' to {recipient_list}: {str(e)}", exc_info=True)
            return 0
