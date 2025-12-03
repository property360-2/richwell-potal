"""
Payment Service - Handles payment recording, allocation, and exam permit unlock.

Key Business Rules:
- Sequential allocation: Month N+1 cannot receive payment until Month N is fully paid
- Monthly buckets pre-created on enrollment with required_amount
- ExamPermit auto-created when month is fully paid
- Receipt PDF generated for each payment
"""

from decimal import Decimal
from django.utils import timezone
from django.db import transaction
import uuid
from sis.models import (
    PaymentTransaction,
    MonthlyPaymentBucket,
    ExamPermit,
    Enrollment,
    AuditLog,
)
from sis.services.audit_service import AuditService


class PaymentService:
    """Service for payment processing and allocation."""

    @staticmethod
    def record_payment(
        enrollment,
        amount,
        payment_mode,
        cashier=None,
        receipt_number=None,
        ip_address=None,
    ):
        """
        Record a payment and allocate to monthly buckets sequentially.

        Args:
            enrollment: Enrollment object
            amount: Payment amount (Decimal)
            payment_mode: 'CASH' or 'ONLINE'
            cashier: User object (cashier who recorded)
            receipt_number: Unique receipt number
            ip_address: Client IP address

        Returns:
            dict with success bool, payment_transaction, receipt_url, errors list
        """
        try:
            # Validation
            if amount <= 0:
                return {
                    "success": False,
                    "payment_transaction": None,
                    "receipt_url": None,
                    "errors": ["Payment amount must be greater than 0."],
                }

            if payment_mode not in ["CASH", "ONLINE"]:
                return {
                    "success": False,
                    "payment_transaction": None,
                    "receipt_url": None,
                    "errors": ["Invalid payment mode."],
                }

            # Use transaction to ensure consistency
            with transaction.atomic():
                # Determine the first month to allocate to (should be Month 1 or later)
                buckets = MonthlyPaymentBucket.objects.filter(
                    enrollment=enrollment
                ).order_by("month_number")

                first_month_to_allocate = None
                for bucket in buckets:
                    if bucket.paid_amount < bucket.required_amount:
                        first_month_to_allocate = bucket.month_number
                        break

                if first_month_to_allocate is None:
                    first_month_to_allocate = 1  # Default fallback

                # Generate receipt number if not provided
                if not receipt_number:
                    receipt_number = f"RCP-{enrollment.student.student_number}-{timezone.now().strftime('%Y%m%d%H%M%S')}"

                # Create PaymentTransaction record
                payment_transaction = PaymentTransaction.objects.create(
                    enrollment=enrollment,
                    amount=amount,
                    payment_mode=payment_mode,
                    cashier=cashier,
                    receipt_number=receipt_number,
                    allocated_to_month=first_month_to_allocate,
                )

                # Allocate payment to monthly buckets sequentially
                remaining_amount = amount
                buckets = MonthlyPaymentBucket.objects.filter(
                    enrollment=enrollment
                ).order_by("month_number")

                allocated_months = []

                for bucket in buckets:
                    if remaining_amount <= 0:
                        break

                    # Calculate how much to allocate to this bucket
                    still_needed = bucket.required_amount - bucket.paid_amount
                    if still_needed <= 0:
                        # Bucket already fully paid, move to next
                        continue

                    # Allocate to this bucket
                    allocation = min(remaining_amount, still_needed)
                    bucket.paid_amount += allocation
                    bucket.is_fully_paid = bucket.paid_amount >= bucket.required_amount
                    bucket.save()

                    remaining_amount -= allocation
                    allocated_months.append(bucket.month_number)

                    # If Month 1 becomes fully paid, unlock exam permits
                    if bucket.month_number == 1 and bucket.is_fully_paid:
                        PaymentService._unlock_exam_permits(enrollment)

                    # If this was the first bucket to be fully paid
                    if bucket.month_number == 1 and bucket.is_fully_paid:
                        # Mark first month as paid on enrollment
                        enrollment.first_month_paid = True
                        enrollment.save()

                # Log audit entry
                AuditService.log_action(
                    actor=cashier,
                    action="PAYMENT_RECORDED",
                    target_model="PaymentTransaction",
                    target_id=str(payment_transaction.id),
                    payload={
                        "amount": str(amount),
                        "payment_mode": payment_mode,
                        "allocated_to_months": allocated_months,
                        "receipt_number": receipt_number,
                    },
                    ip_address=ip_address,
                )

                return {
                    "success": True,
                    "payment_transaction": payment_transaction,
                    "receipt_url": None,  # Will be generated asynchronously
                    "allocated_months": allocated_months,
                    "errors": [],
                }

        except Exception as e:
            return {
                "success": False,
                "payment_transaction": None,
                "receipt_url": None,
                "errors": [str(e)],
            }

    @staticmethod
    def _unlock_exam_permits(enrollment):
        """
        Auto-create exam permits when month is fully paid.
        Currently creates PRELIM permit when Month 1 is paid.

        Args:
            enrollment: Enrollment object
        """
        # Get the ExamMonthMapping to determine which exams unlock at which month
        from sis.models import ExamMonthMapping

        # For Month 1 paid, create PRELIM permit
        permit_mappings = ExamMonthMapping.objects.filter(
            semester=enrollment.semester,
            month_number=1,
        )

        for mapping in permit_mappings:
            ExamPermit.objects.get_or_create(
                enrollment=enrollment,
                exam_type=mapping.exam_type,
                defaults={
                    "month_number": 1,
                    "permit_code": PaymentService._generate_permit_code(
                        enrollment, mapping.exam_type
                    ),
                    "unlocked_at": timezone.now(),
                },
            )

    @staticmethod
    def _generate_permit_code(enrollment, exam_type):
        """
        Generate a unique permit code.

        Format: STUDENT_NUMBER-EXAM_TYPE-TIMESTAMP
        Example: 2025-000001-PRELIM-20251203T154530Z
        """
        timestamp = timezone.now().strftime("%Y%m%dT%H%M%SZ")
        return f"{enrollment.student.student_number}-{exam_type}-{timestamp}"

    @staticmethod
    def get_enrollment_payment_status(enrollment):
        """
        Get complete payment status for an enrollment.

        Returns dict with summary and per-month breakdown.
        """
        buckets = MonthlyPaymentBucket.objects.filter(enrollment=enrollment).order_by(
            "month_number"
        )

        total_required = sum(b.required_amount for b in buckets)
        total_paid = sum(b.paid_amount for b in buckets)
        total_remaining = total_required - total_paid

        months = []
        for bucket in buckets:
            months.append(
                {
                    "month_number": bucket.month_number,
                    "required_amount": bucket.required_amount,
                    "paid_amount": bucket.paid_amount,
                    "remaining_amount": bucket.required_amount - bucket.paid_amount,
                    "is_fully_paid": bucket.is_fully_paid,
                }
            )

        return {
            "total_required": total_required,
            "total_paid": total_paid,
            "total_remaining": total_remaining,
            "percentage_paid": (total_paid / total_required * 100) if total_required > 0 else 0,
            "months": months,
            "first_month_paid": enrollment.first_month_paid,
        }

    @staticmethod
    def can_enroll_subjects(enrollment):
        """
        Check if student can enroll subjects (first month must be paid).

        Returns: bool
        """
        return enrollment.first_month_paid

    @staticmethod
    def record_payment_adjustment(
        enrollment,
        amount,
        reason,
        cashier=None,
        ip_address=None,
    ):
        """
        Record a payment adjustment (refund or correction).

        Args:
            enrollment: Enrollment object
            amount: Adjustment amount (positive for deduction, negative for refund)
            reason: Reason for adjustment
            cashier: User who made adjustment
            ip_address: Client IP address

        Returns:
            dict with success bool, payment_transaction, errors list
        """
        if not reason or len(reason.strip()) == 0:
            return {
                "success": False,
                "payment_transaction": None,
                "errors": ["Adjustment reason is required."],
            }

        try:
            with transaction.atomic():
                # Create adjustment payment transaction
                payment_transaction = PaymentTransaction.objects.create(
                    enrollment=enrollment,
                    amount=amount,
                    payment_mode="ADJUSTMENT",
                    cashier=cashier,
                    is_adjustment=True,
                    adjustment_reason=reason,
                )

                # If adjustment reduces payment, we may need to reverse bucket updates
                # For now, log the adjustment
                AuditService.log_action(
                    actor=cashier,
                    action="PAYMENT_ADJUSTMENT",
                    target_model="PaymentTransaction",
                    target_id=str(payment_transaction.id),
                    payload={
                        "amount": str(amount),
                        "reason": reason,
                    },
                    ip_address=ip_address,
                )

                return {
                    "success": True,
                    "payment_transaction": payment_transaction,
                    "errors": [],
                }

        except Exception as e:
            return {
                "success": False,
                "payment_transaction": None,
                "errors": [str(e)],
            }

    @staticmethod
    def get_payment_history(enrollment, limit=20):
        """
        Get payment transaction history for an enrollment.

        Args:
            enrollment: Enrollment object
            limit: Number of records to return

        Returns:
            QuerySet of PaymentTransaction objects
        """
        return PaymentTransaction.objects.filter(
            enrollment=enrollment
        ).order_by("-created_at")[:limit]
