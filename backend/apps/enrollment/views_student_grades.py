"""
Student-facing grade views.
EPIC 5: Grade Management - Student Views
"""

from decimal import Decimal
from django.db.models import Avg, Sum, Count, Q, F
from rest_framework import generics, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.core.permissions import IsStudent
from .models import SubjectEnrollment, Enrollment, Semester, GradeResolution


class MyGradesView(views.APIView):
    """
    GET: Get student's grades for current or specified semester.
    Organized by semester with GPA calculation.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, *args, **kwargs):
        user = request.user
        semester_id = request.query_params.get('semester')
        
        # Get enrollments with grades
        enrollments_qs = SubjectEnrollment.objects.filter(
            enrollment__student=user,
            is_deleted=False
        ).select_related(
            'enrollment__semester',
            'subject',
            'section'
        ).prefetch_related('grade_resolutions').order_by('-enrollment__semester__start_date', 'subject__code')
        
        # Filter by semester if specified
        if semester_id:
            enrollments_qs = enrollments_qs.filter(enrollment__semester_id=semester_id)
        
        # Group by semester
        semesters_data = {}
        for se in enrollments_qs:
            sem = se.enrollment.semester
            sem_key = str(sem.id)
            
            if sem_key not in semesters_data:
                semesters_data[sem_key] = {
                    'semester_id': str(sem.id),
                    'semester_name': sem.name,
                    'academic_year': sem.academic_year,
                    'subjects': [],
                    'total_units': 0,
                    'graded_units': 0,
                    'total_grade_points': Decimal('0'),
                    'gpa': None
                }
            
            # Check for pending resolutions
            pending_res = se.grade_resolutions.filter(
                status__in=[GradeResolution.Status.PENDING_REGISTRAR, GradeResolution.Status.PENDING_HEAD]
            ).first()
            
            status_display = se.get_status_display() if hasattr(se, 'get_status_display') else se.status
            res_info = None
            
            if pending_res:
                status_display = "Resolution Pending approval"
                res_info = {
                    'proposed_grade': str(pending_res.proposed_grade),
                    'proposed_status': pending_res.proposed_status,
                    'requested_by': pending_res.requested_by.get_full_name(),
                    'created_at': pending_res.created_at
                }

            grade_data = {
                'subject_enrollment_id': str(se.id),
                'subject_code': se.subject.code,
                'subject_title': se.subject.title,
                'units': se.subject.units,
                'section_name': se.section.name if se.section else 'N/A',
                'grade': str(se.grade) if se.grade else None,
                'status': se.status,
                'status_display': status_display,
                'is_finalized': se.is_finalized,
                'enrollment_type': se.enrollment_type,
                'pending_resolution': res_info,
                'retake_eligibility_date': se.retake_eligibility_date,
                'is_retake_eligible': se.is_retake_eligible
            }
            
            semesters_data[sem_key]['subjects'].append(grade_data)
            semesters_data[sem_key]['total_units'] += se.subject.units
            
            # Calculate GPA (only for numeric grades)
            if se.grade and se.status in ['PASSED', 'FAILED']:
                semesters_data[sem_key]['graded_units'] += se.subject.units
                semesters_data[sem_key]['total_grade_points'] += se.grade * se.subject.units
        
        # Calculate GPA for each semester
        for sem_key, data in semesters_data.items():
            if data['graded_units'] > 0:
                data['gpa'] = round(float(data['total_grade_points']) / data['graded_units'], 2)
            # Clean up calculation fields
            del data['total_grade_points']
        
        # Calculate cumulative GPA
        all_graded_units = sum(d['graded_units'] for d in semesters_data.values())
        all_passed = SubjectEnrollment.objects.filter(
            enrollment__student=user,
            status='PASSED',
            is_deleted=False
        ).count()
        all_failed = SubjectEnrollment.objects.filter(
            enrollment__student=user,
            status='FAILED',
            is_deleted=False
        ).count()
        
        # Get cumulative GPA
        cumulative_result = SubjectEnrollment.objects.filter(
            enrollment__student=user,
            status__in=['PASSED', 'FAILED'],
            grade__isnull=False,
            is_deleted=False
        ).annotate(
            weighted_grade=F('grade') * F('subject__units')
        ).aggregate(
            total_weighted=Sum('weighted_grade'),
            total_units=Sum('subject__units')
        )
        
        cumulative_gpa = None
        if cumulative_result['total_units'] and cumulative_result['total_units'] > 0:
            cumulative_gpa = round(
                float(cumulative_result['total_weighted']) / cumulative_result['total_units'],
                2
            )
        
        return Response({
            'success': True,
            'data': {
                'semesters': list(semesters_data.values()),
                'summary': {
                    'cumulative_gpa': cumulative_gpa,
                    'total_units_earned': all_graded_units,
                    'subjects_passed': all_passed,
                    'subjects_failed': all_failed
                }
            }
        })


class MyTranscriptView(views.APIView):
    """
    GET: Get student's unofficial transcript.
    All grades organized chronologically with cumulative statistics.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, *args, **kwargs):
        user = request.user
        
        # Get student profile
        if not hasattr(user, 'student_profile') or not user.student_profile:
            return Response({'error': 'Student profile not found'}, status=400)
        
        profile = user.student_profile
        program = profile.program
        
        # Get all graded subjects
        enrollments = SubjectEnrollment.objects.filter(
            enrollment__student=user,
            status__in=['PASSED', 'FAILED', 'INC', 'CREDITED'],
            is_deleted=False
        ).select_related(
            'enrollment__semester',
            'subject'
        ).order_by('enrollment__semester__start_date', 'subject__code')
        
        # Build transcript data
        semesters = {}
        total_units = 0
        earned_units = 0
        total_grade_points = Decimal('0')
        
        for se in enrollments:
            sem = se.enrollment.semester
            sem_key = f"{sem.academic_year}_{sem.name}"
            
            if sem_key not in semesters:
                semesters[sem_key] = {
                    'semester': sem.name,
                    'academic_year': sem.academic_year,
                    'subjects': []
                }
            
            semesters[sem_key]['subjects'].append({
                'code': se.subject.code,
                'title': se.subject.title,
                'units': se.subject.units,
                'grade': str(se.grade) if se.grade else se.status,
                'status': se.status,
                'remarks': 'Credited' if se.status == 'CREDITED' else ''
            })
            
            total_units += se.subject.units
            if se.status == 'PASSED' or se.status == 'CREDITED':
                earned_units += se.subject.units
            if se.grade and se.status in ['PASSED', 'FAILED']:
                total_grade_points += se.grade * se.subject.units
        
        # Calculate GWA
        gwa = None
        if earned_units > 0:
            gwa = round(float(total_grade_points) / earned_units, 2)
        
        return Response({
            'success': True,
            'data': {
                'student': {
                    'name': user.get_full_name(),
                    'student_number': user.student_number,
                    'program': program.name if program else 'N/A',
                    'program_code': program.code if program else 'N/A',
                    'year_level': profile.year_level,
                    'admission_year': profile.admission_year
                },
                'transcript': list(semesters.values()),
                'summary': {
                    'gwa': gwa,
                    'total_units': total_units,
                    'earned_units': earned_units,
                    'remaining_units': (profile.curriculum.total_units if profile.curriculum else 0) - earned_units
                },
                'generated_at': str(request._request.META.get('REQUEST_TIME', ''))
            }
        })


class INCReportView(views.APIView):
    """
    GET: Get INC report for registrar.
    Shows all INC grades with expiration info.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, *args, **kwargs):
        from datetime import timedelta
        from django.utils import timezone
        
        semester_id = request.query_params.get('semester')
        include_expired = request.query_params.get('include_expired', 'false').lower() == 'true'
        
        # Get all INC subject enrollments
        qs = SubjectEnrollment.objects.filter(
            status='INC',
            is_deleted=False
        ).select_related(
            'enrollment__student',
            'enrollment__semester',
            'subject',
            'section'
        )
        
        if semester_id:
            qs = qs.filter(enrollment__semester_id=semester_id)
        
        # Calculate expiration (typically 1 year from inc_marked_at)
        now = timezone.now()
        inc_data = []
        
        for se in qs:
            # Expiration date: 1 year from when INC was marked
            expiration_date = None
            is_expired = False
            days_until_expiration = None
            
            if se.inc_marked_at:
                expiration_date = se.inc_marked_at + timedelta(days=365)
                is_expired = now > expiration_date
                if not is_expired:
                    days_until_expiration = (expiration_date - now).days
            
            if not include_expired and is_expired:
                continue
            
            inc_data.append({
                'subject_enrollment_id': str(se.id),
                'student_id': str(se.enrollment.student.id),
                'student_number': se.enrollment.student.student_number,
                'student_name': se.enrollment.student.get_full_name(),
                'subject_code': se.subject.code,
                'subject_title': se.subject.title,
                'section_name': se.section.name if se.section else 'N/A',
                'semester': se.enrollment.semester.name,
                'academic_year': se.enrollment.semester.academic_year,
                'inc_marked_at': se.inc_marked_at.isoformat() if se.inc_marked_at else None,
                'expiration_date': expiration_date.isoformat() if expiration_date else None,
                'days_until_expiration': days_until_expiration,
                'is_expired': is_expired
            })
        
        # Sort by expiration (most urgent first)
        inc_data.sort(key=lambda x: x['days_until_expiration'] if x['days_until_expiration'] is not None else 9999)
        
        return Response({
            'success': True,
            'data': {
                'inc_records': inc_data,
                'total_count': len(inc_data),
                'expired_count': len([i for i in inc_data if i['is_expired']]),
                'expiring_soon_count': len([i for i in inc_data if i['days_until_expiration'] and i['days_until_expiration'] <= 30])
            }
        })


class ProcessExpiredINCsView(views.APIView):
    """
    POST: Process expired INC grades.
    Converts expired INC to grade of 5.0 (Failed).
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        from datetime import timedelta
        from django.utils import timezone
        from django.db import transaction
        from .models import GradeHistory
        
        dry_run = request.data.get('dry_run', True)
        
        now = timezone.now()
        one_year_ago = now - timedelta(days=365)
        
        # Find expired INCs
        expired_incs = SubjectEnrollment.objects.filter(
            status='INC',
            inc_marked_at__lt=one_year_ago,
            is_deleted=False
        ).select_related('enrollment__student', 'subject')
        
        processed = []
        
        if not dry_run:
            with transaction.atomic():
                for se in expired_incs:
                    old_grade = se.grade
                    old_status = se.status
                    
                    # Convert to 5.0 Failed
                    se.grade = Decimal('5.00')
                    se.status = 'FAILED'
                    se.failed_at = now
                    se.save()
                    
                    # Create history
                    GradeHistory.objects.create(
                        subject_enrollment=se,
                        previous_grade=old_grade,
                        new_grade=se.grade,
                        previous_status=old_status,
                        new_status='FAILED',
                        changed_by=request.user,
                        change_reason='Automatic: INC expired after 1 year',
                        is_system_action=True
                    )
                    
                    processed.append({
                        'subject_enrollment_id': str(se.id),
                        'student_number': se.enrollment.student.student_number,
                        'subject_code': se.subject.code
                    })
        else:
            # Dry run - just list what would be processed
            for se in expired_incs:
                processed.append({
                    'subject_enrollment_id': str(se.id),
                    'student_number': se.enrollment.student.student_number,
                    'student_name': se.enrollment.student.get_full_name(),
                    'subject_code': se.subject.code,
                    'inc_marked_at': se.inc_marked_at.isoformat() if se.inc_marked_at else None
                })
        
        return Response({
            'success': True,
            'dry_run': dry_run,
            'processed_count': len(processed),
            'processed': processed,
            'message': f"{'Would process' if dry_run else 'Processed'} {len(processed)} expired INC(s)"
        })
