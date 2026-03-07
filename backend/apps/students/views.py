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
                    user.must_change_password = True
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

    @action(detail=True, methods=['post'])
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

        with transaction.atomic():
            # Generate IDN: {YY}{sequential_4_digit}
            import datetime
            year_prefix = str(datetime.datetime.now().year)[2:]
            last_student = Student.objects.filter(idn__startswith=year_prefix).order_by('-idn').first()
            
            if last_student and last_student.idn[:2] == year_prefix:
                # Try to parse the incrementing part
                try:
                    next_num = int(last_student.idn[2:]) + 1
                except ValueError:
                    next_num = 1
            else:
                next_num = 1
                
            idn = f"{year_prefix}{str(next_num).zfill(4)}"
            
            student.idn = idn
            student.status = 'APPROVED'
            student.user.username = idn # IDN is the username
            student.user.is_active = True
            
            # Initial password: {IDN}{birthdate_MMDD}
            dob_suffix = student.date_of_birth.strftime('%m%d')
            generated_password = f"{idn}{dob_suffix}"
            student.user.set_password(generated_password)
            
            student.user.save()
            student.save()

            # Create Enrollment for the active term
            StudentEnrollment.objects.get_or_create(
                student=student,
                term=active_term,
                defaults={
                    'monthly_commitment': monthly_commitment,
                    'year_level': 1 # Default for new applicants, can be adjusted in advising
                }
            )
            
        return Response({
            'student': StudentSerializer(student).data,
            'credentials': {
                'idn': idn,
                'password': generated_password
            }
        })

class StudentEnrollmentViewSet(viewsets.ModelViewSet):
    queryset = StudentEnrollment.objects.all()
    serializer_class = StudentEnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated] # Fine-tune later
