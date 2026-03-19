from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.contrib.auth import get_user_model
from django.db.models import Count, Q, F
from core.permissions import IsAdmission, IsAdmissionOrRegistrar, IsStudentRecordsStaff

from .models import Student, StudentEnrollment
from .serializers import (
    StudentApplicationSerializer,
    StudentEnrollmentSelfSerializer,
    StudentEnrollmentSerializer,
    StudentRecordSerializer,
    StudentSelfSerializer,
)
from .filters import StudentFilter

User = get_user_model()

class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentRecordSerializer
    filterset_class = StudentFilter
    search_fields = ['user__first_name', 'user__last_name', 'user__email', 'idn']

    def get_queryset(self):
        user = self.request.user
        queryset = Student.objects.all().order_by('-updated_at')
        if user.is_authenticated and user.role == 'STUDENT':
            return queryset.filter(user=user)
        if user.is_authenticated and user.role in ('ADMISSION', 'REGISTRAR', 'HEAD_REGISTRAR', 'ADMIN', 'CASHIER'):
            return queryset
        if user.is_authenticated:
            return queryset.none()
        return queryset

    def get_serializer_class(self):
        if self.request.user.is_authenticated and self.request.user.role == 'STUDENT':
            return StudentSelfSerializer
        return StudentRecordSerializer

    def _assert_read_access(self):
        role = getattr(self.request.user, 'role', None)
        if role in ('STUDENT', 'ADMISSION', 'REGISTRAR', 'HEAD_REGISTRAR', 'ADMIN', 'CASHIER') or self.request.user.is_superuser:
            return
        raise PermissionDenied("You do not have permission to access student records.")
    
    def get_permissions(self):
        if self.action == 'apply':
            return [permissions.AllowAny()]
        if self.action in ['update', 'partial_update', 'destroy', 'approve', 'unlock_advising', 'toggle_regularity', 'manual_add']:
            return [IsAdmissionOrRegistrar()]
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated()]

    def list(self, request, *args, **kwargs):
        self._assert_read_access()
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        self._assert_read_access()
        return super().retrieve(request, *args, **kwargs)

    @action(detail=False, methods=['post'], url_path='apply')
    def apply(self, request):
        serializer = StudentApplicationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            data = serializer.validated_data
            
            email = data['email']
            if User.objects.filter(email=email).exists():
                raise ValidationError({'email': ['A student with this email already has an application or account.']})
                
            user = User.objects.create_user(
                username=email,
                email=email,
                first_name=data['first_name'],
                last_name=data['last_name'],
                role='STUDENT',
                is_active=False
            )
            
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
                
        return Response(StudentSelfSerializer(student).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[IsAdmission])
    def approve(self, request, pk=None):
        student = self.get_object()
        if student.status != 'APPLICANT':
            raise ValidationError({'detail': 'Only applicants can be approved.'})
            
        monthly_commitment = request.data.get('monthly_commitment')
        if not monthly_commitment:
            raise ValidationError({'monthly_commitment': ['Monthly commitment is required for approval.']})

        # Get active term
        from apps.terms.models import Term
        active_term = Term.objects.filter(is_active=True).first()
        if not active_term:
            raise ValidationError({'detail': 'No active term found. Please activate a term first.'})

        from core.models import SystemSequence
        from apps.grades.services.advising_service import AdvisingService
        import datetime

        with transaction.atomic():
            year_prefix = str(datetime.datetime.now().year)[2:]
            sequence_key = f"idn_{year_prefix}"
            seq_obj, _ = SystemSequence.objects.select_for_update().get_or_create(key=sequence_key)
            
            while True:
                seq_obj.last_value += 1
                idn = f"{year_prefix}{str(seq_obj.last_value).zfill(4)}"
                if not User.objects.filter(username=idn).exists():
                    break
            
            seq_obj.save()
            
            student.idn = idn
            student.status = 'APPROVED'
            student.user.username = idn
            student.user.is_active = True
            
            dob_suffix = student.date_of_birth.strftime('%m%d')
            generated_password = f"{idn}{dob_suffix}"
            student.user.set_password(generated_password)
            student.user.save()
            
            student.save()

            year_level = AdvisingService.get_year_level(student)

            StudentEnrollment.objects.get_or_create(
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
            'student': StudentRecordSerializer(student).data,
            'credentials': {
                'idn': idn,
                'password': generated_password,
                'message': "Generated password is the IDN + birthdate (MMDD format)"
            }
        })

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
            raise ValidationError({'detail': 'No active term.'})
            
        enrollment = StudentEnrollment.objects.filter(student=student, term=active_term).first()
        if not enrollment:
            raise ValidationError({'detail': 'Student not enrolled for active term.'})
            
        enrollment.is_regular = is_regular
        enrollment.save()
        return Response({'status': 'Regularity status updated', 'is_regular': enrollment.is_regular})

    @action(detail=True, methods=['post'], url_path='returning-student')
    def returning_student(self, request, pk=None):
        """
        Action for a student or Admission to 'enroll' the student for the active term.
        """
        student = self.get_object()
        
        # Permission check: Admission, Admin, Registrar or the Student themselves
        if not (request.user.role in ('ADMIN', 'ADMISSION', 'REGISTRAR', 'HEAD_REGISTRAR') or request.user.is_superuser or request.user == student.user):
            raise PermissionDenied("You do not have permission to perform this action.")
        
        if student.status in ['APPLICANT', 'REJECTED']:
            raise ValidationError({'detail': 'Only approved students can be enrolled as returning.'})
            
        monthly_commitment = request.data.get('monthly_commitment')
        if not monthly_commitment:
            raise ValidationError({'monthly_commitment': ['Monthly commitment is required.']})

        from apps.terms.models import Term
        active_term = Term.objects.filter(is_active=True).first()
        if not active_term:
            raise ValidationError({'detail': 'No active term found.'})

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
            raise ValidationError({'detail': 'IDN and Email are required.'})
        
        if User.objects.filter(Q(username=idn) | Q(email=email)).exists():
            raise ValidationError({'detail': 'Student with this IDN or Email already exists.'})

        from apps.terms.models import Term
        from apps.grades.services.advising_service import AdvisingService
        
        active_term = Term.objects.filter(is_active=True).first()
        if not active_term:
            raise ValidationError({'detail': 'No active term found.'})

        with transaction.atomic():
            user = User.objects.create_user(
                username=idn,
                email=email,
                first_name=data.get('first_name', ''),
                last_name=data.get('last_name', ''),
                role='STUDENT'
            )
            
            import datetime
            dob_str = data.get('date_of_birth')
            try:
                dob = datetime.datetime.strptime(dob_str, '%Y-%m-%d').date()
            except (TypeError, ValueError) as exc:
                raise ValidationError({'date_of_birth': ['A valid date_of_birth is required in YYYY-MM-DD format.']}) from exc
            dob_suffix = dob.strftime('%m%d')
            user.set_password(f"{idn}{dob_suffix}")
            user.save()
            
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
            
            is_regular = AdvisingService.check_student_regularity(student, active_term)
            StudentEnrollment.objects.create(
                student=student,
                term=active_term,
                year_level=data.get('year_level', 1),
                monthly_commitment=data.get('monthly_commitment', 0),
                is_regular=is_regular,
                enrolled_by=request.user
            )
            
        return Response({
            'message': 'Student added manually successfully',
            'student': StudentRecordSerializer(student).data,
            'is_regular': is_regular
        }, status=status.HTTP_201_CREATED)

class StudentEnrollmentViewSet(viewsets.ModelViewSet):
    queryset = StudentEnrollment.objects.all()
    serializer_class = StudentEnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['advising_status', 'is_regular']

    def get_serializer_class(self):
        if self.request.user.is_authenticated and self.request.user.role == 'STUDENT':
            return StudentEnrollmentSelfSerializer
        return StudentEnrollmentSerializer

    def _assert_read_access(self):
        role = getattr(self.request.user, 'role', None)
        if role in ('STUDENT', 'PROGRAM_HEAD', 'ADMISSION', 'REGISTRAR', 'HEAD_REGISTRAR', 'ADMIN') or self.request.user.is_superuser:
            return
        raise PermissionDenied("You do not have permission to access enrollment records.")

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsStudentRecordsStaff()]
        return super().get_permissions()

    def list(self, request, *args, **kwargs):
        self._assert_read_access()
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        self._assert_read_access()
        return super().retrieve(request, *args, **kwargs)


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

        elif user.role in ('ADMIN', 'ADMISSION', 'REGISTRAR', 'HEAD_REGISTRAR'):
            return queryset

        return queryset.none()


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
                    "subject_name": g.subject.description,
                    "section_name": s.section.name,
                    "days": s.days,
                    "start_time": s.start_time.strftime('%H:%M') if s.start_time else None,
                    "end_time": s.end_time.strftime('%H:%M') if s.end_time else None,
                    "room": s.room.name if s.room else "TBA",
                    "professor": s.professor.user.get_full_name() if s.professor else "TBA",
                    "type": s.component_type
                })
        
        return Response(schedule_data)

