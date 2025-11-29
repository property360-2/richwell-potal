"""
Audit logging service for critical operations.
Provides centralized audit trail creation for compliance and debugging.
"""
from django.utils import timezone
from sis.models import AuditLog


def log_action(
    user,
    action,
    target_model,
    target_id,
    before_state=None,
    after_state=None,
    ip_address="127.0.0.1"
):
    """
    Create an audit log entry for a critical action.

    Args:
        user: User performing the action
        action: Action constant from "ACTION_CHOICES"
        target_model: Name of the model being modified
        target_id: ID of the target model instance
        before_state: Dictionary of state before change
        after_state: Dictionary of state after change
        ip_address: IP address of the requester

    Returns:
        AuditLog instance
    """
    before_state = before_state or {}
    after_state = after_state or {}

    audit_log = AuditLog.objects.create(
        actor=user,
        action=action,
        target_model=target_model,
        target_id=target_id,
        before_data=before_state,
        after_data=after_state,
        ip_address=ip_address
    )

    return audit_log


def log_payment(user, enrollment, amount, method, reference_number, ip_address="127.0.0.1"):
    """
    Log a payment transaction.

    Args:
        user: User (cashier/admin) recording the payment
        enrollment: Enrollment receiving the payment
        amount: Payment amount (Decimal)
        method: Payment method
        reference_number: Reference/receipt number
        ip_address: IP address of the requester

    Returns:
        AuditLog instance
    """
    before_state = {
        "total_paid": float(sum(pm.amount_paid for pm in enrollment.payment_months.all())),
        "months_paid": [
            pm.month_number for pm in enrollment.payment_months.filter(is_paid=True)
        ]
    }

    after_state = {
        "amount": float(amount),
        "method": method,
        "reference_number": reference_number
    }

    return log_action(
        user=user,
        action="PAYMENT_RECORDED",
        target_model="Enrollment",
        target_id=enrollment.id,
        before_state=before_state,
        after_state=after_state,
        ip_address=ip_address
    )


def log_permit_unlock(user, exam_permit, ip_address="127.0.0.1"):
    """
    Log an exam permit unlock action.

    Args:
        user: User (system/admin) unlocking the permit
        exam_permit: ExamPermit instance being unlocked
        ip_address: IP address of the requester

    Returns:
        AuditLog instance
    """
    return log_action(
        user=user,
        action="PERMIT_UNLOCKED",
        target_model="ExamPermit",
        target_id=exam_permit.id,
        before_state={"status": "LOCKED"},
        after_state={"status": "UNLOCKED"},
        ip_address=ip_address
    )


def log_subject_enrolled(user, subject_enrollment, ip_address="127.0.0.1"):
    """
    Log a subject enrollment action.

    Args:
        user: User performing the enrollment
        subject_enrollment: SubjectEnrollment instance
        ip_address: IP address of the requester

    Returns:
        AuditLog instance
    """
    return log_action(
        user=user,
        action="SUBJECT_ENROLLED",
        target_model="SubjectEnrollment",
        target_id=subject_enrollment.id,
        before_state={},
        after_state={
            "subject": str(subject_enrollment.subject),
            "units": subject_enrollment.subject.units,
            "status": subject_enrollment.subject_status
        },
        ip_address=ip_address
    )


def log_subject_dropped(user, subject_enrollment, ip_address="127.0.0.1"):
    """
    Log a subject drop action.

    Args:
        user: User dropping the subject
        subject_enrollment: SubjectEnrollment instance being dropped
        ip_address: IP address of the requester

    Returns:
        AuditLog instance
    """
    return log_action(
        user=user,
        action="SUBJECT_DROPPED",
        target_model="SubjectEnrollment",
        target_id=subject_enrollment.id,
        before_state={
            "subject": str(subject_enrollment.subject),
            "status": subject_enrollment.subject_status
        },
        after_state={},
        ip_address=ip_address
    )


def log_grade_submitted(user, grade, ip_address="127.0.0.1"):
    """
    Log a grade submission action.

    Args:
        user: Professor submitting the grade
        grade: Grade instance
        ip_address: IP address of the requester

    Returns:
        AuditLog instance
    """
    return log_action(
        user=user,
        action="GRADE_SUBMITTED",
        target_model="Grade",
        target_id=grade.id,
        before_state={"status": "PENDING"},
        after_state={"grade_value": grade.grade_value, "status": "SUBMITTED"},
        ip_address=ip_address
    )


def log_grade_finalized(user, grade, ip_address="127.0.0.1"):
    """
    Log a grade finalization action.

    Args:
        user: Registrar finalizing the grade
        grade: Grade instance
        ip_address: IP address of the requester

    Returns:
        AuditLog instance
    """
    return log_action(
        user=user,
        action="GRADE_FINALIZED",
        target_model="Grade",
        target_id=grade.id,
        before_state={"status": "SUBMITTED"},
        after_state={"status": "FINALIZED"},
        ip_address=ip_address
    )


def log_grade_overridden(user, grade, new_value, reason, ip_address="127.0.0.1"):
    """
    Log a grade override action (only registrars with reason).

    Args:
        user: Registrar overriding the grade
        grade: Grade instance
        new_value: New grade value
        reason: Reason for override
        ip_address: IP address of the requester

    Returns:
        AuditLog instance
    """
    return log_action(
        user=user,
        action="GRADE_OVERRIDDEN",
        target_model="Grade",
        target_id=grade.id,
        before_state={"grade_value": grade.grade_value},
        after_state={"grade_value": new_value, "reason": reason},
        ip_address=ip_address
    )


def log_inc_expired(user, subject_enrollment, ip_address="127.0.0.1"):
    """
    Log an incomplete (INC) expiry action.

    Args:
        user: System user (or admin) logging the expiry
        subject_enrollment: SubjectEnrollment with expired INC
        ip_address: IP address of the requester

    Returns:
        AuditLog instance
    """
    return log_action(
        user=user,
        action="INC_EXPIRED",
        target_model="SubjectEnrollment",
        target_id=subject_enrollment.id,
        before_state={"status": "INC"},
        after_state={"status": "FAILED"},
        ip_address=ip_address
    )


def log_schedule_override(user, subject_enrollment, reason, ip_address="127.0.0.1"):
    """
    Log a schedule conflict override action.

    Args:
        user: Registrar performing the override
        subject_enrollment: SubjectEnrollment with conflict
        reason: Reason for override
        ip_address: IP address of the requester

    Returns:
        AuditLog instance
    """
    return log_action(
        user=user,
        action="SCHEDULE_OVERRIDE",
        target_model="SubjectEnrollment",
        target_id=subject_enrollment.id,
        before_state={},
        after_state={"reason": reason},
        ip_address=ip_address
    )
