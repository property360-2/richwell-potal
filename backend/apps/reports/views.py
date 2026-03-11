from django.http import HttpResponse
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Sum
from apps.students.models import Student, StudentEnrollment
from apps.academics.models import Program, Subject
from apps.facilities.models import Room
from apps.faculty.models import Professor
from apps.finance.models import Payment
from apps.notifications.models import Notification
from apps.auditing.models import AuditLog
from .services.report_service import ReportService

class ReportViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['masterlist']:
            return [permissions.IsAdminUser()] # Or specific Registrar role
        return super().get_permissions()

    @action(detail=False, methods=['get'])
    def masterlist(self, request):
        term_id = request.query_params.get('term_id')
        program_id = request.query_params.get('program_id')
        year_level = request.query_params.get('year_level')

        if not term_id:
            return Response({"error": "term_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            excel_data = ReportService.generate_masterlist_excel(term_id, program_id, year_level)
            response = HttpResponse(
                excel_data.read(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = 'attachment; filename="masterlist.xlsx"'
            return response
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def cor(self, request):
        student_id = request.query_params.get('student_id')
        term_id = request.query_params.get('term_id')

        # Allow students to get their own COR, or Registrar to get any
        user = request.user
        if not student_id:
            if user.role == 'STUDENT':
                student_id = user.student_profile.id
            else:
                return Response({"error": "student_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            if user.role == 'STUDENT' and str(user.student_profile.id) != str(student_id):
                return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
            # Ensure student_id is integer if provided
            try:
                student_id = int(student_id)
            except (ValueError, TypeError):
                return Response({"error": "Invalid student_id format"}, status=status.HTTP_400_BAD_REQUEST)

        if not term_id:
            return Response({"error": "term_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            pdf_data = ReportService.generate_cor_pdf(student_id, term_id)
            response = HttpResponse(pdf_data.read(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="COR_{student_id}.pdf"'
            return response
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='graduation-check')
    def graduation_check(self, request):
        student_id = request.query_params.get('student_id')
        if not student_id:
             return Response({"error": "student_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            result = ReportService.graduation_check(student_id)
            return Response(result)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        user = request.user
        role = user.role
        data = {}

        if role == 'ADMIN':
            data = {
                "programs": Program.objects.count(),
                "subjects": Subject.objects.count(),
                "professors": Professor.objects.count(),
                "rooms": Room.objects.count(),
                "audit_count": AuditLog.objects.count()
            }
        elif role == 'REGISTRAR':
            data = {
                "pending_docs": Student.objects.filter(status='APPLICANT').count(),
                "pending_grades": StudentEnrollment.objects.filter(advising_status='PENDING').count(),
                "total_students": Student.objects.count(),
                "sections": 0  # TODO: add section count
            }
        elif role == 'CASHIER':
            from django.utils import timezone
            today = timezone.now().date()
            data = {
                "today_collections": Payment.objects.filter(created_at__date=today).aggregate(Sum('amount'))['amount__sum'] or 0,
                "monthly_total": Payment.objects.filter(created_at__month=today.month).aggregate(Sum('amount'))['amount__sum'] or 0,
                "pending_promissories": Payment.objects.filter(is_promissory=True).count()
            }
        elif role == 'STUDENT':
             # Simple dashboard stats for student
             student = getattr(user, 'student_profile', None)
             if student:
                 data = {
                     "enrolled_units": 0, # Calculate based on enrollment
                     "gpa": 0.0,
                     "notifications": Notification.objects.filter(recipient=user, is_read=False).count()
                 }
        
        return Response(data)
