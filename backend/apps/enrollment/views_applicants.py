"""
Applicant management views — admission staff endpoints.
Handles applicant listing, approval/rejection, transferee creation, and student number generation.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.db import transaction

from .models import Enrollment, Semester


class ApplicantListView(APIView):
    """
    List pending applicants for the admission dashboard.
    Supports filtering by status (default: PENDING).
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, *args, **kwargs):
        req_status = request.query_params.get('status', 'PENDING')
        
        # Filter enrollments - support 'all' or comma-separated statuses
        if req_status.lower() == 'all':
            enrollments = Enrollment.objects.all()
        elif ',' in req_status:
            status_list = [s.strip() for s in req_status.split(',')]
            enrollments = Enrollment.objects.filter(status__in=status_list)
        else:
            enrollments = Enrollment.objects.filter(status=req_status)
        
        enrollments = enrollments.select_related(
            'student', 'semester', 'student__student_profile', 
            'student__student_profile__program',
            'student__student_profile__home_section'
        )
        
        data = []
        for enrollment in enrollments:
            student = enrollment.student
            profile = getattr(student, 'student_profile', None)
            program = profile.program if profile else None
            section = profile.home_section if profile else None
            
            data.append({
                'id': str(enrollment.id),
                'student_id': str(student.id),
                'student_number': student.student_number or 'PENDING',
                'first_name': student.first_name,
                'last_name': student.last_name,
                'middle_name': profile.middle_name if profile else '',
                'suffix': profile.suffix if profile else '',
                'email': student.email,
                'contact_number': profile.contact_number if profile else '',
                'address': profile.address if profile else '',
                'birthdate': profile.birthdate.isoformat() if profile and profile.birthdate else '',
                'gender': getattr(profile, 'gender', 'Not Specified'),
                'civil_status': getattr(profile, 'civil_status', 'Single'),
                'program_name': program.name if program else 'N/A',
                'program_code': program.code if program else 'N/A',
                'year_level': profile.year_level if profile else 1,
                'section_name': section.name if section else 'Awaiting Assignment',
                'section_id': str(section.id) if section else None,
                'status': enrollment.status,
                'created_at': enrollment.created_at.isoformat() if enrollment.created_at else None,
                'updated_at': enrollment.updated_at.isoformat() if hasattr(enrollment, 'updated_at') and enrollment.updated_at else None,
                'is_transferee': profile.is_transferee if profile else False,
                'total_paid': float(enrollment.total_paid),
                'total_required': float(enrollment.total_required),
                'balance': float(enrollment.balance),
                'first_month_paid': enrollment.first_month_paid,
                'assigned_visit_date': enrollment.assigned_visit_date.isoformat() if enrollment.assigned_visit_date else None,
                'admission_notes': enrollment.admission_notes,
            })
            
        return Response(data)


class TransfereeCreateView(APIView):
    """
    Registrar view to manually create a student (usually transferee).
    Handles user creation, profile, and initial credited subjects.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        from apps.accounts.serializers import StudentManualCreateSerializer
        
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
                    password=password or email
                )
                
                # 4. Create Profile
                from apps.accounts.models import StudentProfile
                profile = StudentProfile.objects.create(
                    user=user,
                    **data
                )
                
                # 5. Handle Credited Subjects
                if credited_subjects:
                    from .models import SubjectEnrollment
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
        try:
            return StudentProfile.objects.get(id=pk).user
        except StudentProfile.DoesNotExist:
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
        from .models import SubjectEnrollment
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
        
        latest_student = User.objects.filter(
            student_number__startswith=prefix
        ).order_by('-student_number').first()
        
        if latest_student and latest_student.student_number:
            try:
                existing_suffix = latest_student.student_number.replace(prefix, '')
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
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk, *args, **kwargs):
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
                
            if User.objects.filter(student_number=student_number).exclude(pk=enrollment.student.pk).exists():
                return Response({"error": "Student ID already exists"}, status=400)
            
            try:
                with transaction.atomic():
                    student = enrollment.student
                    student.student_number = student_number
                    student.save()
                    
                    enrollment.status = 'ACTIVE'
                    enrollment.save()
                    
                    # Auto-assign section and subjects
                    from .services.section_service import SectionService
                    section_service = SectionService()
                    section = section_service.auto_assign_new_student(enrollment)
                    
                    if section:
                        message = f"Applicant approved with ID {student_number} and assigned to section {section.name}."
                    else:
                        message = f"Applicant approved with ID {student_number}, but no available section was found."

                    return Response({
                        "success": True,
                        "message": message,
                        "data": {
                            "status": "ACTIVE",
                            "student_number": student_number,
                            "section": section.name if section else None
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
            if not student_number:
                return Response({"error": "Student ID is required for admission"}, status=400)
            
            if User.objects.filter(student_number=student_number).exclude(pk=enrollment.student.pk).exists():
                return Response({"error": "Student ID already exists"}, status=400)
            
            try:
                with transaction.atomic():
                    student = enrollment.student
                    student.student_number = student_number
                    student.save()
                    
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
            
        elif action == 'assign_visit_date':
            visit_date = request.data.get('visit_date')
            notes = request.data.get('notes', '')

            if not visit_date:
                return Response({'error': 'visit_date is required'}, status=400)

            try:
                from datetime import date as date_type
                if isinstance(visit_date, str):
                    visit_date = date_type.fromisoformat(visit_date)
            except ValueError:
                return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=400)

            enrollment.assigned_visit_date = visit_date
            if notes:
                enrollment.admission_notes = notes
            enrollment.save(update_fields=['assigned_visit_date', 'admission_notes', 'updated_at'])

            from apps.audit.models import AuditLog
            AuditLog.log(
                action=AuditLog.Action.USER_UPDATED,
                target_model='Enrollment',
                target_id=enrollment.id,
                payload={
                    'action': 'assign_visit_date',
                    'student': enrollment.student.get_full_name(),
                    'visit_date': str(visit_date),
                    'assigned_by': request.user.get_full_name(),
                }
            )

            return Response({
                'success': True,
                'message': f'Visit date {visit_date} assigned to {enrollment.student.get_full_name()}',
                'data': {
                    'assigned_visit_date': str(visit_date),
                    'admission_notes': enrollment.admission_notes,
                }
            })

        return Response({'error': "Invalid action. Use 'accept', 'reject', 'admit', or 'assign_visit_date'"}, status=400)
