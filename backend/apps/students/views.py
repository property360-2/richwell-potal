from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.contrib.auth import get_user_model
from django.db.models import Count, Q, F
from core.permissions import IsAdmin, IsAdmission, IsRegistrar

from .models import Student, StudentEnrollment
from .serializers import StudentSerializer, StudentApplicationSerializer, StudentEnrollmentSerializer
from .filters import StudentFilter

User = get_user_model()

class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    filterset_class = StudentFilter
    search_fields = ['user__first_name', 'user__last_name', 'user__email', 'idn']

    def get_queryset(self):
        user = self.request.user
        queryset = Student.objects.all().order_by('-updated_at')
        if user.is_authenticated and user.role == 'STUDENT':
            return queryset.filter(user=user)
        return queryset
    
    def get_permissions(self):
        if self.action == 'apply':
            return [permissions.AllowAny()]
        if self.action in ['update', 'partial_update', 'destroy', 'approve', 'unlock_advising', 'toggle_regularity', 'manual_add']:
            return [IsAdmission()] # Admission/Admin per code
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
        from apps.grades.services.advising_service import AdvisingService
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
                year_level = AdvisingService.get_year_level(student)

                # Create Enrollment for the active term
                # If they are already enrolled for this term, update it
                enrollment, _ = StudentEnrollment.objects.get_or_create(
                    student=student,
                    term=active_term,
                    defaults={
                        'monthly_commitment': monthly_commitment,
                        'year_level': year_level,
                        'enrolled_by': request.user,
                        'is_regular': AdvisingService.check_student_regularity(student, active_term)
                    }
                )
                
            return Response({
                'student': StudentSerializer(student).data,
                'credentials': {
                    'idn': idn,
                    'password': generated_password,
                    'message': "Generated password is the IDN + birthdate (MMDD format)"
                }
            })
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], permission_classes=[IsAdmission], url_path='unlock-advising')
    def unlock_advising(self, request, pk=None):
        student = self.get_object()
        student.is_advising_unlocked = True
        student.save()
        return Response({'status': 'Advising process unlocked'})

    @action(detail=True, methods=['post'], permission_classes=[IsAdmission], url_path='toggle-regularity')
    def toggle_regularity(self, request, pk=None):
        student = self.get_object()
        is_regular = request.data.get('is_regular', True)
        
        from apps.terms.models import Term
        active_term = Term.objects.filter(is_active=True).first()
        if not active_term:
            return Response({'error': 'No active term'}, status=status.HTTP_400_BAD_REQUEST)
            
        enrollment = StudentEnrollment.objects.filter(student=student, term=active_term).first()
        if not enrollment:
            return Response({'error': 'Student not enrolled for active term'}, status=status.HTTP_400_BAD_REQUEST)
            
        enrollment.is_regular = is_regular
        enrollment.save()
        return Response({'status': 'Regularity status updated', 'is_regular': enrollment.is_regular})

    @action(detail=True, methods=['post'], url_path='returning-student')
    def returning_student(self, request, pk=None):
        """
        Action for a student or Admission to 'enroll' the student for the active term.
        """
        student = self.get_object()
        
        # Permission check: Admission, Admin, or the Student themselves
        if not (request.user.role in ('ADMIN', 'ADMISSION') or request.user.is_superuser or request.user == student.user):
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

        from apps.grades.services.advising_service import AdvisingService
        
        with transaction.atomic():
            # Tag status as Enrolled (system status logic)
            student.status = 'ENROLLED'
            student.save()
            
            # Compute/get year level
            year_level = AdvisingService.get_year_level(student)
            
            enrollment, created = StudentEnrollment.objects.update_or_create(
                student=student,
                term=active_term,
                defaults={
                    'monthly_commitment': monthly_commitment,
                    'year_level': year_level,
                    'enrolled_by': request.user,
                    'is_regular': AdvisingService.check_student_regularity(student, active_term)
                }
            )
            
        return Response({
            'message': 'Student enrolled for term successfully',
            'enrollment': StudentEnrollmentSerializer(enrollment).data
        })

    @action(detail=False, methods=['post'], permission_classes=[IsAdmission], url_path='manual-add')
    def manual_add(self, request):
        """
        Manually add an existing student to the system.
        """
        data = request.data
        idn = data.get('idn')
        email = data.get('email')
        
        if not idn or not email:
            return Response({'error': 'IDN and Email are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if User.objects.filter(Q(username=idn) | Q(email=email)).exists():
            return Response({'error': 'Student with this IDN or Email already exists'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.terms.models import Term
        from apps.grades.services.advising_service import AdvisingService
        
        active_term = Term.objects.filter(is_active=True).first()
        if not active_term:
            return Response({'error': 'No active term found'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                # Create User
                user = User.objects.create_user(
                    username=idn,
                    email=email,
                    first_name=data.get('first_name', ''),
                    last_name=data.get('last_name', ''),
                    role='STUDENT'
                )
                
                # Password = IDN + Birthday (MMDD)
                import datetime
                dob_str = data.get('date_of_birth')
                dob = datetime.datetime.strptime(dob_str, '%Y-%m-%d').date()
                dob_suffix = dob.strftime('%m%d')
                user.set_password(f"{idn}{dob_suffix}")
                user.save()
                
                # Create Student
                gender_map = {'M': 'MALE', 'F': 'FEMALE'}
                type_map = {
                    'REGULAR': 'FRESHMAN', 
                    'TRANSFEREE': 'TRANSFEREE', 
                    'CURRENT': 'CURRENT',
                    'RETURNING': 'FRESHMAN'
                }

                student = Student.objects.create(
                    user=user,
                    idn=idn,
                    date_of_birth=dob,
                    gender=gender_map.get(data.get('gender'), 'MALE'),
                    program_id=data.get('program'),
                    curriculum_id=data.get('curriculum'),
                    student_type=type_map.get(data.get('student_type'), 'FRESHMAN'),
                    status='ENROLLED'
                )
                
                # Create Enrollment
                is_regular = AdvisingService.check_student_regularity(student, active_term)
                enrollment = StudentEnrollment.objects.create(
                    student=student,
                    term=active_term,
                    year_level=data.get('year_level', 1),
                    monthly_commitment=data.get('monthly_commitment', 0),
                    is_regular=is_regular,
                    enrolled_by=request.user
                )
                
            return Response({
                'message': 'Student added manually successfully',
                'student': StudentSerializer(student).data,
                'is_regular': is_regular
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class StudentEnrollmentViewSet(viewsets.ModelViewSet):
    queryset = StudentEnrollment.objects.all()
    serializer_class = StudentEnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['advising_status', 'is_regular']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            # Enrollments should be managed by registrar or admissions staff
            from core.permissions import IsStaff
            return [IsStaff()]
        return super().get_permissions()


    def get_queryset(self):
        user = self.request.user
        queryset = StudentEnrollment.objects.all()
        
        if user.role == 'STUDENT':
            return queryset.filter(student__user=user)
        
        elif user.role == 'PROGRAM_HEAD':
            # PH only sees students in their headed programs who have subjects selected for THAT term
            return queryset.filter(
                student__program__program_head=user
            ).annotate(
                subject_count=Count('student__grades', filter=Q(student__grades__term=F('term')), distinct=True)
            ).filter(subject_count__gt=0).distinct()

            
        return queryset


    @action(detail=False, methods=['get'])
    def me(self, request):
        term_id = request.query_params.get('term')
        if not term_id:
            return Response({"error": "Term ID is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        enrollment = self.get_queryset().filter(term_id=term_id).first()
        if not enrollment:
            return Response(None, status=status.HTTP_200_OK) # Return null if not found
            
        serializer = self.get_serializer(enrollment)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def schedule(self, request):
        term_id = request.query_params.get('term')
        if not term_id:
            return Response({"error": "Term ID is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        user = request.user
        if user.role != 'STUDENT':
            return Response({"error": "Only students can access their schedule"}, status=status.HTTP_403_FORBIDDEN)
            
        from apps.grades.models import Grade
        from apps.scheduling.models import Schedule
        
        # Get approved subjects for the student and term
        student = user.student_profile
        grades = Grade.objects.filter(student=student, term_id=term_id, advising_status='APPROVED')
        
        schedule_data = []
        for g in grades:
            # Find schedule for this subject and term
            # In a real system, we might need to match by section if the student is irregular
            # For now, we fetch the primary schedule linked to the student's sections
            schedules = Schedule.objects.filter(
                subject=g.subject, 
                term_id=term_id,
                section__student_assignments__student=student
            )
            
            for s in schedules:
                schedule_data.append({
                    "subject_code": g.subject.code,
                    "subject_name": g.subject.name,
                    "days": s.days,
                    "start_time": s.start_time.strftime('%H:%M') if s.start_time else None,
                    "end_time": s.end_time.strftime('%H:%M') if s.end_time else None,
                    "room": s.room.name if s.room else "TBA",
                    "professor": s.professor.user.get_full_name() if s.professor else "TBA",
                    "type": s.component_type
                })
        
        return Response(schedule_data)

