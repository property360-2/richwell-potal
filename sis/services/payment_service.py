"""
Payment system service for Richwell Colleges Portal.
Handles payment allocation, exam permits, and payment reconciliation.

CRITICAL BUSINESS RULE: Sequential Payment Allocation
Payments must be allocated to months in order (1->2->3->...->6).
Month N cannot receive payment until Month N-1 is fully paid.
"""
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError

from sis.models import PaymentMonth, ExamPermit, Payment
from sis.validators import validate_payment_sequence
from sis.services.audit_service import log_payment, log_permit_unlock


class PaymentAllocationError(Exception):
    """Base exception for payment allocation errors."""
    pass


class InsufficientPaymentAmount(PaymentAllocationError):
    """Raised when payment amount is insufficient."""
    pass


class InvalidPaymentMonth(PaymentAllocationError):
    """Raised when payment month is invalid."""
    pass


@transaction.atomic
def allocate_payment(enrollment, amount, method, reference_number, user=None, ip_address="127.0.0.1"):
    """
    Allocate payment to enrollment following sequential allocation algorithm.

    ALGORITHM:
    1. Convert amount to Decimal for precision
    2. Use select_for_update() to prevent race conditions
    3. Get all PaymentMonth records in order (1-6)
    4. For each month:
       a. If month is already fully paid, skip
       b. Add amount to month's amount_paid
       c. If amount_paid >= due_amount, mark is_paid=True, set paid_date
       d. If amount_paid > due_amount (overpayment), carry remainder to next month
       e. If amount < remainder needed, update amount_paid and exit loop
    5. After allocation, check if Month 1 is paid and unlock exam permit
    6. Create AuditLog for the payment

    Args:
        enrollment: Enrollment instance receiving payment
        amount: Payment amount (can be Decimal or float)
        method: Payment method from Payment.METHOD_CHOICES
        reference_number: Reference/receipt number
        user: User recording the payment (cashier/admin)
        ip_address: IP address of requester

    Returns:
        Dictionary with allocation details:
        {
            'payment': Payment instance,
            'allocation': [
                {
                    'month_number': 1,
                    'amount_allocated': 10000,
                    'total_paid': 10000,
                    'is_paid': True
                },
                ...
            ],
            'overpayment_carried': 0,
            'exam_permit_unlocked': False
        }

    Raises:
        ValidationError: If payment amount is invalid
        InsufficientPaymentAmount: If amount is zero or negative
        InvalidPaymentMonth: If payment months don't exist
    """
    # Validate and convert amount
    amount = Decimal(str(amount))
    if amount <= 0:
        raise InsufficientPaymentAmount("Payment amount must be greater than zero")

    # Create Payment record first
    payment = Payment.objects.create(
        student=enrollment.student,
        enrollment=enrollment,
        amount=amount,
        payment_method=method,
        reference_number=reference_number,
        status="COMPLETED"
    )

    # Lock enrollment for concurrency control
    enrollment = enrollment.__class__.objects.select_for_update().get(id=enrollment.id)

    # Get payment months in order
    payment_months = PaymentMonth.objects.filter(
        enrollment=enrollment
    ).order_by('month_number').select_for_update()

    if not payment_months.exists():
        raise InvalidPaymentMonth("No payment months found for enrollment")

    allocation = []
    remaining_amount = amount
    exam_permit_unlocked = False

    for month in payment_months:
        if remaining_amount <= 0:
            break

        if month.is_paid:
            # Month already fully paid, skip
            continue

        # Calculate how much can be allocated to this month
        still_due = month.amount_due - month.amount_paid
        amount_to_allocate = min(remaining_amount, still_due)

        # Allocate payment to this month
        month.amount_paid += amount_to_allocate
        remaining_amount -= amount_to_allocate

        # Check if month is now fully paid
        if month.amount_paid >= month.amount_due:
            month.is_paid = True

        month.save()

        allocation.append({
            'month_number': month.month_number,
            'amount_allocated': float(amount_to_allocate),
            'total_paid': float(month.amount_paid),
            'is_paid': month.is_paid,
            'due_amount': float(month.amount_due)
        })

        # Check if Month 1 is now paid and unlock exam permit
        if month.month_number == 1 and month.is_paid:
            exam_permit_unlocked = unlock_exam_permit(enrollment, user, ip_address)

    # Create audit log
    if user:
        log_payment(user, enrollment, amount, method, reference_number, ip_address)

    return {
        'payment': payment,
        'allocation': allocation,
        'overpayment_carried': float(remaining_amount),
        'exam_permit_unlocked': exam_permit_unlocked
    }


def unlock_exam_permit(enrollment, user=None, ip_address="127.0.0.1"):
    """
    Unlock exam permit for enrollment if Month 1 is fully paid.

    Args:
        enrollment: Enrollment instance
        user: User performing the action
        ip_address: IP address of requester

    Returns:
        True if permit was unlocked, False if already unlocked or not applicable
    """
    # Check if Month 1 is paid
    month_1 = PaymentMonth.objects.filter(
        enrollment=enrollment,
        month_number=1
    ).first()

    if not month_1 or not month_1.is_paid:
        return False

    # Get or create exam permit
    exam_permit, created = ExamPermit.objects.get_or_create(
        enrollment=enrollment,
        defaults={'status': 'LOCKED'}
    )

    if exam_permit.status == 'UNLOCKED':
        return False  # Already unlocked

    # Unlock the permit
    exam_permit.status = 'UNLOCKED'
    exam_permit.issued_date = timezone.now()
    exam_permit.expiry_date = enrollment.semester.end_date
    exam_permit.save()

    # Create audit log
    if user:
        log_permit_unlock(user, exam_permit, ip_address)

    return True


def get_payment_balance(enrollment):
    """
    Get payment balance and schedule for an enrollment.

    Args:
        enrollment: Enrollment instance

    Returns:
        Dictionary with payment information
    """
    months = PaymentMonth.objects.filter(
        enrollment=enrollment
    ).order_by('month_number')

    total_due = sum(m.amount_due for m in months)
    total_paid = sum(m.amount_paid for m in months)
    balance = total_due - total_paid

    return {
        'total_due': float(total_due),
        'total_paid': float(total_paid),
        'balance': float(balance),
        'months_paid': [m.month_number for m in months if m.is_paid],
        'months': [
            {
                'month_number': m.month_number,
                'due_amount': float(m.amount_due),
                'amount_paid': float(m.amount_paid),
                'balance': float(m.amount_due - m.amount_paid),
                'is_paid': m.is_paid,
                'due_date': m.due_date.isoformat() if m.due_date else None
            }
            for m in months
        ]
    }


def is_month_1_paid(enrollment):
    """
    Check if Month 1 is fully paid (payment gate for exams/enrollment).

    Args:
        enrollment: Enrollment instance

    Returns:
        Boolean: True if Month 1 is fully paid
    """
    month_1 = PaymentMonth.objects.filter(
        enrollment=enrollment,
        month_number=1
    ).first()

    return month_1 and month_1.is_paid


def can_enroll_subjects(enrollment):
    """
    Check if student can enroll in subjects (Month 1 must be paid).

    Args:
        enrollment: Enrollment instance

    Returns:
        Tuple (can_enroll: bool, reason: str or None)
    """
    if not is_month_1_paid(enrollment):
        return False, "Month 1 payment must be completed before enrolling in subjects"
    return True, None


def can_sit_exam(enrollment):
    """
    Check if student can sit exam (Month 1 must be paid and permit unlocked).

    Args:
        enrollment: Enrollment instance

    Returns:
        Tuple (can_sit: bool, reason: str or None)
    """
    if not is_month_1_paid(enrollment):
        return False, "Month 1 payment must be completed before sitting exams"

    exam_permit = ExamPermit.objects.filter(enrollment=enrollment).first()
    if not exam_permit or exam_permit.status == 'LOCKED':
        return False, "Exam permit is not unlocked"

    if exam_permit.expiry_date and timezone.now().date() > exam_permit.expiry_date:
        return False, "Exam permit has expired"

    return True, None


def get_payment_history(enrollment):
    """
    Get all payment transactions for an enrollment.

    Args:
        enrollment: Enrollment instance

    Returns:
        List of payment dictionaries
    """
    payments = Payment.objects.filter(
        enrollment=enrollment
    ).order_by('-payment_date')

    return [
        {
            'id': p.id,
            'amount': float(p.amount),
            'method': p.payment_method,
            'reference_number': p.reference_number,
            'status': p.status,
            'payment_date': p.payment_date.isoformat(),
            'notes': p.notes
        }
        for p in payments
    ]
