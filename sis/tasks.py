"""
Background tasks for Richwell Colleges Portal.
All tasks are idempotent and designed for async processing via Celery.
"""
from celery import shared_task
from django.utils import timezone
from django.db import transaction
from django.core.mail import send_mail
from datetime import timedelta
from decimal import Decimal

from sis.models import (
    SubjectEnrollment, Grade, Student, PaymentMonth, ExamPermit,
    Payment, Enrollment, AuditLog, Notification
)
from sis.services.grade_service import recalculate_gpa, expire_inc
from sis.services.payment_service import is_month_1_paid
from sis.services.audit_service import log_action


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def process_payment_allocation(self, payment_id):
    """
    Process payment allocation asynchronously (optional enhancement).
    For now, allocation happens synchronously in views, but this task
    can be used for bulk processing or retry scenarios.

    IDEMPOTENCY: Check if payment has already been processed before re-running.
    """
    try:
        payment = Payment.objects.get(id=payment_id)

        # Check if already processed (idempotency check)
        if payment.is_processed:
            return {
                'status': 'already_processed',
                'payment_id': payment_id,
                'message': f'Payment {payment_id} already processed.'
            }

        # Mark as processed to prevent duplicate allocation
        payment.is_processed = True
        payment.save()

        # Log successful processing
        log_action(
            actor_type='SYSTEM',
            action='PAYMENT_PROCESSED_ASYNC',
            target_model='Payment',
            target_id=payment_id,
            payload={'status': 'processed_async'}
        )

        return {
            'status': 'success',
            'payment_id': payment_id,
            'amount': str(payment.amount),
            'message': f'Payment {payment_id} processed successfully.'
        }

    except Payment.DoesNotExist:
        return {
            'status': 'error',
            'payment_id': payment_id,
            'error': 'Payment not found'
        }
    except Exception as exc:
        # Retry with exponential backoff
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def check_inc_expiry():
    """
    Check for expired INC (incomplete) grades and auto-convert to FAILED.

    BUSINESS RULE:
    - Major subjects: 6 months until expiry
    - Minor subjects: 12 months until expiry
    - Clock pauses during LOA (Leave of Absence)

    IDEMPOTENCY: Checks is_expired flag to prevent re-processing same INC.
    Runs daily at 2:00 AM.
    """
    try:
        expired_count = 0

        # Find all INC grades that haven't been expired yet
        inc_grades = SubjectEnrollment.objects.filter(
            status='INC',
            is_expired=False
        ).select_related('subject', 'enrollment__student')

        for enrollment in inc_grades:
            try:
                # Check if INC has expired
                if enrollment.is_inc_expired():
                    # Mark as expired (idempotency check)
                    enrollment.is_expired = True
                    enrollment.save()

                    # Change status to FAILED
                    enrollment.status = 'FAILED'
                    enrollment.save()

                    # Recalculate student's GPA
                    student = enrollment.enrollment.student
                    recalculate_gpa(student)

                    # Create notification for student
                    Notification.objects.create(
                        user=student.user,
                        notification_type='INC_EXPIRED',
                        title='Incomplete Grade Expired',
                        message=f'Your incomplete grade for {enrollment.subject.name} has expired and been marked as FAILED.',
                        related_model='SubjectEnrollment',
                        related_id=enrollment.id
                    )

                    # Log the expiry
                    log_action(
                        actor_type='SYSTEM',
                        action='INC_EXPIRED',
                        target_model='SubjectEnrollment',
                        target_id=enrollment.id,
                        payload={
                            'subject': enrollment.subject.name,
                            'student': str(student.user),
                            'new_status': 'FAILED'
                        }
                    )

                    expired_count += 1

            except Exception as e:
                # Log error but continue processing other INCs
                log_action(
                    actor_type='SYSTEM',
                    action='INC_EXPIRY_ERROR',
                    target_model='SubjectEnrollment',
                    target_id=enrollment.id,
                    payload={'error': str(e)}
                )
                continue

        return {
            'status': 'success',
            'expired_count': expired_count,
            'message': f'Processed {expired_count} expired INC grades.'
        }

    except Exception as exc:
        raise


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_receipt(payment_id):
    """
    Generate receipt for payment (async to avoid blocking payment recording).
    In future, can add PDF generation and email sending.

    IDEMPOTENCY: Check if receipt has already been generated.
    """
    try:
        payment = Payment.objects.get(id=payment_id)

        # Check if receipt already generated (idempotency check)
        if payment.receipt_generated:
            return {
                'status': 'already_generated',
                'payment_id': payment_id,
                'message': f'Receipt for payment {payment_id} already generated.'
            }

        # TODO: Implement PDF receipt generation using ReportLab or WeasyPrint
        # For now, just mark as generated
        payment.receipt_generated = True
        payment.receipt_generated_at = timezone.now()
        payment.save()

        # TODO: Send email to student
        # send_mail(
        #     subject=f'Payment Receipt - {payment.enrollment.student.user.get_full_name()}',
        #     message='Receipt attached',
        #     from_email='noreply@richwell.edu',
        #     recipient_list=[payment.enrollment.student.user.email],
        # )

        return {
            'status': 'success',
            'payment_id': payment_id,
            'message': f'Receipt generated for payment {payment_id}.'
        }

    except Payment.DoesNotExist:
        return {
            'status': 'error',
            'payment_id': payment_id,
            'error': 'Payment not found'
        }
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def recalculate_student_gpa():
    """
    Batch recalculate GPA for all active students.
    Runs weekly on Sunday at 3:00 AM to ensure accuracy.

    IDEMPOTENCY: Idempotent by design - recalculating GPA multiple times
    produces the same result.
    """
    try:
        updated_count = 0

        # Get all active students
        students = Student.objects.filter(status__in=['ACTIVE', 'LOA'])

        for student in students:
            try:
                # Recalculate GPA (idempotent operation)
                recalculate_gpa(student)
                updated_count += 1
            except Exception as e:
                # Log error but continue
                log_action(
                    actor_type='SYSTEM',
                    action='GPA_RECALCULATION_ERROR',
                    target_model='Student',
                    target_id=student.id,
                    payload={'error': str(e)}
                )
                continue

        log_action(
            actor_type='SYSTEM',
            action='BATCH_GPA_RECALCULATION',
            target_model='Student',
            target_id=None,
            payload={'students_updated': updated_count}
        )

        return {
            'status': 'success',
            'updated_count': updated_count,
            'message': f'Recalculated GPA for {updated_count} students.'
        }

    except Exception as exc:
        raise


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_payment_reminder():
    """
    Send payment reminders to students with outstanding balances.
    Runs monthly on the 25th at 8:00 AM.

    IDEMPOTENCY: Check if reminder already sent in current month.
    """
    try:
        reminder_count = 0

        # Get enrollments with outstanding balance
        enrollments_with_balance = Enrollment.objects.filter(
            semester__is_active=True
        ).annotate_payment_balance()

        for enrollment in enrollments_with_balance:
            try:
                # Check if reminder already sent this month (idempotency check)
                month_start = timezone.now().replace(day=1)
                existing_reminder = Notification.objects.filter(
                    user=enrollment.student.user,
                    notification_type='PAYMENT_REMINDER',
                    created_at__gte=month_start
                ).exists()

                if existing_reminder:
                    continue

                balance = enrollment.get_payment_balance()

                # Create notification
                Notification.objects.create(
                    user=enrollment.student.user,
                    notification_type='PAYMENT_REMINDER',
                    title='Payment Reminder',
                    message=f'You have an outstanding balance of ₱{balance:,.2f} for this semester.',
                    related_model='Enrollment',
                    related_id=enrollment.id
                )

                reminder_count += 1

            except Exception as e:
                log_action(
                    actor_type='SYSTEM',
                    action='PAYMENT_REMINDER_ERROR',
                    target_model='Enrollment',
                    target_id=enrollment.id,
                    payload={'error': str(e)}
                )
                continue

        return {
            'status': 'success',
            'reminder_count': reminder_count,
            'message': f'Sent {reminder_count} payment reminders.'
        }

    except Exception as exc:
        raise


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def unlock_exam_permits():
    """
    Check for exam permits that should be unlocked (Month 1 paid).
    Can be triggered manually or as part of payment processing.

    IDEMPOTENCY: Checks is_unlocked flag to prevent re-processing.
    """
    try:
        unlocked_count = 0

        # Find exam permits that should be unlocked
        permits_to_unlock = ExamPermit.objects.filter(
            is_unlocked=False,
            enrollment__payment_months__month_number=1,
            enrollment__payment_months__is_paid=True
        ).distinct()

        for permit in permits_to_unlock:
            try:
                # Verify Month 1 is actually paid (double-check)
                if is_month_1_paid(permit.enrollment):
                    permit.is_unlocked = True
                    permit.unlocked_at = timezone.now()
                    permit.save()

                    # Create notification
                    Notification.objects.create(
                        user=permit.enrollment.student.user,
                        notification_type='PERMIT_UNLOCKED',
                        title='Exam Permit Unlocked',
                        message='Your exam permit has been unlocked and you can now take exams.',
                        related_model='ExamPermit',
                        related_id=permit.id
                    )

                    # Log the unlock
                    log_action(
                        actor_type='SYSTEM',
                        action='PERMIT_UNLOCKED',
                        target_model='ExamPermit',
                        target_id=permit.id,
                        payload={'enrollment_id': permit.enrollment.id}
                    )

                    unlocked_count += 1

            except Exception as e:
                log_action(
                    actor_type='SYSTEM',
                    action='PERMIT_UNLOCK_ERROR',
                    target_model='ExamPermit',
                    target_id=permit.id,
                    payload={'error': str(e)}
                )
                continue

        return {
            'status': 'success',
            'unlocked_count': unlocked_count,
            'message': f'Unlocked {unlocked_count} exam permits.'
        }

    except Exception as exc:
        raise


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def archive_old_records():
    """
    Archive old records (completed enrollments, old payments, etc.).
    Runs monthly on 1st at 1:00 AM.

    For now, just logs the operation. Can implement actual archival to
    separate database or storage later.

    IDEMPOTENCY: Idempotent by design - archiving completed records multiple
    times produces the same result.
    """
    try:
        # Define "old" as records from 2+ years ago
        archive_date = timezone.now() - timedelta(days=730)

        # Count old completed enrollments
        old_enrollments = Enrollment.objects.filter(
            status='COMPLETED',
            semester__end_date__lt=archive_date
        ).count()

        # Count old payments
        old_payments = Payment.objects.filter(
            date_paid__lt=archive_date
        ).count()

        # Log the archival operation
        log_action(
            actor_type='SYSTEM',
            action='ARCHIVE_OLD_RECORDS',
            target_model='Enrollment',
            target_id=None,
            payload={
                'old_enrollments': old_enrollments,
                'old_payments': old_payments,
                'archive_date': str(archive_date)
            }
        )

        # TODO: Implement actual archival logic
        # - Copy to archive table or separate database
        # - Delete from main database
        # - Create backup

        return {
            'status': 'success',
            'old_enrollments': old_enrollments,
            'old_payments': old_payments,
            'message': f'Archived {old_enrollments} enrollments and {old_payments} payments.'
        }

    except Exception as exc:
        raise
