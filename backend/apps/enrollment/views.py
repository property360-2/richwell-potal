"""
Enrollment views - report and other enrollment-related endpoints.
"""

from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiParameter

from apps.core.permissions import IsDepartmentHead, IsRegistrar, IsAdmin
from apps.enrollment.models import Enrollment, SubjectEnrollment, Semester


# Semester ViewSet for academics app
class SemesterViewSet(ModelViewSet):
    """ViewSet for managing semesters."""
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Semester.objects.all().order_by('-start_date')
    
    def get_serializer_class(self):
        from apps.enrollment.serializers import SemesterSerializer
        return SemesterSerializer

# ============================================================
# Report Views (EPIC 13)
# ============================================================

class HeadReportView(APIView):
    """
    Generate reports for department heads.
    Supports enrollment lists and grade summaries.
    """
    permission_classes = [IsAuthenticated, IsDepartmentHead | IsRegistrar | IsAdmin]

    @extend_schema(
        summary="Generate Report",
        description="Generate enrollment or grade reports with filters",
        tags=["Reports"],
        parameters=[
            OpenApiParameter('type', str, description='Report type: enrollment, grades', required=True),
            OpenApiParameter('semester', str, description='Semester ID'),
            OpenApiParameter('program', str, description='Program ID'),
            OpenApiParameter('date_from', str, description='Start date (YYYY-MM-DD)'),
            OpenApiParameter('date_to', str, description='End date (YYYY-MM-DD)'),
        ]
    )
    def get(self, request):
        report_type = request.query_params.get('type')
        semester_id = request.query_params.get('semester')
        program_id = request.query_params.get('program')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        if not report_type:
            return Response({"error": "Report type is required"}, status=400)

        # Base queryset for enrollment
        queryset = Enrollment.objects.select_related(
            'student', 'student__student_profile', 'semester', 'student__student_profile__program'
        ).filter(status__in=[Enrollment.Status.ACTIVE, Enrollment.Status.COMPLETED])

        # Apply filters
        if semester_id:
            queryset = queryset.filter(semester_id=semester_id)
        
        if program_id:
            queryset = queryset.filter(student__student_profile__program_id=program_id)
            
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
            
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)

        # Generate Report Data
        data = []
        
        if report_type == 'enrollment':
            # Enrollment List Report
            enrollments = queryset.prefetch_related('subject_enrollments')
            
            for enrollment in enrollments:
                profile = enrollment.student.student_profile
                total_units = sum(
                    se.subject.units for se in enrollment.subject_enrollments.all()
                    if se.status == SubjectEnrollment.Status.ENROLLED
                )
                
                data.append({
                    'student_number': enrollment.student.student_number,
                    'student_name': enrollment.student.get_full_name(),
                    'program_code': profile.program.code if profile and profile.program else 'N/A',
                    'year_level': profile.year_level if profile else 'N/A',
                    'status': enrollment.get_status_display(),
                    'total_units': total_units,
                    'date_enrolled': enrollment.created_at.date()
                })

        elif report_type == 'grades':
            # Grade Summary Report
            # Requires iterating through subject enrollments
            subject_enrollments = SubjectEnrollment.objects.filter(
                enrollment__in=queryset
            ).select_related('subject', 'enrollment__student')
            
            for se in subject_enrollments:
                data.append({
                    'student_number': se.enrollment.student.student_number,
                    'student_name': se.enrollment.student.get_full_name(),
                    'subject_code': se.subject.code,
                    'subject_title': se.subject.title,
                    'grade': str(se.grade) if se.grade else 'N/A',
                    'status': se.get_status_display(),
                    'units': se.subject.units
                })

        else:
            return Response({"error": "Invalid report type"}, status=400)

        return Response({
            "success": True,
            "type": report_type,
            "count": len(data),
            "results": data
        })


    # ------------------------------------------------------------------
    # Minimal stub views for endpoints referenced in urls.py
    # These are placeholders to satisfy imports during tests. Real
    # implementations live elsewhere or will be implemented in later tasks.
    # ------------------------------------------------------------------

class SimpleGETView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return Response({"success": True, "data": []})


class SimplePOSTView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        return Response({"success": True, "data": {}}, status=201)


# Public views that don't require authentication
class PublicProgramListView(APIView):
    """Public endpoint to list available programs for enrollment."""
    permission_classes = []  # No authentication required
    
    def get(self, request, *args, **kwargs):
        from apps.academics.models import Program
        programs = Program.objects.filter(is_active=True).values('id', 'name', 'code', 'description')
        return Response(list(programs))


class EnrollmentStatusView(APIView):
    """Public endpoint to check if enrollment is enabled."""
    permission_classes = []  # No authentication required
    
    def get(self, request, *args, **kwargs):
        return Response({"enrollment_enabled": True})


class CheckEmailAvailabilityView(APIView):
    """Public endpoint to check if email is available for enrollment."""
    permission_classes = []  # No authentication required
    
    def get(self, request, *args, **kwargs):
        from apps.accounts.models import User
        email = request.query_params.get('email', '')
        if not email:
            return Response({"available": False, "message": "Email is required"})
        
        exists = User.objects.filter(email__iexact=email).exists()
        return Response({
            "available": not exists,
            "message": "Email is already registered" if exists else "Email is available"
        })


class CheckStudentIdAvailabilityView(APIView):
    """Public endpoint to check if student ID is available."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, *args, **kwargs):
        from apps.accounts.models import User
        student_id = request.query_params.get('student_id', '')
        if not student_id:
            return Response({"available": False, "message": "Student ID is required"})
        
        # Check against User model's student_number
        exists = User.objects.filter(student_number__iexact=student_id).exists()
        
        return Response({
            "available": not exists,
            "message": "Student ID is already assigned" if exists else "Student ID is available"
        })


# Register simple view classes for expected names
class OnlineEnrollmentView(APIView):
    """Public endpoint for online enrollment - creates student account and enrollment."""
    permission_classes = []  # No authentication required
    
    def post(self, request, *args, **kwargs):
        from apps.accounts.models import User, StudentProfile
        from apps.academics.models import Program
        from apps.enrollment.models import Enrollment, Semester
        from django.db import transaction
        import uuid
        
        data = request.data
        
        # Validate required fields
        required = ['first_name', 'last_name', 'email', 'program_id']
        for field in required:
            if not data.get(field):
                return Response({"error": f"{field} is required"}, status=400)
        
        # Check if email already exists
        if User.objects.filter(email__iexact=data['email']).exists():
            return Response({"error": "Email already registered"}, status=400)
        
        try:
            with transaction.atomic():
                # Get program
                try:
                    program = Program.objects.get(id=data['program_id'])
                except Program.DoesNotExist:
                    return Response({"error": "Invalid program"}, status=400)
                
                # Generate student number (temporary until approved)
                year = Semester.objects.order_by('-start_date').first()
                year_str = str(year.start_date.year) if year else "2025"
                temp_number = f"PENDING-{uuid.uuid4().hex[:8].upper()}"
                
                # Create user
                user = User.objects.create_user(
                    email=data['email'],
                    username=data['email'],  # Use email as username to satisfy unique constraint
                    password=data.get('password', 'richwell123'),  # Default password
                    first_name=data['first_name'],
                    last_name=data['last_name'],
                    student_number=temp_number,
                    role='STUDENT'
                )
                
                # Create student profile
                StudentProfile.objects.create(
                    user=user,
                    program=program,
                    year_level=1,
                    contact_number=data.get('contact_number', ''),
                    address=data.get('address', ''),
                    birthdate=data.get('birthdate')
                )
                
                # Get current semester or create default
                semester = Semester.objects.filter(is_current=True).first()
                if not semester:
                    semester = Semester.objects.order_by('-start_date').first()
                
                if semester:
                    # Create enrollment
                    Enrollment.objects.create(
                        student=user,
                        semester=semester,
                        status='PENDING',
                        monthly_commitment=data.get('monthly_commitment', 5000),
                        created_via='ONLINE'
                    )
                
                # Generate JWT tokens
                from rest_framework_simplejwt.tokens import RefreshToken
                refresh = RefreshToken.for_user(user)
                
                # Add custom claims to match LoginSerializer
                refresh['email'] = user.email
                refresh['role'] = user.role
                refresh['full_name'] = user.get_full_name()

                return Response({
                    "success": True,
                    "message": "Enrollment submitted successfully",
                    "credentials": {
                        "student_number": temp_number,
                        "login_email": user.email,
                        "password": "richwell123"
                    },
                    "tokens": {
                        "refresh": str(refresh),
                        "access": str(refresh.access_token),
                    },
                    "user": {
                        "id": str(user.id),
                        "email": user.email,
                        "first_name": user.first_name,
                        "last_name": user.last_name,
                        "role": user.role,
                        "student_number": temp_number,
                    }
                }, status=201)
                
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=500)
DocumentUploadView = SimplePOSTView
class EnrollmentDetailView(APIView):
    """
    Get details of the current user's enrollment.
    Used by student dashboard to check status.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        from apps.enrollment.models import Enrollment
        
        # Get latest enrollment
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
                    "year": enrollment.semester.academic_year if enrollment.semester else None
                } if enrollment.semester else None,
                "created_at": enrollment.created_at,
                "monthly_commitment": enrollment.monthly_commitment
            }
        })
# Admission Staff Views
class ApplicantListView(APIView):
    """
    List pending applicants for the admission dashboard.
    Supports filtering by status (default: PENDING).
    """
    permission_classes = [IsAuthenticated] # Should be IsAdmissionStaff ideally, but sticking to IsAuthenticated for now to avoid permission issues during demo
    
    def get(self, request, *args, **kwargs):
        status = request.query_params.get('status', 'PENDING')
        
        # Filter enrollments
        enrollments = Enrollment.objects.filter(
            status=status
        ).select_related('student', 'semester', 'student__student_profile', 'student__student_profile__program')
        
        data = []
        for enrollment in enrollments:
            student = enrollment.student
            profile = getattr(student, 'student_profile', None)
            
            data.append({
                'id': str(enrollment.id), # Use enrollment ID as the primary ID for dashboard actions
                'student_number': student.student_number,
                'first_name': student.first_name,
                'last_name': student.last_name,
                'email': student.email,
                'status': enrollment.status,
                'created_at': enrollment.created_at,
                'program': {
                    'code': profile.program.code if profile and profile.program else 'N/A',
                    'name': profile.program.name if profile and profile.program else 'N/A'
                } if profile else None,
                'contact_number': profile.contact_number if profile else '',
                'address': profile.address if profile else '',
                'student_id': str(student.id)
            })
            
        return Response(data)


# Register simple view classes for expected names
TransfereeCreateView = SimplePOSTView
TransfereeCreditView = SimpleGETView
TransfereeCreateView = SimplePOSTView
TransfereeCreditView = SimpleGETView

class NextStudentNumberView(APIView):
    """
    Generate the next available student number.
    Format: YYYY-XXXXX (e.g., 2025-00001)
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, *args, **kwargs):
        from apps.accounts.models import User
        from django.utils import timezone
        import re
        
        current_year = timezone.now().year
        prefix = f"{current_year}-"
        
        # distinct() is not needed for simple filter but good practice if joins were involved
        # specific to SQLite/Postgres differences, standard filter is strictly better here
        latest_student = User.objects.filter(
            student_number__startswith=prefix
        ).order_by('-student_number').first()
        
        if latest_student and latest_student.student_number:
            # Extract number part
            try:
                # Remove prefix and parse
                existing_suffix = latest_student.student_number.replace(prefix, '')
                # Handle cases where suffix might not be purely numeric (though it should be)
                # We extract the first sequence of digits
                match = re.search(r'^(\d+)', existing_suffix)
                if match:
                    sequence = int(match.group(1)) + 1
                else:
                    sequence = 1
            except ValueError:
                sequence = 1
        else:
            sequence = 1
            
        next_number = f"{prefix}{sequence:05d}"
        
        # Double check existence (loop just in case, though unlikely with logic above)
        while User.objects.filter(student_number=next_number).exists():
            sequence += 1
            next_number = f"{prefix}{sequence:05d}"
            
        return Response({
            "success": True,
            "next_student_number": next_number
        })

class ApplicantUpdateView(APIView):
    """
    Update applicant status (Approve/Reject) and assign Student ID.
    Handles PATCH /api/v1/admissions/applicants/<pk>/
    Body: { "action": "accept"|"reject", "student_number": "..." }
    """
    permission_classes = [IsAuthenticated] # Should be IsAdmissionStaff

    def patch(self, request, pk, *args, **kwargs):
        from django.db import transaction
        from apps.accounts.models import User
        
        try:
            enrollment = Enrollment.objects.get(pk=pk)
        except Enrollment.DoesNotExist:
            return Response({"error": "Applicant not found"}, status=404)
            
        action = request.data.get('action')
        student_number = request.data.get('student_number')
        
        if action == 'accept':
            if not student_number:
                return Response({"error": "Student ID is required for approval"}, status=400)
                
            # Check unique student number (excluding current user if update)
            if User.objects.filter(student_number=student_number).exclude(pk=enrollment.student.pk).exists():
                return Response({"error": "Student ID already exists"}, status=400)
            
            try:
                with transaction.atomic():
                    # Update Student User
                    student = enrollment.student
                    student.student_number = student_number
                    student.save()
                    
                    # Update Enrollment
                    enrollment.status = 'ACTIVE'
                    enrollment.save()
                    
                    return Response({
                        "success": True,
                        "message": f"Applicant approved with ID {student_number}",
                        "data": {
                            "status": "ACTIVE",
                            "student_number": student_number
                        }
                    })
            except Exception as e:
                return Response({"error": str(e)}, status=500)
                
        elif action == 'reject':
            enrollment.status = 'REJECTED'
            enrollment.save()
            return Response({
                "success": True, 
                "message": "Applicant rejected",
                "data": {"status": "REJECTED"}
            })
            
        return Response({"error": "Invalid action"}, status=400)


DocumentVerifyView = SimplePOSTView

class RecommendedSubjectsView(APIView):
    """
    Get recommended subjects for the student based on their curriculum and passed subjects.
    Also handles "No Curriculum" error state.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        from apps.enrollment.models import Semester, SubjectEnrollment
        from apps.academics.models import Curriculum, CurriculumSubject

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
        # Currently Richwell assumes one active curriculum per program for simplicity in this MVP,
        # or we find the one matching the student's entry year (based on student number).
        # For now, let's grab the latest active curriculum for their program.
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
            status='COMPLETED',
            grade__isnull=False
        ).values_list('subject_id', flat=True)

        # 5. Get Subjects for Current Year/Sem from Curriculum
        # We try to recommend subjects for the user's current standing (e.g. 1st Year, 1st Sem)
        # But a better approach is to show ALL subjects they CAN take (prereqs met, not passed).
        # For this specific view "Recommended", let's stick to the user's current Year Level & Active Sem.
        
        # Filter by query params if present, else default to student's current year/sem
        target_year = request.query_params.get('year_level')
        target_sem = request.query_params.get('semester_number')
        
        # If no filter, use active semester's term (e.g., if active sem is "1st Semester", show Sem 1 subjects)
        # We need to map Semester string to integer (1, 2, 3)
        if not target_sem:
            if "1st" in active_semester.name: target_sem = 1
            elif "2nd" in active_semester.name: target_sem = 2
            elif "Summer" in active_semester.name: target_sem = 3
            else: target_sem = 1

        # If no filter for year, use student's current year level
        if not target_year:
             target_year = profile.year_level

        curriculum_subjects = CurriculumSubject.objects.filter(
            curriculum=curriculum,
            year_level=target_year,
            semester_number=target_sem
        ).select_related('subject')

        recommended = []
        
        for cs in curriculum_subjects:
            subject = cs.subject
            
            # Skip if already passed
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
            sections = []
            from apps.academics.models import SectionSubject
            section_subjects = SectionSubject.objects.filter(
                subject=subject,
                section__semester=active_semester
            ).select_related('section', 'professor')
            
            for ss in section_subjects:
                sections.append({
                    'section_id': str(ss.section.id),
                    'section_name': ss.section.name,
                    'available_slots': ss.section.available_slots,
                    'schedule': [
                        {
                            'day': slot.get_day_display(),
                            'start_time': slot.start_time.strftime("%H:%M"),
                            'end_time': slot.end_time.strftime("%H:%M") 
                        } for slot in ss.schedule_slots.all()
                    ]
                })

            recommended.append({
                'id': str(subject.id),
                'code': subject.code,
                'title': subject.title,
                'units': subject.units,
                'year_level': cs.year_level,
                'semester': cs.semester_number,
                'can_enroll': can_enroll,
                'missing_prerequisites': missing_prereqs,
                'available_sections': sections
            })

        return Response({
            "success": True,
            "data": {
                "recommended_subjects": recommended,
                "current_units": 0, # TODO: Calc currently enrolled units
                "max_units": 24 # Standard max units
            }
        })
AvailableSubjectsView = SimpleGETView
MySubjectEnrollmentsView = SimpleGETView
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
        
        # 1. Get student profile & program
        if not hasattr(user, 'student_profile') or not user.student_profile:
            return Response({"error": "Student profile not found"}, status=400)
            
        profile = user.student_profile
        program = profile.program
        
        if not program:
            return Response({"error": "No program assigned"}, status=400)

        # 2. Get Curriculum
        curriculum = Curriculum.objects.filter(
            program=program, 
            is_active=True
        ).order_by('-effective_year').first()
        
        if not curriculum:
             return Response({
                "success": False, 
                "error": "No curriculum found for your program.",
            }, status=400)

        # 3. Get All Passed/Enrolled Subjects
        enrollments = SubjectEnrollment.objects.filter(
            enrollment__student=user
        ).select_related('subject', 'enrollment__semester')

        grades_map = {}
        for e in enrollments:
            grades_map[str(e.subject.id)] = {
                'grade': e.grade,
                'status': e.status,
                'semester': e.enrollment.semester.name if e.enrollment.semester else 'N/A',
                'academic_year': e.enrollment.semester.academic_year if e.enrollment.semester else 'N/A'
            }

        # 4. Build Structure
        # Group by Year > Semester
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

            # Check if student has grade
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
            })

        # Calculate GPA (simple average of numeric grades for now)
        numeric_grades = [
            float(e.grade) for e in enrollments 
            if e.grade and e.grade.replace('.', '', 1).isdigit() and e.status == 'COMPLETED'
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
                    "passed_subjects": passed_subjects,
                    "total_units": total_units,
                    "earned_units": earned_units
                }
            }
        })

MyScheduleView = SimpleGETView

EnrollSubjectView = SimplePOSTView
DropSubjectView = SimplePOSTView
EditSubjectEnrollmentView = SimplePOSTView
RegistrarOverrideEnrollmentView = SimplePOSTView

PaymentRecordView = SimplePOSTView
PaymentAdjustmentView = SimplePOSTView
PaymentTransactionListView = SimpleGETView
StudentPaymentHistoryView = SimpleGETView
class CashierStudentSearchView(APIView):
    """
    Search for students for cashier/registrar.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        from apps.accounts.models import User
        from django.db.models import Q
        
        query = request.query_params.get('q', '')
        
        # Filter students
        students = User.objects.filter(role='STUDENT')
        
        if query:
            students = students.filter(
                Q(student_number__icontains=query) |
                Q(first_name__icontains=query) |
                Q(last_name__icontains=query) |
                Q(email__icontains=query)
            )
            
        # Limit results
        students = students[:50]
        
        data = []
        for s in students:
            # Get latest enrollment
            latest_enrollment = s.enrollments.order_by('-created_at').first()
            
            # Get program code safely
            program_code = 'N/A'
            if hasattr(s, 'student_profile') and s.student_profile and s.student_profile.program:
                program_code = s.student_profile.program.code
                
            data.append({
                'id': str(s.id),
                'student_number': s.student_number,
                'first_name': s.first_name,
                'last_name': s.last_name,
                'email': s.email,
                'program_code': program_code,
                'year_level': s.student_profile.year_level if hasattr(s, 'student_profile') and s.student_profile else 1,
                'enrollment_id': str(latest_enrollment.id) if latest_enrollment else None,
                'student_name': s.get_full_name(),
                'balance': '0.00'
            })
            
        return Response(data)
CashierPendingPaymentsView = SimpleGETView
CashierTodayTransactionsView = SimpleGETView
MyPaymentsView = SimpleGETView

ExamMonthMappingView = SimpleGETView
ExamMonthMappingDetailView = SimpleGETView
MyExamPermitsView = SimpleGETView
GenerateExamPermitView = SimplePOSTView
PrintExamPermitView = SimpleGETView
ExamPermitListView = SimpleGETView

ProfessorSectionsView = SimpleGETView
SectionStudentsView = SimpleGETView
SubmitGradeView = SimplePOSTView
GradeHistoryView = SimpleGETView
SectionFinalizationListView = SimpleGETView
FinalizeSectionGradesView = SimplePOSTView
OverrideGradeView = SimplePOSTView

INCReportView = SimpleGETView
ProcessExpiredINCsView = SimplePOSTView
MyGradesView = SimpleGETView
MyTranscriptView = SimpleGETView
UpdateAcademicStandingView = SimplePOSTView

CreateDocumentReleaseView = SimplePOSTView
MyReleasesView = SimpleGETView
StudentEnrollmentStatusView = SimpleGETView
StudentDocumentsView = SimpleGETView
DocumentDetailView = SimpleGETView
DownloadDocumentPDFView = SimpleGETView
RevokeDocumentView = SimplePOSTView
ReissueDocumentView = SimplePOSTView
AllReleasesView = SimpleGETView
DocumentReleaseStatsView = SimpleGETView

HeadPendingEnrollmentsView = SimpleGETView
HeadApproveEnrollmentView = SimplePOSTView
HeadRejectEnrollmentView = SimplePOSTView
HeadBulkApproveView = SimplePOSTView

GenerateCORView = SimplePOSTView