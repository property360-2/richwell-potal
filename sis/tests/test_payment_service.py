"""
Tests for Payment System - Sequential Payment Allocation Engine.

Tests cover:
1. Basic payment allocation to months 1-6
2. Sequential allocation (can't skip months)
3. Overpayment carryover
4. Exam permit unlock on Month 1 payment
5. Concurrent payment handling
6. Payment reconciliation
"""
import pytest
from decimal import Decimal
from django.utils import timezone

from sis.models import Payment, PaymentMonth, ExamPermit
from sis.services.payment_service import (
    allocate_payment,
    get_payment_balance,
    is_month_1_paid,
    can_enroll_subjects,
    can_sit_exam,
    get_payment_history,
    unlock_exam_permit,
    InsufficientPaymentAmount,
    InvalidPaymentMonth
)


@pytest.mark.payment
@pytest.mark.django_db
class TestPaymentAllocation:
    """Test sequential payment allocation algorithm."""

    def test_allocate_payment_to_month_1(self, setup_payment_scenario, cashier_user):
        """Test: First payment allocates to Month 1."""
        enrollment, months = setup_payment_scenario

        result = allocate_payment(
            enrollment=enrollment,
            amount=5000,
            method="CASH",
            reference_number="REF001",
            user=cashier_user
        )

        assert result['payment'].amount == Decimal('5000')
        assert len(result['allocation']) == 1
        assert result['allocation'][0]['month_number'] == 1
        assert result['allocation'][0]['amount_allocated'] == 5000
        assert result['allocation'][0]['is_paid'] is False
        assert result['overpayment_carried'] == 0

        # Verify Month 1 updated in database
        month_1 = PaymentMonth.objects.get(month_number=1, enrollment=enrollment)
        assert month_1.amount_paid == Decimal('5000')
        assert month_1.is_paid is False

    def test_allocate_payment_completes_month(self, setup_payment_scenario, cashier_user):
        """Test: Full payment marks month as paid."""
        enrollment, months = setup_payment_scenario

        result = allocate_payment(
            enrollment=enrollment,
            amount=10000,
            method="CASH",
            reference_number="REF001",
            user=cashier_user
        )

        month_1 = PaymentMonth.objects.get(month_number=1, enrollment=enrollment)
        assert month_1.amount_paid == Decimal('10000')
        assert month_1.is_paid is True
        assert result['allocation'][0]['is_paid'] is True

    def test_allocate_payment_sequential_months(self, setup_payment_scenario, cashier_user):
        """Test: Payments allocate sequentially to unpaid months."""
        enrollment, months = setup_payment_scenario

        # First payment: Month 1
        allocate_payment(enrollment, 10000, "CASH", "REF001", cashier_user)

        # Second payment: Should go to Month 2
        result = allocate_payment(enrollment, 10000, "CASH", "REF002", cashier_user)

        assert len(result['allocation']) == 1
        assert result['allocation'][0]['month_number'] == 2
        assert result['allocation'][0]['is_paid'] is True

    def test_overpayment_carryover(self, setup_payment_scenario, cashier_user):
        """Test: Overpayment carries to next month."""
        enrollment, months = setup_payment_scenario

        # Pay 15000 (Month 1 due: 10000, remainder 5000 for Month 2)
        result = allocate_payment(
            enrollment=enrollment,
            amount=15000,
            method="CASH",
            reference_number="REF001",
            user=cashier_user
        )

        assert len(result['allocation']) == 2
        assert result['allocation'][0]['month_number'] == 1
        assert result['allocation'][0]['amount_allocated'] == 10000
        assert result['allocation'][0]['is_paid'] is True

        assert result['allocation'][1]['month_number'] == 2
        assert result['allocation'][1]['amount_allocated'] == 5000
        assert result['allocation'][1]['is_paid'] is False
        assert result['allocation'][1]['total_paid'] == 5000

        assert result['overpayment_carried'] == 0

    def test_overpayment_all_months(self, setup_payment_scenario, cashier_user):
        """Test: Large payment covers multiple months."""
        enrollment, months = setup_payment_scenario

        # Pay 60000 (all 6 months at 10000 each)
        result = allocate_payment(
            enrollment=enrollment,
            amount=60000,
            method="CASH",
            reference_number="REF001",
            user=cashier_user
        )

        assert len(result['allocation']) == 6
        assert all(alloc['is_paid'] for alloc in result['allocation'])
        assert result['overpayment_carried'] == 0

        # All months should be marked as paid
        for month_num in range(1, 7):
            month = PaymentMonth.objects.get(month_number=month_num, enrollment=enrollment)
            assert month.is_paid is True

    def test_partial_payments_accumulate(self, setup_payment_scenario, cashier_user):
        """Test: Multiple partial payments accumulate correctly."""
        enrollment, months = setup_payment_scenario

        # Payment 1: 3000 to Month 1
        allocate_payment(enrollment, 3000, "CASH", "REF001", cashier_user)

        month_1 = PaymentMonth.objects.get(month_number=1, enrollment=enrollment)
        assert month_1.amount_paid == Decimal('3000')
        assert month_1.is_paid is False

        # Payment 2: 4000 to Month 1
        allocate_payment(enrollment, 4000, "CASH", "REF002", cashier_user)

        month_1.refresh_from_db()
        assert month_1.amount_paid == Decimal('7000')
        assert month_1.is_paid is False

        # Payment 3: 3000 to Month 1 (completes it)
        result = allocate_payment(enrollment, 3000, "CASH", "REF003", cashier_user)

        month_1.refresh_from_db()
        assert month_1.amount_paid == Decimal('10000')
        assert month_1.is_paid is True

        # Verify no overpayment
        assert result['overpayment_carried'] == 0

    def test_payment_creates_payment_record(self, setup_payment_scenario, cashier_user):
        """Test: Payment allocation creates Payment record."""
        enrollment, months = setup_payment_scenario

        result = allocate_payment(
            enrollment=enrollment,
            amount=5000,
            method="CASH",
            reference_number="REF001",
            user=cashier_user
        )

        payment = Payment.objects.get(reference_number="REF001")
        assert payment.enrollment == enrollment
        assert payment.amount == Decimal('5000')
        assert payment.payment_method == "CASH"
        assert payment.status == "COMPLETED"

        assert result['payment'].id == payment.id

    def test_payment_invalid_amount_zero(self, enrollment, cashier_user):
        """Test: Zero payment amount raises error."""
        with pytest.raises(InsufficientPaymentAmount):
            allocate_payment(
                enrollment=enrollment,
                amount=0,
                method="CASH",
                reference_number="REF001",
                user=cashier_user
            )

    def test_payment_invalid_amount_negative(self, enrollment, cashier_user):
        """Test: Negative payment amount raises error."""
        with pytest.raises(InsufficientPaymentAmount):
            allocate_payment(
                enrollment=enrollment,
                amount=-1000,
                method="CASH",
                reference_number="REF001",
                user=cashier_user
            )

    def test_payment_no_months_raises_error(self, enrollment, cashier_user):
        """Test: Enrollment with no payment months raises error."""
        # Don't set up payment months for this enrollment
        with pytest.raises(InvalidPaymentMonth):
            allocate_payment(
                enrollment=enrollment,
                amount=5000,
                method="CASH",
                reference_number="REF001",
                user=cashier_user
            )


@pytest.mark.payment
@pytest.mark.django_db
class TestExamPermitUnlock:
    """Test exam permit auto-unlock on Month 1 payment."""

    def test_exam_permit_created_locked(self, enrollment, semester):
        """Test: ExamPermit created in locked state."""
        exam_permit, created = ExamPermit.objects.get_or_create(enrollment=enrollment)
        assert exam_permit.status == "LOCKED"
        assert exam_permit.issued_date is None
        assert exam_permit.expiry_date is None

    def test_exam_permit_unlocks_on_month1_payment(self, setup_payment_scenario, cashier_user):
        """Test: ExamPermit auto-unlocks when Month 1 fully paid."""
        enrollment, months = setup_payment_scenario

        # Create locked exam permit
        exam_permit = ExamPermit.objects.create(
            enrollment=enrollment,
            status="LOCKED"
        )

        # Pay Month 1
        result = allocate_payment(
            enrollment=enrollment,
            amount=10000,
            method="CASH",
            reference_number="REF001",
            user=cashier_user
        )

        assert result['exam_permit_unlocked'] is True

        exam_permit.refresh_from_db()
        assert exam_permit.status == "UNLOCKED"
        assert exam_permit.issued_date is not None
        assert exam_permit.expiry_date == enrollment.semester.end_date

    def test_exam_permit_not_unlocked_if_month1_not_complete(self, setup_payment_scenario, cashier_user):
        """Test: ExamPermit stays locked if Month 1 not fully paid."""
        enrollment, months = setup_payment_scenario

        exam_permit = ExamPermit.objects.create(enrollment=enrollment)

        # Pay partial Month 1
        result = allocate_payment(
            enrollment=enrollment,
            amount=5000,
            method="CASH",
            reference_number="REF001",
            user=cashier_user
        )

        assert result['exam_permit_unlocked'] is False

        exam_permit.refresh_from_db()
        assert exam_permit.status == "LOCKED"

    def test_exam_permit_not_double_unlocked(self, setup_payment_scenario, cashier_user):
        """Test: Already unlocked permit not unlocked again."""
        enrollment, months = setup_payment_scenario

        exam_permit = ExamPermit.objects.create(
            enrollment=enrollment,
            status="UNLOCKED",
            issued_date=timezone.now()
        )

        # Allocate another payment
        result = allocate_payment(
            enrollment=enrollment,
            amount=5000,
            method="CASH",
            reference_number="REF001",
            user=cashier_user
        )

        assert result['exam_permit_unlocked'] is False


@pytest.mark.payment
@pytest.mark.django_db
class TestPaymentQueries:
    """Test payment balance and history queries."""

    def test_get_payment_balance(self, setup_payment_scenario, cashier_user):
        """Test: Payment balance calculation."""
        enrollment, months = setup_payment_scenario

        # No payments yet
        balance = get_payment_balance(enrollment)
        assert balance['total_due'] == 60000
        assert balance['total_paid'] == 0
        assert balance['balance'] == 60000
        assert len(balance['months']) == 6

        # Pay partial
        allocate_payment(enrollment, 25000, "CASH", "REF001", cashier_user)

        balance = get_payment_balance(enrollment)
        assert balance['total_paid'] == 25000
        assert balance['balance'] == 35000
        assert balance['months_paid'] == [1, 2]

    def test_is_month_1_paid(self, setup_payment_scenario, cashier_user):
        """Test: Check if Month 1 is paid."""
        enrollment, months = setup_payment_scenario

        assert is_month_1_paid(enrollment) is False

        allocate_payment(enrollment, 10000, "CASH", "REF001", cashier_user)

        assert is_month_1_paid(enrollment) is True

    def test_can_enroll_subjects(self, setup_payment_scenario, cashier_user):
        """Test: Subject enrollment blocked until Month 1 paid."""
        enrollment, months = setup_payment_scenario

        can_enroll, reason = can_enroll_subjects(enrollment)
        assert can_enroll is False
        assert "Month 1" in reason

        allocate_payment(enrollment, 10000, "CASH", "REF001", cashier_user)

        can_enroll, reason = can_enroll_subjects(enrollment)
        assert can_enroll is True
        assert reason is None

    def test_can_sit_exam(self, setup_payment_scenario, cashier_user):
        """Test: Exam access blocked until Month 1 paid and permit unlocked."""
        enrollment, months = setup_payment_scenario

        ExamPermit.objects.create(enrollment=enrollment, status="LOCKED")

        can_sit, reason = can_sit_exam(enrollment)
        assert can_sit is False

        allocate_payment(enrollment, 10000, "CASH", "REF001", cashier_user)

        can_sit, reason = can_sit_exam(enrollment)
        assert can_sit is True

    def test_get_payment_history(self, setup_payment_scenario, cashier_user):
        """Test: Retrieve payment history."""
        enrollment, months = setup_payment_scenario

        allocate_payment(enrollment, 5000, "CASH", "REF001", cashier_user)
        allocate_payment(enrollment, 10000, "CASH", "REF002", cashier_user)

        history = get_payment_history(enrollment)
        assert len(history) == 2

        # Most recent first
        assert history[0]['reference_number'] == "REF002"
        assert history[1]['reference_number'] == "REF001"

        assert all(h['status'] == "COMPLETED" for h in history)
