"""
Django views for SIS application.
Views for enrollment, payments, grades, and admin functions.
"""

from django.shortcuts import render, redirect, get_object_or_404
from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib import messages
from django.views.generic.edit import FormView
from django.urls import reverse_lazy
from decimal import Decimal
from sis.forms import (
    EnrollmentStep1Form, EnrollmentStep2Form, EnrollmentStep3Form, EnrollmentStep4Form,
    PaymentRecordForm, PaymentAdjustmentForm,
)
from sis.services.enrollment_service import EnrollmentService
from sis.services.payment_service import PaymentService
from sis.models import Student, Enrollment


class HomeView(LoginRequiredMixin, View):
    """Home/Dashboard view"""
    template_name = 'sis/home.html'

    def get(self, request):
        context = {
            'user': request.user,
        }
        return render(request, self.template_name, context)


class EnrollmentWizardView(View):
    """Multi-step enrollment wizard"""

    def get(self, request):
        """Display current step of enrollment form"""
        step = request.GET.get('step', '1')
        session_data = request.session.get('enrollment_data', {})

        # Map steps to forms
        forms_map = {
            '1': EnrollmentStep1Form,
            '2': EnrollmentStep2Form,
            '3': EnrollmentStep3Form,
            '4': EnrollmentStep4Form,
        }

        FormClass = forms_map.get(step, EnrollmentStep1Form)

        # Pre-fill form with saved session data
        form = FormClass(initial=session_data)

        context = {
            'form': form,
            'step': step,
            'step_title': self._get_step_title(step),
            'step_description': self._get_step_description(step),
            'progress': int(step) * 25,  # 25% per step
            'next_step': str(int(step) + 1) if int(step) < 4 else None,
            'prev_step': str(int(step) - 1) if int(step) > 1 else None,
        }

        return render(request, 'enrollment/wizard.html', context)

    def post(self, request):
        """Process form submission"""
        step = request.POST.get('step', '1')

        # Map steps to forms
        forms_map = {
            '1': EnrollmentStep1Form,
            '2': EnrollmentStep2Form,
            '3': EnrollmentStep3Form,
            '4': EnrollmentStep4Form,
        }

        FormClass = forms_map.get(step, EnrollmentStep1Form)
        form = FormClass(request.POST)

        if form.is_valid():
            # Save form data to session
            session_data = request.session.get('enrollment_data', {})
            session_data.update(form.cleaned_data)
            request.session['enrollment_data'] = session_data

            # Determine next action
            if step == '4':
                # Final step - create enrollment
                return self._create_enrollment(request, session_data)
            else:
                # Move to next step
                next_step = str(int(step) + 1)
                return redirect(f'/enroll/?step={next_step}')

        # Form invalid - redisplay with errors
        context = {
            'form': form,
            'step': step,
            'step_title': self._get_step_title(step),
            'step_description': self._get_step_description(step),
            'progress': int(step) * 25,
            'next_step': str(int(step) + 1) if int(step) < 4 else None,
            'prev_step': str(int(step) - 1) if int(step) > 1 else None,
        }

        return render(request, 'enrollment/wizard.html', context)

    def _create_enrollment(self, request, data):
        """Create student enrollment"""
        result = EnrollmentService.create_online_enrollment(
            first_name=data.get('first_name'),
            last_name=data.get('last_name'),
            email=data.get('email'),
            program_id=data.get('program').id,
            monthly_commitment=data.get('monthly_commitment'),
            is_transferee=data.get('is_transferee', False),
            previous_school=data.get('previous_school'),
            previous_course=data.get('previous_course'),
            phone=data.get('phone'),
            birthdate=data.get('birthdate'),
            address=data.get('address'),
            city=data.get('city'),
            province=data.get('province'),
            zip_code=data.get('zip_code'),
            ip_address=self._get_client_ip(request),
        )

        # Clear session data
        if 'enrollment_data' in request.session:
            del request.session['enrollment_data']

        if result['success']:
            messages.success(
                request,
                f"Welcome! Your student number is {result['student_number']}"
            )
            return redirect('enrollment_confirmation', student_number=result['student_number'])
        else:
            messages.error(request, ' '.join(result['errors']))
            return redirect('/enroll/?step=1')

    @staticmethod
    def _get_step_title(step):
        """Get step title"""
        titles = {
            '1': 'Personal Information',
            '2': 'Address Information',
            '3': 'Program Selection',
            '4': 'Payment Commitment',
        }
        return titles.get(step, 'Enrollment')

    @staticmethod
    def _get_step_description(step):
        """Get step description"""
        descriptions = {
            '1': 'Please provide your basic personal information',
            '2': 'Where should we contact you?',
            '3': 'Select your preferred academic program',
            '4': 'Set your monthly payment commitment',
        }
        return descriptions.get(step, '')

    @staticmethod
    def _get_client_ip(request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class EnrollmentConfirmationView(View):
    """Enrollment confirmation page"""
    template_name = 'enrollment/confirmation.html'

    def get(self, request, student_number):
        context = {
            'student_number': student_number,
            'message': f'Welcome to Richwell Colleges! Your student number is {student_number}',
        }
        return render(request, self.template_name, context)


class CashierDashboardView(LoginRequiredMixin, View):
    """Cashier dashboard for payment recording"""
    template_name = 'cashier/dashboard.html'
    login_url = 'admin:login'

    def get(self, request):
        """Display cashier dashboard"""
        form = PaymentRecordForm()
        context = {
            'form': form,
            'user': request.user,
        }
        return render(request, self.template_name, context)

    def post(self, request):
        """Process payment recording"""
        form = PaymentRecordForm(request.POST)

        if form.is_valid():
            # Get student by student number
            student_number = form.cleaned_data.get('student_number')
            try:
                student = Student.objects.get(student_number=student_number)
            except Student.DoesNotExist:
                messages.error(request, f"Student {student_number} not found.")
                context = {'form': form}
                return render(request, self.template_name, context)

            # Get current enrollment
            try:
                enrollment = Enrollment.objects.get(student=student, status='ACTIVE')
            except Enrollment.DoesNotExist:
                messages.error(
                    request,
                    f"No active enrollment found for student {student_number}."
                )
                context = {'form': form}
                return render(request, self.template_name, context)

            # Record payment
            amount = form.cleaned_data.get('amount')
            payment_mode = form.cleaned_data.get('payment_mode')

            result = PaymentService.record_payment(
                enrollment=enrollment,
                amount=Decimal(str(amount)),
                payment_mode=payment_mode,
                cashier=request.user if request.user.is_authenticated else None,
                ip_address=self._get_client_ip(request),
            )

            if result['success']:
                messages.success(
                    request,
                    f"Payment of {amount} recorded successfully for {student.user.get_full_name()}. "
                    f"Allocated to months: {', '.join(str(m) for m in result.get('allocated_months', []))}."
                )
                # Redirect to payment receipt
                return redirect('payment_receipt', payment_id=result['payment_transaction'].id)
            else:
                messages.error(request, f"Error: {', '.join(result['errors'])}")
                context = {'form': form}
                return render(request, self.template_name, context)

        context = {'form': form}
        return render(request, self.template_name, context)

    @staticmethod
    def _get_client_ip(request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class PaymentReceiptView(LoginRequiredMixin, View):
    """Display payment receipt"""
    template_name = 'cashier/receipt.html'
    login_url = 'admin:login'

    def get(self, request, payment_id):
        """Display payment receipt"""
        from sis.models import PaymentTransaction

        payment = get_object_or_404(PaymentTransaction, id=payment_id)
        enrollment = payment.enrollment
        student = enrollment.student
        payment_status = PaymentService.get_enrollment_payment_status(enrollment)

        context = {
            'payment': payment,
            'student': student,
            'enrollment': enrollment,
            'payment_status': payment_status,
        }
        return render(request, self.template_name, context)


class EnrollmentPaymentStatusView(LoginRequiredMixin, View):
    """View payment status for a student"""
    template_name = 'cashier/payment_status.html'
    login_url = 'admin:login'

    def get(self, request):
        """Display payment status lookup"""
        student_number = request.GET.get('student_number')
        enrollment = None
        payment_status = None

        if student_number:
            try:
                student = Student.objects.get(student_number=student_number)
                enrollment = Enrollment.objects.get(student=student, status='ACTIVE')
                payment_status = PaymentService.get_enrollment_payment_status(enrollment)
            except (Student.DoesNotExist, Enrollment.DoesNotExist):
                messages.warning(request, f"No enrollment found for {student_number}")

        context = {
            'student_number': student_number,
            'enrollment': enrollment,
            'payment_status': payment_status,
        }
        return render(request, self.template_name, context)
