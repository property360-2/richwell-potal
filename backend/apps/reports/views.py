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
        """
        if not (tid := request.query_params.get('term_id')): return Response({"error": "term_id required"}, 400)
        excel = self.service.generate_masterlist_excel(tid, request.query_params.get('program_id'), request.query_params.get('year_level'))
        res = HttpResponse(excel, content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        res['Content-Disposition'] = 'attachment; filename="masterlist.xlsx"'
        return res

    @action(detail=False, methods=['get'])
    def cor(self, request):
        """
        Generates a Certificate of Registration (COR) in PDF format for a student.
        """
        tid = request.query_params.get('term_id')
        sid = request.query_params.get('student_id') or (request.user.student_profile.id if request.user.role == 'STUDENT' else None)
        if not all([tid, sid]): return Response({"error": "term_id and student_id required"}, 400)
        if request.user.role == 'STUDENT' and str(request.user.student_profile.id) != str(sid): return Response({"error": "Access denied"}, 403)
        
        try:
            pdf = self.service.generate_cor_pdf(sid, tid)
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
