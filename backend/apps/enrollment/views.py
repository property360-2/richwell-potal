"""
Enrollment views - report and other enrollment-related endpoints.
"""

from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from drf_spectacular.utils import extend_schema, OpenApiParameter

from apps.core.permissions import IsDepartmentHead, IsRegistrar, IsAdmin
from apps.enrollment.models import Enrollment, SubjectEnrollment, Semester, GradeResolution
from .serializers import GradeResolutionSerializer
from django.db import transaction

# Import grading views from separate module
from .views_grading import (
    ProfessorGradeableStudentsView,
    ProfessorAssignedSectionsView,
    ProfessorSubmitGradeView,
    BulkGradeSubmissionView,
    GradeHistoryView
)

# Semester ViewSet for academics app
class SemesterViewSet(ModelViewSet):
    """ViewSet for managing semesters."""
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Semester.objects.all().order_by('-start_date')
    
    def get_serializer_class(self):
        from apps.enrollment.serializers import SemesterSerializer, SemesterCreateSerializer
        if self.action == 'create':
            return SemesterCreateSerializer
        return SemesterSerializer

    @action(detail=False, methods=['get'])
    def active(self, request):
        """
        Get the currently active semester.
        """
        semester = Semester.objects.filter(is_current=True).first()
        if not semester:
            return Response({'error': 'No active semester found'}, status=404)
        
        from apps.enrollment.serializers import SemesterSerializer
        return Response(SemesterSerializer(semester).data)

    @extend_schema(request=None, responses={200: None})
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """
        Activate a term (set is_current=True).
        Strict Rule: Cannot activate a new term unless the current active term is fully ended (GRADING_CLOSED or ARCHIVED).
        """
        target_semester = self.get_object()
        
        # Check current active semester
        current_active = Semester.objects.filter(is_current=True).exclude(pk=target_semester.pk).first()
        
        if current_active:
            # Enforce Hard Switch Rule
            if current_active.status not in [Semester.TermStatus.GRADING_CLOSED, Semester.TermStatus.ARCHIVED]:
                return Response(
                    {
                        'detail': f'Current active term "{current_active.name}" must be closed (Grading Closed or Archived)'
                                  f' before activating a new term. Current status: {current_active.get_status_display()}'
                    }, 
                    status=400
                )
            
            # Deactivate old term
            current_active.is_current = False
            current_active.save()

        # Activate new term
        target_semester.is_current = True
        target_semester.status = Semester.TermStatus.ENROLLMENT_OPEN
        target_semester.save()
        
        return Response({'success': True, 'message': f'Term "{target_semester.name}" is now active and open for enrollment.'})

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
        from apps.academics.models import Program, Curriculum
        programs = Program.objects.filter(is_active=True)
        
        results = []
        for program in programs:
            active_curriculum = Curriculum.objects.filter(program=program, is_active=True).first()
            results.append({
                'id': program.id,
                'name': program.name,
                'code': program.code,
                'description': program.description,
                'curriculum_name': active_curriculum.name if active_curriculum else None,
                'curriculum_code': active_curriculum.code if active_curriculum else None
            })
            
        return Response(results)


class EnrollmentStatusView(APIView):
    """Public endpoint to check if enrollment is enabled."""
    permission_classes = []  # No authentication required
    
    def get(self, request, *args, **kwargs):
        semester = Semester.objects.filter(is_current=True).first()
        enabled = semester.is_enrollment_open if semester else False
        return Response({
            "enrollment_enabled": enabled,
            "semester_name": semester.name if semester else None,
            "academic_year": semester.academic_year if semester else None,
            "enrollment_start_date": semester.enrollment_start_date if semester else None,
            "enrollment_end_date": semester.enrollment_end_date if semester else None
        })


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


class CheckNameAvailabilityView(APIView):
    """Public endpoint to check if name combination is already registered."""
    permission_classes = []  # No authentication required
    
    def get(self, request, *args, **kwargs):
        from apps.accounts.models import User
        first_name = request.query_params.get('first_name', '').strip()
        last_name = request.query_params.get('last_name', '').strip()
        
        if not first_name or not last_name:
            return Response({"available": True, "message": ""})
            
        exists = User.objects.filter(
            first_name__iexact=first_name,
            last_name__iexact=last_name
        ).exists()
        
        return Response({
            "available": not exists,
            "message": "This name combination is already registered" if exists else "Name combination is available"
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
        
        # Check if name combination already exists
        if User.objects.filter(first_name__iexact=data['first_name'], last_name__iexact=data['last_name']).exists():
            return Response({"error": "A student with this name is already registered"}, status=400)
        
        try:
            from .services import EnrollmentService
            
            service = EnrollmentService()
            result = service.create_online_enrollment(data)
            
            return Response({
                "success": True,
                "message": "Enrollment submitted successfully",
                "credentials": result['credentials'],
                "tokens": result['tokens'],
                "user": {
                    "id": str(result['user'].id),
                    "email": result['user'].email,
                    "first_name": result['user'].first_name,
                    "last_name": result['user'].last_name,
                    "role": result['user'].role,
                    "student_number": result['credentials']['student_number'],
                }
            }, status=201)
                
        except ValueError as e:
            return Response({"error": str(e)}, status=400)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": "An unexpected error occurred"}, status=500)
DocumentUploadView = SimplePOSTView
class EnrollmentDetailView(APIView):
    """
    Get details of the current user's enrollment.
    Used by student dashboard to check status.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        from apps.enrollment.models import Enrollment, Semester
        
        # 1. Try to get enrollment for the current semester
        active_semester = Semester.objects.filter(is_current=True).first()
        enrollment = None
        
        if active_semester:
            enrollment = Enrollment.objects.filter(
                student=request.user,
                semester=active_semester
            ).first()
            
        # 2. Fallback to latest enrollment if no current one
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
        
        # Filter enrollments - support 'all' or comma-separated statuses
        if status.lower() == 'all':
            enrollments = Enrollment.objects.all()
        elif ',' in status:
            # Support comma-separated statuses like ACTIVE,ADMITTED
            status_list = [s.strip() for s in status.split(',')]
            enrollments = Enrollment.objects.filter(status__in=status_list)
        else:
            enrollments = Enrollment.objects.filter(status=status)
        
        enrollments = enrollments.select_related(
            'student', 'semester', 'student__student_profile', 'student__student_profile__program'
        )
        
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
                'year_level': profile.year_level if profile else 1,
                'program': {
                    'code': profile.program.code if profile and profile.program else 'N/A',
                    'name': profile.program.name if profile and profile.program else 'N/A'
                } if profile else None,
                'contact_number': profile.contact_number if profile else '',
                'address': profile.address if profile else '',
                'student_id': str(student.id),
                # Additional fields for admission dashboard
                'first_month_paid': enrollment.first_month_paid,
                'has_subject_enrollments': enrollment.has_subject_enrollments,
                'can_be_marked_admitted': enrollment.can_be_marked_admitted,
                'subject_enrollment_count': enrollment.subject_enrollments.filter(is_deleted=False, status__in=['ENROLLED', 'PENDING', 'PENDING_PAYMENT', 'PENDING_HEAD']).count(),
            })
            
        return Response(data)


# Register simple view classes for expected names
class TransfereeCreateView(APIView):
    """
    Registrar view to manually create a student (usually transferee).
    Handles user creation, profile, and initial credited subjects.
    """
    permission_classes = [IsAuthenticated] # Should be IsRegistrarOrAdmin
    
    def post(self, request, *args, **kwargs):
        from apps.accounts.serializers import StudentManualCreateSerializer
        from django.db import transaction
        
        serializer = StudentManualCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            with transaction.atomic():
                # 1. Generate Student Number
                from .services import EnrollmentService
                service = EnrollmentService()
                student_number = service.generate_student_number()
                
                # 2. Get validated data
                data = serializer.validated_data
                email = data.pop('email')
                first_name = data.pop('first_name')
                last_name = data.pop('last_name')
                password = data.pop('password', None)
                req_student_number = data.pop('student_number', None)
                credited_subjects = data.pop('credited_subjects', [])
                
                # 3. Create User
                from apps.accounts.models import User
                user = User.objects.create_user(
                    email=email,
                    username=email,
                    first_name=first_name,
                    last_name=last_name,
                    role='STUDENT',
                    student_number=req_student_number or student_number,
                    password=password or email # Temporary password is password or email
                )
                
                # 4. Create Profile (StudentManualCreateSerializer handles some, but let's be explicit if needed)
                from apps.accounts.models import StudentProfile
                profile = StudentProfile.objects.create(
                    user=user,
                    **data
                )
                
                # 5. Handle Credited Subjects
                if credited_subjects:
                    from .models import Enrollment, SubjectEnrollment
                    # Create a "PREVIOUS" enrollment record to hold credited subjects if no current semester?
                    # Or just use the current active semester for administrative record-keeping
                    active_semester = Semester.objects.filter(is_current=True).first()
                    
                    enrollment, _ = Enrollment.objects.get_or_create(
                        student=user,
                        semester=active_semester,
                        defaults={
                            'status': 'ACTIVE',
                            'monthly_commitment': 5000,
                            'created_via': 'TRANSFEREE'
                        }
                    )
                    
                    for item in credited_subjects:
                        SubjectEnrollment.objects.create(
                            enrollment=enrollment,
                            subject_id=item['subject_id'],
                            grade=item.get('grade'),
                            status='CREDITED',
                            enrollment_type='HOME',
                            payment_approved=True,
                            head_approved=True
                        )
                
                return Response({
                    'success': True,
                    'message': f'Student {student_number} created successfully.',
                    'student_id': str(user.id)
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TransfereeCreditView(APIView):
    """
    View to manage/view credited subjects for a transferee.
    Supporting lookup by StudentProfile ID (frontend default) or User ID.
    """
    permission_classes = [IsAuthenticated]
    
    def _get_student_user(self, pk):
        from apps.accounts.models import User, StudentProfile
        # Try StudentProfile first (most common from frontend)
        try:
            return StudentProfile.objects.get(id=pk).user
        except StudentProfile.DoesNotExist:
            # Fallback to User ID
            try:
                return User.objects.get(id=pk)
            except User.DoesNotExist:
                return None

    def get(self, request, pk, *args, **kwargs):
        """List credited subjects for student."""
        from .models import SubjectEnrollment
        
        user = self._get_student_user(pk)
        if not user:
            return Response({'error': 'Student not found'}, status=404)
        
        enrollments = SubjectEnrollment.objects.filter(
            enrollment__student=user,
            status='CREDITED',
            is_deleted=False
        ).select_related('subject')
        
        data = []
        for se in enrollments:
            data.append({
                'id': str(se.id),
                'subject_code': se.subject.code,
                'subject_title': se.subject.title,
                'grade': se.grade,
                'status': se.status
            })
        return Response(data)
        
    def post(self, request, pk, *args, **kwargs):
        """Add a credited subject."""
        from .models import Enrollment, SubjectEnrollment
        from apps.accounts.models import User
        
        subject_id = request.data.get('subject_id')
        grade = request.data.get('grade')
        
        if grade and isinstance(grade, str):
            grade = grade.upper().strip()
        
        if not subject_id:
            return Response({'error': 'Subject ID required'}, status=400)
            
        try:
            user = self._get_student_user(pk)
            if not user:
                return Response({'error': 'Student not found'}, status=404)
            
            # Use active semester for the container enrollment
            active_semester = Semester.objects.filter(is_current=True).first()
            if not active_semester:
                 return Response({'error': 'No active semester found to attach credit'}, status=400)
            
            enrollment, _ = Enrollment.objects.get_or_create(
                student=user,
                semester=active_semester,
                defaults={'status': 'ACTIVE', 'payment_approved': True, 'head_approved': True}
            )
            
            se, created = SubjectEnrollment.objects.update_or_create(
                enrollment=enrollment,
                subject_id=subject_id,
                defaults={
                    'grade': grade,
                    'status': 'CREDITED',
                    'enrollment_type': 'HOME',
                    'payment_approved': True,
                    'head_approved': True,
                    'is_deleted': False
                }
            )
            
            return Response({'success': True, 'id': str(se.id)})
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    def delete(self, request, pk, *args, **kwargs):
        """Delete a credited subject."""
        from .models import SubjectEnrollment
        
        user = self._get_student_user(pk)
        if not user:
             return Response({'error': 'Student not found'}, status=404)
        
        credit_id = request.data.get('credit_id') or request.query_params.get('credit_id')
        if not credit_id:
             return Response({'error': 'Credit ID required'}, status=400)
             
        try:
             # Ensure the credit belongs to the student (pk -> user)
             se = SubjectEnrollment.objects.get(id=credit_id, enrollment__student=user)
             se.is_deleted = True
             se.save()
             return Response({'success': True})
        except SubjectEnrollment.DoesNotExist:
             return Response({'error': 'Credit not found'}, status=404)

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
        
        elif action == 'admit':
            # ADMITTED status: Student paid initial fee and was approved but didn't enroll in subjects
            # during the enrollment period. They are considered "admitted" but not fully enrolled.
            if not student_number:
                return Response({"error": "Student ID is required for admission"}, status=400)
            
            # Check unique student number
            if User.objects.filter(student_number=student_number).exclude(pk=enrollment.student.pk).exists():
                return Response({"error": "Student ID already exists"}, status=400)
            
            try:
                with transaction.atomic():
                    # Update Student User with assigned student number
                    student = enrollment.student
                    student.student_number = student_number
                    student.save()
                    
                    # Update Enrollment to ADMITTED status
                    enrollment.status = 'ADMITTED'
                    enrollment.save()
                    
                    return Response({
                        "success": True,
                        "message": f"Student {student_number} marked as Admitted (paid but no subject enrollment)",
                        "data": {
                            "status": "ADMITTED",
                            "student_number": student_number
                        }
                    })
            except Exception as e:
                return Response({"error": str(e)}, status=500)
            
        return Response({"error": "Invalid action. Use 'accept', 'reject', or 'admit'"}, status=400)


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
        # Logic: Current Year/Sem + Back Subjects (Lower Years, Same Sem)
        
        target_year = request.query_params.get('year_level')
        target_sem = request.query_params.get('semester_number')
        
        # Build Query
        query = Q(curriculum=curriculum)
        
        # Only filter if parameters are explicitly provided
        if target_sem:
            query &= Q(semester_number=target_sem)
            
        if target_year:
            query &= Q(year_level=target_year)

        curriculum_subjects = CurriculumSubject.objects.filter(query).select_related('subject')

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
            from apps.academics.models import SectionSubject
            section_subjects = SectionSubject.objects.filter(
                subject=subject,
                section__semester=active_semester,
                is_deleted=False
            ).select_related('section', 'professor').prefetch_related('schedule_slots')

            # =========================================================
            # Apply Enrollment Rules (Regular vs Irregular vs Overload)
            # =========================================================
            home_section = profile.home_section
            is_irregular = profile.is_irregular
            is_overloaded = profile.overload_approved
            
            # Check if this is a retake subject (Failed, Dropped, or 5.00)
            is_retake = False
            last_enrollment = None
            retake_blocked_reason = None
            
            if subject.id in passed_subject_ids: # Should be caught above, but double check
                pass
            else:
                 # Check history for failures
                 last_enrollment = SubjectEnrollment.objects.filter(
                    enrollment__student=user,
                    subject=subject,
                    status__in=['FAILED', 'DROPPED', 'RETAKE', 'INC'] 
                 ).order_by('-created_at').first()
                 
                 if last_enrollment:
                     is_retake = True
                     # Check eligibility
                     if not last_enrollment.is_retake_eligible:
                         can_enroll = False
                         date_str = last_enrollment.retake_eligibility_date.strftime('%b %d, %Y') if last_enrollment.retake_eligibility_date else 'Unknown'
                         retake_blocked_reason = f"Retake blocked until {date_str}"

            # Define Freshman Status once
            is_freshman_first_sem = (profile.year_level == 1) and ("1st" in active_semester.name or "First" in active_semester.name)

            valid_sections = []
            for ss in section_subjects:
                allowed = False
                
                # Rule 1: Overloaded (Overvolumed)
                if is_overloaded:
                     allowed = True
                
                # Rule 2: Irregular
                elif is_irregular:
                    if ss.section == home_section:
                        allowed = True
                    elif is_retake:
                        allowed = True
                
                # Rule 3: Regular Freshman (Year 1 Sem 1)
                elif is_freshman_first_sem:
                    # If Home Section is ASSIGNED -> Restrict to it
                    if home_section:
                        if ss.section == home_section:
                            allowed = True
                        elif home_section and ss.section.name == home_section.name:
                             allowed = True
                    # If NO Home Section -> First Come First Serve (Enable All)
                    else:
                        allowed = True

                # Rule 4: Current Students (Year > 1 OR Year 1 Sem 2) -> Open Choice
                else:
                    allowed = True

                if allowed:
                    valid_sections.append(ss)

            sections = []
            for ss in valid_sections:
                sections.append({
                    'section_id': str(ss.section.id),
                    'section_name': ss.section.name,
                    'available_slots': ss.section.available_slots,
                    'professor': ss.professor.get_full_name() if ss.professor else 'TBA',
                    'schedule': [
                        {
                            'day': slot.get_day_display(),
                            'start_time': slot.start_time.strftime("%I:%M %p"),
                            'end_time': slot.end_time.strftime("%I:%M %p"),
                            'room': slot.room or 'TBA'
                        } for slot in ss.schedule_slots.filter(is_deleted=False)
                    ]
                })

            recommended.append({
                'id': str(subject.id),
                'code': subject.code,
                'title': subject.title,
                'units': subject.units,
                'year_level': cs.year_level,
                'semester_number': cs.semester_number,
                'can_enroll': can_enroll,
                'is_retake': is_retake,  # Helpful for UI
                'enrollment_blocked_reason': retake_blocked_reason,
                'missing_prerequisites': missing_prereqs,
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
                "max_units": 26 # Typically 24-26, hardcoded for now or fetch from config
            }
        })
class AvailableSubjectsView(APIView):
    """
    Get all subjects that are available for enrollment (have sections in active semester).
    This is broader than RecommendedSubjectsView as it ignores the student's specific curriculum year level.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        from apps.enrollment.models import Semester, SubjectEnrollment
        from apps.academics.models import Section, Subject
        from django.db.models import Q

        user = request.user
        
        # 1. Get active semester
        active_semester = Semester.objects.filter(is_current=True).first()
        if not active_semester:
            return Response({"error": "No active semester found"}, status=400)

        # 2. Get subjects that have sections offered this semester
        # Optimization: distinct() on subject
        offered_subjects = Subject.objects.filter(
            section_subjects__section__semester=active_semester,
            section_subjects__section__is_deleted=False,
            section_subjects__is_deleted=False,
            is_deleted=False
        ).distinct().prefetch_related('prerequisites')

        # 3. Get Student status
        passed_subjects = set(SubjectEnrollment.objects.filter(
            enrollment__student=user,
            status__in=['PASSED', 'CREDITED']
        ).values_list('subject_id', flat=True))

        current_subjects = set(SubjectEnrollment.objects.filter(
            enrollment__student=user,
            enrollment__semester=active_semester,
            status__in=['ENROLLED', 'PENDING']
        ).values_list('subject_id', flat=True))

        # 4. Filter and Format
        # We can implement search here if needed
        search = request.query_params.get('search', '').lower()

        data = []
        for subject in offered_subjects:
            if search and (search not in subject.code.lower() and search not in subject.title.lower()):
                continue

            # Check prerequisites
            prereqs_met = True
            missing_prereqs = []
            for p in subject.prerequisites.all():
                if p.id not in passed_subjects:
                    prereqs_met = False
                    missing_prereqs.append(p.code)

            # Get sections
            # Get sections (with Filtering)
            from apps.academics.models import SectionSubject
            section_subjects = SectionSubject.objects.filter(
                subject=subject,
                section__semester=active_semester,
                is_deleted=False
            ).select_related('section', 'professor')

            # Get Student Profile
            profile = user.student_profile
            home_section = profile.home_section
            is_irregular = profile.is_irregular
            is_overloaded = profile.overload_approved

            # Check if retake
            is_retake = False
            if subject.id not in passed_subjects: # basic check
                 is_retake = SubjectEnrollment.objects.filter(
                    enrollment__student=user,
                    subject=subject,
                    status__in=['FAILED', 'DROPPED', 'RETAKE']
                 ).exists()

            valid_sections = []
            for ss in section_subjects:
                allowed = False
                # Rule 3: Overloaded
                if is_overloaded:
                     allowed = True
                # Rule 2: Irregular
                elif is_irregular:
                    if ss.section == home_section:
                        allowed = True
                    elif is_retake:
                        allowed = True
                # Rule 3: Current Students (Year > 1 OR Year 1 Sem 2)
                # Open Choice ("At Will")
                elif not ((profile.year_level == 1) and ("1st" in active_semester.name or "First" in active_semester.name)):
                     allowed = True
                
                # Rule 4: Regular Freshman (Year 1 Sem 1)
                # Restricted to Home Section
                else:
                    if ss.section == home_section:
                        allowed = True
                    elif home_section and ss.section.name == home_section.name:
                        allowed = True
                
                if allowed:
                    valid_sections.append(ss)

            available_sections = []
            for ss in valid_sections:
                available_sections.append({
                    'id': str(ss.section.id),
                    'name': ss.section.name,
                    'slots': ss.section.available_slots,
                    'enrolled': ss.section.enrolled_count, # Estimate
                    'professor': ss.professor.get_full_name() if ss.professor else 'TBA',
                    'schedule': [
                        {
                            'day': slot.get_day_display(),
                            'start_time': slot.start_time.strftime("%H:%M"),
                            'end_time': slot.end_time.strftime("%H:%M"),
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
                'prerequisites_met': prereqs_met,
                'missing_prerequisites': missing_prereqs,
                'is_enrolled': subject.id in current_subjects,
                'is_passed': subject.id in passed_subjects,
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
        from apps.enrollment.models import Semester, SubjectEnrollment
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

        # Bulk fetch professors and schedules via SectionSubject
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
            
            # Get professor from map
            prof = prof_map.get((se.section_id, se.subject_id))
            prof_name = prof.get_full_name() if prof else 'TBA'
            
            # Get slots from map
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
                'approval_status_display': 'Enrolled' if se.status == 'ENROLLED' else 'Pending Head' if not se.head_approved else 'Pending Payment',
                'is_fully_enrolled': se.status == 'ENROLLED',
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
        
        # 1. Get student profile & program
        if not hasattr(user, 'student_profile') or not user.student_profile:
            return Response({"error": "Student profile not found"}, status=400)
            
        profile = user.student_profile
        program = profile.program
        
        if not program:
            return Response({"error": "No program assigned"}, status=400)

        # 2. Get Curriculum
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
                'academic_year': e.enrollment.semester.academic_year if e.enrollment.semester else 'N/A',
                'retake_eligibility_date': e.retake_eligibility_date,
                'is_retake_eligible': e.is_retake_eligible
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
                'retake_eligibility_date': grade_info['retake_eligibility_date'] if grade_info else None,
                'is_retake_eligible': grade_info['is_retake_eligible'] if grade_info else None,
            })

        # Calculate GPA (simple average of numeric grades for now)
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

MyScheduleView = SimpleGETView

class EnrollSubjectView(APIView):
    """
    Enroll a student in a specific subject section.
    Delegates validation and fulfillment to SubjectEnrollmentService.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        from apps.enrollment.models import Enrollment, Semester
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
        
        # 1. Validate Input
        serializer = EnrollSubjectRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"error": serializer.errors}, status=400)
            
        subject_id = serializer.validated_data['subject_id']
        section_id = serializer.validated_data['section_id']

        try:
            with transaction.atomic():
                # 2. Get Student Profile & Status
                if not hasattr(user, 'student_profile'):
                    return Response({"error": "Student profile not found"}, status=400)
                
                # 3. Get Active Semester
                semester = Semester.objects.filter(is_current=True).first()
                if not semester:
                    return Response({"error": "No active semester"}, status=400)
                
                if not semester.is_enrollment_open:
                    return Response({"error": "Enrollment is currently closed"}, status=400)

                # 4. Get/Create Enrollment Header
                enrollment, _ = Enrollment.objects.get_or_create(
                    student=user,
                    semester=semester,
                    defaults={
                        'status': Enrollment.Status.PENDING,
                        'monthly_commitment': 0
                    }
                )
                
                # 5. Fetch Subject & Section
                try:
                    subject = Subject.objects.get(id=subject_id, is_deleted=False)
                    section = Section.objects.get(id=section_id, is_deleted=False)
                except (Subject.DoesNotExist, Section.DoesNotExist):
                     return Response({"error": "Subject or Section not found"}, status=404)

                # 6. Call Service for Core Logic
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
            return Response({"error": str(e)}, status=402) # Payment Required
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": "An internal error occurred"}, status=500)
DropSubjectView = SimplePOSTView
EditSubjectEnrollmentView = SimplePOSTView
class RegistrarOverrideEnrollmentView(APIView):
    """
    Registrar-initiated subject override.
    Bypasses all standard enrollment validation rules.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, enrollment_id, *args, **kwargs):
        from apps.enrollment.models import Enrollment, Semester
        from apps.academics.models import Subject, Section
        from apps.accounts.models import User
        from apps.enrollment.serializers import RegistrarOverrideSerializer
        from apps.enrollment.services import SubjectEnrollmentService
        from django.db import transaction

        user = request.user
        
        # 1. Role Check
        if user.role not in ['REGISTRAR', 'HEAD_REGISTRAR', 'ADMIN', 'DEPARTMENT_HEAD']:
            return Response({"error": "Only registrars and administrators can perform overrides"}, status=403)

        # 2. Validate Input
        serializer = RegistrarOverrideSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"error": serializer.errors}, status=400)
            
        student_id = serializer.validated_data['student_id']
        subject_id = serializer.validated_data['subject_id']
        section_id = serializer.validated_data['section_id']
        override_reason = serializer.validated_data['override_reason']

        try:
            with transaction.atomic():
                # 3. Get Student Profile
                try:
                    student = User.objects.get(id=student_id, role='STUDENT')
                except User.DoesNotExist:
                    return Response({"error": "Student not found"}, status=404)

                # 4. Get Target Enrollment
                try:
                    enrollment = Enrollment.objects.get(id=enrollment_id, student=student)
                except Enrollment.DoesNotExist:
                     return Response({"error": "Enrollment header not found for this student"}, status=404)
                
                # 5. Fetch Subject & Section
                try:
                    subject = Subject.objects.get(id=subject_id, is_deleted=False)
                    section = Section.objects.get(id=section_id, is_deleted=False)
                except (Subject.DoesNotExist, Section.DoesNotExist):
                     return Response({"error": "Subject or Section not found"}, status=404)

                # 6. Call Service for Override
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

PaymentRecordView = SimplePOSTView
class PaymentAdjustmentView(APIView):
    """
    Create a payment adjustment transaction.
    Used by cashiers to correct errors, apply refunds, or make manual adjustments.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        from apps.enrollment.models import Enrollment, PaymentTransaction
        from decimal import Decimal, InvalidOperation
        from datetime import datetime
        import uuid

        user = request.user
        # Permission check: Cashier, Registrar, or Admin
        if user.role not in ['CASHIER', 'REGISTRAR', 'HEAD_REGISTRAR', 'ADMIN']:
            return Response({"error": "Permission denied"}, status=403)

        enrollment_id = request.data.get('enrollment_id')
        amount = request.data.get('amount')
        adjustment_reason = request.data.get('adjustment_reason', '')
        original_transaction_id = request.data.get('original_transaction_id')
        payment_mode = request.data.get('payment_mode', 'CASH')

        # Validation
        if not enrollment_id:
            return Response({"error": "Enrollment ID is required"}, status=400)
        if not amount:
            return Response({"error": "Adjustment amount is required"}, status=400)
        if not adjustment_reason or len(adjustment_reason.strip()) < 5:
            return Response({"error": "Adjustment reason is required (min 5 characters)"}, status=400)

        try:
            amount = Decimal(str(amount))
        except (InvalidOperation, ValueError):
            return Response({"error": "Invalid amount format"}, status=400)

        if amount == 0:
            return Response({"error": "Adjustment amount cannot be zero"}, status=400)

        # Get enrollment
        try:
            enrollment = Enrollment.objects.get(id=enrollment_id)
        except Enrollment.DoesNotExist:
            return Response({"error": "Enrollment not found"}, status=404)

        # Get original transaction if provided
        original_txn = None
        if original_transaction_id:
            try:
                original_txn = PaymentTransaction.objects.get(id=original_transaction_id)
            except PaymentTransaction.DoesNotExist:
                return Response({"error": "Original transaction not found"}, status=404)

        # Generate adjustment receipt number
        now = datetime.now()
        random_suffix = str(uuid.uuid4())[:5].upper()
        receipt_number = f"ADJ-{now.strftime('%Y%m%d')}-{random_suffix}"

        # Ensure unique receipt
        while PaymentTransaction.objects.filter(receipt_number=receipt_number).exists():
            random_suffix = str(uuid.uuid4())[:5].upper()
            receipt_number = f"ADJ-{now.strftime('%Y%m%d')}-{random_suffix}"

        # Create adjustment transaction
        transaction = PaymentTransaction.objects.create(
            enrollment=enrollment,
            amount=abs(amount),
            payment_mode=payment_mode,
            receipt_number=receipt_number,
            is_adjustment=True,
            adjustment_reason=adjustment_reason.strip(),
            original_transaction=original_txn,
            processed_by=user,
            notes=f"Adjustment: {adjustment_reason.strip()}"
        )

        return Response({
            "success": True,
            "data": {
                "id": str(transaction.id),
                "receipt_number": transaction.receipt_number,
                "amount": str(transaction.amount),
                "adjustment_reason": transaction.adjustment_reason,
                "payment_mode": transaction.payment_mode,
                "processed_by": user.get_full_name(),
                "processed_at": transaction.processed_at.isoformat() if transaction.processed_at else None,
                "original_receipt": original_txn.receipt_number if original_txn else None,
            }
        }, status=201)
class PaymentTransactionListView(APIView):
    """
    List all payment transactions with filtering and pagination.
    For admin/registrar oversight of all financial transactions.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        from apps.enrollment.models import PaymentTransaction
        from django.db.models import Q

        user = request.user
        if user.role not in ['ADMIN', 'CASHIER', 'REGISTRAR', 'HEAD_REGISTRAR']:
            return Response({"error": "Permission denied"}, status=403)

        qs = PaymentTransaction.objects.select_related(
            'enrollment', 'enrollment__student', 'processed_by'
        ).order_by('-processed_at')

        # Search filter
        search = request.query_params.get('search', '')
        if search:
            qs = qs.filter(
                Q(receipt_number__icontains=search) |
                Q(enrollment__student__first_name__icontains=search) |
                Q(enrollment__student__last_name__icontains=search) |
                Q(enrollment__student__student_number__icontains=search)
            )

        # Date range filter
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(processed_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(processed_at__date__lte=date_to)

        # Payment mode filter
        mode = request.query_params.get('payment_mode')
        if mode:
            qs = qs.filter(payment_mode=mode)

        # Type filter (regular vs adjustment)
        txn_type = request.query_params.get('type')
        if txn_type == 'adjustment':
            qs = qs.filter(is_adjustment=True)
        elif txn_type == 'regular':
            qs = qs.filter(is_adjustment=False)

        # Pagination
        page = int(request.query_params.get('page', 1))
        per_page = 25
        total = qs.count()
        start = (page - 1) * per_page
        end = start + per_page
        transactions = qs[start:end]

        results = []
        for txn in transactions:
            student = txn.enrollment.student if txn.enrollment else None
            results.append({
                'id': str(txn.id),
                'receipt_number': txn.receipt_number,
                'amount': str(txn.amount),
                'payment_mode': txn.payment_mode,
                'is_adjustment': txn.is_adjustment,
                'adjustment_reason': txn.adjustment_reason or '',
                'student_name': student.get_full_name() if student else 'Unknown',
                'student_number': student.student_number if student else 'N/A',
                'processed_by': txn.processed_by.get_full_name() if txn.processed_by else 'System',
                'processed_at': txn.processed_at.isoformat() if txn.processed_at else None,
                'notes': txn.notes or '',
                'original_receipt': txn.original_transaction.receipt_number if txn.original_transaction else None,
            })

        return Response({
            'results': results,
            'count': total,
            'next': page * per_page < total,
            'previous': page > 1,
        })
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

# Import exam views
from .views_exam import (
    ExamMonthMappingView,
    ExamMonthMappingDetailView,
    MyExamPermitsView,
    GenerateExamPermitView,
    PrintExamPermitView,
    ExamPermitListView
)

ProfessorSectionsView = SimpleGETView
SectionStudentsView = SimpleGETView
class SubmitGradeView(APIView):
    """
    Submit grades for a specific student in a subject.
    Enforces grading window.
    """
    permission_classes = [IsAuthenticated] # Should be IsProfessor

    def post(self, request, *args, **kwargs):
        from apps.enrollment.models import SubjectEnrollment, GradeHistory, Semester
        from decimal import Decimal
        
        # 1. Get Active Semester and check window
        semester = Semester.objects.filter(is_current=True).first()
        if not semester:
            return Response({"error": "No active semester"}, status=400)
            
        if not semester.is_grading_open:
            # Allow if it is a resolution request? (Phase 4)
            # For now, strict block
            return Response({"error": "Grading window is closed"}, status=400)
            
        enrollment_id = request.data.get('enrollment_id')
        grade_value = request.data.get('grade')
        
        if not enrollment_id or grade_value is None:
            return Response({"error": "Enrollment ID and Grade are required"}, status=400)
            
        try:
            se = SubjectEnrollment.objects.get(id=enrollment_id)
        except SubjectEnrollment.DoesNotExist:
            return Response({"error": "Subject enrollment not found"}, status=404)
            
        # Check if professor handles this section (TODO: Authorization check)
        
        # Check if already finalized
        if se.is_finalized:
            return Response({"error": "Grade is already finalized"}, status=400)
            
        # Validate Grade Value
        allowed_grades = ['1.00', '1.25', '1.50', '1.75', '2.00', '2.25', '2.50', '2.75', '3.00', '5.00', 'INC', 'DRP']
        # Convert numeric inputs to string for check
        if str(grade_value) not in allowed_grades and str(float(grade_value)) not in allowed_grades:
             # Allow numeric check
             pass # TODO: stricter validation
        
        # Update Grade
        old_grade = se.grade
        old_status = se.status
        
        se.grade = Decimal(grade_value) if hasattr(grade_value, 'isdigit') or isinstance(grade_value, (int, float)) else None
        
        # Map grade to status
        new_status = 'ENROLLED'
        if str(grade_value) == 'INC':
            new_status = 'INC'
        elif str(grade_value) == 'DRP':
            new_status = 'DROPPED'
        elif str(grade_value) == '5.00' or (se.grade and se.grade == 5.0):
             new_status = 'FAILED'
        elif se.grade and se.grade <= 3.0:
             new_status = 'PASSED'
             
        se.status = new_status
        se.save()
        
        # History
        GradeHistory.objects.create(
            subject_enrollment=se,
            previous_grade=old_grade,
            new_grade=se.grade,
            previous_status=old_status,
            new_status=new_status,
            changed_by=request.user,
            change_reason="Grade submission"
        )
        
        return Response({"success": True, "message": "Grade submitted"})
# Import finalization views
from .views_finalization import (
    SectionFinalizationListView,
    FinalizeSectionGradesView,
    OverrideGradeView
)

# Import real implementations from views_student_grades
from .views_student_grades import (
    MyGradesView,
    MyTranscriptView,
    INCReportView,
    ProcessExpiredINCsView
)
class UpdateAcademicStandingView(APIView):
    """
    Update a student's academic standing.
    POST: Set the academic standing (e.g., Good Standing, Dean's List, Probation).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, student_id, *args, **kwargs):
        from apps.accounts.models import StudentProfile

        user = request.user
        if user.role not in ['REGISTRAR', 'HEAD_REGISTRAR', 'ADMIN']:
            return Response({"error": "Permission denied"}, status=403)

        try:
            profile = StudentProfile.objects.select_related('user').get(user__id=student_id)
        except StudentProfile.DoesNotExist:
            return Response({"error": "Student not found"}, status=404)

        standing = request.data.get('academic_standing', '').strip()
        if not standing:
            return Response({"error": "academic_standing is required"}, status=400)
        if len(standing) > 100:
            return Response({"error": "academic_standing must be 100 characters or less"}, status=400)

        profile.academic_standing = standing
        profile.save(update_fields=['academic_standing'])

        return Response({
            "message": "Academic standing updated successfully",
            "academic_standing": profile.academic_standing,
            "student_name": profile.user.get_full_name()
        })

# Import document release views
from .views_documents import (
    CreateDocumentReleaseView,
    MyReleasesView,
    StudentDocumentsView,
    DocumentDetailView,
    DownloadDocumentPDFView,
    RevokeDocumentView,
    ReissueDocumentView,
    AllReleasesView,
    DocumentReleaseStatsView
)

StudentEnrollmentStatusView = SimpleGETView # TODO: Implement this

# Import head approval views
from .views_head import (
    HeadPendingEnrollmentsView,
    HeadApproveEnrollmentView,
    HeadRejectEnrollmentView,
    HeadBulkApproveView
)

GenerateCORView = SimplePOSTView

from rest_framework import status
from rest_framework.decorators import action
from django.utils import timezone

class GradeResolutionViewSet(ModelViewSet):
    """
    ViewSet for handling grade resolution requests.
    """
    queryset = GradeResolution.objects.all().select_related(
        'subject_enrollment__enrollment__student',
        'subject_enrollment__subject',
        'requested_by'
    )
    serializer_class = GradeResolutionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        if user.role == 'PROFESSOR':
            from django.db.models import Q
            return self.queryset.filter(
                Q(requested_by=user) | 
                Q(subject_enrollment__section__professor=user) |
                Q(subject_enrollment__section__professor_assignments__professor=user)
            ).distinct()
        elif user.role in ['REGISTRAR', 'HEAD_REGISTRAR', 'ADMIN']:
            return self.queryset.all()
        elif user.role == 'DEPARTMENT_HEAD' and hasattr(user, 'department_head_profile'):
            return self.queryset.filter(
                subject_enrollment__subject__program__in=user.department_head_profile.programs.all()
            )
        return self.queryset.none()

    def perform_create(self, serializer):
        subject_enrollment = serializer.validated_data['subject_enrollment']
        serializer.save(
            requested_by=self.request.user,
            current_grade=subject_enrollment.grade,
            current_status=subject_enrollment.status,
            status=GradeResolution.Status.PENDING_HEAD
        )

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """List resolutions pending review based on role."""
        user = request.user
        if user.role in ['REGISTRAR', 'HEAD_REGISTRAR', 'ADMIN']:
            pending = self.get_queryset().filter(status=GradeResolution.Status.PENDING_REGISTRAR)
        elif user.role == 'DEPARTMENT_HEAD':
            pending = self.get_queryset().filter(status=GradeResolution.Status.PENDING_HEAD)
        else:
            pending = self.get_queryset().none()
            
        serializer = self.get_serializer(pending, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a resolution (Registrar or Head)."""
        resolution = self.get_object()
        user = request.user
        notes = request.data.get('notes', '')
        
        with transaction.atomic():
            if user.role in ['REGISTRAR', 'HEAD_REGISTRAR', 'ADMIN']:
                if resolution.status != GradeResolution.Status.PENDING_REGISTRAR:
                    return Response(
                        {'detail': f'Resolution is in {resolution.status} status, cannot be approved by registrar'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Final Approval by Registrar
                resolution.status = GradeResolution.Status.APPROVED
                resolution.reviewed_by_registrar = user
                resolution.registrar_action_at = timezone.now()
                resolution.registrar_notes = notes or resolution.registrar_notes
                resolution.save()
                
                # Apply the grade change to SubjectEnrollment
                se = resolution.subject_enrollment
                previous_grade = se.grade
                previous_status = se.status
                
                se.grade = resolution.proposed_grade
                se.status = resolution.proposed_status
                se.save()
                
                # Create GradeHistory
                from .models import GradeHistory
                GradeHistory.objects.create(
                    subject_enrollment=se,
                    previous_grade=previous_grade,
                    new_grade=se.grade,
                    previous_status=previous_status,
                    new_status=se.status,
                    changed_by=user,
                    change_reason=f"Grade Resolution Approved: {resolution.reason}",
                    is_system_action=False
                )
                
                return Response({'success': True, 'message': 'Resolution approved and grade updated'})
                
            elif user.role == 'DEPARTMENT_HEAD':
                if resolution.status != GradeResolution.Status.PENDING_HEAD:
                    return Response(
                        {'detail': f'Resolution is in {resolution.status} status, cannot be approved by head'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Forward to Registrar
                resolution.status = GradeResolution.Status.PENDING_REGISTRAR
                resolution.reviewed_by_head = user
                resolution.head_action_at = timezone.now()
                resolution.head_notes = notes or resolution.head_notes
                resolution.save()
                
                return Response({'success': True, 'message': 'Approved by Head and forwarded to Registrar'})
            
            return Response({'error': 'Unauthorized role for approval'}, status=status.HTTP_403_FORBIDDEN)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a resolution."""
        resolution = self.get_object()
        reason = request.data.get('reason', '') or request.data.get('notes', '')
        
        resolution.status = GradeResolution.Status.REJECTED
        
        if request.user.role in ['REGISTRAR', 'HEAD_REGISTRAR', 'ADMIN']:
            resolution.reviewed_by_registrar = request.user
            resolution.registrar_action_at = timezone.now()
            resolution.registrar_notes = reason
        else:
            resolution.reviewed_by_head = request.user
            resolution.head_action_at = timezone.now()
            resolution.head_notes = reason
            
        resolution.save()
        return Response({'success': True, 'message': 'Resolution rejected'})

# ============================================================
# Grading Views (EPIC 5)
# ============================================================
from .views_grading import (
    ProfessorAssignedSectionsView,
    ProfessorGradeableStudentsView,
    ProfessorSubmitGradeView,
    BulkGradeSubmissionView,
    GradeHistoryView
)

# Legacy alias
GradeHistoryViewLegacy = GradeHistoryView
