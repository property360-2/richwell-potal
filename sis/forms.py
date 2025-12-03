"""
Django forms for SIS application.
Forms for enrollment, payments, grades, and other features.
"""

from django import forms


class OnlineEnrollmentForm(forms.Form):
    """Multi-step online enrollment form"""
    # Personal Information
    first_name = forms.CharField(max_length=150, required=True)
    last_name = forms.CharField(max_length=150, required=True)
    email = forms.EmailField(required=True)
    phone = forms.CharField(max_length=20, required=False)
    birthdate = forms.DateField(required=False)

    # Address
    address = forms.CharField(max_length=255, required=False)
    city = forms.CharField(max_length=100, required=False)
    province = forms.CharField(max_length=100, required=False)
    zip_code = forms.CharField(max_length=10, required=False)

    # Program Information
    program = forms.CharField(max_length=100, required=True)
    is_transferee = forms.BooleanField(required=False)
    previous_school = forms.CharField(max_length=255, required=False)
    previous_course = forms.CharField(max_length=255, required=False)

    # Monthly Commitment
    monthly_commitment = forms.DecimalField(max_digits=10, decimal_places=2, required=True)
