"""
Export views for enrollment data - students, enrollments, payments.
"""

from django.http import FileResponse
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from apps.core.api_responses import error_response
from apps.core.services import ExportService
from apps.accounts.models import User, StudentProfile
from apps.enrollment.models import Enrollment, PaymentTransaction, SubjectEnrollment
from datetime import datetime


class ExportStudentsView(APIView):
    """
    Export students list to Excel or PDF.
    Query params: format (excel|pdf)
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Check permissions (registrar or admin only)
        if not (request.user.is_registrar or request.user.is_admin):
            return error_response('Permission denied', status_code=status.HTTP_403_FORBIDDEN)
        
        export_format = request.GET.get('format', 'excel').lower()
        
        # Get all students
        students = User.objects.filter(role=User.Role.STUDENT).select_related('student_profile')
        
        # Prepare data
        columns = [
            {'key': 'student_number', 'label': 'Student Number'},
            {'key': 'full_name', 'label': 'Full Name'},
            {'key': 'email', 'label': 'Email'},
            {'key': 'program', 'label': 'Program'},
            {'key': 'year_level', 'label': 'Year'},
            {'key': 'status', 'label': 'Status'},
        ]
        
        data = []
        for student in students:
            try:
                profile = student.student_profile
                data.append({
                    'student_number': student.student_number or 'N/A',
                    'full_name': student.get_full_name(),
                    'email': student.email,
                    'program': profile.program.code if profile.program else 'N/A',
                    'year_level': profile.year_level,
                    'status': profile.get_status_display(),
                })
            except:
                continue
        
        # Generate export
        title = f"Students List - {datetime.now().strftime('%Y-%m-%d')}"
        
        if export_format == 'pdf':
            output = ExportService.export_to_pdf(data, columns, title)
            filename = f"students_{datetime.now().strftime('%Y%m%d')}.pdf"
            content_type = 'application/pdf'
        else:
            output = ExportService.export_to_excel(data, columns, "Students")
            filename = f"students_{datetime.now().strftime('%Y%m%d')}.xlsx"
            content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        
        response = FileResponse(output, content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class ExportEnrollmentsView(APIView):
    """
    Export enrollments for current semester to Excel or PDF.
    Query params: format (excel|pdf), semester_id (optional)
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Check permissions
        if not (request.user.is_registrar or request.user.is_admin):
            return error_response('Permission denied', status_code=status.HTTP_403_FORBIDDEN)
        
        export_format = request.GET.get('format', 'excel').lower()
        semester_id = request.GET.get('semester_id')
        
        # Get enrollments
        enrollments_qs = Enrollment.objects.select_related('student', 'student__student_profile', 'semester')
        
        if semester_id:
            enrollments_qs = enrollments_qs.filter(semester_id=semester_id)
        else:
            enrollments_qs = enrollments_qs.filter(semester__is_current=True)
        
        # Prepare data
        columns = [
            {'key': 'student_number', 'label': 'Student Number'},
            {'key': 'student_name', 'label': 'Student Name'},
            {'key': 'program', 'label': 'Program'},
            {'key': 'year_level', 'label': 'Year'},
            {'key': 'semester', 'label': 'Semester'},
            {'key': 'status', 'label': 'Status'},
            {'key': 'monthly_commitment', 'label': 'Monthly Payment'},
            {'key': 'created_at', 'label': 'Enrolled On'},
        ]
        
        data = []
        for enrollment in enrollments_qs:
            try:
                profile = enrollment.student.student_profile
                data.append({
                    'student_number': enrollment.student.student_number or 'N/A',
                    'student_name': enrollment.student.get_full_name(),
                    'program': profile.program.code if profile.program else 'N/A',
                    'year_level': profile.year_level,
                    'semester': enrollment.semester.name,
                    'status': enrollment.get_status_display(),
                    'monthly_commitment': f"₱{enrollment.monthly_commitment:,.2f}",
                    'created_at': enrollment.created_at.strftime('%Y-%m-%d'),
                })
            except:
                continue
        
        # Generate export
        title = f"Enrollments - {datetime.now().strftime('%Y-%m-%d')}"
        
        if export_format == 'pdf':
            output = ExportService.export_to_pdf(data, columns, title)
            filename = f"enrollments_{datetime.now().strftime('%Y%m%d')}.pdf"
            content_type = 'application/pdf'
        else:
            output = ExportService.export_to_excel(data, columns, "Enrollments")
            filename = f"enrollments_{datetime.now().strftime('%Y%m%d')}.xlsx"
            content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        
        response = FileResponse(output, content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class ExportPaymentsView(APIView):
    """
    Export payment transactions to Excel or PDF.
    Query params: format (excel|pdf), start_date, end_date (optional)
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Check permissions (cashier, registrar, or admin)
        if not (request.user.role in [User.Role.CASHIER, User.Role.REGISTRAR, User.Role.HEAD_REGISTRAR, User.Role.ADMIN]):
            return error_response('Permission denied', status_code=status.HTTP_403_FORBIDDEN)
        
        export_format = request.GET.get('format', 'excel').lower()
        
        # Get payments
        payments = PaymentTransaction.objects.select_related(
            'payment_bucket__enrollment__student',
            'recorded_by'
        ).order_by('-payment_date')
        
        # Apply date filters if provided
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        
        if start_date:
            payments = payments.filter(payment_date__gte=start_date)
        if end_date:
            payments = payments.filter(payment_date__lte=end_date)
        
        # Prepare data
        columns = [
            {'key': 'or_number', 'label': 'OR Number'},
            {'key': 'student_number', 'label': 'Student Number'},
            {'key': 'student_name', 'label': 'Student Name'},
            {'key': 'amount', 'label': 'Amount'},
            {'key': 'payment_date', 'label': 'Payment Date'},
            {'key': 'payment_method', 'label': 'Method'},
            {'key': 'recorded_by', 'label': 'Recorded By'},
        ]
        
        data = []
        for payment in payments[:500]:  # Limit to 500 for performance
            try:
                student = payment.payment_bucket.enrollment.student
                data.append({
                    'or_number': payment.or_number or 'N/A',
                    'student_number': student.student_number or 'N/A',
                    'student_name': student.get_full_name(),
                    'amount': f"₱{payment.amount:,.2f}",
                    'payment_date': payment.payment_date.strftime('%Y-%m-%d'),
                    'payment_method': payment.get_payment_method_display(),
                    'recorded_by': payment.recorded_by.get_full_name() if payment.recorded_by else 'System',
                })
            except:
                continue
        
        # Generate export
        title = f"Payment Transactions - {datetime.now().strftime('%Y-%m-%d')}"
        
        if export_format == 'pdf':
            output = ExportService.export_to_pdf(data, columns, title)
            filename = f"payments_{datetime.now().strftime('%Y%m%d')}.pdf"
            content_type = 'application/pdf'
        else:
            output = ExportService.export_to_excel(data, columns, "Payments")
            filename = f"payments_{datetime.now().strftime('%Y%m%d')}.xlsx"
            content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        
        response = FileResponse(output, content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
