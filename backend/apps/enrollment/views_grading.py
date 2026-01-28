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
from rest_framework import generics, views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.core.permissions import IsProfessor, IsProfessorOrRegistrar
from apps.academics.models import SectionSubject, SectionSubjectProfessor
from .models import SubjectEnrollment, GradeHistory, Enrollment, Semester
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
    permission_classes = [IsAuthenticated, IsProfessor]
    
    def get_queryset(self):
        user = self.request.user
        
        # Get query params
        semester_id = self.request.query_params.get('semester')
        section_subject_id = self.request.query_params.get('section_subject')
        section_id = self.request.query_params.get('section')
        subject_id = self.request.query_params.get('subject')
        
        # Determine semester
        if semester_id:
            semester = Semester.objects.filter(id=semester_id).first()
        else:
            semester = Semester.objects.filter(is_current=True).first()
        
        if not semester:
            return SubjectEnrollment.objects.none()
        
        # Get section-subjects where this professor is assigned
        # Check both SectionSubject.professor and SectionSubjectProfessor table
        professor_section_subjects = SectionSubject.objects.filter(
            Q(professor=user) | Q(professor_assignments__professor=user),
            section__semester=semester,
            is_deleted=False
        ).distinct()
        
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
        queryset = SubjectEnrollment.objects.filter(
            enrollment__semester=semester,
            section__in=professor_section_subjects.values_list('section', flat=True),
            subject__in=professor_section_subjects.values_list('subject', flat=True),
            status__in=['ENROLLED', 'PASSED', 'FAILED', 'INC', 'FOR_RESOLUTION'],
            is_deleted=False
        ).select_related(
            'enrollment__student',
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
        serializer = self.get_serializer(queryset, many=True)
        
        # Group by section-subject for better UI organization
        data = {
            'students': serializer.data,
            'total_count': queryset.count(),
            'graded_count': queryset.exclude(grade__isnull=True).count(),
            'pending_count': queryset.filter(grade__isnull=True, status='ENROLLED').count()
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
                'is_grading_open': semester.is_grading_open
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
        
        # Check if grade is finalized (only registrar can modify)
        if subject_enrollment.is_finalized and request.user.role != 'REGISTRAR':
            return Response(
                {'error': 'This grade has been finalized and cannot be modified'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check semester grading status
        semester = subject_enrollment.enrollment.semester
        if not semester.is_grading_open and request.user.role == 'PROFESSOR':
            return Response(
                {'error': 'Grading is not currently open for this semester'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Submit the grade
        result = self._submit_grade(
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
    
    def _submit_grade(self, subject_enrollment, grade, new_status, remarks, user):
        """
        Submit grade and create history entry.
        """
        with transaction.atomic():
            # Store previous values for history
            previous_grade = subject_enrollment.grade
            previous_status = subject_enrollment.status
            
            # Update grade and status
            subject_enrollment.grade = grade
            if new_status:
                subject_enrollment.status = new_status
            
            # Set failed_at timestamp if status is FAILED
            if new_status == 'FAILED' and previous_status != 'FAILED':
                subject_enrollment.failed_at = timezone.now()
            
            # Set inc_marked_at timestamp if status is INC
            if new_status == 'INC' and previous_status != 'INC':
                subject_enrollment.inc_marked_at = timezone.now()
            
            subject_enrollment.save()
            
            # Create grade history entry
            history = GradeHistory.objects.create(
                subject_enrollment=subject_enrollment,
                previous_grade=previous_grade,
                new_grade=grade,
                previous_status=previous_status,
                new_status=new_status or subject_enrollment.status,
                changed_by=user,
                change_reason=remarks,
                is_system_action=False,
                is_finalization=False
            )
            
            return {
                'success': True,
                'subject_enrollment_id': str(subject_enrollment.id),
                'grade': str(grade) if grade else None,
                'status': subject_enrollment.status,
                'grade_history_id': str(history.id),
                'message': 'Grade submitted successfully'
            }


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
                    
                    # Skip finalized grades
                    if subject_enrollment.is_finalized and request.user.role != 'REGISTRAR':
                        errors.append({
                            'subject_enrollment_id': str(grade_data['subject_enrollment_id']),
                            'error': 'Grade is finalized'
                        })
                        continue
                    
                    # Submit grade
                    result = self._submit_grade(
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
    
    def _submit_grade(self, subject_enrollment, grade, new_status, remarks, user):
        """Submit grade and create history entry."""
        previous_grade = subject_enrollment.grade
        previous_status = subject_enrollment.status
        
        subject_enrollment.grade = grade
        if new_status:
            subject_enrollment.status = new_status
        
        if new_status == 'FAILED' and previous_status != 'FAILED':
            subject_enrollment.failed_at = timezone.now()
        
        if new_status == 'INC' and previous_status != 'INC':
            subject_enrollment.inc_marked_at = timezone.now()
        
        subject_enrollment.save()
        
        history = GradeHistory.objects.create(
            subject_enrollment=subject_enrollment,
            previous_grade=previous_grade,
            new_grade=grade,
            previous_status=previous_status,
            new_status=new_status or subject_enrollment.status,
            changed_by=user,
            change_reason=remarks,
            is_system_action=False,
            is_finalization=False
        )
        
        return {
            'success': True,
            'subject_enrollment_id': str(subject_enrollment.id),
            'grade': str(grade) if grade else None,
            'status': subject_enrollment.status,
            'grade_history_id': str(history.id)
        }


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
