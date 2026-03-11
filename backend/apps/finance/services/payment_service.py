from django.db.models import Sum
from django.utils import timezone
from django.core.exceptions import ValidationError
from apps.notifications.services.notification_service import NotificationService
from apps.notifications.models import Notification
from ..models import Payment

class PaymentService:
    @staticmethod
    def record_payment(student, term, month, amount, processed_by, is_promissory=False, remarks=None):
        """
        Records a student payment.
        Rule: Promissory for month 2+ requires month-1 to have at least one payment.
        """
        if is_promissory and month > 1:
            prev_month_payments = Payment.objects.filter(
                student=student,
                term=term,
                month=month - 1,
                entry_type=Payment.EntryType.PAYMENT
            ).exists()
            
            if not prev_month_payments:
                raise ValidationError(f"Promissory note for Month {month} denied. Previous month (Month {month-1}) must have at least one payment recorded.")

        payment = Payment.objects.create(
            student=student,
            term=term,
            month=month,
            amount=amount,
            is_promissory=is_promissory,
            processed_by=processed_by,
            remarks=remarks,
            entry_type=Payment.EntryType.PAYMENT
        )

        # Notify Student
        NotificationService.notify(
            recipient=student.user,
            notification_type=Notification.NotificationType.FINANCE,
            title="Payment Recorded",
            message=f"A payment of ₱{amount:,.2f} for Month {month} has been recorded.",
            link_url="/student/finance"
        )

        return payment

    @staticmethod
    def record_adjustment(student, term, month, amount, processed_by, remarks):
        """
        Records a negative adjustment (correction).
        """
        if amount >= 0:
            raise ValidationError("Adjustment amount must be negative for corrections.")
            
        adjustment = Payment.objects.create(
            student=student,
            term=term,
            month=month,
            amount=amount,
            processed_by=processed_by,
            remarks=remarks,
            entry_type=Payment.EntryType.ADJUSTMENT
        )

        # Notify Student
        NotificationService.notify(
            recipient=student.user,
            notification_type=Notification.NotificationType.FINANCE,
            title="Finance Adjustment",
            message=f"An adjustment of ₱{abs(amount):,.2f} has been recorded on your ledger.",
            link_url="/student/finance"
        )

        return adjustment

    @staticmethod
    def get_payment_summary(student, term):
        """
        Returns sum of payments/adjustments per month.
        """
        summary = {}
        for m in range(1, 7):
            total = Payment.objects.filter(
                student=student,
                term=term,
                month=m
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            has_promissory = Payment.objects.filter(
                student=student,
                term=term,
                month=m,
                is_promissory=True
            ).exists()
            
            summary[m] = {
                'total_paid': float(total),
                'has_promissory': has_promissory,
                'is_cleared': total > 0 or has_promissory
            }
        return summary

    @staticmethod
    def get_permit_status(student, term):
        """
        Derived status for exam permits.
        Prelim: Month 1-2-3 cleared?
        Midterm: Month 4 cleared?
        Final: Month 5-6 cleared?
        (Refining based on school specific rules if needed, but per plan:)
        """
        summary = PaymentService.get_payment_summary(student, term)
        
        return {
            'prelim': {
                'status': 'PAID' if summary[3]['is_cleared'] else ('PROMISSORY' if summary[3]['has_promissory'] else 'UNPAID'),
                'is_allowed': summary[3]['is_cleared'] or summary[3]['has_promissory']
            },
            'midterm': {
                'status': 'PAID' if summary[4]['is_cleared'] else ('PROMISSORY' if summary[4]['has_promissory'] else 'UNPAID'),
                'is_allowed': summary[4]['is_cleared'] or summary[4]['has_promissory']
            },
            'final': {
                'status': 'PAID' if summary[6]['is_cleared'] else ('PROMISSORY' if summary[6]['has_promissory'] else 'UNPAID'),
                'is_allowed': summary[6]['is_cleared'] or summary[6]['has_promissory']
            }
        }
