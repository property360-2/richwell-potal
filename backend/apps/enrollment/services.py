"""
Enrollment services - Business logic for enrollment operations.
"""

import secrets
import string
from datetime import date
from decimal import Decimal
from typing import Optional

from django.db import transaction
from django.conf import settings

from apps.accounts.models import User, StudentProfile
from apps.academics.models import Program
from apps.audit.models import AuditLog

from .models import Enrollment, MonthlyPaymentBucket, Semester


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
        
        # Generate student number
        student_number = self.generate_student_number()
        
        # Generate password if not provided
        password = data.get('password') or self._generate_password()
        
        # Create User
        user = User.objects.create_user(
            email=data['email'],
            password=password,
            first_name=data['first_name'],
            last_name=data['last_name'],
            role=User.Role.STUDENT,
            student_number=student_number,
            username=data['email']  # Use email as username
        )
        
        # Create StudentProfile
        student_profile = StudentProfile.objects.create(
            user=user,
            program=program,
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
        
        # Create Enrollment
        enrollment = Enrollment.objects.create(
            student=user,
            semester=semester,
            status=Enrollment.Status.ACTIVE,
            created_via=Enrollment.CreatedVia.ONLINE,
            monthly_commitment=data['monthly_commitment']
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
        
        # TODO: Send welcome email with credentials
        
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
        student_number = self.generate_student_number()
        password = self._generate_password()
        
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
        
        # Create StudentProfile
        StudentProfile.objects.create(
            user=user,
            program=program,
            year_level=data['year_level'],
            middle_name=data.get('middle_name', ''),
            suffix=data.get('suffix', ''),
            birthdate=data['birthdate'],
            address=data['address'],
            contact_number=data['contact_number'],
            is_transferee=True,
            previous_school=data['previous_school'],
            previous_course=data['previous_course']
        )
        
        # Create Enrollment
        enrollment = Enrollment.objects.create(
            student=user,
            semester=semester,
            status=Enrollment.Status.ACTIVE,
            created_via=Enrollment.CreatedVia.TRANSFEREE,
            monthly_commitment=data['monthly_commitment']
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
    
    def _generate_payment_buckets(self, enrollment: Enrollment) -> list[MonthlyPaymentBucket]:
        """
        Generate 6 monthly payment buckets for an enrollment.
        
        Args:
            enrollment: The enrollment to create buckets for
            
        Returns:
            list: Created MonthlyPaymentBucket instances
        """
        buckets = []
        for month in range(1, self.payment_months + 1):
            bucket = MonthlyPaymentBucket.objects.create(
                enrollment=enrollment,
                month_number=month,
                required_amount=enrollment.monthly_commitment,
                paid_amount=Decimal('0.00'),
                is_fully_paid=False
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
