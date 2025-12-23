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
    PaymentTransaction, ExamMonthMapping, ExamPermit,
    SubjectEnrollment, GradeHistory, SemesterGPA,
    DocumentRelease
)

from datetime import timedelta


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
        
        # Generate school email as username: first_initial + last_name + random_digits + @richwell.edu.ph
        school_email = self._generate_school_email(data['first_name'], data['last_name'])
        
        # Password is the school email initially (until approved)
        password = school_email
        
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
        
        # Create Enrollment - Set to ACTIVE immediately (no admin approval needed)
        enrollment = Enrollment.objects.create(
            student=user,
            semester=semester,
            status=Enrollment.Status.PENDING,  # Wait for Admission approval
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
            status=Enrollment.Status.PENDING,
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


class SubjectEnrollmentService:
    """
    Service class for subject enrollment business logic.
    Handles subject selection, validation, and enrollment/drop operations.
    """
    
    def __init__(self):
        self.max_units = settings.SYSTEM_CONFIG.get('MAX_UNITS_PER_SEMESTER', 30)
    
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

    def check_inc_prerequisites(self, student, subject) -> tuple[bool, list]:
        """
        Check if any prerequisites have INC status - HARD BLOCK.

        Args:
            student: User object (student)
            subject: Subject object

        Returns:
            tuple: (is_valid: bool, inc_prerequisites: list of dicts with code and name)
        """
        from .models import SubjectEnrollment

        inc_prerequisites = []

        for prereq in subject.prerequisites.all():
            # Check if student has this prerequisite with INC status
            has_inc = SubjectEnrollment.objects.filter(
                enrollment__student=student,
                subject=prereq,
                status=SubjectEnrollment.Status.INC
            ).exists()

            if has_inc:
                inc_prerequisites.append({
                    'code': prereq.code,
                    'name': prereq.name
                })

        return len(inc_prerequisites) == 0, inc_prerequisites

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

        Students can now enroll without payment. If Month 1 is not paid,
        the subject enrollment will have status=PENDING_PAYMENT.

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

        # NEW: Check for INC prerequisites
        has_no_inc, inc_prereqs = self.check_inc_prerequisites(student, subject)
        if not has_no_inc:
            inc_list = ', '.join([f"{p['code']} - {p['name']}" for p in inc_prereqs])
            raise PrerequisiteNotSatisfiedError(
                f"Cannot enroll in {subject.code}: Prerequisites with INC status must be completed first: {inc_list}"
            )
        
        # Check unit cap
        within_cap, current, max_units = self.check_unit_cap(
            student, enrollment.semester, subject.units
        )
        if not within_cap:
            raise UnitCapExceededError(
                f"Would exceed unit cap ({current} + {subject.units} > {max_units})"
            )

        # REMOVED: Check payment status - students can now enroll without payment
        # Payment status will determine if enrollment is PENDING or ENROLLED

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

        # Determine enrollment status:
        # NEW FLOW: Subject enrollments now require Head approval
        # Status is set to PENDING_HEAD, Head will approve to change to ENROLLED
        enrollment_status = SubjectEnrollment.Status.PENDING_HEAD

        # Create the enrollment with dual approval flags
        subject_enrollment = SubjectEnrollment.objects.create(
            enrollment=enrollment,
            subject=subject,
            section=section,
            status=enrollment_status,
            is_irregular=is_irregular,
            payment_approved=enrollment.first_month_paid,  # Set based on current payment status
            head_approved=False  # Initially False, awaiting head approval
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
    def edit_subject_enrollment(
        self,
        subject_enrollment: 'SubjectEnrollment',
        new_subject: 'Subject',
        new_section: 'Section',
        actor: User
    ) -> 'SubjectEnrollment':
        """
        Edit a subject enrollment (change subject or section).
        Only allowed before head approval.

        Validates:
        - Prerequisites for new subject
        - Unit cap (adjusted for subject swap)
        - Schedule conflicts (excluding current enrollment)
        - No duplicate enrollments

        Args:
            subject_enrollment: SubjectEnrollment object to edit
            new_subject: New Subject object
            new_section: New Section object
            actor: User performing the edit

        Returns:
            SubjectEnrollment: Updated record

        Raises:
            ConflictError: If head has already approved or duplicate enrollment
            PrerequisiteNotSatisfiedError: If prerequisites not met
            UnitCapExceededError: If edit would exceed unit cap
            ScheduleConflictError: If schedule conflict with other enrollments
        """
        from .models import SubjectEnrollment
        from apps.core.exceptions import (
            ConflictError,
            PrerequisiteNotSatisfiedError,
            UnitCapExceededError,
            ScheduleConflictError
        )

        # 1. Validation gate - cannot edit after head approval
        if subject_enrollment.head_approved:
            raise ConflictError("Cannot edit: Head has already approved this enrollment")

        # 2. Store old values for audit
        old_subject = subject_enrollment.subject
        old_section = subject_enrollment.section
        old_units = old_subject.units

        # 3. Validate prerequisites for new subject
        self.check_prerequisites(actor, new_subject)
        self.check_inc_prerequisites(actor, new_subject)

        # 4. Check for duplicate enrollment
        duplicate = SubjectEnrollment.objects.filter(
            enrollment__student=actor,
            subject=new_subject,
            status__in=[
                SubjectEnrollment.Status.PENDING_HEAD,
                SubjectEnrollment.Status.ENROLLED
            ]
        ).exclude(id=subject_enrollment.id).exists()

        if duplicate:
            raise ConflictError(f"Already enrolled in {new_subject.code}")

        # 5. Validate unit cap (adjust for swap)
        enrollment = subject_enrollment.enrollment
        current_units = self.get_current_enrolled_units(actor, enrollment.semester)
        adjusted_units = current_units - old_units + new_subject.units

        if adjusted_units > 30:
            raise UnitCapExceededError(
                f"Would exceed unit cap: {adjusted_units}/30 units"
            )

        # 6. Check schedule conflict (excluding current enrollment's section)
        has_conflict, conflict_info = self.check_schedule_conflict(
            student=actor,
            section=new_section,
            semester=enrollment.semester
        )

        # If there's a conflict, check if it's with the current enrollment (which is OK)
        if has_conflict:
            # Get the conflicting enrollment to see if it's the current one being edited
            from apps.enrollment.models import SubjectEnrollment as SE
            conflicting_enrollments = SE.objects.filter(
                enrollment__student=actor,
                enrollment__semester=enrollment.semester,
                status__in=[SE.Status.PENDING_HEAD, SE.Status.ENROLLED],
                section=conflict_info.get('section')
            ).exclude(id=subject_enrollment.id)

            # If there are other conflicting enrollments (not just the current one), raise error
            if conflicting_enrollments.exists():
                conflicting = conflicting_enrollments.first()
                raise ScheduleConflictError(
                    f"Schedule conflict with {conflicting.subject.code}"
                )

        # 7. Update record
        subject_enrollment.subject = new_subject
        subject_enrollment.section = new_section
        subject_enrollment.is_irregular = (
            new_subject.year_level != actor.student_profile.year_level or
            self._get_semester_number(enrollment.semester) != new_subject.semester_number
        )
        subject_enrollment.save(update_fields=['subject', 'section', 'is_irregular'])

        # 8. Audit log
        AuditLog.log(
            action=AuditLog.Action.SUBJECT_EDITED,
            target_model='SubjectEnrollment',
            target_id=subject_enrollment.id,
            actor=actor,
            payload={
                'old_subject': old_subject.code,
                'new_subject': new_subject.code,
                'old_section': old_section.name if old_section else None,
                'new_section': new_section.name if new_section else None,
                'old_units': old_units,
                'new_units': new_subject.units
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

        # Check if Month 1 is now fully paid and update approval flags
        month_1_bucket = enrollment.payment_buckets.filter(month_number=1).first()
        if month_1_bucket and month_1_bucket.is_fully_paid:
            # Set enrollment first_month_paid flag
            enrollment.first_month_paid = True
            enrollment.save(update_fields=['first_month_paid'])

            # Update all subject enrollments to mark payment as approved
            from .models import SubjectEnrollment
            subject_enrollments = SubjectEnrollment.objects.filter(
                enrollment=enrollment,
                payment_approved=False
            )

            for se in subject_enrollments:
                se.payment_approved = True

                # If head has also approved, change status to ENROLLED
                if se.head_approved and se.status == SubjectEnrollment.Status.PENDING_HEAD:
                    se.status = SubjectEnrollment.Status.ENROLLED

                se.save(update_fields=['payment_approved', 'status'])

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


# ============================================================
# EPIC 5 — Grade & GPA Services
# ============================================================

class GradeService:
    """
    Service class for grade-related business logic.
    Handles grade submission, validation, finalization, and GPA calculation.
    """
    
    # Allowed grade values as per documentation
    ALLOWED_GRADES = [
        Decimal('1.00'),
        Decimal('1.25'),
        Decimal('1.50'),
        Decimal('1.75'),
        Decimal('2.00'),
        Decimal('2.25'),
        Decimal('2.50'),
        Decimal('2.75'),
        Decimal('3.00'),
        Decimal('5.00'),
    ]
    
    PASSING_GRADE = Decimal('3.00')
    
    @classmethod
    def validate_grade(cls, grade: Decimal) -> tuple[bool, str]:
        """
        Validate that a grade is in the allowed set.
        
        Args:
            grade: The grade value to validate
            
        Returns:
            tuple: (is_valid, error_message)
        """
        if grade is None:
            return True, ""
        
        grade = Decimal(str(grade))
        
        if grade not in cls.ALLOWED_GRADES:
            allowed = ', '.join(str(g) for g in cls.ALLOWED_GRADES)
            return False, f"Grade must be one of: {allowed}"
        
        return True, ""
    
    @classmethod
    def is_passing(cls, grade: Decimal) -> bool:
        """Check if a grade is passing."""
        if grade is None:
            return False
        return Decimal(str(grade)) <= cls.PASSING_GRADE
    
    @classmethod
    @transaction.atomic
    def submit_grade(
        cls,
        subject_enrollment: SubjectEnrollment,
        grade: Decimal,
        professor: User,
        is_inc: bool = False,
        change_reason: str = ''
    ) -> SubjectEnrollment:
        """
        Submit or update a grade for a subject enrollment.
        
        Args:
            subject_enrollment: The enrollment to grade
            grade: The grade value (None if INC)
            professor: The professor submitting the grade
            is_inc: Whether to mark as INC instead of numeric grade
            change_reason: Optional reason for the change
            
        Returns:
            SubjectEnrollment: Updated enrollment
        """
        from apps.academics.models import SectionSubject
        
        # Check if already finalized
        if subject_enrollment.is_finalized:
            raise ValueError("Cannot modify a finalized grade")
        
        # Verify professor is assigned to this section
        if subject_enrollment.section:
            is_assigned = SectionSubject.objects.filter(
                section=subject_enrollment.section,
                subject=subject_enrollment.subject,
                professor=professor
            ).exists()
            
            if not is_assigned:
                raise ValueError("You are not assigned to teach this subject in this section")
        
        # Store previous values for history
        previous_grade = subject_enrollment.grade
        previous_status = subject_enrollment.status
        
        if is_inc:
            # Mark as INC
            new_grade = None
            new_status = SubjectEnrollment.Status.INC
            subject_enrollment.inc_marked_at = timezone.now()
        else:
            # Validate grade
            is_valid, error = cls.validate_grade(grade)
            if not is_valid:
                raise ValueError(error)
            
            new_grade = Decimal(str(grade))
            new_status = (
                SubjectEnrollment.Status.PASSED 
                if cls.is_passing(new_grade) 
                else SubjectEnrollment.Status.FAILED
            )
            subject_enrollment.inc_marked_at = None
        
        # Update the enrollment
        subject_enrollment.grade = new_grade
        subject_enrollment.status = new_status
        subject_enrollment.save()
        
        # Create history entry
        GradeHistory.objects.create(
            subject_enrollment=subject_enrollment,
            previous_grade=previous_grade,
            new_grade=new_grade,
            previous_status=previous_status,
            new_status=new_status,
            changed_by=professor,
            change_reason=change_reason
        )
        
        # Log to audit
        AuditLog.log(
            action=AuditLog.Action.GRADE_SUBMITTED,
            target_model='SubjectEnrollment',
            target_id=subject_enrollment.id,
            actor=professor,
            payload={
                'subject_code': subject_enrollment.subject.code,
                'student_number': subject_enrollment.enrollment.student.student_number,
                'previous_grade': str(previous_grade) if previous_grade else None,
                'new_grade': str(new_grade) if new_grade else 'INC',
                'new_status': new_status
            }
        )
        
        return subject_enrollment
    
    @classmethod
    @transaction.atomic
    def finalize_section_grades(
        cls,
        section,
        registrar: User
    ) -> List[SubjectEnrollment]:
        """
        Finalize all grades for a section.
        
        Args:
            section: The section to finalize
            registrar: The registrar performing finalization
            
        Returns:
            list: Finalized subject enrollments
        """
        from apps.academics.models import Section
        
        # Get all subject enrollments for this section
        enrollments = SubjectEnrollment.objects.filter(
            section=section,
            is_finalized=False,
            status__in=[
                SubjectEnrollment.Status.PASSED,
                SubjectEnrollment.Status.FAILED,
                SubjectEnrollment.Status.INC
            ]
        )
        
        finalized = []
        now = timezone.now()
        
        for enrollment in enrollments:
            enrollment.is_finalized = True
            enrollment.finalized_at = now
            enrollment.finalized_by = registrar
            enrollment.save()
            
            # Create history entry for finalization
            GradeHistory.objects.create(
                subject_enrollment=enrollment,
                previous_grade=enrollment.grade,
                new_grade=enrollment.grade,
                previous_status=enrollment.status,
                new_status=enrollment.status,
                changed_by=registrar,
                is_finalization=True
            )
            
            finalized.append(enrollment)
        
        if finalized:
            # Log to audit
            AuditLog.log(
                action=AuditLog.Action.GRADE_FINALIZED,
                target_model='Section',
                target_id=section.id,
                actor=registrar,
                payload={
                    'section_name': section.name,
                    'grades_finalized': len(finalized)
                }
            )
            
            # Trigger GPA recalculation for affected enrollments
            enrollment_ids = set(e.enrollment_id for e in finalized)
            for eid in enrollment_ids:
                cls.calculate_semester_gpa(Enrollment.objects.get(id=eid))
        
        return finalized
    
    @classmethod
    @transaction.atomic
    def override_grade(
        cls,
        subject_enrollment: SubjectEnrollment,
        new_grade: Decimal,
        registrar: User,
        reason: str
    ) -> SubjectEnrollment:
        """
        Override a grade (even if finalized). Registrar only.
        
        Args:
            subject_enrollment: The enrollment to override
            new_grade: The new grade value
            registrar: The registrar making the override
            reason: Required justification
            
        Returns:
            SubjectEnrollment: Updated enrollment
        """
        if not reason or len(reason.strip()) < 10:
            raise ValueError("Override reason must be at least 10 characters")
        
        # Validate grade
        is_valid, error = cls.validate_grade(new_grade)
        if not is_valid:
            raise ValueError(error)
        
        # Store previous values
        previous_grade = subject_enrollment.grade
        previous_status = subject_enrollment.status
        
        # Update grade
        new_grade = Decimal(str(new_grade))
        new_status = (
            SubjectEnrollment.Status.PASSED 
            if cls.is_passing(new_grade) 
            else SubjectEnrollment.Status.FAILED
        )
        
        subject_enrollment.grade = new_grade
        subject_enrollment.status = new_status
        subject_enrollment.save()
        
        # Create history entry
        GradeHistory.objects.create(
            subject_enrollment=subject_enrollment,
            previous_grade=previous_grade,
            new_grade=new_grade,
            previous_status=previous_status,
            new_status=new_status,
            changed_by=registrar,
            change_reason=reason
        )
        
        # Log to audit
        AuditLog.log(
            action=AuditLog.Action.GRADE_UPDATED,
            target_model='SubjectEnrollment',
            target_id=subject_enrollment.id,
            actor=registrar,
            payload={
                'subject_code': subject_enrollment.subject.code,
                'student_number': subject_enrollment.enrollment.student.student_number,
                'previous_grade': str(previous_grade) if previous_grade else None,
                'new_grade': str(new_grade),
                'reason': reason,
                'was_finalized': subject_enrollment.is_finalized
            }
        )
        
        # Recalculate GPA if grades were finalized
        if subject_enrollment.is_finalized:
            cls.calculate_semester_gpa(subject_enrollment.enrollment)
        
        return subject_enrollment
    
    @classmethod
    def calculate_semester_gpa(cls, enrollment: Enrollment) -> SemesterGPA:
        """
        Calculate GPA for a semester enrollment.
        
        GPA = Σ(grade × units) / Σ(units)
        Only includes subjects where count_in_gpa=True and status in [PASSED, FAILED]
        
        Args:
            enrollment: The enrollment to calculate GPA for
            
        Returns:
            SemesterGPA: The GPA record
        """
        # Get graded subjects
        graded = SubjectEnrollment.objects.filter(
            enrollment=enrollment,
            count_in_gpa=True,
            status__in=[SubjectEnrollment.Status.PASSED, SubjectEnrollment.Status.FAILED],
            grade__isnull=False
        )
        
        total_units = 0
        total_grade_points = Decimal('0.00')
        subjects_count = 0
        
        for subject_enrollment in graded:
            units = subject_enrollment.subject.units
            grade = subject_enrollment.grade
            
            total_units += units
            total_grade_points += grade * units
            subjects_count += 1
        
        # Calculate GPA
        if total_units > 0:
            gpa = total_grade_points / total_units
            gpa = gpa.quantize(Decimal('0.01'))
        else:
            gpa = Decimal('0.00')
        
        # Check if all grades are finalized
        all_finalized = not SubjectEnrollment.objects.filter(
            enrollment=enrollment,
            is_finalized=False,
            status__in=[
                SubjectEnrollment.Status.PASSED,
                SubjectEnrollment.Status.FAILED,
                SubjectEnrollment.Status.INC
            ]
        ).exists()
        
        # Update or create GPA record
        gpa_record, created = SemesterGPA.objects.update_or_create(
            enrollment=enrollment,
            defaults={
                'gpa': gpa,
                'total_units': total_units,
                'total_grade_points': total_grade_points,
                'subjects_included': subjects_count,
                'is_finalized': all_finalized
            }
        )
        
        return gpa_record
    
    @staticmethod
    def get_student_transcript(student: User) -> List[Dict]:
        """
        Get full academic transcript for a student.
        
        Args:
            student: The student user
            
        Returns:
            list: List of semester records with subjects and grades
        """
        from apps.enrollment.models import Enrollment
        
        enrollments = Enrollment.objects.filter(
            student=student
        ).select_related('semester').order_by('semester__start_date')
        
        transcript = []
        cumulative_units = 0
        cumulative_points = Decimal('0.00')
        
        for enrollment in enrollments:
            # Get GPA record
            gpa_record = getattr(enrollment, 'gpa_record', None)
            
            # Get subject enrollments
            subjects = SubjectEnrollment.objects.filter(
                enrollment=enrollment
            ).select_related('subject').order_by('subject__code')
            
            subject_data = []
            for se in subjects:
                subject_data.append({
                    'code': se.subject.code,
                    'title': se.subject.title,
                    'units': se.subject.units,
                    'grade': str(se.grade) if se.grade else None,
                    'status': se.status,
                    'is_finalized': se.is_finalized
                })
            
            semester_record = {
                'semester': str(enrollment.semester),
                'semester_id': str(enrollment.semester.id),
                'enrollment_id': str(enrollment.id),
                'subjects': subject_data,
                'gpa': str(gpa_record.gpa) if gpa_record else None,
                'total_units': gpa_record.total_units if gpa_record else 0,
                'is_finalized': gpa_record.is_finalized if gpa_record else False
            }
            
            transcript.append(semester_record)
            
            # Cumulative totals
            if gpa_record:
                cumulative_units += gpa_record.total_units
                cumulative_points += gpa_record.total_grade_points
        
        # Calculate cumulative GPA
        cumulative_gpa = (
            cumulative_points / cumulative_units 
            if cumulative_units > 0 
            else Decimal('0.00')
        ).quantize(Decimal('0.01'))
        
        return {
            'semesters': transcript,
            'cumulative_gpa': str(cumulative_gpa),
            'cumulative_units': cumulative_units
        }


class INCAutomationService:
    """
    Service for handling INC (Incomplete) grade automation.
    Manages expiry and conversion to FAILED.
    """
    
    MAJOR_INC_EXPIRY_MONTHS = 6
    MINOR_INC_EXPIRY_MONTHS = 12
    
    @classmethod
    def get_inc_expiry_date(cls, subject_enrollment: SubjectEnrollment):
        """
        Calculate when an INC expires based on subject type.
        
        Args:
            subject_enrollment: The enrollment with INC status
            
        Returns:
            datetime or None: Expiry date
        """
        if subject_enrollment.status != SubjectEnrollment.Status.INC:
            return None
        
        if not subject_enrollment.inc_marked_at:
            return None
        
        # Check if major or minor subject
        is_major = subject_enrollment.subject.is_major
        
        months = cls.MAJOR_INC_EXPIRY_MONTHS if is_major else cls.MINOR_INC_EXPIRY_MONTHS
        expiry_date = subject_enrollment.inc_marked_at + timedelta(days=months * 30)
        
        return expiry_date
    
    @classmethod
    def check_inc_expired(cls, subject_enrollment: SubjectEnrollment) -> bool:
        """
        Check if an INC has expired.
        
        Args:
            subject_enrollment: The enrollment to check
            
        Returns:
            bool: Whether the INC has expired
        """
        expiry = cls.get_inc_expiry_date(subject_enrollment)
        if not expiry:
            return False
        
        return timezone.now() > expiry
    
    @classmethod
    @transaction.atomic
    def convert_inc_to_failed(
        cls,
        subject_enrollment: SubjectEnrollment
    ) -> SubjectEnrollment:
        """
        Convert an INC to FAILED due to expiry.
        
        Args:
            subject_enrollment: The enrollment to convert
            
        Returns:
            SubjectEnrollment: Updated enrollment
        """
        if subject_enrollment.status != SubjectEnrollment.Status.INC:
            raise ValueError("Subject is not marked as INC")
        
        previous_grade = subject_enrollment.grade
        previous_status = subject_enrollment.status
        
        # Update to FAILED
        subject_enrollment.grade = Decimal('5.00')
        subject_enrollment.status = SubjectEnrollment.Status.FAILED
        subject_enrollment.save()
        
        # Create history entry (system action)
        GradeHistory.objects.create(
            subject_enrollment=subject_enrollment,
            previous_grade=previous_grade,
            new_grade=Decimal('5.00'),
            previous_status=previous_status,
            new_status=SubjectEnrollment.Status.FAILED,
            changed_by=None,  # System action
            change_reason='INC automatically converted to FAILED due to expiry',
            is_system_action=True
        )
        
        # Log to audit
        AuditLog.log(
            action=AuditLog.Action.INC_CONVERTED_TO_FAILED,
            target_model='SubjectEnrollment',
            target_id=subject_enrollment.id,
            payload={
                'subject_code': subject_enrollment.subject.code,
                'student_number': subject_enrollment.enrollment.student.student_number,
                'inc_marked_at': subject_enrollment.inc_marked_at.isoformat() if subject_enrollment.inc_marked_at else None,
                'is_major': subject_enrollment.subject.is_major,
                'expiry_months': cls.MAJOR_INC_EXPIRY_MONTHS if subject_enrollment.subject.is_major else cls.MINOR_INC_EXPIRY_MONTHS
            }
        )
        
        # Recalculate GPA
        GradeService.calculate_semester_gpa(subject_enrollment.enrollment)
        
        return subject_enrollment
    
    @classmethod
    def get_expiring_incs(cls, days_ahead: int = 7) -> List[Dict]:
        """
        Get INCs that will expire within the specified days.
        
        Args:
            days_ahead: Number of days to look ahead
            
        Returns:
            list: List of expiring INC details
        """
        expiring = []
        now = timezone.now()
        threshold = now + timedelta(days=days_ahead)
        
        # Get all INC enrollments
        incs = SubjectEnrollment.objects.filter(
            status=SubjectEnrollment.Status.INC,
            inc_marked_at__isnull=False
        ).select_related('subject', 'enrollment__student', 'enrollment__semester')
        
        for enrollment in incs:
            expiry = cls.get_inc_expiry_date(enrollment)
            if expiry and now < expiry <= threshold:
                days_remaining = (expiry - now).days
                expiring.append({
                    'enrollment_id': str(enrollment.id),
                    'subject_code': enrollment.subject.code,
                    'subject_title': enrollment.subject.title,
                    'student_number': enrollment.enrollment.student.student_number,
                    'student_name': enrollment.enrollment.student.get_full_name(),
                    'is_major': enrollment.subject.is_major,
                    'inc_marked_at': enrollment.inc_marked_at.isoformat(),
                    'expires_at': expiry.isoformat(),
                    'days_remaining': days_remaining
                })
        
        return sorted(expiring, key=lambda x: x['days_remaining'])
    
    @classmethod
    def process_all_expired_incs(cls) -> List[SubjectEnrollment]:
        """
        Process all expired INCs and convert them to FAILED.
        This should be run as a daily background task.
        
        Returns:
            list: List of converted enrollments
        """
        converted = []
        now = timezone.now()
        
        # Get all INC enrollments
        incs = SubjectEnrollment.objects.filter(
            status=SubjectEnrollment.Status.INC,
            inc_marked_at__isnull=False
        ).select_related('subject')
        
        for enrollment in incs:
            if cls.check_inc_expired(enrollment):
                try:
                    cls.convert_inc_to_failed(enrollment)
                    converted.append(enrollment)
                except Exception as e:
                    # Log error but continue processing
                    print(f"Error converting INC to FAILED: {e}")
        
        return converted


# ============================================================
# EPIC 6 — Document Release Service
# ============================================================

class DocumentReleaseService:
    """
    Service class for document release operations.
    Handles creating, revoking, and reissuing official documents.
    """
    
    @staticmethod
    def generate_document_code() -> str:
        """
        Generate a unique document code.
        Format: DOC-YYYYMMDD-XXXXX
        """
        today = timezone.now().strftime('%Y%m%d')
        
        # Get count of documents created today
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        count = DocumentRelease.objects.filter(
            released_at__gte=today_start
        ).count()
        
        # Generate code with sequential number
        code = f"DOC-{today}-{count + 1:05d}"
        
        # Ensure uniqueness
        while DocumentRelease.objects.filter(document_code=code).exists():
            count += 1
            code = f"DOC-{today}-{count:05d}"
        
        return code
    
    @classmethod
    @transaction.atomic
    def create_release(
        cls,
        student: User,
        document_type: str,
        released_by: User,
        purpose: str = '',
        copies: int = 1,
        notes: str = ''
    ) -> DocumentRelease:
        """
        Create a new document release record.
        
        Args:
            student: The student receiving the document
            document_type: Type of document (TOR, GOOD_MORAL, etc.)
            released_by: The registrar creating the release
            purpose: Purpose of the document request
            copies: Number of copies released
            notes: Internal notes
            
        Returns:
            DocumentRelease: The created release record
        """
        # Validate document type
        valid_types = [dt[0] for dt in DocumentRelease.DocumentType.choices]
        if document_type not in valid_types:
            raise ValueError(f"Invalid document type: {document_type}")
        
        # Generate unique code
        document_code = cls.generate_document_code()
        
        # Create the release
        release = DocumentRelease.objects.create(
            document_code=document_code,
            document_type=document_type,
            student=student,
            released_by=released_by,
            purpose=purpose,
            copies_released=copies,
            notes=notes,
            status=DocumentRelease.Status.ACTIVE
        )
        
        # Log to audit
        AuditLog.log(
            action=AuditLog.Action.DOCUMENT_RELEASED,
            target_model='DocumentRelease',
            target_id=release.id,
            actor=released_by,
            payload={
                'document_code': document_code,
                'document_type': document_type,
                'student_number': student.student_number,
                'student_name': student.get_full_name(),
                'copies': copies
            }
        )
        
        return release
    
    @classmethod
    @transaction.atomic
    def revoke_document(
        cls,
        document_release: DocumentRelease,
        revoked_by: User,
        reason: str
    ) -> DocumentRelease:
        """
        Revoke an active document.
        
        Args:
            document_release: The document to revoke
            revoked_by: The registrar revoking the document
            reason: Reason for revocation (required)
            
        Returns:
            DocumentRelease: The updated release record
        """
        if document_release.status != DocumentRelease.Status.ACTIVE:
            raise ValueError(f"Cannot revoke document with status: {document_release.status}")
        
        if not reason or len(reason.strip()) < 10:
            raise ValueError("Revocation reason must be at least 10 characters")
        
        # Update status
        document_release.status = DocumentRelease.Status.REVOKED
        document_release.revoked_by = revoked_by
        document_release.revoked_at = timezone.now()
        document_release.revocation_reason = reason
        document_release.save()
        
        # Log to audit
        AuditLog.log(
            action=AuditLog.Action.DOCUMENT_REVOKED,
            target_model='DocumentRelease',
            target_id=document_release.id,
            actor=revoked_by,
            payload={
                'document_code': document_release.document_code,
                'document_type': document_release.document_type,
                'student_number': document_release.student.student_number,
                'reason': reason
            }
        )
        
        return document_release
    
    @classmethod
    @transaction.atomic
    def reissue_document(
        cls,
        document_release: DocumentRelease,
        reissued_by: User,
        purpose: str = '',
        notes: str = ''
    ) -> DocumentRelease:
        """
        Reissue a revoked document (creates new record).
        
        Args:
            document_release: The revoked document to reissue
            reissued_by: The registrar reissuing the document
            purpose: Optional new purpose
            notes: Optional notes for the reissue
            
        Returns:
            DocumentRelease: The new release record
        """
        if document_release.status != DocumentRelease.Status.REVOKED:
            raise ValueError("Can only reissue revoked documents")
        
        # Mark original as REISSUED (superseded)
        document_release.status = DocumentRelease.Status.REISSUED
        document_release.save()
        
        # Create new release
        new_release = cls.create_release(
            student=document_release.student,
            document_type=document_release.document_type,
            released_by=reissued_by,
            purpose=purpose or document_release.purpose,
            copies=document_release.copies_released,
            notes=notes or f"Reissue of {document_release.document_code}"
        )
        
        # Link to original
        new_release.replaces = document_release
        new_release.save()
        
        # Log to audit
        AuditLog.log(
            action=AuditLog.Action.DOCUMENT_REISSUED,
            target_model='DocumentRelease',
            target_id=new_release.id,
            actor=reissued_by,
            payload={
                'new_document_code': new_release.document_code,
                'original_document_code': document_release.document_code,
                'document_type': new_release.document_type,
                'student_number': new_release.student.student_number
            }
        )
        
        return new_release
    
    @staticmethod
    def get_student_documents(student: User) -> List[Dict]:
        """
        Get all documents for a student.
        
        Args:
            student: The student
            
        Returns:
            list: List of document records
        """
        releases = DocumentRelease.objects.filter(
            student=student,
            is_deleted=False
        ).order_by('-released_at')
        
        documents = []
        for release in releases:
            documents.append({
                'id': str(release.id),
                'document_code': release.document_code,
                'document_type': release.document_type,
                'document_type_display': release.get_document_type_display(),
                'status': release.status,
                'status_display': release.get_status_display(),
                'released_at': release.released_at.isoformat(),
                'released_by': release.released_by.get_full_name(),
                'purpose': release.purpose,
                'copies_released': release.copies_released,
                'is_revoked': release.is_revoked,
                'revocation_reason': release.revocation_reason if release.is_revoked else None,
                'has_replacement': release.has_replacement
            })
        
        return documents
    
    @staticmethod
    def get_release_logs(
        registrar: User = None,
        date_from=None,
        date_to=None,
        document_type: str = None,
        status: str = None,
        limit: int = 100
    ) -> List[Dict]:
        """
        Get release logs (for audit purpose).
        
        Args:
            registrar: Filter by registrar (None for all - head-registrar only)
            date_from: Start date filter
            date_to: End date filter
            document_type: Filter by document type
            status: Filter by status
            limit: Maximum records to return
            
        Returns:
            list: List of release log entries
        """
        queryset = DocumentRelease.objects.filter(
            is_deleted=False
        ).select_related('student', 'released_by', 'revoked_by')
        
        if registrar:
            queryset = queryset.filter(released_by=registrar)
        
        if date_from:
            queryset = queryset.filter(released_at__gte=date_from)
        
        if date_to:
            queryset = queryset.filter(released_at__lte=date_to)
        
        if document_type:
            queryset = queryset.filter(document_type=document_type)
        
        if status:
            queryset = queryset.filter(status=status)
        
        queryset = queryset.order_by('-released_at')[:limit]
        
        logs = []
        for release in queryset:
            logs.append({
                'id': str(release.id),
                'document_code': release.document_code,
                'document_type': release.document_type,
                'document_type_display': release.get_document_type_display(),
                'status': release.status,
                'student_number': release.student.student_number,
                'student_name': release.student.get_full_name(),
                'released_by': release.released_by.get_full_name(),
                'released_at': release.released_at.isoformat(),
                'revoked_by': release.revoked_by.get_full_name() if release.revoked_by else None,
                'revoked_at': release.revoked_at.isoformat() if release.revoked_at else None,
                'revocation_reason': release.revocation_reason,
                'copies_released': release.copies_released
            })
        
        return logs
    
    @staticmethod
    def get_release_stats(registrar: User = None) -> Dict:
        """
        Get release statistics.
        
        Args:
            registrar: Filter by registrar (None for all)
            
        Returns:
            dict: Statistics summary
        """
        from django.db.models import Count
        
        queryset = DocumentRelease.objects.filter(is_deleted=False)
        
        if registrar:
            queryset = queryset.filter(released_by=registrar)
        
        # By status
        status_counts = dict(queryset.values_list('status').annotate(count=Count('id')))
        
        # By document type
        type_counts = dict(queryset.values_list('document_type').annotate(count=Count('id')))
        
        return {
            'total_released': queryset.count(),
            'active': status_counts.get('ACTIVE', 0),
            'revoked': status_counts.get('REVOKED', 0),
            'reissued': status_counts.get('REISSUED', 0),
            'by_document_type': type_counts
        }
