"""
Registrar Grade Finalization logic.
EPIC 5: Grade Management
"""

from rest_framework import views, generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q

from apps.core.permissions import IsRegistrar
from .models import SubjectEnrollment, GradeHistory, Semester
from .serializers import SubjectEnrollmentSerializer

class SectionFinalizationListView(views.APIView):
    """
    GET: List sections ready for finalization (submitted but not finalized).
    Grouped by subject/section.
    """
    permission_classes = [IsAuthenticated, IsRegistrar]
    
    def get(self, request):
        semester = Semester.objects.filter(is_current=True).first()
        if not semester:
             return Response({"error": "No active semester"}, status=400)

        # Get sections that have grades submitted but not finalized
        # We aggregate by section/subject
        sections = SubjectEnrollment.objects.filter(
            enrollment__semester=semester,
            is_deleted=False
        ).values(
            'subject__id', 'subject__code', 'subject__title',
            'section__id', 'section__name'
        ).annotate(
            total_students=Count('id'),
            graded_count=Count('id', filter=Q(grade__isnull=False) | Q(status='INC')),
            finalized_count=Count('id', filter=Q(is_finalized=True)),
            passed_count=Count('id', filter=Q(status='PASSED')),
            failed_count=Count('id', filter=Q(status='FAILED')),
            inc_count=Count('id', filter=Q(status='INC'))
        ).order_by('subject__code', 'section__name')
        
        # Format for UI
        data = []
        for s in sections:
            # Determine status
            status_label = 'Pending'
            if s['finalized_count'] == s['total_students'] and s['total_students'] > 0:
                status_label = 'Finalized'
            elif s['graded_count'] == s['total_students'] and s['total_students'] > 0:
                status_label = 'Ready for Finalization'
            elif s['graded_count'] > 0:
                status_label = 'Partial Grades'
                
            data.append({
                'subject_id': str(s['subject__id']),
                'subject_code': s['subject__code'],
                'subject_title': s['subject__title'],
                'section_id': str(s['section__id']) if s['section__id'] else 'No Section',
                'section_name': s['section__name'] if s['section__name'] else 'Unassigned',
                'stats': {
                    'total': s['total_students'],
                    'graded': s['graded_count'],
                    'finalized': s['finalized_count'],
                    'passed': s['passed_count'],
                    'failed': s['failed_count'],
                    'inc': s['inc_count']
                },
                'status': status_label,
                'is_ready': s['graded_count'] == s['total_students'] and s['total_students'] > 0 and s['finalized_count'] < s['total_students']
            })
            
        return Response({'success': True, 'data': data})

class FinalizeSectionGradesView(views.APIView):
    """
    POST: Finalize all grades for a specific section/subject.
    locks the grades so professors can no longer edit them.
    Attributes 'finalized_at' and 'finalized_by'.
    """
    permission_classes = [IsAuthenticated, IsRegistrar]
    
    def post(self, request, section_id):
        semester = Semester.objects.filter(is_current=True).first()
        subject_id = request.data.get('subject_id')
        
        if not subject_id:
            return Response({"error": "Subject ID is required"}, status=400)
            
        # Get enrollments
        enrollments = SubjectEnrollment.objects.filter(
             enrollment__semester=semester,
             section_id=section_id,
             subject_id=subject_id,
             is_deleted=False,
             is_finalized=False # Only unfinalized
        )
        
        count = enrollments.count()
        if count == 0:
             return Response({"message": "No unfinalized enrollments found for this section"}, status=200)
             
        # Check if all have grades
        ungraded = enrollments.filter(grade__isnull=True, status__in=['ENROLLED', 'PENDING'])
        if ungraded.exists():
            return Response({
                "error": f"Cannot finalize. {ungraded.count()} students still have no grades.",
                "ungraded_students": list(ungraded.values_list('enrollment__student__last_name', flat=True))
            }, status=400)
            
        # Finalize
        updated = enrollments.update(
            is_finalized=True,
            finalized_by=request.user,
            finalized_at=timezone.now()
        )
        
        # Log action? (Implicit via finalized_by field, but could add audit log)
        
        return Response({
            "success": True,
            "message": f"Successfully finalized {updated} student grades.",
            "finalized_count": updated
        })

class OverrideGradeView(views.APIView):
    """
    POST: Registrar manual override of a grade (even if finalized).
    Requires a reason.
    """
    permission_classes = [IsAuthenticated, IsRegistrar]
    
    def post(self, request):
        enrollment_id = request.data.get('enrollment_id')
        new_grade = request.data.get('grade')
        reason = request.data.get('reason')
        
        if not all([enrollment_id, new_grade, reason]):
            return Response({"error": "Enrollment ID, grade, and reason are required"}, status=400)
            
        try:
            se = SubjectEnrollment.objects.get(id=enrollment_id)
        except SubjectEnrollment.DoesNotExist:
            return Response({"error": "Enrollment not found"}, status=404)
            
        # Track history
        old_grade = se.grade
        old_status = se.status
        
        from decimal import Decimal
        se.grade = Decimal(new_grade) if str(new_grade) not in ['INC', 'DRP'] else None
        
        # Update status logic (simplified duplication from SubmitGradeView)
        status_map = {
            'INC': 'INC', 'DRP': 'DROPPED', '5.00': 'FAILED'
        }
        if str(new_grade) in status_map:
            se.status = status_map[str(new_grade)]
        elif se.grade is not None:
             se.status = 'PASSED' if se.grade <= 3.0 else 'FAILED'
             
        # If overriding a finalized grade, keep it finalized but update timestamp?
        # Usually override implies a correction.
        if se.is_finalized:
            se.finalized_by = request.user
            se.finalized_at = timezone.now()
            
        se.save()
        
        # Create history entry
        GradeHistory.objects.create(
            subject_enrollment=se,
            previous_grade=old_grade,
            new_grade=se.grade,
            previous_status=old_status,
            new_status=se.status,
            changed_by=request.user,
            change_reason=reason,
            is_system_action=False,
            is_finalization=False
        )
        
        return Response({"success": True, "message": "Grade overridden successfully"})



class RegistrarSectionSubjectsView(views.APIView):
    """
    GET: List all subjects in a section with grade submission status.
    Drill-down Step 3: Section -> Subjects
    """
    permission_classes = [IsAuthenticated, IsRegistrar]

    def get(self, request, section_id):
        from apps.academics.models import SectionSubject
        
        # 1. Get all subjects assigned to this section
        section_subjects = SectionSubject.objects.filter(
            section_id=section_id,
            is_deleted=False
        ).select_related('subject', 'professor')
        
        data = []
        for ss in section_subjects:
            # 2. Key metrics for status
            enrollments = SubjectEnrollment.objects.filter(
                section_subject=ss,
                is_deleted=False,
                status__in=['ENROLLED', 'PENDING', 'PASSED', 'FAILED', 'INC', 'DROPPED'] # Exclude cancelled/withdrawn if any
            )
            
            total = enrollments.count()
            graded = enrollments.filter(Q(grade__isnull=False) | Q(status='INC') | Q(status='DROPPED')).count()
            finalized = enrollments.filter(is_finalized=True).count()
            
            # 3. Determine Status
            status_label = 'Pending'
            badge_color = 'warning'
            
            if total == 0:
                status_label = 'No Students'
                badge_color = 'secondary'
            elif finalized == total:
                status_label = 'Submitted'
                badge_color = 'success'
            elif graded > 0:
                status_label = 'Partial'
                badge_color = 'info'
                
            data.append({
                'id': str(ss.id), # SectionSubject ID
                'subject_code': ss.subject.code,
                'subject_title': ss.subject.title,
                'professor_name': ss.professor.get_full_name() if ss.professor else 'TBA',
                'stats': {
                    'enrolled': total,
                    'graded': graded,
                    'finalized': finalized
                },
                'status': status_label,
                'badge_color': badge_color
            })
            
        return Response(data)
