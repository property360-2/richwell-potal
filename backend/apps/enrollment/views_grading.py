"""
Grading views for professor grade management.
EPIC 5: Grade Management

Professors can:
- View students in their assigned sections
- Submit/update grades for students
- View grade history
"""

from django.db import transaction
from django.utils import timezone
from django.db.models import Q
from rest_framework import generics, views, status, filters
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.core.permissions import IsProfessor, IsProfessorOrRegistrar
from apps.academics.models import SectionSubject, SectionSubjectProfessor
from .models import SubjectEnrollment, GradeHistory, Enrollment, Semester, GradeResolution
from .serializers_grading import (
    GradeableStudentSerializer,
    GradeSubmissionSerializer,
    BulkGradeSubmissionSerializer,
    GradeHistorySerializer,
    GradeSubmissionResponseSerializer
)


class ProfessorGradeableStudentsView(generics.ListAPIView):
    """
    GET: List all students the professor can grade.
    
    Query params:
    - semester: UUID of semester (defaults to current)
    - section_subject: UUID of specific section-subject
    - section: UUID of section (returns all subjects in section)
    - subject: UUID of subject (returns across all sections)
    """
    serializer_class = GradeableStudentSerializer
    permission_classes = [IsAuthenticated, IsProfessorOrRegistrar]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        'enrollment__student__first_name', 
        'enrollment__student__last_name', 
        'enrollment__student__student_number'
    ]
    ordering_fields = ['grade', 'status', 'enrollment__student__last_name', 'enrollment__student__first_name', 'created_at']
    ordering = ['enrollment__student__last_name', 'enrollment__student__first_name']
    
    def get_queryset(self):
        user = self.request.user
        
        # Get query params
        semester_id = self.request.query_params.get('semester')
        section_subject_id = self.request.query_params.get('section_subject')
        section_id = self.request.query_params.get('section')
        subject_id = self.request.query_params.get('subject')
        
        # Determine semester
        is_archive_search = semester_id in ['all', 'archives', 'archive']
        
        if is_archive_search:
            # For archive search, we look at everything handled by this professor
            # but usually excluded by the specific semester filter.
            # We will filter by professor assignment directly on the SubjectEnrollment later.
            semester = None
        elif semester_id:
            semester = Semester.objects.filter(id=semester_id).first()
        else:
            semester = Semester.objects.filter(is_current=True).first()
        
        if not semester and not is_archive_search:
            return SubjectEnrollment.objects.none()
        
        # Base filter for subjects handled by this professor
        # IF USER IS REGISTRAR, DO NOT FILTER BY PROFESSOR
        if user.role in ['REGISTRAR', 'HEAD_REGISTRAR', 'ADMIN']:
             professor_section_subjects = SectionSubject.objects.filter(is_deleted=False)
        else:
            assignment_q = Q(professor=user) | Q(professor_assignments__professor=user)
            professor_section_subjects = SectionSubject.objects.filter(
                assignment_q,
                is_deleted=False
            )

        if semester:
            professor_section_subjects = professor_section_subjects.filter(section__semester=semester)
        elif is_archive_search:
            # Exclude current semester for archive search if it exists
            current = Semester.objects.filter(is_current=True).first()
            if current:
                professor_section_subjects = professor_section_subjects.exclude(section__semester=current)

        professor_section_subjects = professor_section_subjects.distinct()
        
        # Filter by specific section-subject if provided
        if section_subject_id:
            professor_section_subjects = professor_section_subjects.filter(id=section_subject_id)
        
        # Filter by section if provided
        if section_id:
            professor_section_subjects = professor_section_subjects.filter(section_id=section_id)
        
        # Filter by subject if provided
        if subject_id:
            professor_section_subjects = professor_section_subjects.filter(subject_id=subject_id)
        
        # Get subject enrollments for these section-subjects
        filter_kwargs = {
            'section__in': professor_section_subjects.values_list('section', flat=True),
            'subject__in': professor_section_subjects.values_list('subject', flat=True),
            'status__in': ['ENROLLED', 'PASSED', 'FAILED', 'INC', 'FOR_RESOLUTION'],
            'is_deleted': False
        }
        
        if semester:
            filter_kwargs['enrollment__semester'] = semester
        elif is_archive_search:
            # Ensure we are only looking at what's in the professor's historical list
            # The section__in/subject__in already handles that via professor_section_subjects
            pass

        queryset = SubjectEnrollment.objects.filter(**filter_kwargs).select_related(
            'enrollment__student',
            'enrollment__semester',
            'subject',
            'section'
        ).order_by(
            'section__name',
            'enrollment__student__last_name',
            'enrollment__student__first_name'
        )
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        queryset = self.filter_queryset(queryset)
        
        # Apply status filter if provided
        target_status = request.query_params.get('status')
        if target_status:
            queryset = queryset.filter(status=target_status)
            
        serializer = self.get_serializer(queryset, many=True)
        
        # Enrich INC records with expiration info
        enriched_data = serializer.data
        if target_status == 'INC' or not target_status:
            from datetime import timedelta
            now = timezone.now()
            for record in enriched_data:
                if record['current_status'] == 'INC':
                    # Find the actual model instance to get inc_marked_at
                    # (Note: For performance in a real app, this should be in the serializer)
                    se = SubjectEnrollment.objects.prefetch_related('grade_resolutions').get(id=record['subject_enrollment_id'])
                    
                    # Check for pending resolutions
                    pending_res = se.grade_resolutions.filter(
                        status__in=[GradeResolution.Status.PENDING_REGISTRAR, GradeResolution.Status.PENDING_HEAD]
                    ).first()
                    
                    if pending_res:
                        record['pending_resolution'] = {
                            'id': str(pending_res.id),
                            'proposed_grade': str(pending_res.proposed_grade) if pending_res.proposed_status not in ['INC', 'DROPPED'] else pending_res.proposed_status,
                            'proposed_status': pending_res.proposed_status,
                            'status': pending_res.status,
                            'remarks': pending_res.reason,
                            'reviewed_by_head_name': pending_res.reviewed_by_head.get_full_name() if pending_res.reviewed_by_head else None,
                            'head_action_at': pending_res.head_action_at,
                            'reviewed_by_registrar_name': pending_res.reviewed_by_registrar.get_full_name() if pending_res.reviewed_by_registrar else None,
                            'registrar_action_at': pending_res.registrar_action_at
                        }

                    if se.inc_marked_at:
                        expiration_date = se.inc_marked_at + timedelta(days=365)
                        record['days_remaining'] = (expiration_date - now).days
                        record['is_expired'] = now > expiration_date
                    else:
                        record['days_remaining'] = None
                        record['is_expired'] = False
                else:
                    # Even if not INC, check for resolutions (e.g. for archived semesters)
                    se = SubjectEnrollment.objects.prefetch_related('grade_resolutions').get(id=record['subject_enrollment_id'])
                    pending_res = se.grade_resolutions.filter(
                        status__in=[GradeResolution.Status.PENDING_REGISTRAR, GradeResolution.Status.PENDING_HEAD]
                    ).first()
                    
                    if pending_res:
                        record['pending_resolution'] = {
                            'id': str(pending_res.id),
                            'proposed_grade': str(pending_res.proposed_grade) if pending_res.proposed_status not in ['INC', 'DROPPED'] else pending_res.proposed_status,
                            'proposed_status': pending_res.proposed_status,
                            'status': pending_res.status,
                            'remarks': pending_res.reason,
                            'reviewed_by_head_name': pending_res.reviewed_by_head.get_full_name() if pending_res.reviewed_by_head else None,
                            'head_action_at': pending_res.head_action_at,
                            'reviewed_by_registrar_name': pending_res.reviewed_by_registrar.get_full_name() if pending_res.reviewed_by_registrar else None,
                            'registrar_action_at': pending_res.registrar_action_at
                        }

        # Group by section-subject for better UI organization
        data = {
            'students': enriched_data,
            'total_count': queryset.count(),
            'graded_count': queryset.exclude(grade__isnull=True).count(),
            'pending_count': queryset.filter(grade__isnull=True, status='ENROLLED').count(),
            'expiring_inc_count': len([s for s in enriched_data if s.get('days_remaining') is not None and s['days_remaining'] <= 30])
        }
        
        return Response(data)


class ProfessorAssignedSectionsView(generics.ListAPIView):
    """
    GET: List sections/subjects assigned to the professor for grading.
    Used to populate filter dropdowns in the UI.
    """
    permission_classes = [IsAuthenticated, IsProfessor]
    
    def get(self, request, *args, **kwargs):
        user = request.user
        semester_id = request.query_params.get('semester')
        
        # Determine semester
        if semester_id:
            semester = Semester.objects.filter(id=semester_id).first()
        else:
            semester = Semester.objects.filter(is_current=True).first()
        
        if not semester:
            return Response({'sections': [], 'semester': None})
        
        # Get section-subjects where this professor is assigned
        section_subjects = SectionSubject.objects.filter(
            Q(professor=user) | Q(professor_assignments__professor=user),
            section__semester=semester,
            is_deleted=False
        ).select_related(
            'section',
            'subject'
        ).distinct()
        
        # Build response
        sections_data = []
        for ss in section_subjects:
            sections_data.append({
                'section_subject_id': str(ss.id),
                'section_id': str(ss.section.id),
                'section_name': ss.section.name,
                'subject_id': str(ss.subject.id),
                'subject_code': ss.subject.code,
                'subject_title': ss.subject.title,
                'year_level': ss.section.year_level,
                'is_tba': ss.is_tba
            })
        
        return Response({
            'sections': sections_data,
            'semester': {
                'id': str(semester.id),
                'name': semester.name,
                'academic_year': semester.academic_year,
                'is_grading_open': semester.is_grading_open,
                'grading_start_date': semester.grading_start_date,
                'grading_end_date': semester.grading_end_date
            }
        })


class ProfessorSubmitGradeView(views.APIView):
    """
    POST: Submit a grade for a single student.
    """
    permission_classes = [IsAuthenticated, IsProfessorOrRegistrar]
    
    def post(self, request, *args, **kwargs):
        serializer = GradeSubmissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        subject_enrollment_id = data['subject_enrollment_id']
        
        try:
            subject_enrollment = SubjectEnrollment.objects.select_related(
                'enrollment__semester',
                'section',
                'subject'
            ).get(id=subject_enrollment_id, is_deleted=False)
        except SubjectEnrollment.DoesNotExist:
            return Response(
                {'error': 'Subject enrollment not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Validate professor has access (skip for registrar)
        if request.user.role == 'PROFESSOR':
            if not self._professor_has_access(request.user, subject_enrollment):
                return Response(
                    {'error': 'You are not assigned to this section-subject'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Check semester grading status
        semester = subject_enrollment.enrollment.semester
        is_resolution = subject_enrollment.status in ['INC', 'FOR_RESOLUTION'] and subject_enrollment.is_resolution_allowed
        
        # Check if grade is finalized (only registrar can modify, UNLESS it is a valid resolution)
        if subject_enrollment.is_finalized and request.user.role != 'REGISTRAR' and not is_resolution:
            return Response(
                {'error': 'This grade has been finalized and cannot be modified'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not semester.is_grading_open and not is_resolution and request.user.role == 'PROFESSOR':
            return Response(
                {'error': 'Grading is not currently open for this semester'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Additional check for resolution: cannot resolve if retake exists
        if is_resolution and subject_enrollment.retakes.exists():
            return Response(
                {'error': 'Cannot resolve grade because a retake enrollment exists'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Submit the grade
        from .services_grading import GradingService
        result = GradingService.submit_grade(
            subject_enrollment=subject_enrollment,
            grade=data.get('grade'),
            new_status=data.get('status'),
            remarks=data.get('remarks', ''),
            user=request.user
        )
        
        return Response(result, status=status.HTTP_200_OK)
    
    def _professor_has_access(self, professor, subject_enrollment):
        """Check if professor is assigned to this section-subject."""
        section = subject_enrollment.section
        subject = subject_enrollment.subject
        
        if not section:
            return False
        
        # Check SectionSubject assignment
        has_access = SectionSubject.objects.filter(
            Q(professor=professor) | Q(professor_assignments__professor=professor),
            section=section,
            subject=subject,
            is_deleted=False
        ).exists()
        
        return has_access


class BulkGradeSubmissionView(views.APIView):
    """
    POST: Submit multiple grades at once.
    """
    permission_classes = [IsAuthenticated, IsProfessorOrRegistrar]
    
    def post(self, request, *args, **kwargs):
        serializer = BulkGradeSubmissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        grades_data = serializer.validated_data['grades']
        results = []
        errors = []
        
        with transaction.atomic():
            for grade_data in grades_data:
                try:
                    subject_enrollment = SubjectEnrollment.objects.select_related(
                        'enrollment__semester',
                        'section',
                        'subject'
                    ).get(
                        id=grade_data['subject_enrollment_id'],
                        is_deleted=False
                    )
                    
                    # Validate professor has access
                    if request.user.role == 'PROFESSOR':
                        if not self._professor_has_access(request.user, subject_enrollment):
                            errors.append({
                                'subject_enrollment_id': str(grade_data['subject_enrollment_id']),
                                'error': 'Not authorized to grade this student'
                            })
                            continue
                    
                    # Check grading window vs resolution window
                    semester = subject_enrollment.enrollment.semester
                    is_resolution = subject_enrollment.status in ['INC', 'FOR_RESOLUTION'] and subject_enrollment.is_resolution_allowed
                    
                    # Skip finalized grades (unless resolution)
                    if subject_enrollment.is_finalized and request.user.role != 'REGISTRAR' and not is_resolution:
                        errors.append({
                            'subject_enrollment_id': str(grade_data['subject_enrollment_id']),
                            'error': 'Grade is finalized'
                        })
                        continue
                    
                    if not semester.is_grading_open and not is_resolution and request.user.role == 'PROFESSOR':
                        errors.append({
                            'subject_enrollment_id': str(grade_data['subject_enrollment_id']),
                            'error': 'Grading is not open for this semester'
                        })
                        continue
                        
                    if is_resolution and subject_enrollment.retakes.exists():
                        errors.append({
                            'subject_enrollment_id': str(grade_data['subject_enrollment_id']),
                            'error': 'Cannot resolve because retake exists'
                        })
                        continue
                    
                    # Submit grade
                    from .services_grading import GradingService
                    result = GradingService.submit_grade(
                        subject_enrollment=subject_enrollment,
                        grade=grade_data.get('grade'),
                        new_status=grade_data.get('status'),
                        remarks=grade_data.get('remarks', ''),
                        user=request.user
                    )
                    results.append(result)
                    
                except SubjectEnrollment.DoesNotExist:
                    errors.append({
                        'subject_enrollment_id': str(grade_data['subject_enrollment_id']),
                        'error': 'Subject enrollment not found'
                    })
                    continue
        
        return Response({
            'success': len(errors) == 0,
            'submitted_count': len(results),
            'error_count': len(errors),
            'results': results,
            'errors': errors
        })
    
    def _professor_has_access(self, professor, subject_enrollment):
        """Check if professor is assigned to this section-subject."""
        section = subject_enrollment.section
        subject = subject_enrollment.subject
        
        if not section:
            return False
        
        return SectionSubject.objects.filter(
            Q(professor=professor) | Q(professor_assignments__professor=professor),
            section=section,
            subject=subject,
            is_deleted=False
        ).exists()


class GradeHistoryView(generics.ListAPIView):
    """
    GET: View grade history for a subject enrollment.
    """
    serializer_class = GradeHistorySerializer
    permission_classes = [IsAuthenticated, IsProfessorOrRegistrar]
    
    def get_queryset(self):
        subject_enrollment_id = self.kwargs.get('pk')
        return GradeHistory.objects.filter(
            subject_enrollment_id=subject_enrollment_id
        ).select_related(
            'subject_enrollment__enrollment__student',
            'subject_enrollment__subject',
            'changed_by'
        ).order_by('-created_at')
