"""
Promissory Note service — handles creation, payments, and status management.
"""

from decimal import Decimal
from django.db import transaction
from django.utils import timezone

from apps.enrollment.models_payments import PromissoryNote
from apps.enrollment.models import Enrollment


class PromissoryNoteService:
    """Service for promissory note business logic."""

    @staticmethod
    def generate_reference_code():
        """Generate unique reference code: PN-YYYYMMDD-XXXXX."""
        today = timezone.now().strftime('%Y%m%d')
        prefix = f'PN-{today}-'

        last = PromissoryNote.objects.filter(
            reference_code__startswith=prefix
        ).order_by('-reference_code').first()

        if last:
            try:
                seq = int(last.reference_code.split('-')[-1]) + 1
            except ValueError:
                seq = 1
        else:
            seq = 1

        return f'{prefix}{seq:05d}'

    @staticmethod
    @transaction.atomic
    def create_promissory_note(enrollment, total_amount, due_date, reason,
                                covered_months, created_by, terms='',
                                guarantor_name='', guarantor_contact='',
                                guarantor_relationship=''):
        """
        Create a new promissory note for a student.
        Only cashier/registrar/admin can create.
        """
        # Validate no active promissory note for same months
        active_statuses = [PromissoryNote.Status.ACTIVE, PromissoryNote.Status.PARTIALLY_PAID]
        existing = PromissoryNote.objects.filter(
            enrollment=enrollment,
            status__in=active_statuses,
        )
        for note in existing:
            overlap = set(note.covered_months) & set(covered_months)
            if overlap:
                return {
                    'success': False,
                    'error': f'Active promissory note already covers month(s): {sorted(overlap)}'
                }

        reference_code = PromissoryNoteService.generate_reference_code()

        note = PromissoryNote.objects.create(
            enrollment=enrollment,
            total_amount=total_amount,
            due_date=due_date,
            reason=reason,
            covered_months=covered_months,
            terms=terms,
            guarantor_name=guarantor_name,
            guarantor_contact=guarantor_contact,
            guarantor_relationship=guarantor_relationship,
            created_by=created_by,
            reference_code=reference_code,
            status=PromissoryNote.Status.ACTIVE,
        )

        from apps.audit.models import AuditLog
        AuditLog.log(
            action=AuditLog.Action.PAYMENT_PROCESSED,
            target_model='PromissoryNote',
            target_id=note.id,
            payload={
                'action': 'created',
                'student': enrollment.student.get_full_name(),
                'amount': str(total_amount),
                'due_date': str(due_date),
                'reference_code': reference_code,
            }
        )

        return {
            'success': True,
            'note_id': str(note.id),
            'reference_code': reference_code,
            'message': f'Promissory note {reference_code} created'
        }

    @staticmethod
    @transaction.atomic
    def record_payment(note, amount, processed_by):
        """
        Record a payment against a promissory note.
        Updates status to PARTIALLY_PAID or FULFILLED.
        """
        if note.status in [PromissoryNote.Status.FULFILLED,
                           PromissoryNote.Status.CANCELLED]:
            return {
                'success': False,
                'error': f'Cannot record payment: note is {note.get_status_display()}'
            }

        amount = Decimal(str(amount))
        note.amount_paid += amount

        if note.amount_paid >= note.total_amount:
            note.status = PromissoryNote.Status.FULFILLED
            note.fulfilled_at = timezone.now()
        else:
            note.status = PromissoryNote.Status.PARTIALLY_PAID

        note.save()

        from apps.audit.models import AuditLog
        AuditLog.log(
            action=AuditLog.Action.PAYMENT_PROCESSED,
            target_model='PromissoryNote',
            target_id=note.id,
            payload={
                'action': 'payment_recorded',
                'amount': str(amount),
                'total_paid': str(note.amount_paid),
                'remaining': str(note.remaining_balance),
                'status': note.status,
                'processed_by': processed_by.get_full_name(),
            }
        )

        return {
            'success': True,
            'amount_paid': str(note.amount_paid),
            'remaining_balance': str(note.remaining_balance),
            'status': note.status,
            'message': 'Payment recorded' if note.status != PromissoryNote.Status.FULFILLED
                       else 'Promissory note fulfilled'
        }

    @staticmethod
    @transaction.atomic
    def mark_defaulted(note, user):
        """Mark a promissory note as defaulted (past due, not paid)."""
        if note.status in [PromissoryNote.Status.FULFILLED,
                           PromissoryNote.Status.CANCELLED]:
            return {
                'success': False,
                'error': f'Cannot default: note is {note.get_status_display()}'
            }

        note.status = PromissoryNote.Status.DEFAULTED
        note.defaulted_at = timezone.now()
        note.save()

        from apps.audit.models import AuditLog
        AuditLog.log(
            action=AuditLog.Action.PAYMENT_PROCESSED,
            target_model='PromissoryNote',
            target_id=note.id,
            payload={
                'action': 'defaulted',
                'student': note.enrollment.student.get_full_name(),
                'remaining': str(note.remaining_balance),
            }
        )

        return {'success': True, 'message': 'Promissory note marked as defaulted'}

    @staticmethod
    @transaction.atomic
    def cancel_note(note, user, reason=''):
        """Cancel a promissory note (only if no payments made)."""
        if note.status in [PromissoryNote.Status.FULFILLED,
                           PromissoryNote.Status.DEFAULTED]:
            return {
                'success': False,
                'error': f'Cannot cancel: note is {note.get_status_display()}'
            }

        if note.amount_paid > 0:
            return {
                'success': False,
                'error': 'Cannot cancel: payments have already been recorded'
            }

        note.status = PromissoryNote.Status.CANCELLED
        note.save()

        from apps.audit.models import AuditLog
        AuditLog.log(
            action=AuditLog.Action.PAYMENT_PROCESSED,
            target_model='PromissoryNote',
            target_id=note.id,
            payload={
                'action': 'cancelled',
                'cancelled_by': user.get_full_name(),
                'reason': reason,
            }
        )

        return {'success': True, 'message': 'Promissory note cancelled'}
