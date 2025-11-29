"""
Celery configuration for Richwell Colleges Portal.
Handles asynchronous task processing for payment allocation, INC expiry, receipts, etc.
"""
import os
from celery import Celery
from celery.schedules import crontab
from django.conf import settings

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'richwell_config.settings')

app = Celery('richwell_config')

# Load configuration from Django settings with CELERY_ prefix
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks from all registered Django app configs.
app.autodiscover_tasks()

# Celery Beat Scheduler - Scheduled periodic tasks
app.conf.beat_schedule = {
    # Check INC expiry daily at 2:00 AM
    'check-inc-expiry': {
        'task': 'sis.tasks.check_inc_expiry',
        'schedule': crontab(hour=2, minute=0),
    },
    # Send payment reminders monthly on 25th at 8:00 AM
    'send-payment-reminder': {
        'task': 'sis.tasks.send_payment_reminder',
        'schedule': crontab(day_of_month=25, hour=8, minute=0),
    },
    # Recalculate student GPA weekly on Sunday at 3:00 AM
    'recalculate-student-gpa': {
        'task': 'sis.tasks.recalculate_student_gpa',
        'schedule': crontab(day_of_week=6, hour=3, minute=0),  # Sunday
    },
    # Archive old records monthly on 1st at 1:00 AM
    'archive-old-records': {
        'task': 'sis.tasks.archive_old_records',
        'schedule': crontab(day_of_month=1, hour=1, minute=0),
    },
}

# Task configuration
app.conf.update(
    # Task timeout: 5 minutes for payment processing, 15 minutes for batch operations
    task_time_limit=15 * 60,  # 15 minutes hard limit
    task_soft_time_limit=10 * 60,  # 10 minutes soft limit (raises SoftTimeLimitExceeded)

    # Task routing - can specify which queue each task goes to
    task_routes={
        'sis.tasks.process_payment_allocation': {'queue': 'payments'},
        'sis.tasks.check_inc_expiry': {'queue': 'batch'},
        'sis.tasks.generate_receipt': {'queue': 'email'},
        'sis.tasks.recalculate_student_gpa': {'queue': 'batch'},
        'sis.tasks.send_payment_reminder': {'queue': 'email'},
    },

    # Task execution settings
    task_acks_late=True,  # Acknowledge task only after successful execution
    task_reject_on_worker_lost=True,  # Requeue task if worker dies

    # Retry settings
    task_autoretry_for=(Exception,),  # Retry on any exception
    task_max_retries=3,
    task_default_retry_delay=60,  # Retry after 1 minute

    # Result backend settings (Redis)
    result_backend='redis://localhost:6379/0',
    result_expires=3600 * 24 * 7,  # Keep results for 7 days
)

@app.task(bind=True)
def debug_task(self):
    """Debug task to test Celery is working."""
    print(f'Request: {self.request!r}')
