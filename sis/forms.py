"""
Django forms for Richwell Colleges Portal.
Handles student enrollment, payments, and admin operations.
"""

from django import forms
from django.core.exceptions import ValidationError
from decimal import Decimal

from .models import Subject, Section, Enrollment, Payment
from .services.enrollment_service import add_subject_to_enrollment


class EnrollSubjectForm(forms.Form):
    """Form for student to enroll in a subject."""

    subject = forms.ModelChoiceField(
        queryset=Subject.objects.all(),
        widget=forms.RadioSelect,
        label="Select Subject"
    )
    section = forms.ModelChoiceField(
        queryset=Section.objects.all(),
        widget=forms.RadioSelect,
        required=False,
        label="Select Section (Optional - auto-assigned if not selected)"
    )
    override_schedule_conflict = forms.BooleanField(
        required=False,
        label="Override Schedule Conflict (Registrar Only)"
    )
    override_reason = forms.CharField(
        max_length=500,
        required=False,
        widget=forms.Textarea(attrs={'rows': 3}),
        label="Reason for Override"
    )

    def __init__(self, enrollment=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.enrollment = enrollment

        if enrollment:
            # Filter subjects to available ones for this semester
            self.fields['subject'].queryset = Subject.objects.filter(
                sections__semester=enrollment.semester
            ).distinct()

            # Filter sections to this semester
            self.fields['section'].queryset = Section.objects.filter(
                semester=enrollment.semester
            )

    def clean(self):
        cleaned_data = super().clean()
        override = cleaned_data.get('override_schedule_conflict')
        reason = cleaned_data.get('override_reason')

        if override and not reason:
            raise ValidationError("Override reason is required when overriding schedule conflicts.")

        return cleaned_data


class RecordPaymentForm(forms.Form):
    """Form for cashier to record student payments."""

    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'Cash'),
        ('CHECK', 'Check'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('CREDIT_CARD', 'Credit Card'),
        ('ONLINE', 'Online Payment'),
    ]

    amount = forms.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal('0.01'),
        label="Payment Amount (PHP)",
        widget=forms.NumberInput(attrs={'placeholder': '0.00'})
    )
    payment_method = forms.ChoiceField(
        choices=PAYMENT_METHOD_CHOICES,
        widget=forms.RadioSelect,
        label="Payment Method"
    )
    reference_number = forms.CharField(
        max_length=100,
        label="Reference Number (Check #, Receipt #, etc.)",
        widget=forms.TextInput(attrs={'placeholder': 'e.g., CHK-12345'})
    )
    notes = forms.CharField(
        max_length=500,
        required=False,
        widget=forms.Textarea(attrs={'rows': 3}),
        label="Notes (Optional)"
    )

    def clean_amount(self):
        amount = self.cleaned_data.get('amount')
        if amount and amount <= 0:
            raise ValidationError("Payment amount must be greater than 0.")
        return amount

    def clean_reference_number(self):
        ref = self.cleaned_data.get('reference_number')
        if not ref or len(ref.strip()) == 0:
            raise ValidationError("Reference number is required.")
        return ref.strip()


class DropSubjectForm(forms.Form):
    """Form for student to drop a subject."""

    reason = forms.CharField(
        max_length=500,
        required=False,
        widget=forms.Textarea(attrs={'rows': 3}),
        label="Reason for Dropping (Optional)"
    )
    confirm = forms.BooleanField(
        required=True,
        label="I confirm I want to drop this subject"
    )
