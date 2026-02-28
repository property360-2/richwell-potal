"""
Subject enrollment views — student enrollment and enlistment endpoints.
Handles recommended subjects, available subjects, schedule, bulk enrollment, and overrides.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Enrollment, Semester


class EnrollmentDetailView(APIView):
    """
    Get details of the current user's enrollment.
    Used by student dashboard to check status.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        active_semester = Semester.objects.filter(is_current=True).first()
        enrollment = None
        
        if active_semester:
            enrollment = Enrollment.objects.filter(
                student=request.user,
                semester=active_semester
            ).first()
            
        if not enrollment:
            enrollment = Enrollment.objects.filter(
                student=request.user
            ).select_related('semester').order_by('-created_at').first()
        
        if not enrollment:
            return Response({"success": True, "data": None})
            
        return Response({
            "success": True,
            "data": {
                "id": str(enrollment.id),
                "status": enrollment.status,
                "semester": {
                    "id": str(enrollment.semester.id) if enrollment.semester else None,
                    "term": enrollment.semester.name if enrollment.semester else None,
                    "year": enrollment.semester.academic_year if enrollment.semester else None,
                    "enrollment_start": enrollment.semester.enrollment_start_date,
                    "enrollment_end": enrollment.semester.enrollment_end_date
                } if enrollment.semester else None,
                "created_at": enrollment.created_at,
                "monthly_commitment": enrollment.monthly_commitment,
                "student_profile": {
                    "student_number": request.user.student_number,
                    "section_name": request.user.student_profile.home_section.name if request.user.student_profile.home_section else "N/A",
                    "program_code": request.user.student_profile.program.code if request.user.student_profile.program else "N/A",
                    "program_name": request.user.student_profile.program.name if request.user.student_profile.program else "N/A",
                }
            }
        })


class RecommendedSubjectsView(APIView):
    """
    Get recommended subjects for the student based on their curriculum and passed subjects.
    Also handles "No Curriculum" error state.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        from apps.enrollment.models import SubjectEnrollment
        from apps.academics.models import Curriculum, CurriculumSubject
        from django.db.models import Q, Sum

        user = request.user
        
        # 1. Get active semester
        active_semester = Semester.objects.filter(is_current=True).first()
        if not active_semester:
            return Response({"error": "No active semester found"}, status=400)

        # 2. Get student profile & program
        if not hasattr(user, 'student_profile') or not user.student_profile:
            return Response({"error": "Student profile not found"}, status=400)
            
        profile = user.student_profile
        program = profile.program
        
        if not program:
            return Response({"error": "No program assigned"}, status=400)

        # 3. Get Student's Assigned Curriculum
        # PRIORITY: profile.curriculum > Latest Active Curriculum (Fallback)
        curriculum = profile.curriculum
        
        if not curriculum:
             curriculum = Curriculum.objects.filter(
                program=program, 
                is_active=True
            ).order_by('-effective_year').first()
        
        if not curriculum:
             return Response({
                "success": False, 
                "error": "No curriculum found for your program. Please contact the Registrar.",
                "recommended_subjects": [],
                "current_units": 0,
                "max_units": 0
            })

        # 4. Get Passed Subjects (to filter out)
        passed_subject_ids = SubjectEnrollment.objects.filter(
            enrollment__student=user,
            status__in=['PASSED', 'CREDITED']
        ).values_list('subject_id', flat=True)

        # 5. Get Subjects for Recommendation
        query_params = getattr(request, 'query_params', getattr(request, 'GET', {}))
        target_year = query_params.get('year_level')
        target_sem = query_params.get('semester_number')
        
        query = Q(curriculum=curriculum)
        
        if target_sem:
            query &= Q(semester_number=target_sem)
            
        if target_year:
            query &= Q(year_level=target_year)

        curriculum_subjects = CurriculumSubject.objects.filter(query).select_related('subject')

        recommended = []
        
        for cs in curriculum_subjects:
            subject = cs.subject
            
            if subject.id in passed_subject_ids:
                continue

            # Check prerequisites
            prereqs = subject.prerequisites.all()
            missing_prereqs = []
            for p in prereqs:
                if p.id not in passed_subject_ids:
                    missing_prereqs.append(p.code)
            
            can_enroll = len(missing_prereqs) == 0
            
            # Find available sections for this subject in the active semester
            from apps.academics.models import SectionSubject
            section_subjects = SectionSubject.objects.filter(
                subject=subject,
                section__semester=active_semester,
                is_deleted=False
            ).select_related('section', 'professor').prefetch_related('schedule_slots')

            # Apply Enrollment Rules (Regular vs Irregular vs Overload)
            home_section = profile.home_section
            is_irregular = profile.is_irregular
            is_overloaded = profile.overload_approved
            
            # Check if this is a retake subject
            is_retake = False
            last_enrollment = None
            retake_blocked_reason = None
            
            if subject.id in passed_subject_ids:
                pass
            else:
                 last_enrollment = SubjectEnrollment.objects.filter(
                    enrollment__student=user,
                    subject=subject,
                    status__in=['FAILED', 'DROPPED', 'RETAKE', 'INC'] 
                 ).order_by('-created_at').first()
                 
                 if last_enrollment:
                     is_retake = True
                     if not last_enrollment.is_retake_eligible:
                         can_enroll = False
                         date_str = last_enrollment.retake_eligibility_date.strftime('%b %d, %Y') if last_enrollment.retake_eligibility_date else 'Unknown'
                         
                         if last_enrollment.status == 'INC':
                             is_retake = False
                             retake_blocked_reason = f"Please resolve your INC grade first."
                         else:
                             retake_blocked_reason = f"Retake blocked until {date_str}"

            # Define Freshman Status once
            is_freshman_first_sem = (profile.year_level == 1) and ("1st" in active_semester.name or "First" in active_semester.name)

            valid_sections = []
            for ss in section_subjects:
                allowed = False
                is_same_program = (ss.section.program_id == program.id)
                
                if is_overloaded:
                     allowed = True
                elif is_irregular:
                    allowed = True
                elif is_retake:
                    allowed = True
                elif is_freshman_first_sem:
                    if home_section:
                        if ss.section == home_section or ss.section.name == home_section.name:
                            allowed = True
                    else:
                        if is_same_program:
                            allowed = True
                else:
                    if is_same_program:
                        allowed = True

                if allowed and not is_same_program:
                    if not (is_irregular or is_overloaded):
                        allowed = False

                if allowed:
                    valid_sections.append(ss)

            sections = []
            for ss in valid_sections:
                sections.append({
                    'id': str(ss.section.id),
                    'name': ss.section.name,
                    'slots': ss.section.available_slots,
                    'enrolled': ss.section.enrolled_count,
                    'professor': ss.professor.get_full_name() if ss.professor else 'TBA',
                    'schedule': [
                        {
                            'day': slot.day,
                            'start_time': slot.start_time.strftime("%I:%M %p"),
                            'end_time': slot.end_time.strftime("%I:%M %p"),
                            'room': slot.room or 'TBA'
                        } for slot in ss.schedule_slots.filter(is_deleted=False)
                    ]
                })

            if not can_enroll and not retake_blocked_reason and missing_prereqs:
                retake_blocked_reason = f"Missing prerequisites: {', '.join(missing_prereqs)}"

            recommended.append({
                'id': str(subject.id),
                'code': subject.code,
                'title': subject.title,
                'units': subject.units,
                'year_level': cs.year_level,
                'semester_number': cs.semester_number,
                'program_code': subject.program.code if subject.program else 'Global',
                'is_global': subject.is_global,
                'can_enroll': can_enroll,
                'is_retake': is_retake,
                'enrollment_blocked_reason': retake_blocked_reason,
                'missing_prerequisites': missing_prereqs,
                'prerequisites': [{'code': p.code, 'title': p.title} for p in prereqs],
                'available_sections': sections
            })


        # Calculate currently enrolled units
        current_units = SubjectEnrollment.objects.filter(
            enrollment__student=user,
            enrollment__semester=active_semester,
            status__in=['ENROLLED', 'PENDING'],
            is_deleted=False
        ).aggregate(total=Sum('subject__units'))['total'] or 0

        return Response({
            "success": True,
            "data": {
                "recommended_subjects": recommended,
                "current_units": current_units,
                "max_units": 30,
                "student_profile": {
                    "student_number": user.student_number,
                    "section_name": profile.home_section.name if profile.home_section else "N/A",
                    "program_code": profile.program.code if profile.program else "N/A",
                    "program_name": profile.program.name if profile.program else "N/A",
                }
            }
        })


class AvailableSubjectsView(APIView):
    """
    Get all subjects that are available for enrollment (have sections in active semester).
    This is broader than RecommendedSubjectsView as it ignores the student's specific curriculum year level.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        from apps.enrollment.models import SubjectEnrollment
        from apps.academics.models import Section, Subject
        from django.db.models import Q

        user = request.user
        
        active_semester = Semester.objects.filter(is_current=True).first()
        if not active_semester:
            return Response({"error": "No active semester found"}, status=400)
            
        profile = user.student_profile
        
        offered_subjects = Subject.objects.filter(
            Q(program=profile.program) | Q(is_global=True),
            section_subjects__section__semester=active_semester,
            section_subjects__section__is_deleted=False,
            section_subjects__is_deleted=False,
            is_deleted=False
        ).distinct().select_related('program').prefetch_related('prerequisites')

        passed_subjects = set(SubjectEnrollment.objects.filter(
            enrollment__student=user,
            status__in=['PASSED', 'CREDITED']
        ).values_list('subject_id', flat=True))

        current_subjects = set(SubjectEnrollment.objects.filter(
            enrollment__student=user,
            enrollment__semester=active_semester,
            status__in=['ENROLLED', 'PENDING']
        ).values_list('subject_id', flat=True))

        search = request.query_params.get('search', '').lower()

        data = []
        for subject in offered_subjects:
            if search and (search not in subject.code.lower() and search not in subject.title.lower()):
                continue

            prereqs_met = True
            missing_prereqs = []
            for p in subject.prerequisites.all():
                if p.id not in passed_subjects:
                    prereqs_met = False
                    missing_prereqs.append(p.code)

            from apps.academics.models import SectionSubject
            section_subjects = SectionSubject.objects.filter(
                subject=subject,
                section__semester=active_semester,
                is_deleted=False
            ).select_related('section', 'professor')

            home_section = profile.home_section
            is_irregular = profile.is_irregular
            is_overloaded = profile.overload_approved

            is_retake = False
            if subject.id not in passed_subjects:
                 is_retake = SubjectEnrollment.objects.filter(
                    enrollment__student=user,
                    subject=subject,
                    status__in=['FAILED', 'DROPPED', 'RETAKE']
                 ).exists()

            valid_sections = []
            for ss in section_subjects:
                allowed = False
                is_same_program = (ss.section.program_id == profile.program_id)

                if is_overloaded:
                     allowed = True
                elif is_irregular:
                    allowed = True
                elif is_retake:
                    allowed = True
                elif (profile.year_level == 1) and ("1st" in active_semester.name or "First" in active_semester.name):
                    if ss.section == home_section or (home_section and ss.section.name == home_section.name):
                        allowed = True
                    elif not home_section and is_same_program:
                        allowed = True
                else:
                    if is_same_program:
                         allowed = True
                
                if allowed and not is_same_program and not (is_irregular or is_overloaded):
                    allowed = False
                
                if allowed:
                    valid_sections.append(ss)

            available_sections = []
            for ss in valid_sections:
                available_sections.append({
                    'id': str(ss.section.id),
                    'name': ss.section.name,
                    'slots': ss.section.available_slots,
                    'enrolled': ss.section.enrolled_count,
                    'professor': ss.professor.get_full_name() if ss.professor else 'TBA',
                    'schedule': [
                        {
                            'day': slot.day,
                            'start_time': slot.start_time.strftime("%I:%M %p"),
                            'end_time': slot.end_time.strftime("%I:%M %p"),
                            'room': slot.room or 'TBA'
                        } for slot in ss.schedule_slots.filter(is_deleted=False)
                    ]
                })

            data.append({
                'id': str(subject.id),
                'code': subject.code,
                'title': subject.title,
                'units': subject.units,
                'year_level': subject.year_level,
                'semester_number': subject.semester_number,
                'program_code': subject.program.code if subject.program else 'Global',
                'is_global': subject.is_global,
                'prerequisites_met': prereqs_met,
                'missing_prerequisites': missing_prereqs,
                'prerequisites': [{'code': p.code, 'title': p.title} for p in subject.prerequisites.all()],
                'is_enrolled': subject.id in current_subjects,
                'is_passed': subject.id in passed_subjects,
                'can_enroll': prereqs_met and (subject.id not in passed_subjects),
                'enrollment_status': 'available' if prereqs_met else 'blocked',
                'sections': available_sections
            })

        return Response({
            "success": True,
            "data": {
                "available_subjects": data
            }
        })


class MySubjectEnrollmentsView(APIView):
    """
    Get current semester enrollments for the student.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        from apps.enrollment.models import SubjectEnrollment
        from django.db.models import Sum

        user = request.user
        active_semester = Semester.objects.filter(is_current=True).first()
        
        if not active_semester:
             return Response({"success": True, "subject_enrollments": [], "enrolled_units": 0})

        enrollments = SubjectEnrollment.objects.filter(
            enrollment__student=user,
            enrollment__semester=active_semester,
            is_deleted=False
        ).select_related('subject', 'section')

        from apps.academics.models import SectionSubject
        section_ids = [se.section_id for se in enrollments if se.section_id]
        subject_ids = [se.subject_id for se in enrollments]
        
        prof_map = {}
        schedule_map = {}
        if section_ids:
            section_subjects = SectionSubject.objects.filter(
                section_id__in=section_ids,
                subject_id__in=subject_ids
            ).select_related('professor').prefetch_related('schedule_slots')
            
            for ss in section_subjects:
                key = (ss.section_id, ss.subject_id)
                prof_map[key] = ss.professor
                schedule_map[key] = ss.schedule_slots.all()

        data = []
        total_units = 0
        for se in enrollments:
            total_units += se.subject.units
            
            prof = prof_map.get((se.section_id, se.subject_id))
            prof_name = prof.get_full_name() if prof else 'TBA'
            
            slots = schedule_map.get((se.section_id, se.subject_id), [])
            
            data.append({
                'id': str(se.id),
                'subject_id': str(se.subject.id),
                'subject_code': se.subject.code,
                'subject_title': se.subject.title,
                'units': se.subject.units,
                'section_id': str(se.section.id) if se.section else None,
                'section_name': se.section.name if se.section else 'TBA',
                'status': se.status,
                'payment_approved': se.payment_approved,
                'head_approved': se.head_approved,
                'approval_status_display': se.get_approval_status_display(),
                'is_fully_enrolled': se.is_fully_enrolled,
                'professor': prof_name,
                'schedule': [
                    {
                        'day': slot.get_day_display(),
                        'start_time': slot.start_time.strftime("%I:%M %p"),
                        'end_time': slot.end_time.strftime("%I:%M %p"),
                        'room': slot.room or 'TBA'
                    } for slot in slots
                ]
            })

        return Response({
            "success": True,
            "data": {
                "subject_enrollments": data,
                "enrolled_units": total_units
            }
        })


class StudentCurriculumView(APIView):
    """
    Get student's curriculum and grades structure.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        from apps.enrollment.models import SubjectEnrollment
        from apps.academics.models import Curriculum, CurriculumSubject
        from apps.academics.serializers import CurriculumSerializer

        user = request.user
        
        if not hasattr(user, 'student_profile') or not user.student_profile:
            return Response({"error": "Student profile not found"}, status=400)
            
        profile = user.student_profile
        program = profile.program
        
        if not program:
            return Response({"error": "No program assigned"}, status=400)

        curriculum = profile.curriculum
        
        if not curriculum:
             curriculum = Curriculum.objects.filter(
                program=program, 
                is_active=True
            ).order_by('-effective_year').first()
        
        if not curriculum:
             return Response({
                "success": False, 
                "error": "No curriculum found for your program.",
            }, status=400)

        enrollments = SubjectEnrollment.objects.filter(
            enrollment__student=user
        ).select_related('subject', 'enrollment__semester')

        grades_map = {}
        for e in enrollments:
            grades_map[str(e.subject.id)] = {
                'grade': e.grade,
                'status': e.status,
                'semester': e.enrollment.semester.name if e.enrollment.semester else 'N/A',
                'academic_year': e.enrollment.semester.academic_year if e.enrollment.semester else 'N/A',
                'retake_eligibility_date': e.retake_eligibility_date,
                'is_retake_eligible': e.is_retake_eligible
            }

        curriculum_subjects = CurriculumSubject.objects.filter(
            curriculum=curriculum
        ).select_related('subject', 'subject__program').order_by('year_level', 'semester_number', 'subject__code')

        structure = {}
        total_subjects = 0
        passed_subjects = 0
        total_units = 0
        earned_units = 0

        for cs in curriculum_subjects:
            year = str(cs.year_level)
            sem = str(cs.semester_number)
            
            if year not in structure: structure[year] = {}
            if sem not in structure[year]: structure[year][sem] = []

            grade_info = grades_map.get(str(cs.subject.id))
            
            total_subjects += 1
            total_units += cs.subject.units

            if grade_info and (grade_info['status'] == 'COMPLETED' or grade_info['grade'] not in [None, '', 'INC', 'DRP', '5.00']):
                 passed_subjects += 1
                 earned_units += cs.subject.units

            structure[year][sem].append({
                'id': str(cs.subject.id),
                'code': cs.subject.code,
                'title': cs.subject.title,
                'units': cs.subject.units,
                'is_major': cs.subject.is_major,
                'grade': grade_info['grade'] if grade_info else None,
                'status': grade_info['status'] if grade_info else 'NOT_TAKEN',
                'semester_taken': grade_info['semester'] if grade_info else None,
                'year_taken': grade_info['academic_year'] if grade_info else None,
                'retake_eligibility_date': grade_info['retake_eligibility_date'] if grade_info else None,
                'is_retake_eligible': grade_info['is_retake_eligible'] if grade_info else None,
            })

        numeric_grades = [
            float(e.grade) for e in enrollments 
            if e.grade is not None and e.status in ['PASSED', 'FAILED', 'COMPLETED']
        ]
        gpa = sum(numeric_grades) / len(numeric_grades) if numeric_grades else 0.00

        return Response({
            "success": True,
            "data": {
                "curriculum": CurriculumSerializer(curriculum).data,
                "student": {
                    "name": user.get_full_name(),
                    "student_number": user.student_number,
                    "program_code": program.code,
                    "current_year_level": profile.year_level
                },
                "structure": structure,
                "statistics": {
                    "gpa": round(gpa, 2),
                    "total_subjects": total_subjects,
                    "completed_subjects": passed_subjects,
                    "total_units": total_units,
                    "completed_units": earned_units,
                    "inc_count": enrollments.filter(status='INC').count()
                }
            }
        })


class MyScheduleView(APIView):
    """
    Get the student's current class schedule grouped by day.
    Used for the Timetable and List views.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        from apps.enrollment.models import SubjectEnrollment
        from apps.academics.models import SectionSubject
        
        user = request.user
        active_semester = Semester.objects.filter(is_current=True).first()
        
        if not active_semester:
            return Response({"schedule": [], "semester": ""})

        enrollments = SubjectEnrollment.objects.filter(
            enrollment__student=user,
            enrollment__semester=active_semester,
            status__in=['ENROLLED', 'PENDING_HEAD', 'PENDING_PAYMENT'],
            is_deleted=False
        ).select_related('subject', 'section')

        days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
        schedule_by_day = {day: [] for day in days}

        section_ids = [se.section_id for se in enrollments if se.section_id]
        subject_ids = [se.subject_id for se in enrollments]
        
        ss_map = {}
        if section_ids:
            section_subjects = SectionSubject.objects.filter(
                section_id__in=section_ids,
                subject_id__in=subject_ids
            ).select_related('professor').prefetch_related('schedule_slots')
            
            for ss in section_subjects:
                key = (ss.section_id, ss.subject_id)
                ss_map[key] = ss

        for se in enrollments:
            ss = ss_map.get((se.section_id, se.subject_id))
            if not ss:
                continue
            
            prof = ss.professor
            prof_name = prof.get_full_name() if prof else 'TBA'
            
            for slot in ss.schedule_slots.all():
                schedule_by_day[slot.day].append({
                    'subject_code': se.subject.code,
                    'subject_title': se.subject.title,
                    'section': se.section.name if se.section else 'TBA',
                    'start_time': slot.start_time.strftime('%H:%M'),
                    'end_time': slot.end_time.strftime('%H:%M'),
                    'room': slot.room or 'TBA',
                    'professor_name': prof_name
                })

        formatted_schedule = []
        for day in days:
            if schedule_by_day[day]:
                day_slots = sorted(schedule_by_day[day], key=lambda x: x['start_time'])
                formatted_schedule.append({
                    'day': day,
                    'slots': day_slots
                })

        return Response({
            "schedule": formatted_schedule,
            "semester": f"{active_semester.name} FY {active_semester.academic_year}"
        })


class EnrollSubjectView(APIView):
    """
    Enroll a student in a specific subject section.
    Delegates validation and fulfillment to SubjectEnrollmentService.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        from apps.enrollment.models import SubjectEnrollment
        from apps.academics.models import Subject, Section
        from apps.enrollment.serializers import EnrollSubjectRequestSerializer
        from apps.enrollment.services import SubjectEnrollmentService
        from apps.core.exceptions import (
            PrerequisiteNotSatisfiedError, UnitCapExceededError,
            PaymentRequiredError, ScheduleConflictError, ConflictError,
            ValidationError
        )
        from django.db import transaction

        user = request.user
        
        serializer = EnrollSubjectRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"error": serializer.errors}, status=400)
            
        subject_id = serializer.validated_data['subject_id']
        section_id = serializer.validated_data['section_id']

        try:
            with transaction.atomic():
                if not hasattr(user, 'student_profile'):
                    return Response({"error": "Student profile not found"}, status=400)
                
                semester = Semester.objects.filter(is_current=True).first()
                if not semester:
                    return Response({"error": "No active semester"}, status=400)
                
                if not semester.is_enrollment_open:
                    return Response({"error": "Enrollment is currently closed"}, status=400)

                enrollment, _ = Enrollment.objects.get_or_create(
                    student=user,
                    semester=semester,
                    defaults={
                        'status': Enrollment.Status.PENDING,
                        'monthly_commitment': 0
                    }
                )
                
                try:
                    subject = Subject.objects.get(id=subject_id, is_deleted=False)
                    section = Section.objects.get(id=section_id, is_deleted=False)
                except (Subject.DoesNotExist, Section.DoesNotExist):
                     return Response({"error": "Subject or Section not found"}, status=404)

                service = SubjectEnrollmentService()
                subject_enrollment = service.enroll_in_subject(
                    student=user,
                    enrollment=enrollment,
                    subject=subject,
                    section=section
                )

                return Response({
                    "success": True, 
                    "message": "Enrolled successfully",
                    "data": {
                        "id": str(subject_enrollment.id),
                        "subject": subject.code,
                        "section": section.name,
                        "status": subject_enrollment.status
                    }
                })

        except (PrerequisiteNotSatisfiedError, UnitCapExceededError, 
                ScheduleConflictError, ConflictError, ValidationError) as e:
            return Response({"error": str(e)}, status=400)
        except PaymentRequiredError as e:
            return Response({"error": str(e)}, status=402)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": "An internal error occurred"}, status=500)


class BulkEnrollSubjectView(APIView):
    """
    Bulk enroll a student in multiple subject sections.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        from apps.academics.models import Subject, Section
        from apps.enrollment.serializers import BulkEnrollRequestSerializer
        from apps.enrollment.services import SubjectEnrollmentService
        from apps.core.exceptions import (
            PrerequisiteNotSatisfiedError, UnitCapExceededError,
            PaymentRequiredError, ScheduleConflictError, ConflictError,
            ValidationError
        )
        from django.db import transaction

        user = request.user
        serializer = BulkEnrollRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"error": serializer.errors}, status=400)

        enrollments_data = serializer.validated_data['enrollments']
        
        if not hasattr(user, 'student_profile'):
            return Response({"error": "Student profile not found"}, status=400)
            
        semester = Semester.objects.filter(is_current=True).first()
        if not semester:
            return Response({"error": "No active semester"}, status=400)
            
        if not semester.is_enrollment_open:
            return Response({"error": "Enrollment is currently closed"}, status=400)

        service = SubjectEnrollmentService()
        results = []
        overall_success = True

        try:
            with transaction.atomic():
                enrollment, _ = Enrollment.objects.get_or_create(
                    student=user,
                    semester=semester,
                    defaults={
                        'status': Enrollment.Status.PENDING,
                        'monthly_commitment': 0
                    }
                )

                for entry in enrollments_data:
                    subj_id = entry['subject_id']
                    sect_id = entry['section_id']
                    
                    try:
                        subject = Subject.objects.get(id=subj_id, is_deleted=False)
                        section = Section.objects.get(id=sect_id, is_deleted=False)
                        
                        service.enroll_in_subject(user, enrollment, subject, section)
                        results.append({
                            "subject_id": str(subj_id),
                            "subject_code": subject.code,
                            "status": "success",
                            "message": "Enrolled successfully"
                        })
                    except (Subject.DoesNotExist, Section.DoesNotExist):
                        results.append({
                            "subject_id": str(subj_id),
                            "status": "error",
                            "message": "Subject or Section not found"
                        })
                        overall_success = False
                    except (PrerequisiteNotSatisfiedError, UnitCapExceededError,
                            PaymentRequiredError, ScheduleConflictError, ConflictError,
                            ValidationError) as e:
                        results.append({
                            "subject_id": str(subj_id),
                            "status": "error",
                            "message": str(e)
                        })
                        overall_success = False
                    except Exception as e:
                        results.append({
                            "subject_id": str(subj_id),
                            "status": "error",
                            "message": f"Unexpected error: {str(e)}"
                        })
                        overall_success = False

                if not overall_success:
                    transaction.set_rollback(True)
                    first_error = next((r['message'] for r in results if r['status'] == 'error'), "Enrollment failed")
                    return Response({
                        "error": first_error,
                        "results": results,
                        "message": first_error
                    }, status=400)

        except Exception as e:
            return Response({"error": f"Internal server error: {str(e)}"}, status=500)

        return Response({
            "success": True,
            "message": f"Successfully enrolled in {len(results)} subjects",
            "results": results
        }, status=200)


class RegistrarOverrideEnrollmentView(APIView):
    """
    Registrar-initiated subject override.
    Bypasses all standard enrollment validation rules.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, enrollment_id, *args, **kwargs):
        from apps.academics.models import Subject, Section
        from apps.accounts.models import User
        from apps.enrollment.serializers import RegistrarOverrideSerializer
        from apps.enrollment.services import SubjectEnrollmentService
        from django.db import transaction

        user = request.user
        
        if user.role not in ['REGISTRAR', 'HEAD_REGISTRAR', 'ADMIN', 'DEPARTMENT_HEAD']:
            return Response({"error": "Only registrars and administrators can perform overrides"}, status=403)

        serializer = RegistrarOverrideSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"error": serializer.errors}, status=400)
            
        student_id = serializer.validated_data['student_id']
        subject_id = serializer.validated_data['subject_id']
        section_id = serializer.validated_data['section_id']
        override_reason = serializer.validated_data['override_reason']

        try:
            with transaction.atomic():
                try:
                    student = User.objects.get(id=student_id, role='STUDENT')
                except User.DoesNotExist:
                    return Response({"error": "Student not found"}, status=404)

                try:
                    enrollment = Enrollment.objects.get(id=enrollment_id, student=student)
                except Enrollment.DoesNotExist:
                     return Response({"error": "Enrollment header not found for this student"}, status=404)
                
                try:
                    subject = Subject.objects.get(id=subject_id, is_deleted=False)
                    section = Section.objects.get(id=section_id, is_deleted=False)
                except (Subject.DoesNotExist, Section.DoesNotExist):
                     return Response({"error": "Subject or Section not found"}, status=404)

                service = SubjectEnrollmentService()
                subject_enrollment = service.enroll_in_subject(
                    student=student,
                    enrollment=enrollment,
                    subject=subject,
                    section=section,
                    override=True,
                    override_reason=override_reason,
                    actor=user
                )

                return Response({
                    "success": True, 
                    "message": "Override enrollment completed successfully",
                    "data": {
                        "id": str(subject_enrollment.id),
                        "student": student.get_full_name(),
                        "subject": subject.code,
                        "section": section.name,
                        "status": subject_enrollment.status,
                        "is_overridden": True
                    }
                })

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=500)
