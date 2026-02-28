"""
Public enrollment views — no authentication required.
Handles enrollment status, program listing, availability checks, and online enrollment.
"""

from rest_framework.views import APIView
from rest_framework.response import Response

from .models import Semester


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
    from rest_framework.permissions import IsAuthenticated
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
        required = ['first_name', 'last_name', 'email', 'program_id', 'birthdate', 'address', 'contact_number']
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
            enrollment = service.create_online_enrollment(data)
            user = enrollment.student
            
            # Extract birth year for the password display
            birth_year = "2000"
            try:
                if isinstance(data['birthdate'], str):
                    birth_year = data['birthdate'].split('-')[0]
                else:
                    birth_year = str(data['birthdate'].year)
            except:
                pass

            return Response({
                "success": True,
                "message": "Enrollment submitted successfully",
                "credentials": {
                    "login_email": user.email,
                    "school_email": user.username, # Keep for record
                    "initial_password": f"RW@{birth_year}",
                    "student_number": user.student_number or "PENDING"
                },
                "user": {
                    "id": str(user.id),
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "role": user.role,
                    "student_number": user.student_number or "PENDING",
                }
            }, status=201)
                
        except ValueError as e:
            return Response({"error": str(e)}, status=400)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": "An unexpected error occurred"}, status=500)
