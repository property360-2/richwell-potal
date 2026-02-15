"""
Accounts services - User and Student business logic.
"""

from django.db import transaction
from apps.accounts.models import User, StudentProfile
from apps.enrollment.models import Enrollment, SubjectEnrollment, Semester
from apps.audit.models import AuditLog

class StudentService:
    """
    Service for student-related operations.
    """
    
    @staticmethod
    @transaction.atomic
    def create_student(data, registrar=None):
        """
        Create a new student (manual/transferee creation).
         delegating core enrollment logic to EnrollmentService.
        
        Args:
            data: Validated data dictionary
            registrar: User object acting as registrar (optional)
            
        Returns:
            StudentProfile: The created student profile
        """
        from apps.enrollment.services import EnrollmentService
        enrollment_service = EnrollmentService()
        
        # Check email uniqueness
        if User.objects.filter(email=data['email']).exists():
            raise ValueError("Email already exists")
            
        # Prepare data for EnrollmentService (adapt structure if needed)
        # EnrollmentService expects snake_case keys which standard serializer provides
        enrollment_data = data.copy()
        enrollment_data['program_id'] = data['program'].id
        
        # 1. Use EnrollmentService to create basic student structure
        # This handles User, Profile, Enrollment, Payment Buckets
        enrollment = enrollment_service.create_transferee_enrollment(
            registrar=registrar,
            data=enrollment_data
        )
        
        user = enrollment.student
        profile = user.student_profile
        
        # 2. Handle Credited Subjects
        credited_subjects = data.get('credited_subjects', [])
        if credited_subjects:
            # For credited subjects, we create them as PASSED/CREDITED under the enrollment
            # validation that they are valid subjects is done by serializer
            
            for credit in credited_subjects:
                 SubjectEnrollment.objects.create(
                     enrollment=enrollment,
                     subject_id=credit['subject_id'],
                     grade=credit.get('grade'),
                     status=SubjectEnrollment.Status.CREDITED,
                     payment_approved=True,
                     enrollment_type=SubjectEnrollment.EnrollmentType.HOME
                 )
                 
            # Log credited subjects
            AuditLog.log(
                action=AuditLog.Action.ENROLLMENT_UPDATED,
                target_model='Enrollment',
                target_id=enrollment.id,
                payload={
                    'action': 'credited_subjects_added',
                    'count': len(credited_subjects),
                    'student': user.student_number
                },
                actor=registrar
            )

        return profile
