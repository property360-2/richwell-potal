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
