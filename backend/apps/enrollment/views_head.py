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


def can_manage_subject(user, se):
    """Helper to check if user has permission to manage this subject enrollment."""
    if user.role in ['ADMIN', 'REGISTRAR']:
        return True
    
    if user.role == 'DEPARTMENT_HEAD' and hasattr(user, 'department_head_profile'):
        programs = user.department_head_profile.programs.all()
        if not programs.exists():
            return False
            
        # 1. Check subject's primary program
        if programs.filter(id=se.subject.program_id).exists():
            return True
            
        # 2. Check section's program
        if se.section and programs.filter(id=se.section.program_id).exists():
            return True
            
        # 3. Check student's program
        profile = getattr(se.enrollment.student, 'student_profile', None)
        if profile and profile.program and programs.filter(id=profile.program_id).exists():
            return True
            
    return False


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
            status__in=['PENDING', 'PENDING_HEAD'],
            is_deleted=False
        ).select_related(
            'enrollment__student',
            'enrollment__semester',
            'subject',
            'section'
        ).order_by('-created_at')
        
        # If department head, filter to their programs
        if user.role == 'DEPARTMENT_HEAD' and hasattr(user, 'department_head_profile'):
            programs = user.department_head_profile.programs.all()
            if programs.exists():
                from django.db.models import Q
                pending_qs = pending_qs.filter(
                    Q(subject__program__in=programs) |
                    Q(section__program__in=programs) |
                    Q(enrollment__student__student_profile__program__in=programs)
                ).distinct()
            else:
                pending_qs = SubjectEnrollment.objects.none()
        
        pending_enrollments = []
        for se in pending_qs:
            student = se.enrollment.student
            profile = getattr(student, 'student_profile', None)
            
            pending_enrollments.append({
                'id': str(se.id),
                'student_id': str(student.id),
                'student_number': student.student_number,
                'student_name': student.get_full_name(),
                'program_code': profile.program.code if profile and profile.program else 'N/A',
                'year_level': profile.year_level if profile else 1,
                'is_month1_paid': se.enrollment.first_month_paid,
                'subject_code': se.subject.code,
                'subject_name': se.subject.title,  # Renamed to name for consistency
                'subject_units': se.subject.units,  # Renamed to units for consistency
                'section_name': se.section.name if se.section else 'N/A',
                'semester': se.enrollment.semester.name,
                'academic_year': se.enrollment.semester.academic_year,
                'enrollment_type': se.enrollment_type,
                'is_irregular': profile.is_irregular if profile else False,
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
        
        if not can_manage_subject(request.user, se):
            return Response({'error': 'You do not have permission to approve this subject'}, status=403)
            
        if se.head_approved:
            return Response({'error': 'Already approved'}, status=400)
        
        se.head_approved = True
        
        # Note: head_approved_by/at are not in current model, 
        # using them as ephemeral attributes if needed for other logic
        # but they won't persist unless fields are added.
        if hasattr(se, 'head_approved_by'):
            se.head_approved_by = request.user
        if hasattr(se, 'head_approved_at'):
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
        
        if not can_manage_subject(request.user, se):
            return Response({'error': 'You do not have permission to reject this subject'}, status=403)
            
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
                    if not can_manage_subject(request.user, se):
                        errors.append(f"Permission denied for enrollment {eid}")
                        continue

                    if not se.head_approved:
                        se.head_approved = True
                        
                        if hasattr(se, 'head_approved_by'):
                            se.head_approved_by = request.user
                        if hasattr(se, 'head_approved_at'):
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
