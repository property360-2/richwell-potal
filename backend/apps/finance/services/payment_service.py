from django.db.models import Sum
from django.utils import timezone
from django.core.exceptions import ValidationError
from apps.notifications.services.notification_service import NotificationService
from apps.notifications.models import Notification
from ..models import Payment

class PaymentService:
    @staticmethod
    def _generate_reference_number():
        """
        Generates a unique reference number: PAY-YYYYMMDD-XXXX
        """
        import random, string
        date_str = timezone.now().strftime('%Y%m%d')
        random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
        ref = f"PAY-{date_str}-{random_str}"
        
        # Ensure uniqueness
        while Payment.objects.filter(reference_number=ref).exists():
            random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
            ref = f"PAY-{date_str}-{random_str}"
            
        return ref

    @staticmethod
    def get_next_payment_info(student, term):
        """
        Returns info for the next payment due based on cumulative balance.
        """
        from apps.students.models import StudentEnrollment
        enrollment = StudentEnrollment.objects.filter(student=student, term=term).first()
        monthly_commitment = float(enrollment.monthly_commitment) if enrollment else 0.0
        
        # Calculate total paid all-time for this term
        total_paid_all_time = Payment.objects.filter(
            student=student,
            term=term
        ).aggregate(total=Sum('amount'))['total'] or 0.0
        
        # Find earliest month that is not cleared cumulatively
        next_month = 1
        for m in range(1, 7):
            required_cumulative = monthly_commitment * m
            if total_paid_all_time < required_cumulative:
                # Check if they have a promissory note for this specific month
                has_promissory = Payment.objects.filter(
                    student=student,
                    term=term,
                    month=m,
                    is_promissory=True
                ).exists()
                if not has_promissory:
                    next_month = m
                    break
        else:
            next_month = 6
        
        required_for_next = monthly_commitment * next_month
        shortfall = max(0, required_for_next - float(total_paid_all_time))
        
        return {
            'next_month': next_month,
            'monthly_commitment': monthly_commitment,
            'total_paid_all_time': float(total_paid_all_time),
            'amount_due_for_next': shortfall,
            'is_cleared': shortfall <= 0
        }

    @staticmethod
    def record_payment(student, term, month, amount, processed_by, is_promissory=False, notes=None):
        """
        Records a student payment.
        - month: If None, system finds the earliest uncleared month.
        - Reference Number: Auto-generated.
        """
        from apps.students.models import StudentEnrollment
        enrollment = StudentEnrollment.objects.filter(student=student, term=term).first()
        monthly_commitment = float(enrollment.monthly_commitment) if enrollment else 0.0

        # Auto-detect month if not provided
        if month is None:
            info = PaymentService.get_next_payment_info(student, term)
            month = info['next_month']

        if is_promissory and month > 1:
            # Check if previous month is cumulatively settled
            total_paid = Payment.objects.filter(
                student=student,
                term=term
            ).aggregate(total=Sum('amount'))['total'] or 0.0
            
            required_prev = monthly_commitment * (month - 1)
            
            if total_paid < required_prev:
                # Special case: Maybe they have a promissory note for the previous month?
                prev_promissory = Payment.objects.filter(
                    student=student, 
                    term=term, 
                    month=month-1, 
                    is_promissory=True
                ).exists()
                
                if not prev_promissory:
                    raise ValidationError(f"Promissory note for Month {month} denied. Previous month (Month {month-1}) is not settled.")

        payment = Payment.objects.create(
            student=student,
            term=term,
            month=month,
            amount=amount,
            is_promissory=is_promissory,
            processed_by=processed_by,
            notes=notes,
            reference_number=PaymentService._generate_reference_number(),
            entry_type=Payment.EntryType.PAYMENT
        )

        # Notify Student
        NotificationService.notify(
            recipient=student.user,
            notification_type=Notification.NotificationType.FINANCE,
            title="Payment Recorded",
            message=f"A payment of ₱{amount:,.2f} has been recorded (Ref: {payment.reference_number}).",
            link_url="/student/finance"
        )

        return payment

    @staticmethod
    def record_adjustment(student, term, month, amount, processed_by, notes):
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
            notes=notes,
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
        Returns cumulative payment summary.
        """
        from apps.students.models import StudentEnrollment
        enrollment = StudentEnrollment.objects.filter(student=student, term=term).first()
        monthly_commitment = float(enrollment.monthly_commitment) if enrollment else 0.0
        
        total_paid_all_time = Payment.objects.filter(
            student=student,
            term=term
        ).aggregate(total=Sum('amount'))['total'] or 0.0
        
        summary = {}
        for m in range(1, 7):
            required_cumulative = monthly_commitment * m
            
            has_promissory = Payment.objects.filter(
                student=student,
                term=term,
                month=m,
                is_promissory=True
            ).exists()
            
            is_cleared = total_paid_all_time >= required_cumulative or has_promissory
            
            summary[m] = {
                'required_cumulative': required_cumulative,
                'is_cleared': is_cleared,
                'has_promissory': has_promissory
            }
        
        summary['total_paid'] = float(total_paid_all_time)
        return summary

    @staticmethod
    def get_permit_status(student, term):
        """
        Derived status based on cumulative settlement.
        """
        summary = PaymentService.get_payment_summary(student, term)
        
        def get_status(month_idx):
            month_data = summary[month_idx]
            return {
                'status': 'PAID' if (summary['total_paid'] >= month_data['required_cumulative']) else ('PROMISSORY' if month_data['has_promissory'] else 'UNPAID'),
                'is_allowed': month_data['is_cleared']
            }

        return {
            'enrollment': get_status(1),
            'chapter_test': get_status(2),
            'prelim': get_status(3),
            'midterm': get_status(4),
            'pre_final': get_status(5),
            'final': get_status(6),
        }
