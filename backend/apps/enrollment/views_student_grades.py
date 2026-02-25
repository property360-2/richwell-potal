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
    GET: Get student's comprehensive curriculum grades.
    Lists all subjects in the student's program curriculum and highlights their status.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, *args, **kwargs):
        user = request.user
        
        if not hasattr(user, 'student_profile') or not user.student_profile:
            return Response({'error': 'Student profile not found'}, status=400)
            
        profile = user.student_profile
        program = profile.program
        curriculum = profile.curriculum
        
        if not program:
            return Response({'error': 'No program assigned'}, status=400)
            
        program_info = {
            'program_name': program.name,
            'program_code': program.code,
            'curriculum_name': curriculum.name if curriculum else 'Default Curriculum',
            'curriculum_code': curriculum.code if curriculum else ''
        }
        
        # 1. Fetch all subjects for this program
        from apps.academics.models import Subject
        all_subjects = Subject.objects.filter(programs=program).order_by('year_level', 'semester_number', 'code')
        
        # 2. Fetch student's enrollments to map against subjects
        enrollments_qs = SubjectEnrollment.objects.filter(
            enrollment__student=user,
            is_deleted=False
        ).select_related(
            'subject', 'section'
        ).prefetch_related('grade_resolutions').order_by('-created_at') # Order by latest
        
        # Map by subject id
        subject_enrollments_map = {}
        for se in enrollments_qs:
            sid = se.subject_id
            if sid not in subject_enrollments_map:
                subject_enrollments_map[sid] = []
            subject_enrollments_map[sid].append(se)
            
        # 3. Build Semesters structure based on Curriculum (Year Level + Semester Number)
        semesters_dict = {}
        
        # Helper lists for summary
        passed_count = 0
        failed_count = 0
        total_units_earned = 0
        total_grade_points = Decimal('0')
        all_graded_units = 0
        
        def get_best_enrollment(enrollments):
            # Priority: PASSED/CREDITED > ENROLLED > INC > FAILED > DROPPED
            if not enrollments: return None
            
            for se in enrollments:
                if se.status in ['PASSED', 'CREDITED']: return se
            for se in enrollments:
                if se.status == 'ENROLLED': return se
            for se in enrollments:
                if se.status == 'INC': return se
            for se in enrollments:
                if se.status == 'FAILED': return se
            
            return enrollments[0] # Fallback to latest

        for subj in all_subjects:
            year = subj.year_level
            sem_num = subj.semester_number
            sem_key = f"{year}_{sem_num}"
            
            if sem_key not in semesters_dict:
                # Format Year
                year_str = "1st Year"
                if year == 2: year_str = "2nd Year"
                elif year == 3: year_str = "3rd Year"
                elif year == 4: year_str = "4th Year"
                elif year == 5: year_str = "5th Year"
                else: year_str = f"{year}th Year"
                
                # Format Semester
                sem_str = "First Semester"
                if sem_num == 2: sem_str = "Second Semester"
                elif sem_num == 3: sem_str = "Summer"
                
                semesters_dict[sem_key] = {
                    'semester_id': sem_key,
                    'semester_name': f"{year_str}, {sem_str}",
                    'academic_year': '',
                    'total_units': 0,
                    'graded_units': 0,
                    'total_grade_points': Decimal('0'),
                    'gpa': None,
                    'subjects': []
                }
                
            sem_data = semesters_dict[sem_key]
            sem_data['total_units'] += subj.units
            
            # Find best enrollment for this subject
            enrollments = subject_enrollments_map.get(subj.id, [])
            best_se = get_best_enrollment(enrollments)
            
            if best_se:
                # Determine status
                status_display = getattr(best_se, 'get_status_display', lambda: best_se.status)()
                display_status = best_se.status
                
                if display_status == 'ENROLLED':
                    display_status = 'IN PROGRESS'
                
                grade_str = str(best_se.grade) if best_se.grade else ''
                
                if display_status == 'INC' and best_se.is_retake_eligible:
                    display_status = 'RETAKE'
                    status_display = 'Must Retake'
                    grade_str = ''
                    
                res_info = None
                pending_res = best_se.grade_resolutions.filter(
                    status__in=[GradeResolution.Status.PENDING_REGISTRAR, GradeResolution.Status.PENDING_HEAD]
                ).first()
                if pending_res:
                    status_display = "Resolution Pending approval"
                    res_info = {'status': pending_res.status}
                    
                grade_data = {
                    'subject_enrollment_id': str(best_se.id),
                    'subject_code': subj.code,
                    'subject_title': subj.title,
                    'units': subj.units,
                    'section_name': best_se.section.name if best_se.section else 'N/A',
                    'grade': grade_str,
                    'status': display_status,
                    'status_display': status_display,
                    'is_finalized': best_se.is_finalized,
                    'pending_resolution': res_info,
                    'retake_eligibility_date': best_se.retake_eligibility_date,
                    'is_retake_eligible': best_se.is_retake_eligible,
                }
                
                # Accumulate stats
                if best_se.status == 'PASSED':
                    passed_count += 1
                    total_units_earned += subj.units
                elif best_se.status == 'CREDITED':
                    total_units_earned += subj.units
                elif best_se.status == 'FAILED':
                    failed_count += 1
                    
                # Calculate GPA (only for numeric grades)
                if best_se.grade and best_se.status in ['PASSED', 'FAILED']:
                    try:
                        numeric_grade = Decimal(str(best_se.grade))
                        sem_data['graded_units'] += subj.units
                        sem_data['total_grade_points'] += numeric_grade * subj.units
                        
                        all_graded_units += subj.units
                        total_grade_points += numeric_grade * subj.units
                    except:
                        pass
                        
            else:
                # Subject not taken yet
                grade_data = {
                    'subject_enrollment_id': None,
                    'subject_code': subj.code,
                    'subject_title': subj.title,
                    'units': subj.units,
                    'section_name': '---',
                    'grade': '',
                    'status': '',
                    'status_display': 'Not Taken',
                    'is_finalized': False,
                    'pending_resolution': None,
                }
            
            sem_data['subjects'].append(grade_data)
        
        # Calculate Semester GPAs
        semesters_list = []
        for key in sorted(semesters_dict.keys()): # sorts by year_semester correctly (e.g., 1_1, 1_2, 2_1)
            data = semesters_dict[key]
            if data['graded_units'] > 0:
                data['gpa'] = round(float(data['total_grade_points']) / data['graded_units'], 2)
            del data['total_grade_points']
            semesters_list.append(data)
            
        # Calculate Cumulative GPA
        cumulative_gpa = None
        if all_graded_units > 0:
            cumulative_gpa = round(float(total_grade_points) / all_graded_units, 2)
            
        return Response({
            'success': True,
            'data': {
                'program_info': program_info,
                'semesters': semesters_list,
                'summary': {
                    'cumulative_gpa': cumulative_gpa,
                    'total_units_earned': total_units_earned,
                    'subjects_passed': passed_count,
                    'subjects_failed': failed_count
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
