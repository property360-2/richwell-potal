"""
Department Head views for enrollment approval.
EPIC 7: Administrative Features
"""

from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.utils import timezone

from apps.core.permissions import IsDepartmentHead, IsRegistrar, IsAdmin
from .models import SubjectEnrollment, Enrollment


class HeadPendingEnrollmentsView(views.APIView):
    """
    GET: Get pending enrollments requiring department head approval.
    """
    permission_classes = [IsAuthenticated, IsDepartmentHead | IsRegistrar | IsAdmin]
    
    def get(self, request, *args, **kwargs):
        from apps.academics.models import Program
        
        user = request.user
        
        # Get pending subject enrollments needing head approval
        # Filter by department if user is department head
        pending_qs = SubjectEnrollment.objects.filter(
            head_approved=False,
            status='PENDING',
            is_deleted=False
        ).select_related(
            'enrollment__student',
            'enrollment__semester',
            'subject',
            'section'
        ).order_by('-created_at')
        
        # If department head, filter to their program/department
        if user.role == 'DEPARTMENT_HEAD' and hasattr(user, 'department_head_profile'):
            program = user.department_head_profile.program
            if program:
                pending_qs = pending_qs.filter(
                    subject__program=program
                )
        
        pending_enrollments = []
        for se in pending_qs:
            pending_enrollments.append({
                'id': str(se.id),
                'student_id': str(se.enrollment.student.id),
                'student_number': se.enrollment.student.student_number,
                'student_name': se.enrollment.student.get_full_name(),
                'subject_code': se.subject.code,
                'subject_title': se.subject.title,
                'units': se.subject.units,
                'section_name': se.section.name if se.section else 'N/A',
                'semester': se.enrollment.semester.name,
                'academic_year': se.enrollment.semester.academic_year,
                'enrollment_type': se.enrollment_type,
                'is_retake': se.is_retake,
                'created_at': se.created_at.isoformat()
            })
        
        return Response({
            'success': True,
            'data': {
                'pending_enrollments': pending_enrollments,
                'total_count': len(pending_enrollments)
            }
        })


class HeadApproveEnrollmentView(views.APIView):
    """
    POST: Approve a pending enrollment.
    """
    permission_classes = [IsAuthenticated, IsDepartmentHead | IsRegistrar | IsAdmin]
    
    def post(self, request, pk, *args, **kwargs):
        try:
            se = SubjectEnrollment.objects.get(id=pk)
        except SubjectEnrollment.DoesNotExist:
            return Response({'error': 'Enrollment not found'}, status=404)
        
        if se.head_approved:
            return Response({'error': 'Already approved'}, status=400)
        
        se.head_approved = True
        se.head_approved_by = request.user
        se.head_approved_at = timezone.now()
        
        # If payment is also approved, mark as ENROLLED
        if se.payment_approved:
            se.status = 'ENROLLED'
        
        se.save()
        
        return Response({
            'success': True,
            'message': f'Enrollment approved for {se.enrollment.student.get_full_name()} - {se.subject.code}'
        })


class HeadRejectEnrollmentView(views.APIView):
    """
    POST: Reject a pending enrollment.
    """
    permission_classes = [IsAuthenticated, IsDepartmentHead | IsRegistrar | IsAdmin]
    
    def post(self, request, pk, *args, **kwargs):
        reason = request.data.get('reason', '')
        
        try:
            se = SubjectEnrollment.objects.get(id=pk)
        except SubjectEnrollment.DoesNotExist:
            return Response({'error': 'Enrollment not found'}, status=404)
        
        se.status = 'REJECTED'
        se.rejection_reason = reason
        se.rejected_by = request.user
        se.rejected_at = timezone.now()
        se.save()
        
        return Response({
            'success': True,
            'message': f'Enrollment rejected for {se.enrollment.student.get_full_name()} - {se.subject.code}'
        })


class HeadBulkApproveView(views.APIView):
    """
    POST: Bulk approve multiple enrollments.
    """
    permission_classes = [IsAuthenticated, IsDepartmentHead | IsRegistrar | IsAdmin]
    
    def post(self, request, *args, **kwargs):
        enrollment_ids = request.data.get('enrollment_ids', [])
        
        if not enrollment_ids:
            return Response({'error': 'No enrollments specified'}, status=400)
        
        approved_count = 0
        errors = []
        
        with transaction.atomic():
            for eid in enrollment_ids:
                try:
                    se = SubjectEnrollment.objects.get(id=eid)
                    if not se.head_approved:
                        se.head_approved = True
                        se.head_approved_by = request.user
                        se.head_approved_at = timezone.now()
                        
                        if se.payment_approved:
                            se.status = 'ENROLLED'
                        
                        se.save()
                        approved_count += 1
                except SubjectEnrollment.DoesNotExist:
                    errors.append(f"Enrollment {eid} not found")
        
        return Response({
            'success': True,
            'approved_count': approved_count,
            'errors': errors,
            'message': f'Approved {approved_count} enrollment(s)'
        })
