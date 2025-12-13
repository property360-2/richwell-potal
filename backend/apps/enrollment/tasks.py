"""
Celery tasks for enrollment app.
Handles background processing for grades, INC automation, and GPA calculation.
"""

from celery import shared_task
from django.utils import timezone

import logging

logger = logging.getLogger(__name__)


@shared_task(name='enrollment.check_expired_incs')
def check_expired_incs_task():
    """
    Daily task to check and convert expired INCs to FAILED.
    
    Run this task daily at midnight via Celery Beat:
    
    CELERY_BEAT_SCHEDULE = {
        'check-expired-incs-daily': {
            'task': 'enrollment.check_expired_incs',
            'schedule': crontab(hour=0, minute=0),
        },
    }
    """
    from .services import INCAutomationService
    
    logger.info("Starting expired INC check...")
    
    try:
        converted = INCAutomationService.process_all_expired_incs()
        
        if converted:
            logger.info(f"Converted {len(converted)} INCs to FAILED")
            
            # Log details
            for enrollment in converted:
                logger.info(
                    f"  - {enrollment.subject.code}: "
                    f"{enrollment.enrollment.student.student_number}"
                )
        else:
            logger.info("No expired INCs found")
        
        return {
            'status': 'success',
            'converted_count': len(converted),
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in INC check task: {e}")
        raise


@shared_task(name='enrollment.recalculate_gpa')
def recalculate_gpa_task(enrollment_id: str):
    """
    Async task to recalculate GPA for an enrollment.
    
    Called after grade finalization for large sections.
    
    Args:
        enrollment_id: UUID of the enrollment
    """
    from .models import Enrollment
    from .services import GradeService
    
    logger.info(f"Recalculating GPA for enrollment {enrollment_id}")
    
    try:
        enrollment = Enrollment.objects.get(id=enrollment_id)
        gpa_record = GradeService.calculate_semester_gpa(enrollment)
        
        logger.info(
            f"GPA for {enrollment.student.student_number}: {gpa_record.gpa}"
        )
        
        return {
            'status': 'success',
            'enrollment_id': str(enrollment_id),
            'gpa': str(gpa_record.gpa),
            'total_units': gpa_record.total_units
        }
        
    except Enrollment.DoesNotExist:
        logger.error(f"Enrollment {enrollment_id} not found")
        raise
    except Exception as e:
        logger.error(f"Error recalculating GPA: {e}")
        raise


@shared_task(name='enrollment.notify_expiring_incs')
def notify_expiring_incs_task(days_ahead: int = 7):
    """
    Weekly task to find INCs expiring soon and queue notifications.
    
    Run this weekly to give students time to complete requirements.
    
    Args:
        days_ahead: Days to look ahead for expiring INCs
    """
    from .services import INCAutomationService
    
    logger.info(f"Checking for INCs expiring in {days_ahead} days...")
    
    try:
        expiring = INCAutomationService.get_expiring_incs(days_ahead)
        
        if expiring:
            logger.info(f"Found {len(expiring)} INCs expiring soon:")
            
            for inc in expiring:
                logger.info(
                    f"  - {inc['subject_code']}: {inc['student_number']} "
                    f"({inc['days_remaining']} days remaining)"
                )
                
                # TODO: Queue notification to student
                # NotificationService.send_inc_warning(inc)
        else:
            logger.info("No expiring INCs found")
        
        return {
            'status': 'success',
            'expiring_count': len(expiring),
            'days_ahead': days_ahead
        }
        
    except Exception as e:
        logger.error(f"Error in expiring INC notification task: {e}")
        raise
