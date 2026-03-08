from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.contrib.auth import get_user_model
from core.permissions import IsAdmin, IsAdmission, IsRegistrar
from .models import Student, StudentEnrollment
from .serializers import StudentSerializer, StudentApplicationSerializer, StudentEnrollmentSerializer

User = get_user_model()

class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    filterset_fields = ['status', 'student_type', 'program']
    search_fields = ['user__first_name', 'user__last_name', 'user__email', 'idn']

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and user.role == 'STUDENT':
            return Student.objects.filter(user=user)
        return Student.objects.all()
    
    def get_permissions(self):
        if self.action == 'apply':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['post'], url_path='apply')
    def apply(self, request):
        serializer = StudentApplicationSerializer(data=request.data)
        if serializer.is_valid():
            try:
                with transaction.atomic():
                    data = serializer.validated_data
                    
                    # Create User
                    email = data['email']
                    if User.objects.filter(email=email).exists():
                        return Response({'error': 'A student with this email already has an application or account.'}, status=status.HTTP_400_BAD_REQUEST)
                        
                    user = User.objects.create_user(
                        username=email, # Use email as temporary username
                        email=email,
                        first_name=data['first_name'],
                        last_name=data['last_name'],
                        role='STUDENT',
                        is_active=False
                    )
                    user.save()
                    
                    # Create Student
                    student = Student.objects.create(
                        user=user,
                        idn=f"APP-{user.id}",
                        middle_name=data.get('middle_name'),
                        date_of_birth=data['date_of_birth'],
                        gender=data['gender'],
                        address_municipality=data['address_municipality'],
                        address_barangay=data['address_barangay'],
                        address_full=data.get('address_full'),
                        contact_number=data['contact_number'],
                        guardian_name=data['guardian_name'],
                        guardian_contact=data['guardian_contact'],
                        program=data['program'],
                        curriculum=data['curriculum'],
                        student_type=data['student_type'],
                        status='APPLICANT'
                    )
                    
                return Response(StudentSerializer(student).data, status=status.HTTP_201_CREATED)
            except Exception as e:
                # Log the error here if you had a logger
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        # If serializer is not valid, return the specific field errors
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[IsAdmission])
    def approve(self, request, pk=None):
        student = self.get_object()
        if student.status != 'APPLICANT':
            return Response({'error': 'Only applicants can be approved'}, status=status.HTTP_400_BAD_REQUEST)
            
        monthly_commitment = request.data.get('monthly_commitment')
        if not monthly_commitment:
            return Response({'error': 'Monthly commitment is required for approval'}, status=status.HTTP_400_BAD_REQUEST)

        # Get active term
        from apps.terms.models import Term
        active_term = Term.objects.filter(is_active=True).first()
        if not active_term:
            return Response({'error': 'No active term found. Please activate a term first.'}, status=status.HTTP_400_BAD_REQUEST)

        from core.models import SystemSequence
        from .services import AdvisingService
        import datetime

        try:
            with transaction.atomic():
                # Thread-safe sequential IDN generation: YY{sequential_4_digits}
                # e.g., 2027 becomes 270001
                year_prefix = str(datetime.datetime.now().year)[2:]
                sequence_key = f"idn_{year_prefix}"
                
                # Lock the sequence row for update
                seq_obj, _ = SystemSequence.objects.select_for_update().get_or_create(key=sequence_key)
                
                # Resilient generation: Loop until we find a non-existing username
                # This auto-heals if the sequence and database get out of sync
                while True:
                    seq_obj.last_value += 1
                    idn = f"{year_prefix}{str(seq_obj.last_value).zfill(4)}"
                    if not User.objects.filter(username=idn).exists():
                        break
                
                seq_obj.save()
                
                student.idn = idn
                student.status = 'APPROVED'
                student.user.username = idn # IDN is the username
                student.user.is_active = True
                
                dob_suffix = student.date_of_birth.strftime('%m%d')
                generated_password = f"{idn}{dob_suffix}"
                student.user.set_password(generated_password)
                student.user.save()
                
                student.save()

                # Get Year Level from Service
                year_level = AdvisingService.get_year_level(student, active_term)

                # Create Enrollment for the active term
                # If they are already enrolled for this term, update it
                enrollment, _ = StudentEnrollment.objects.get_or_create(
                    student=student,
                    term=active_term,
                    defaults={
                        'monthly_commitment': monthly_commitment,
                        'year_level': year_level,
                        'enrolled_by': request.user
                    }
                )
                
            return Response({
                'student': StudentSerializer(student).data,
                'credentials': {
                    'idn': idn,
                    'password': generated_password
                }
            })
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def returning_student(self, request, pk=None):
        """
        Action for a student or Admission to 'enroll' the student for the active term.
        """
        student = self.get_object()
        
        # Permission check: Admission or the Student themselves
        if not (request.user.role == 'ADMIN' or request.user.role == 'ADMISSION' or request.user == student.user):
            return Response({'error': 'You do not have permission to perform this action.'}, status=status.HTTP_403_FORBIDDEN)
        if student.status in ['APPLICANT', 'REJECTED']:
            return Response({'error': 'Only approved students can be enrolled as returning'}, status=status.HTTP_400_BAD_REQUEST)
            
        monthly_commitment = request.data.get('monthly_commitment')
        if not monthly_commitment:
            return Response({'error': 'Monthly commitment is required.'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.terms.models import Term
        active_term = Term.objects.filter(is_active=True).first()
        if not active_term:
            return Response({'error': 'No active term found.'}, status=status.HTTP_400_BAD_REQUEST)

        from .services import AdvisingService
        
        with transaction.atomic():
            # Tag status as Enrolled (system status logic)
            student.status = 'ENROLLED'
            student.save()
            
            # Compute/get year level
            year_level = AdvisingService.get_year_level(student, active_term)
            
            enrollment, created = StudentEnrollment.objects.update_or_create(
                student=student,
                term=active_term,
                defaults={
                    'monthly_commitment': monthly_commitment,
                    'year_level': year_level,
                    'enrolled_by': request.user
                }
            )
            
        return Response({
            'message': 'Student enrolled for term successfully',
            'enrollment': StudentEnrollmentSerializer(enrollment).data
        })

class StudentEnrollmentViewSet(viewsets.ModelViewSet):
    queryset = StudentEnrollment.objects.all()
    serializer_class = StudentEnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated] # Fine-tune later
