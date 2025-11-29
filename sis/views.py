from django.shortcuts import render, redirect, get_object_or_404
from django.views.generic import TemplateView, ListView, DetailView, FormView
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.contrib.auth.views import LoginView, LogoutView
from django.urls import reverse_lazy
from django.http import HttpResponseRedirect, HttpResponseForbidden
from django.contrib import messages
from django.db import transaction

from .models import Student, Enrollment, SubjectEnrollment, Subject, Section, Payment
from .forms import EnrollSubjectForm, RecordPaymentForm, DropSubjectForm
from .services.enrollment_service import add_subject_to_enrollment, drop_subject, get_enrolled_subjects, get_student_load, get_available_sections
from .services.payment_service import allocate_payment, is_month_1_paid, get_payment_balance


class HomeView(LoginRequiredMixin, TemplateView):
    """Home page view - requires authentication."""
    template_name = 'home.html'
    login_url = reverse_lazy('sis:login')


class CustomLoginView(LoginView):
    """Custom login view with role-based redirect."""
    template_name = 'registration/login.html'
    redirect_authenticated_user = True
    next_page = reverse_lazy('sis:home')


class CustomLogoutView(LogoutView):
    """Custom logout view that handles both GET and POST requests."""
    next_page = reverse_lazy('sis:login')
    http_method_names = ['get', 'post', 'head', 'options', 'trace']

    def get(self, request, *args, **kwargs):
        """Handle GET requests by logging out and redirecting."""
        from django.contrib.auth import logout
        logout(request)
        return HttpResponseRedirect(self.get_success_url())


def handler_404(request, exception):
    """Handle 404 errors."""
    return render(request, '404.html', status=404)


def handler_500(request):
    """Handle 500 errors."""
    return render(request, '500.html', status=500)


# ===== STUDENT VIEWS =====

class StudentDashboardView(LoginRequiredMixin, TemplateView):
    """Student dashboard showing enrollment status and available actions."""
    template_name = 'enrollment/student_dashboard.html'
    login_url = reverse_lazy('sis:login')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        user = self.request.user

        try:
            student = Student.objects.get(user=user)
            # Get current semester enrollment
            enrollment = student.enrollments.first()

            if enrollment:
                # Get enrolled subjects
                enrolled_subjects = get_enrolled_subjects(enrollment)

                # Get student load
                load = get_student_load(enrollment)

                # Check payment status
                month_1_paid = is_month_1_paid(enrollment)
                balance = get_payment_balance(enrollment)

                # Get available subjects
                available_subjects = Subject.objects.filter(
                    sections__semester=enrollment.semester
                ).exclude(
                    subjectenrollment__enrollment=enrollment,
                    subjectenrollment__enrollment_status='ENROLLED'
                ).distinct()

                context.update({
                    'student': student,
                    'enrollment': enrollment,
                    'enrolled_subjects': enrolled_subjects,
                    'load': load,
                    'month_1_paid': month_1_paid,
                    'balance': balance,
                    'available_subjects': available_subjects,
                    'can_enroll': month_1_paid,
                })
            else:
                context['student'] = student
                context['no_enrollment'] = True
        except Student.DoesNotExist:
            context['not_a_student'] = True

        return context


class EnrollSubjectView(LoginRequiredMixin, FormView):
    """Student enrolls in a subject."""
    template_name = 'enrollment/enroll_subject.html'
    form_class = EnrollSubjectForm
    login_url = reverse_lazy('sis:login')

    def dispatch(self, request, *args, **kwargs):
        # Check if user is a student
        try:
            self.student = Student.objects.get(user=request.user)
            self.enrollment = self.student.enrollments.first()
            if not self.enrollment:
                messages.error(request, 'No active enrollment found.')
                return redirect('sis:student_dashboard')
        except Student.DoesNotExist:
            return HttpResponseForbidden('You are not a student.')
        return super().dispatch(request, *args, **kwargs)

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs['enrollment'] = self.enrollment
        return kwargs

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['student'] = self.student
        context['enrollment'] = self.enrollment
        return context

    def form_valid(self, form):
        from .services.enrollment_service import StudentNotEligibleToEnroll
        from .validators import PrerequisiteNotMet, UnitCapExceeded, ScheduleConflict

        subject = form.cleaned_data['subject']
        section = form.cleaned_data.get('section')
        override = form.cleaned_data.get('override_schedule_conflict', False)
        reason = form.cleaned_data.get('override_reason')

        try:
            with transaction.atomic():
                result = add_subject_to_enrollment(
                    self.enrollment,
                    subject,
                    section=section,
                    user=self.request.user,
                    override_schedule_conflict=override,
                    override_reason=reason
                )
                messages.success(
                    self.request,
                    f'Successfully enrolled in {subject.code}. Total units: {result["total_units"]}/30'
                )
                return redirect('sis:student_dashboard')
        except StudentNotEligibleToEnroll as e:
            messages.error(self.request, f'Cannot enroll: {str(e)}')
        except PrerequisiteNotMet as e:
            messages.error(self.request, f'Prerequisite not met: {str(e)}')
        except UnitCapExceeded as e:
            messages.error(self.request, f'Unit cap exceeded: {str(e)}')
        except ScheduleConflict as e:
            messages.error(self.request, f'Schedule conflict: {str(e)}')
        except Exception as e:
            messages.error(self.request, f'Error: {str(e)}')

        return self.form_invalid(form)

    def get_success_url(self):
        return reverse_lazy('sis:student_dashboard')


class DropSubjectView(LoginRequiredMixin, FormView):
    """Student drops a subject."""
    template_name = 'enrollment/drop_subject.html'
    form_class = DropSubjectForm
    login_url = reverse_lazy('sis:login')

    def dispatch(self, request, *args, **kwargs):
        try:
            self.student = Student.objects.get(user=request.user)
            self.subject_enrollment = SubjectEnrollment.objects.get(
                id=kwargs['enrollment_id'],
                enrollment__student=self.student,
                enrollment_status='ENROLLED'
            )
        except (Student.DoesNotExist, SubjectEnrollment.DoesNotExist):
            return HttpResponseForbidden('Cannot access this enrollment.')
        return super().dispatch(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['subject_enrollment'] = self.subject_enrollment
        context['subject'] = self.subject_enrollment.subject
        return context

    def form_valid(self, form):
        try:
            with transaction.atomic():
                result = drop_subject(
                    self.subject_enrollment,
                    user=self.request.user
                )
                messages.success(
                    self.request,
                    f'Successfully dropped {result["subject_code"]}. Units refunded: {result["units_removed"]}'
                )
                return redirect('sis:student_dashboard')
        except ValueError as e:
            messages.error(self.request, f'Error: {str(e)}')
            return self.form_invalid(form)

    def get_success_url(self):
        return reverse_lazy('sis:student_dashboard')


# ===== CASHIER VIEWS =====

class CashierDashboardView(UserPassesTestMixin, TemplateView):
    """Cashier dashboard to search and manage student payments."""
    template_name = 'payment/cashier_dashboard.html'
    login_url = reverse_lazy('sis:login')

    def test_func(self):
        # Check if user is cashier or admin
        return self.request.user.role in ['CASHIER', 'ADMIN'] or self.request.user.is_staff

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        query = self.request.GET.get('q', '')

        if query:
            # Search by student ID or name
            from django.db.models import Q
            students = Student.objects.filter(
                Q(student_id__icontains=query) |
                Q(user__first_name__icontains=query) |
                Q(user__last_name__icontains=query)
            ).select_related('user', 'program').prefetch_related('enrollments')[:20]
        else:
            students = []

        context['query'] = query
        context['students'] = students
        return context


class RecordPaymentView(UserPassesTestMixin, FormView):
    """Cashier records student payment."""
    template_name = 'payment/record_payment.html'
    form_class = RecordPaymentForm
    login_url = reverse_lazy('sis:login')

    def test_func(self):
        # Check if user is cashier or admin
        return self.request.user.role in ['CASHIER', 'ADMIN'] or self.request.user.is_staff

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        enrollment = None
        student = None
        try:
            student = Student.objects.get(student_id=self.kwargs.get('student_id'))
            enrollment = student.enrollments.first()

            if enrollment:
                # Get payment months for context
                payment_months = enrollment.payment_months.all().order_by('month_number')
                context['payment_months'] = payment_months
        except Student.DoesNotExist:
            pass

        context['enrollment'] = enrollment
        context['student'] = student
        return context

    def form_valid(self, form):
        try:
            student = Student.objects.get(student_id=self.kwargs.get('student_id'))
            enrollment = student.enrollments.first()

            if not enrollment:
                messages.error(self.request, 'Enrollment not found.')
                return redirect('sis:cashier_dashboard')

            with transaction.atomic():
                result = allocate_payment(
                    enrollment,
                    form.cleaned_data['amount'],
                    form.cleaned_data['payment_method'],
                    form.cleaned_data['reference_number'],
                    self.request.user,
                    notes=form.cleaned_data.get('notes', '')
                )
                messages.success(
                    self.request,
                    f'Payment recorded: PHP {result["amount_paid"]:.2f} allocated to Month {result["month"]}'
                )
                # Redirect to receipt
                payment = Payment.objects.filter(
                    enrollment=enrollment,
                    reference_number=form.cleaned_data['reference_number']
                ).first()
                if payment:
                    return redirect('sis:payment_receipt', payment_id=payment.id)
                return redirect('sis:cashier_dashboard')
        except Exception as e:
            messages.error(self.request, f'Error recording payment: {str(e)}')
            return self.form_invalid(form)

    def get_success_url(self):
        return reverse_lazy('sis:cashier_dashboard')


class PaymentReceiptView(LoginRequiredMixin, DetailView):
    """View and print payment receipt."""
    template_name = 'payment/receipt.html'
    model = Payment
    context_object_name = 'payment'
    login_url = reverse_lazy('sis:login')
    pk_url_kwarg = 'payment_id'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        payment = self.get_object()
        # Check if user is the student or cashier/admin
        is_student = hasattr(self.request.user, 'student_profile') and payment.student.user == self.request.user
        is_cashier = self.request.user.role in ['CASHIER', 'ADMIN'] or self.request.user.is_staff

        if not (is_student or is_cashier):
            raise HttpResponseForbidden()

        context['is_printable'] = True
        return context
