"""
Enrollment services - Business logic for enrollment operations.
"""

import secrets
import string
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List, Dict

from django.db import models, transaction
from django.conf import settings
from django.utils import timezone

from apps.accounts.models import User, StudentProfile
from apps.academics.models import Program
from apps.audit.models import AuditLog

from .models import (
    Enrollment, MonthlyPaymentBucket, Semester,
    PaymentTransaction, ExamMonthMapping, ExamPermit
)



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


class SubjectEnrollmentService:
    """
    Service class for subject enrollment business logic.
    Handles subject selection, validation, and enrollment/drop operations.
    """
    
    def __init__(self):
        self.max_units = settings.SYSTEM_CONFIG.get('MAX_UNITS_PER_SEMESTER', 24)
    
    def get_student_passed_subjects(self, student) -> set:
        """
        Get all subjects the student has passed or been credited for.
        
        Args:
            student: User object (student)
            
        Returns:
            set: Subject IDs that have been passed/credited
        """
        from .models import SubjectEnrollment
        
        passed_statuses = [
            SubjectEnrollment.Status.PASSED,
            SubjectEnrollment.Status.CREDITED
        ]
        
        return set(
            SubjectEnrollment.objects.filter(
                enrollment__student=student,
                status__in=passed_statuses
            ).values_list('subject_id', flat=True)
        )
    
    def get_student_current_subjects(self, student, semester) -> set:
        """
        Get subjects the student is currently enrolled in for a semester.
        
        Returns:
            set: Subject IDs currently enrolled
        """
        from .models import SubjectEnrollment
        
        return set(
            SubjectEnrollment.objects.filter(
                enrollment__student=student,
                enrollment__semester=semester,
                status=SubjectEnrollment.Status.ENROLLED
            ).values_list('subject_id', flat=True)
        )
    
    def get_current_enrolled_units(self, student, semester) -> int:
        """
        Get total units currently enrolled for the semester.
        """
        from .models import SubjectEnrollment
        from apps.academics.models import Subject
        
        enrolled_subject_ids = SubjectEnrollment.objects.filter(
            enrollment__student=student,
            enrollment__semester=semester,
            status=SubjectEnrollment.Status.ENROLLED
        ).values_list('subject_id', flat=True)
        
        total = Subject.objects.filter(
            id__in=enrolled_subject_ids
        ).aggregate(total=models.Sum('units'))['total']
        
        return total or 0
    
    def get_recommended_subjects(self, student, semester):
        """
        Get subjects recommended for the student based on year level and curriculum.
        
        Args:
            student: User object (student)
            semester: Semester object
            
        Returns:
            QuerySet: Recommended subjects
        """
        from apps.academics.models import Subject
        
        # Get student's program and year level
        profile = student.student_profile
        program = profile.program
        year_level = profile.year_level
        
        # Get semester number from semester name (1st Semester = 1, 2nd Semester = 2, Summer = 3)
        semester_number = 1
        if '2nd' in semester.name.lower() or 'second' in semester.name.lower():
            semester_number = 2
        elif 'summer' in semester.name.lower():
            semester_number = 3
        
        # Get passed subjects
        passed_subjects = self.get_student_passed_subjects(student)
        
        # Get currently enrolled subjects
        current_subjects = self.get_student_current_subjects(student, semester)
        
        # Exclude passed and currently enrolled subjects
        excluded_subjects = passed_subjects | current_subjects
        
        # Get recommended subjects for current year/semester
        recommended = Subject.objects.filter(
            program=program,
            year_level=year_level,
            semester_number=semester_number,
            is_deleted=False
        ).exclude(id__in=excluded_subjects)
        
        return recommended
    
    def get_available_subjects(self, student, semester):
        """
        Get all subjects the student can enroll in (has sections, meets prerequisites).
        
        Args:
            student: User object (student)
            semester: Semester object
            
        Returns:
            QuerySet: Available subjects with sections
        """
        from apps.academics.models import Subject, Section
        
        profile = student.student_profile
        program = profile.program
        
        # Get passed subjects
        passed_subjects = self.get_student_passed_subjects(student)
        
        # Get currently enrolled subjects
        current_subjects = self.get_student_current_subjects(student, semester)
        
        # Exclude passed and current
        excluded_subjects = passed_subjects | current_subjects
        
        # Get all subjects from student's program not already passed/enrolled
        available = Subject.objects.filter(
            program=program,
            is_deleted=False
        ).exclude(
            id__in=excluded_subjects
        ).prefetch_related('prerequisites')
        
        # Filter to only those with sections in this semester
        sections_exist = Section.objects.filter(
            semester=semester,
            program=program,
            is_deleted=False
        ).values_list('section_subjects__subject_id', flat=True)
        
        available = available.filter(id__in=sections_exist)
        
        return available
    
    def check_prerequisites(self, student, subject) -> tuple[bool, list]:
        """
        Check if student has passed all prerequisites for a subject.
        
        Args:
            student: User object (student)
            subject: Subject object
            
        Returns:
            tuple: (all_met: bool, missing_prerequisites: list of subject codes)
        """
        passed_subjects = self.get_student_passed_subjects(student)
        
        missing = []
        for prereq in subject.prerequisites.all():
            if prereq.id not in passed_subjects:
                missing.append(prereq.code)
        
        return len(missing) == 0, missing
    
    def check_unit_cap(self, student, semester, new_units: int) -> tuple[bool, int, int]:
        """
        Check if enrolling in a subject would exceed the unit cap.
        
        Args:
            student: User object
            semester: Semester object
            new_units: Units of the new subject
            
        Returns:
            tuple: (within_cap: bool, current_units: int, max_units: int)
        """
        current_units = self.get_current_enrolled_units(student, semester)
        total_after = current_units + new_units
        
        return total_after <= self.max_units, current_units, self.max_units
    
    def check_payment_status(self, enrollment) -> bool:
        """
        Check if Month 1 payment is completed.
        
        Args:
            enrollment: Enrollment object
            
        Returns:
            bool: True if Month 1 is paid
        """
        month1 = enrollment.payment_buckets.filter(month_number=1).first()
        return month1 is not None and month1.is_fully_paid
    
    def check_schedule_conflict(self, student, section, semester):
        """
        Check if enrolling in a section would cause schedule conflicts.
        
        Args:
            student: User object
            section: Section object
            semester: Semester object
            
        Returns:
            tuple: (has_conflict: bool, conflicting_slot_info: dict or None)
        """
        from apps.academics.services import SchedulingService
        from apps.academics.models import ScheduleSlot
        
        # Get all schedule slots for this section's subjects
        section_slots = ScheduleSlot.objects.filter(
            section_subject__section=section,
            is_deleted=False
        )
        
        for slot in section_slots:
            has_conflict, conflicting_slot = SchedulingService.check_student_conflict(
                student=student,
                day=slot.day,
                start_time=slot.start_time,
                end_time=slot.end_time,
                semester=semester
            )
            
            if has_conflict:
                return True, {
                    'day': slot.get_day_display(),
                    'time': f"{slot.start_time.strftime('%H:%M')}-{slot.end_time.strftime('%H:%M')}",
                    'conflicting_subject': conflicting_slot.section_subject.subject.code
                }
        
        return False, None
    
    @transaction.atomic
    def enroll_in_subject(self, student, enrollment, subject, section) -> 'SubjectEnrollment':
        """
        Enroll a student in a subject with full validation.
        
        Args:
            student: User object
            enrollment: Enrollment object for current semester
            subject: Subject object
            section: Section object
            
        Returns:
            SubjectEnrollment: The created enrollment record
            
        Raises:
            PrerequisiteNotSatisfiedError: If prerequisites not met
            UnitCapExceededError: If would exceed unit cap
            PaymentRequiredError: If Month 1 not paid
            ScheduleConflictError: If schedule conflict detected
            ConflictError: If already enrolled in this subject
        """
        from .models import SubjectEnrollment
        from apps.core.exceptions import (
            PrerequisiteNotSatisfiedError, UnitCapExceededError,
            PaymentRequiredError, ScheduleConflictError, ConflictError
        )
        
        # Check if already enrolled
        existing = SubjectEnrollment.objects.filter(
            enrollment=enrollment,
            subject=subject,
            status=SubjectEnrollment.Status.ENROLLED
        ).exists()
        
        if existing:
            raise ConflictError(f"Already enrolled in {subject.code}")
        
        # Check prerequisites
        prereqs_met, missing = self.check_prerequisites(student, subject)
        if not prereqs_met:
            raise PrerequisiteNotSatisfiedError(
                f"Missing prerequisites: {', '.join(missing)}"
            )
        
        # Check unit cap
        within_cap, current, max_units = self.check_unit_cap(
            student, enrollment.semester, subject.units
        )
        if not within_cap:
            raise UnitCapExceededError(
                f"Would exceed unit cap ({current} + {subject.units} > {max_units})"
            )
        
        # Check payment status
        if not self.check_payment_status(enrollment):
            raise PaymentRequiredError()
        
        # Check schedule conflicts
        has_conflict, conflict_info = self.check_schedule_conflict(
            student, section, enrollment.semester
        )
        if has_conflict:
            raise ScheduleConflictError(
                f"Schedule conflict on {conflict_info['day']} {conflict_info['time']} "
                f"with {conflict_info['conflicting_subject']}"
            )
        
        # Determine if irregular (not in recommended year/semester)
        profile = student.student_profile
        is_irregular = (
            subject.year_level != profile.year_level or 
            self._get_semester_number(enrollment.semester) != subject.semester_number
        )
        
        # Create the enrollment
        subject_enrollment = SubjectEnrollment.objects.create(
            enrollment=enrollment,
            subject=subject,
            section=section,
            status=SubjectEnrollment.Status.ENROLLED,
            is_irregular=is_irregular
        )
        
        # Audit log
        AuditLog.log(
            action=AuditLog.Action.SUBJECT_ENROLLED,
            target_model='SubjectEnrollment',
            target_id=subject_enrollment.id,
            actor=student,
            payload={
                'subject_code': subject.code,
                'section': section.name,
                'units': subject.units,
                'is_irregular': is_irregular
            }
        )
        
        return subject_enrollment
    
    @transaction.atomic
    def drop_subject(self, subject_enrollment, actor) -> 'SubjectEnrollment':
        """
        Drop a subject (change status to DROPPED).
        
        Args:
            subject_enrollment: SubjectEnrollment object
            actor: User performing the action
            
        Returns:
            SubjectEnrollment: Updated record
        """
        from .models import SubjectEnrollment
        
        subject_enrollment.status = SubjectEnrollment.Status.DROPPED
        subject_enrollment.save()
        
        # Audit log
        AuditLog.log(
            action=AuditLog.Action.SUBJECT_DROPPED,
            target_model='SubjectEnrollment',
            target_id=subject_enrollment.id,
            actor=actor,
            payload={
                'subject_code': subject_enrollment.subject.code,
                'section': subject_enrollment.section.name if subject_enrollment.section else None
            }
        )
        
        return subject_enrollment
    
    @transaction.atomic
    def registrar_override_enroll(
        self, registrar, student, enrollment, subject, section, override_reason: str
    ) -> 'SubjectEnrollment':
        """
        Registrar override enrollment - bypasses all validation rules.
        
        Args:
            registrar: User object (registrar performing override)
            student: User object (student)
            enrollment: Enrollment object
            subject: Subject object
            section: Section object
            override_reason: Justification for the override
            
        Returns:
            SubjectEnrollment: The created enrollment record
        """
        from .models import SubjectEnrollment
        
        # Check if already enrolled (only hard constraint)
        existing = SubjectEnrollment.objects.filter(
            enrollment=enrollment,
            subject=subject,
            status=SubjectEnrollment.Status.ENROLLED
        ).first()
        
        if existing:
            return existing  # Return existing if already enrolled
        
        # Determine if irregular
        profile = student.student_profile
        is_irregular = (
            subject.year_level != profile.year_level or 
            self._get_semester_number(enrollment.semester) != subject.semester_number
        )
        
        # Create without validation
        subject_enrollment = SubjectEnrollment.objects.create(
            enrollment=enrollment,
            subject=subject,
            section=section,
            status=SubjectEnrollment.Status.ENROLLED,
            is_irregular=is_irregular
        )
        
        # Audit log with override details
        AuditLog.log(
            action=AuditLog.Action.OVERRIDE_APPLIED,
            target_model='SubjectEnrollment',
            target_id=subject_enrollment.id,
            actor=registrar,
            payload={
                'student_id': str(student.id),
                'student_number': student.student_number,
                'subject_code': subject.code,
                'section': section.name,
                'override_reason': override_reason,
                'override_by': registrar.email
            }
        )
        
        return subject_enrollment
    
    def _get_semester_number(self, semester) -> int:
        """Helper to get semester number from Semester object."""
        if '2nd' in semester.name.lower() or 'second' in semester.name.lower():
            return 2
        elif 'summer' in semester.name.lower():
            return 3
        return 1


# ============================================================
# EPIC 4 — Payment & Exam Permit Services
# ============================================================

class PaymentService:
    """
    Service class for payment-related business logic.
    Handles payment recording, allocation, adjustments, and receipt generation.
    """
    
    @staticmethod
    def generate_receipt_number() -> str:
        """
        Generate unique receipt number in format: RCV-YYYYMMDD-XXXXX
        
        Returns:
            str: Unique receipt number
        """
        today = date.today()
        date_part = today.strftime('%Y%m%d')
        
        # Find the highest existing number for today
        latest = PaymentTransaction.objects.filter(
            receipt_number__startswith=f"RCV-{date_part}-"
        ).order_by('-receipt_number').first()
        
        if latest:
            try:
                last_number = int(latest.receipt_number.split('-')[-1])
                new_number = last_number + 1
            except (ValueError, IndexError):
                new_number = 1
        else:
            new_number = 1
        
        receipt_number = f"RCV-{date_part}-{new_number:05d}"
        
        # Double-check uniqueness
        while PaymentTransaction.objects.filter(receipt_number=receipt_number).exists():
            new_number += 1
            receipt_number = f"RCV-{date_part}-{new_number:05d}"
        
        return receipt_number
    
    @staticmethod
    def auto_allocate(enrollment: Enrollment, amount: Decimal) -> List[Dict]:
        """
        Allocate payment to earliest unpaid bucket(s).
        
        Args:
            enrollment: The enrollment to allocate to
            amount: The amount to allocate
            
        Returns:
            list: List of allocation details
        """
        allocations = []
        remaining = amount
        
        # Get unpaid/partially paid buckets in order
        buckets = enrollment.payment_buckets.filter(
            is_fully_paid=False
        ).order_by('month_number')
        
        for bucket in buckets:
            if remaining <= 0:
                break
            
            bucket_remaining = bucket.remaining_amount
            to_allocate = min(remaining, bucket_remaining)
            
            if to_allocate > 0:
                # Add payment to bucket
                allocated = bucket.add_payment(to_allocate)
                
                allocations.append({
                    'bucket_id': str(bucket.id),
                    'month': bucket.month_number,
                    'amount': float(allocated)
                })
                
                remaining -= allocated
        
        return allocations
    
    @staticmethod
    def manual_allocate(
        enrollment: Enrollment,
        allocations: List[Dict],
        cashier: User
    ) -> List[Dict]:
        """
        Manually allocate payment to specific bucket(s).
        
        Args:
            enrollment: The enrollment to allocate to
            allocations: List of {"month": int, "amount": Decimal}
            cashier: The cashier making the allocation
            
        Returns:
            list: List of allocation details with bucket IDs
        """
        result = []
        
        for allocation in allocations:
            month = allocation['month']
            amount = Decimal(str(allocation['amount']))
            
            bucket = enrollment.payment_buckets.filter(month_number=month).first()
            if bucket:
                allocated = bucket.add_payment(amount)
                result.append({
                    'bucket_id': str(bucket.id),
                    'month': month,
                    'amount': float(allocated)
                })
        
        return result
    
    @classmethod
    @transaction.atomic
    def record_payment(
        cls,
        enrollment: Enrollment,
        amount: Decimal,
        payment_mode: str,
        cashier: User,
        reference_number: str = '',
        allocations: List[Dict] = None,
        notes: str = ''
    ) -> PaymentTransaction:
        """
        Record a payment and allocate to buckets.
        
        Args:
            enrollment: The enrollment receiving payment
            amount: Payment amount
            payment_mode: PaymentMode choice value
            cashier: User processing the payment
            reference_number: External reference for online payments
            allocations: Optional manual allocations, auto-allocates if None
            notes: Optional notes
            
        Returns:
            PaymentTransaction: The created transaction
        """
        # Generate receipt number
        receipt_number = cls.generate_receipt_number()
        
        # Allocate the payment
        if allocations:
            allocated = cls.manual_allocate(enrollment, allocations, cashier)
        else:
            allocated = cls.auto_allocate(enrollment, amount)
        
        # Create transaction
        transaction_obj = PaymentTransaction.objects.create(
            enrollment=enrollment,
            amount=amount,
            payment_mode=payment_mode,
            receipt_number=receipt_number,
            reference_number=reference_number,
            allocated_buckets=allocated,
            processed_by=cashier,
            notes=notes
        )
        
        # Log to audit
        AuditLog.log(
            action=AuditLog.Action.PAYMENT_RECORDED,
            target_model='PaymentTransaction',
            target_id=transaction_obj.id,
            actor=cashier,
            payload={
                'receipt_number': receipt_number,
                'amount': str(amount),
                'payment_mode': payment_mode,
                'student_number': enrollment.student.student_number,
                'allocations': allocated
            }
        )
        
        # Check if any exam permits should be unlocked
        ExamPermitService.check_and_unlock_permits(enrollment)
        
        return transaction_obj
    
    @classmethod
    @transaction.atomic
    def create_adjustment(
        cls,
        original_transaction: PaymentTransaction,
        adjustment_amount: Decimal,
        reason: str,
        cashier: User
    ) -> PaymentTransaction:
        """
        Create an adjustment transaction.
        
        Args:
            original_transaction: The transaction being adjusted
            adjustment_amount: The adjustment amount (positive or negative)
            reason: Justification for the adjustment
            cashier: The cashier making the adjustment
            
        Returns:
            PaymentTransaction: The adjustment transaction
        """
        if not reason.strip():
            raise ValueError("Adjustment reason is required")
        
        receipt_number = cls.generate_receipt_number()
        
        # Apply adjustment to buckets (reverse allocation for negative)
        enrollment = original_transaction.enrollment
        
        if adjustment_amount > 0:
            # Adding funds - allocate normally
            allocated = cls.auto_allocate(enrollment, adjustment_amount)
        else:
            # Removing funds - reverse from latest allocations
            allocated = cls._reverse_allocate(enrollment, abs(adjustment_amount))
        
        # Create adjustment transaction
        adjustment = PaymentTransaction.objects.create(
            enrollment=enrollment,
            amount=adjustment_amount,
            payment_mode=original_transaction.payment_mode,
            receipt_number=receipt_number,
            is_adjustment=True,
            adjustment_reason=reason,
            original_transaction=original_transaction,
            allocated_buckets=allocated,
            processed_by=cashier
        )
        
        # Log to audit
        AuditLog.log(
            action=AuditLog.Action.PAYMENT_ADJUSTED,
            target_model='PaymentTransaction',
            target_id=adjustment.id,
            actor=cashier,
            payload={
                'original_receipt': original_transaction.receipt_number,
                'adjustment_amount': str(adjustment_amount),
                'reason': reason,
                'student_number': enrollment.student.student_number
            }
        )
        
        return adjustment
    
    @staticmethod
    def _reverse_allocate(enrollment: Enrollment, amount: Decimal) -> List[Dict]:
        """
        Reverse allocation from buckets (for negative adjustments).
        Removes from latest months first.
        """
        allocations = []
        remaining = amount
        
        # Get paid/partially paid buckets in reverse order
        buckets = enrollment.payment_buckets.filter(
            paid_amount__gt=0
        ).order_by('-month_number')
        
        for bucket in buckets:
            if remaining <= 0:
                break
            
            to_remove = min(remaining, bucket.paid_amount)
            
            if to_remove > 0:
                bucket.paid_amount -= to_remove
                bucket.is_fully_paid = bucket.paid_amount >= bucket.required_amount
                bucket.save()
                
                allocations.append({
                    'bucket_id': str(bucket.id),
                    'month': bucket.month_number,
                    'amount': float(-to_remove)  # Negative to indicate removal
                })
                
                remaining -= to_remove
        
        return allocations
    
    @staticmethod
    def get_payment_summary(enrollment: Enrollment) -> Dict:
        """
        Get payment summary for an enrollment.
        
        Returns:
            dict: Summary with totals and bucket breakdown
        """
        buckets = enrollment.payment_buckets.all().order_by('month_number')
        
        bucket_data = []
        for bucket in buckets:
            bucket_data.append({
                'month': bucket.month_number,
                'required': float(bucket.required_amount),
                'paid': float(bucket.paid_amount),
                'remaining': float(bucket.remaining_amount),
                'is_fully_paid': bucket.is_fully_paid,
                'percentage': bucket.payment_percentage
            })
        
        transactions = enrollment.transactions.all().order_by('-processed_at')[:10]
        transaction_data = [
            {
                'id': str(t.id),
                'receipt_number': t.receipt_number,
                'amount': float(t.amount),
                'payment_mode': t.payment_mode,
                'processed_at': t.processed_at.isoformat(),
                'is_adjustment': t.is_adjustment
            }
            for t in transactions
        ]
        
        return {
            'total_required': float(enrollment.total_required),
            'total_paid': float(enrollment.total_paid),
            'balance': float(enrollment.balance),
            'is_fully_paid': enrollment.is_fully_paid,
            'buckets': bucket_data,
            'recent_transactions': transaction_data
        }


class ExamPermitService:
    """
    Service class for exam permit business logic.
    Handles permit eligibility checking and generation.
    """
    
    @staticmethod
    def generate_permit_code() -> str:
        """
        Generate unique permit code in format: EXP-YYYYMMDD-XXXXX
        
        Returns:
            str: Unique permit code
        """
        today = date.today()
        date_part = today.strftime('%Y%m%d')
        
        # Find the highest existing number for today
        latest = ExamPermit.objects.filter(
            permit_code__startswith=f"EXP-{date_part}-"
        ).order_by('-permit_code').first()
        
        if latest:
            try:
                last_number = int(latest.permit_code.split('-')[-1])
                new_number = last_number + 1
            except (ValueError, IndexError):
                new_number = 1
        else:
            new_number = 1
        
        permit_code = f"EXP-{date_part}-{new_number:05d}"
        
        # Double-check uniqueness
        while ExamPermit.objects.filter(permit_code=permit_code).exists():
            new_number += 1
            permit_code = f"EXP-{date_part}-{new_number:05d}"
        
        return permit_code
    
    @staticmethod
    def check_permit_eligibility(
        enrollment: Enrollment,
        exam_period: str
    ) -> tuple[bool, str]:
        """
        Check if student is eligible for exam permit.
        
        Args:
            enrollment: The enrollment
            exam_period: ExamPeriod choice value
            
        Returns:
            tuple: (is_eligible: bool, reason: str)
        """
        # Check if permit already exists
        existing = ExamPermit.objects.filter(
            enrollment=enrollment,
            exam_period=exam_period
        ).first()
        
        if existing:
            return True, "Permit already generated"
        
        # Get mapping for this exam period
        mapping = ExamMonthMapping.objects.filter(
            semester=enrollment.semester,
            exam_period=exam_period,
            is_active=True
        ).first()
        
        if not mapping:
            return False, f"No exam-month mapping found for {exam_period}"
        
        # Check if required month is paid
        bucket = enrollment.payment_buckets.filter(
            month_number=mapping.required_month
        ).first()
        
        if not bucket:
            return False, f"Payment bucket for month {mapping.required_month} not found"
        
        if not bucket.is_fully_paid:
            return False, f"Month {mapping.required_month} payment not complete (₱{bucket.remaining_amount} remaining)"
        
        return True, "Eligible"
    
    @classmethod
    @transaction.atomic
    def generate_permit(
        cls,
        enrollment: Enrollment,
        exam_period: str
    ) -> Optional[ExamPermit]:
        """
        Generate exam permit if eligible.
        
        Args:
            enrollment: The enrollment
            exam_period: ExamPeriod choice value
            
        Returns:
            ExamPermit or None: The generated permit or None if not eligible
        """
        # Check if already exists
        existing = ExamPermit.objects.filter(
            enrollment=enrollment,
            exam_period=exam_period
        ).first()
        
        if existing:
            return existing
        
        # Verify eligibility
        is_eligible, reason = cls.check_permit_eligibility(enrollment, exam_period)
        if not is_eligible:
            return None
        
        # Get the required month from mapping
        mapping = ExamMonthMapping.objects.filter(
            semester=enrollment.semester,
            exam_period=exam_period,
            is_active=True
        ).first()
        
        # Generate permit
        permit = ExamPermit.objects.create(
            enrollment=enrollment,
            exam_period=exam_period,
            permit_code=cls.generate_permit_code(),
            required_month=mapping.required_month
        )
        
        # Log to audit
        AuditLog.log(
            action=AuditLog.Action.EXAM_PERMIT_GENERATED,
            target_model='ExamPermit',
            target_id=permit.id,
            payload={
                'permit_code': permit.permit_code,
                'exam_period': exam_period,
                'student_number': enrollment.student.student_number,
                'required_month': mapping.required_month
            }
        )
        
        return permit
    
    @classmethod
    def check_and_unlock_permits(cls, enrollment: Enrollment) -> List[ExamPermit]:
        """
        Check and generate all eligible exam permits for an enrollment.
        Called automatically after a payment is recorded.
        
        Args:
            enrollment: The enrollment to check
            
        Returns:
            list: List of newly generated permits
        """
        generated = []
        
        # Get all active mappings for this semester
        mappings = ExamMonthMapping.objects.filter(
            semester=enrollment.semester,
            is_active=True
        )
        
        for mapping in mappings:
            # Check if already has permit
            existing = ExamPermit.objects.filter(
                enrollment=enrollment,
                exam_period=mapping.exam_period
            ).exists()
            
            if existing:
                continue
            
            # Check if eligible
            is_eligible, _ = cls.check_permit_eligibility(enrollment, mapping.exam_period)
            
            if is_eligible:
                permit = cls.generate_permit(enrollment, mapping.exam_period)
                if permit:
                    generated.append(permit)
        
        return generated
    
    @staticmethod
    def get_student_permits(enrollment: Enrollment) -> List[Dict]:
        """
        Get all exam permits for an enrollment.
        
        Args:
            enrollment: The enrollment
            
        Returns:
            list: List of permit data
        """
        permits = ExamPermit.objects.filter(enrollment=enrollment).order_by('exam_period')
        
        # Get all exam periods to show status
        all_periods = ExamMonthMapping.ExamPeriod.choices
        
        period_status = {}
        for code, label in all_periods:
            mapping = ExamMonthMapping.objects.filter(
                semester=enrollment.semester,
                exam_period=code,
                is_active=True
            ).first()
            
            permit = permits.filter(exam_period=code).first()
            
            if permit:
                status = 'GENERATED'
            elif mapping:
                bucket = enrollment.payment_buckets.filter(
                    month_number=mapping.required_month
                ).first()
                if bucket and bucket.is_fully_paid:
                    status = 'ELIGIBLE'
                else:
                    status = 'LOCKED'
            else:
                status = 'NOT_CONFIGURED'
            
            period_status[code] = {
                'exam_period': code,
                'exam_period_label': label,
                'status': status,
                'permit_code': permit.permit_code if permit else None,
                'permit_id': str(permit.id) if permit else None,
                'is_printed': permit.is_printed if permit else False,
                'required_month': mapping.required_month if mapping else None
            }
        
        return list(period_status.values())
    
    @classmethod
    @transaction.atomic
    def mark_as_printed(cls, permit: ExamPermit, printed_by: User) -> ExamPermit:
        """
        Mark a permit as printed.
        
        Args:
            permit: The permit to mark
            printed_by: User who printed it
            
        Returns:
            ExamPermit: Updated permit
        """
        permit.is_printed = True
        permit.printed_at = timezone.now()
        permit.printed_by = printed_by
        permit.save()
        
        # Log to audit
        AuditLog.log(
            action=AuditLog.Action.EXAM_PERMIT_PRINTED,
            target_model='ExamPermit',
            target_id=permit.id,
            actor=printed_by,
            payload={
                'permit_code': permit.permit_code,
                'exam_period': permit.exam_period,
                'student_number': permit.student.student_number
            }
        )
        
        return permit
