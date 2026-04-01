"""
Richwell Portal — Report Views

This module manages academic reporting, document export (PDF/Excel), and 
dashboard statistics for different administrative roles. It coordinates 
generation tasks via the ReportService.
"""

from django.http import HttpResponse
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .services.report_service import ReportService
from apps.students.models import Student
from apps.auditing.models import AuditLog
from apps.auditing.middleware import get_current_ip

class ReportViewSet(viewsets.ViewSet):
    """
    Handles PDF/Excel generation and real-time dashboard stats.
    Restricted to authenticated staff and students.
    """
    permission_classes = [permissions.IsAuthenticated]
    service = ReportService()

    def get_permissions(self):
        """
        Applies role-based constraints for specific document types.
        """
        if self.action == 'masterlist':
            from core.permissions import IsRegistrar
            return [IsRegistrar()]
        if self.action in ['cor', 'academic_summary']:
            from core.permissions import IsRegistrar, IsStudent, IsAdmission
            class COR_Permissions(permissions.BasePermission):
                def has_permission(self, request, view):
                    return any([IsRegistrar().has_permission(request, view), IsStudent().has_permission(request, view), IsAdmission().has_permission(request, view)])
            return [COR_Permissions()]
        return super().get_permissions()

    @action(detail=False, methods=['get'])
    def masterlist(self, request):
        """
        Generates a master list of students for a specific term, program, and year level in Excel format.
        Records a RELEASE audit log entry to ensure document generation is traceable.

        @param request - Authenticated DRF request; must include term_id query param.
        @returns {HttpResponse} - Excel file attachment, or 400 if term_id is missing.
        """
        if not (tid := request.query_params.get('term_id')): return Response({"error": "term_id required"}, 400)
        program_id = request.query_params.get('program_id')
        year_level = request.query_params.get('year_level')

        excel = self.service.generate_masterlist_excel(tid, program_id, year_level)

        # AUDIT: Log document release — masterlist downloads are not model-saves,
        # so we must manually create an audit entry for compliance.
        AuditLog.objects.create(
            user=request.user,
            action='RELEASE',
            model_name='Masterlist',
            object_id=str(tid),
            object_repr=f"Masterlist | Term: {tid} | Program: {program_id} | Year: {year_level}",
            changes={
                'document': 'masterlist',
                'term_id': str(tid),
                'program_id': str(program_id),
                'year_level': str(year_level)
            },
            ip_address=get_current_ip()
        )

        res = HttpResponse(excel, content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        res['Content-Disposition'] = 'attachment; filename="masterlist.xlsx"'
        return res

    @action(detail=False, methods=['get'])
    def cor(self, request):
        """
        Generates a Certificate of Registration (COR) in PDF format for a student.
        Records a RELEASE audit log entry to ensure document generation is traceable.

        @param request - Authenticated DRF request; must include term_id and student_id.
        @returns {HttpResponse} - PDF file attachment, or 400/403 on validation failure.
        """
        tid = request.query_params.get('term_id')
        sid = request.query_params.get('student_id') or (request.user.student_profile.id if request.user.role == 'STUDENT' else None)
        if not all([tid, sid]): return Response({"error": "term_id and student_id required"}, 400)
        if request.user.role == 'STUDENT' and str(request.user.student_profile.id) != str(sid): return Response({"error": "Access denied"}, 403)
        
        try:
            pdf = self.service.generate_cor_pdf(sid, tid)

            # AUDIT: Log document release — COR generation via GET bypasses model-level
            # AuditMixin, so we create a manual entry for full accountability.
            AuditLog.objects.create(
                user=request.user,
                action='RELEASE',
                model_name='COR',
                object_id=str(sid),
                object_repr=f"COR | Student: {sid} | Term: {tid}",
                changes={
                    'document': 'cor',
                    'student_id': str(sid),
                    'term_id': str(tid),
                    'generated_by_role': request.user.role
                },
                ip_address=get_current_ip()
            )

            res = HttpResponse(pdf, content_type='application/pdf')
            res['Content-Disposition'] = f'attachment; filename="COR_{sid}.pdf"'
            return res
        except (ValueError, Student.DoesNotExist, Exception) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='academic-summary')
    def academic_summary(self, request):
        """
        Retrieves a summary of a student's academic performance, including grades and progress.
        """
        sid = request.query_params.get('student_id') or (request.user.student_profile.id if request.user.role == 'STUDENT' else None)
        if not sid: return Response({"error": "student_id required"}, 400)
        try:
            return Response(self.service.get_academic_summary(sid))
        except (Student.DoesNotExist, Exception) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='graduation-check')
    def graduation_check(self, request):
        """
        Performs a check to determine if a student is eligible for graduation.
        """
        if not (sid := request.query_params.get('student_id')): return Response({"error": "student_id required"}, 400)
        try:
            return Response(self.service.graduation_check(sid))
        except (Student.DoesNotExist, Exception) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Returns high-level dashboard statistics based on the user's role.
        """
        return Response(self.service.get_dashboard_stats(request.user))
