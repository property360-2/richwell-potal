"""
Django forms for SIS application.
Forms for enrollment, payments, grades, and other features.
"""

from django import forms
from django.core.exceptions import ValidationError
from sis.models import Program


class EnrollmentStep1Form(forms.Form):
    """Step 1: Personal Information"""
    first_name = forms.CharField(
        max_length=150,
        required=True,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'First Name',
        }),
    )
    last_name = forms.CharField(
        max_length=150,
        required=True,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Last Name',
        }),
    )
    email = forms.EmailField(
        required=True,
        widget=forms.EmailInput(attrs={
            'class': 'form-control',
            'placeholder': 'Email Address',
        }),
    )
    phone = forms.CharField(
        max_length=20,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Contact Number',
        }),
    )
    birthdate = forms.DateField(
        required=False,
        widget=forms.DateInput(attrs={
            'class': 'form-control',
            'type': 'date',
        }),
    )


class EnrollmentStep2Form(forms.Form):
    """Step 2: Address Information"""
    address = forms.CharField(
        max_length=255,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Street Address',
        }),
    )
    city = forms.CharField(
        max_length=100,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'City',
        }),
    )
    province = forms.CharField(
        max_length=100,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Province/State',
        }),
    )
    zip_code = forms.CharField(
        max_length=10,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Postal Code',
        }),
    )


class EnrollmentStep3Form(forms.Form):
    """Step 3: Program Selection"""
    program = forms.ModelChoiceField(
        queryset=Program.objects.filter(is_active=True),
        required=True,
        widget=forms.Select(attrs={
            'class': 'form-control',
        }),
        label='Select Your Program',
    )
    is_transferee = forms.BooleanField(
        required=False,
        widget=forms.CheckboxInput(attrs={
            'class': 'form-check-input',
        }),
        label='I am a transferee from another school',
    )
    previous_school = forms.CharField(
        max_length=255,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Previous School/University Name',
        }),
    )
    previous_course = forms.CharField(
        max_length=255,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Previous Course/Program',
        }),
    )

    def clean(self):
        cleaned_data = super().clean()
        is_transferee = cleaned_data.get('is_transferee')
        previous_school = cleaned_data.get('previous_school')
        previous_course = cleaned_data.get('previous_course')

        if is_transferee:
            if not previous_school:
                raise ValidationError("Previous school is required for transferees.")
            if not previous_course:
                raise ValidationError("Previous course is required for transferees.")

        return cleaned_data


class EnrollmentStep4Form(forms.Form):
    """Step 4: Payment Commitment"""
    monthly_commitment = forms.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=True,
        widget=forms.NumberInput(attrs={
            'class': 'form-control',
            'placeholder': '5000.00',
            'step': '0.01',
        }),
        min_value=0.01,
        label='Monthly Commitment Amount',
    )
    agree_terms = forms.BooleanField(
        required=True,
        widget=forms.CheckboxInput(attrs={
            'class': 'form-check-input',
        }),
        label='I agree to the terms and conditions',
    )

    def clean_monthly_commitment(self):
        commitment = self.cleaned_data.get('monthly_commitment')
        if commitment and commitment <= 0:
            raise ValidationError("Monthly commitment must be greater than 0.")
        return commitment


class PaymentRecordForm(forms.Form):
    """Form to record a payment transaction"""
    student_number = forms.CharField(
        max_length=50,
        required=True,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Student Number (e.g., 2025-000001)',
        }),
        label='Student Number',
    )
    amount = forms.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=True,
        widget=forms.NumberInput(attrs={
            'class': 'form-control',
            'placeholder': '5000.00',
            'step': '0.01',
        }),
        min_value=0.01,
        label='Payment Amount',
    )
    payment_mode = forms.ChoiceField(
        required=True,
        choices=[
            ('CASH', 'Cash'),
            ('ONLINE', 'Online/Bank Transfer'),
        ],
        widget=forms.RadioSelect(attrs={
            'class': 'form-check-input',
        }),
        label='Payment Mode',
    )

    def clean_amount(self):
        amount = self.cleaned_data.get('amount')
        if amount and amount <= 0:
            raise ValidationError("Amount must be greater than 0.")
        return amount


class PaymentAdjustmentForm(forms.Form):
    """Form to record a payment adjustment (refund or correction)"""
    amount = forms.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=True,
        widget=forms.NumberInput(attrs={
            'class': 'form-control',
            'placeholder': '1000.00',
            'step': '0.01',
        }),
        label='Adjustment Amount',
    )
    reason = forms.CharField(
        max_length=500,
        required=True,
        widget=forms.Textarea(attrs={
            'class': 'form-control',
            'rows': 4,
            'placeholder': 'Reason for adjustment (required for audit trail)',
        }),
        label='Reason for Adjustment',
    )

    def clean_reason(self):
        reason = self.cleaned_data.get('reason')
        if not reason or len(reason.strip()) == 0:
            raise ValidationError("Reason is required for all adjustments.")
        return reason
