"""
Celery background tasks for SIS application.
Handles async operations like payment processing, INC expiry, etc.
"""

from celery import shared_task
from django.utils import timezone


@shared_task
def check_inc_expiry_task():
    """
    Check for expired INC grades and convert to FAILED.
    Runs daily via Celery Beat.
    """
    # Implementation will be added in Priority 5 (Grade Feature)
    pass


@shared_task
def bulk_schedule_conflict_checker_task():
    """
    Bulk check for schedule conflicts across all enrollments.
    Runs nightly via Celery Beat.
    """
    # Implementation will be added in Priority 4 (Subject Enrollment)
    pass


@shared_task
def allocate_payment_and_unlock_permits_task(payment_transaction_id):
    """
    Allocate payment to months and unlock exam permits.
    Called when payment is recorded.
    """
    # Implementation will be added in Priority 3 (Payment Feature)
    pass


@shared_task
def generate_receipt_pdf_task(payment_transaction_id):
    """
    Generate receipt PDF asynchronously.
    Called when payment is recorded.
    """
    # Implementation will be added in Priority 3 (Payment Feature)
    pass


@shared_task
def recalculate_gpa_task(student_id, semester_id=None):
    """
    Recalculate student GPA after grade finalization.
    Called when grades are finalized.
    """
    # Implementation will be added in Priority 5 (Grade Feature)
    pass


@shared_task
def send_notification_task(user_id, notification_type, message):
    """
    Send in-app notification to user.
    Called by various features.
    """
    # Implementation will be added in Priority 8 (Notifications)
    pass
