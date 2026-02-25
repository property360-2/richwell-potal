"""
Enrollment Service - Student enrollment creation and management.
Handles online enrollment, transferee creation, and payment bucket generation.
"""

import secrets
import string
from datetime import date
from decimal import Decimal
from typing import List

from django.db import transaction
from django.conf import settings

from apps.accounts.models import User, StudentProfile
from apps.academics.models import Program, Curriculum
from apps.audit.models import AuditLog

from ..models import Enrollment, MonthlyPaymentBucket, Semester


class EnrollmentService:
    """
    Service class for enrollment-related business logic.
    Handles online enrollment, transferee creation, and payment bucket generation.
    """
    
    def __init__(self):
        self.payment_months = settings.SYSTEM_CONFIG.get('PAYMENT_MONTHS_PER_SEMESTER', 6)
    
    @transaction.atomic
    def create_online_enrollment(self, data: dict) -> Enrollment:
        """
        Create a complete enrollment from online form submission.
        
        Steps:
        1. Generate student number
        2. Create User account
        3. Create StudentProfile
        4. Create Enrollment record
        5. Generate 6 payment buckets
        6. Log to audit
        
        Args:
            data: Validated data from OnlineEnrollmentSerializer
            
        Returns:
            Enrollment: The created enrollment record
        """
        # Get current semester
        semester = self._get_current_semester()
        
        # Get program
        program = Program.objects.get(id=data['program_id'])
        
        # student_number will be generated upon Admission approval
        student_number = None
        
        # Generate school email as username
        school_email = self._generate_school_email(data['first_name'], data['last_name'])
        
        # Password format: RW@ + birth year (e.g., RW@2000)
        birth_year = "2000" # Default fallback
        try:
            if isinstance(data['birthdate'], str):
                birth_year = data['birthdate'].split('-')[0]
            else:
                birth_year = str(data['birthdate'].year)
        except:
            pass
            
        password = f"RW@{birth_year}"
        
        # Create User
        user = User.objects.create_user(
            email=data['email'],  # Keep personal email for contact
            password=password,
            first_name=data['first_name'],
            last_name=data['last_name'],
            role=User.Role.STUDENT,
            student_number=student_number,
            username=school_email  # School email as login username
        )
        
        # Get active curriculum for program
        active_curriculum = Curriculum.objects.filter(
            program=program,
            is_active=True,
            is_deleted=False
        ).order_by('-effective_year').first()

        # Create StudentProfile
        StudentProfile.objects.create(
            user=user,
            program=program,
            curriculum=active_curriculum,
            year_level=1,
            middle_name=data.get('middle_name', ''),
            suffix=data.get('suffix', ''),
            birthdate=data['birthdate'],
            address=data['address'],
            contact_number=data['contact_number'],
            is_transferee=data.get('is_transferee', False),
            previous_school=data.get('previous_school', ''),
            previous_course=data.get('previous_course', '')
        )
        
        # Create Enrollment - Set to PENDING (wait for Admission approval)
        enrollment = Enrollment.objects.create(
            student=user,
            semester=semester,
            status=Enrollment.Status.PENDING,
            created_via=Enrollment.CreatedVia.ONLINE,
            monthly_commitment=data.get('monthly_commitment', 0.00)
        )
        
        # Generate payment buckets
        self._generate_payment_buckets(enrollment)
        
        # Log to audit
        AuditLog.log(
            action=AuditLog.Action.ENROLLMENT_CREATED,
            target_model='Enrollment',
            target_id=enrollment.id,
            payload={
                'student_number': student_number,
                'program': program.code,
                'monthly_commitment': str(data['monthly_commitment']),
                'is_transferee': data.get('is_transferee', False),
                'created_via': 'ONLINE'
            }
        )
        
        # Log user creation
        AuditLog.log(
            action=AuditLog.Action.USER_CREATED,
            target_model='User',
            target_id=user.id,
            payload={
                'email': user.email,
                'role': user.role,
                'student_number': student_number
            }
        )
        
        return enrollment
    
    @transaction.atomic
    def create_transferee_enrollment(self, registrar: User, data: dict) -> Enrollment:
        """
        Create a transferee enrollment (registrar-initiated).
        
        Args:
            registrar: The registrar user creating the account
            data: Validated transferee data
            
        Returns:
            Enrollment: The created enrollment record
        """
        semester = self._get_current_semester()
        program = Program.objects.get(id=data['program_id'])
        # Use provided student_number or generate new one
        student_number = data.get('student_number')
        if not student_number:
             student_number = self.generate_student_number()
             
        # Use provided password or default to student number (common initial password)
        password = data.get('password') or student_number
        
        # Create User
        user = User.objects.create_user(
            email=data['email'],
            password=password,
            first_name=data['first_name'],
            last_name=data['last_name'],
            role=User.Role.STUDENT,
            student_number=student_number,
            username=data['email']
        )
        
        # EPIC 7: Get active curriculum for program (transferees get latest curriculum)
        # Use provided curriculum or fetch active one
        if data.get('curriculum'):
             active_curriculum = data['curriculum']
        else:
             active_curriculum = Curriculum.objects.filter(
                program=program,
                is_active=True,
                is_deleted=False
            ).order_by('-effective_year').first()

        # Create StudentProfile
        # Default birthdate if missing (required by model usually but creating safe fallback)
        from datetime import date
        default_birthdate = date(2000, 1, 1)
        
        StudentProfile.objects.create(
            user=user,
            program=program,
            curriculum=active_curriculum,
            year_level=data.get('year_level', 1),
            middle_name=data.get('middle_name', ''),
            suffix=data.get('suffix', ''),
            birthdate=data.get('birthdate') or default_birthdate,
            address=data.get('address', ''),
            contact_number=data.get('contact_number', ''),
            is_transferee=data.get('is_transferee', True),
            previous_school=data.get('previous_school', ''),
            previous_course=data.get('previous_course', '')
        )
        
        # Create Enrollment
        enrollment = Enrollment.objects.create(
            student=user,
            semester=semester,
            status=Enrollment.Status.PENDING,
            created_via=Enrollment.CreatedVia.TRANSFEREE,
            monthly_commitment=data.get('monthly_commitment', 0.00)
        )
        
        # Generate payment buckets
        self._generate_payment_buckets(enrollment)
        
        # Log to audit
        AuditLog.log(
            action=AuditLog.Action.ENROLLMENT_CREATED,
            target_model='Enrollment',
            target_id=enrollment.id,
            actor=registrar,
            payload={
                'student_number': student_number,
                'program': program.code,
                'created_via': 'TRANSFEREE',
                'created_by': registrar.email
            }
        )
        
        # Log user creation
        AuditLog.log(
            action=AuditLog.Action.USER_CREATED,
            target_model='User',
            target_id=user.id,
            actor=registrar,
            payload={
                'email': user.email,
                'role': user.role,
                'student_number': student_number,
                'created_via': 'TRANSFEREE'
            }
        )
        
        return enrollment
    
    def generate_student_number(self) -> str:
        """
        Generate a unique student number in format: YYYY-XXXXX
        
        Returns:
            str: Unique student number
        """
        year = date.today().year
        
        # Find the highest existing number for this year
        latest = User.objects.filter(
            student_number__startswith=f"{year}-"
        ).order_by('-student_number').first()
        
        if latest and latest.student_number:
            try:
                last_number = int(latest.student_number.split('-')[1])
                new_number = last_number + 1
            except (ValueError, IndexError):
                new_number = 1
        else:
            new_number = 1
        
        student_number = f"{year}-{new_number:05d}"
        
        # Double-check uniqueness
        while User.objects.filter(student_number=student_number).exists():
            new_number += 1
            student_number = f"{year}-{new_number:05d}"
        
        return student_number
    
    def _generate_payment_buckets(self, enrollment: Enrollment) -> List[MonthlyPaymentBucket]:
        """
        Generate 6 monthly payment buckets for an enrollment.

        Args:
            enrollment: The enrollment to create buckets for

        Returns:
            list: Created MonthlyPaymentBucket instances
        """
        # Event labels for each payment month
        EVENT_LABELS = {
            1: 'Subject Enrollment',
            2: 'Chapter Test',
            3: 'Prelims',
            4: 'Midterms',
            5: 'Pre Finals',
            6: 'Finals'
        }

        buckets = []
        for month in range(1, self.payment_months + 1):
            bucket = MonthlyPaymentBucket.objects.create(
                enrollment=enrollment,
                month_number=month,
                required_amount=enrollment.monthly_commitment,
                paid_amount=Decimal('0.00'),
                is_fully_paid=False,
                event_label=EVENT_LABELS.get(month, '')
            )
            buckets.append(bucket)

        return buckets
    
    def _get_current_semester(self) -> Semester:
        """
        Get the current active semester.
        Creates a default one if none exists.
        
        Returns:
            Semester: The current semester
        """
        semester = Semester.objects.filter(is_current=True).first()
        
        if not semester:
            # Create a default semester for development
            today = date.today()
            semester = Semester.objects.create(
                name="1st Semester",
                academic_year=f"{today.year}-{today.year + 1}",
                start_date=today,
                end_date=date(today.year + 1, 3, 31),
                is_current=True
            )
        
        return semester
    
    def _generate_password(self, length: int = 12) -> str:
        """
        Generate a random password.
        
        Args:
            length: Password length (default 12)
            
        Returns:
            str: Random password
        """
        alphabet = string.ascii_letters + string.digits + "!@#$%"
        return ''.join(secrets.choice(alphabet) for _ in range(length))
    
    def _generate_school_email(self, first_name: str, last_name: str) -> str:
        """
        Generate a unique school email as username.
        Format: first_initial + last_name + random_digits + @richwell.edu.ph
        
        Example: jdelacruz9104@richwell.edu.ph
        
        Args:
            first_name: Student's first name
            last_name: Student's last name
            
        Returns:
            str: Unique school email
        """
        import random
        
        # Clean names: lowercase, remove spaces and special chars
        first_initial = first_name[0].lower() if first_name else 'x'
        clean_last = ''.join(c.lower() for c in last_name if c.isalnum())
        
        # Generate random 4-digit suffix
        suffix = str(random.randint(1000, 9999))
        
        # Build email
        school_email = f"{first_initial}{clean_last}{suffix}@richwell.edu.ph"
        
        # Ensure uniqueness
        while User.objects.filter(username=school_email).exists():
            suffix = str(random.randint(1000, 9999))
            school_email = f"{first_initial}{clean_last}{suffix}@richwell.edu.ph"
        
        return school_email
