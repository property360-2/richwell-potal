"""
Subject enrollment services — subject selection, validation, and enrollment/drop operations.
Split services: payment_service.py (PaymentService, ExamPermitService — EPIC 4)
                grade_service.py (GradeService, INCAutomationService — EPIC 5)
                document_release_service.py (DocumentReleaseService — EPIC 6)
"""

from django.db import models, transaction
from django.conf import settings

from apps.accounts.models import User, StudentProfile
from apps.academics.models import Program
from apps.audit.models import AuditLog

from ..models import (
    Enrollment, Semester, SubjectEnrollment
)


# Re-export for backward compatibility
from .payment_service import PaymentService, ExamPermitService  # noqa: F401
from .grade_service import GradeService, INCAutomationService  # noqa: F401
from .document_release_service import DocumentReleaseService  # noqa: F401


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
        from ..models import SubjectEnrollment
        
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
        from ..models import SubjectEnrollment
        
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
        from ..models import SubjectEnrollment
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
    
    def get_allowed_subjects_by_curriculum(self, student, semester):
        """
        EPIC 7: Get subjects allowed based on student's assigned curriculum.

        Returns subjects the student is allowed to enroll in based on:
        1. Their assigned curriculum
        2. Their current year level
        3. Current semester number
        4. Not already passed/enrolled

        This method implements curriculum-based filtering while maintaining
        backward compatibility for students without an assigned curriculum.

        Args:
            student: User object (student)
            semester: Semester object

        Returns:
            QuerySet: Allowed subjects based on curriculum
        """
        from apps.academics.models import Subject, CurriculumSubject

        profile = student.student_profile
        curriculum = profile.curriculum
        year_level = profile.year_level

        # Determine semester number from semester name
        semester_number = 1
        if '2nd' in semester.name.lower() or 'second' in semester.name.lower():
            semester_number = 2
        elif 'summer' in semester.name.lower():
            semester_number = 3

        # Get subjects already passed or enrolled (for reference, but don't exclude them)
        passed_subjects = self.get_student_passed_subjects(student)
        current_subjects = self.get_student_current_subjects(student, semester)
        # NOTE: We're NOT excluding passed/enrolled subjects anymore
        # User wants to see ALL subjects including completed and currently enrolled

        # NEW: Filter by curriculum assignment if student has one
        if curriculum:
            # Get ALL subjects assigned to this curriculum (all years, all semesters)
            curriculum_subjects = CurriculumSubject.objects.filter(
                curriculum=curriculum,
                is_deleted=False
            ).select_related('subject')

            subject_ids = [cs.subject_id for cs in curriculum_subjects]

            allowed = Subject.objects.filter(
                id__in=subject_ids,
                is_deleted=False
            )
        else:
            # FALLBACK: Use old logic for students without curriculum assigned
            # Show ALL subjects from program (all years, all semesters)
            allowed = Subject.objects.filter(
                program=profile.program,
                is_deleted=False
            )

        return allowed

    def get_recommended_subjects(self, student, semester, year_level=None, semester_number=None):
        """
        Get subjects recommended for the student based on curriculum assignment.

        STRICT CURRICULUM ENFORCEMENT: Students can ONLY enroll in subjects
        assigned to their curriculum via CurriculumSubject table.

        Args:
            student: User object (student)
            semester: Semester object
            year_level: Optional filter by year (1-5)
            semester_number: Optional filter by semester (1-3)

        Returns:
            dict: Contains recommended subjects with sections, enrollment info, and metadata
        """
        from apps.academics.models import Subject, Section, CurriculumSubject

        profile = student.student_profile
        curriculum = profile.curriculum

        # STRICT ENFORCEMENT: No curriculum = no enrollment
        if not curriculum:
            return {
                'recommended_subjects': [],
                'error': 'Student has no curriculum assigned. Please contact the registrar.',
                'current_units': 0,
                'max_units': self.max_units,
                'remaining_units': self.max_units
            }

        # Get curriculum subjects with optional year/semester filtering
        filters = {
            'curriculum': curriculum,
            'is_deleted': False
        }

        if year_level is not None:
            filters['year_level'] = year_level

        if semester_number is not None:
            filters['semester_number'] = semester_number

        curriculum_subjects = CurriculumSubject.objects.filter(
            **filters
        ).select_related('subject').prefetch_related('subject__prerequisites')

        # Extract subject IDs from curriculum assignments
        subject_ids = [cs.subject_id for cs in curriculum_subjects]

        if not subject_ids:
            return {
                'recommended_subjects': [],
                'message': 'No subjects found for the selected filters.',
                'current_units': self.get_current_enrolled_units(student, semester),
                'max_units': self.max_units,
                'remaining_units': self.max_units - self.get_current_enrolled_units(student, semester)
            }

        # Get subjects that exist and have sections in current semester
        subjects = Subject.objects.filter(
            id__in=subject_ids,
            is_deleted=False
        ).distinct()

        # Get passed and currently enrolled subjects
        passed_subjects = self.get_student_passed_subjects(student)
        current_subjects = self.get_student_current_subjects(student, semester)

        # Get SectionSubjects for this semester that match our curriculum subjects
        from apps.academics.models import SectionSubject
        section_subjects = SectionSubject.objects.filter(
            section__semester=semester,
            section__is_deleted=False,
            subject_id__in=subject_ids,
            is_deleted=False
        ).select_related('section', 'subject')

        # Group section_subjects by subject_id
        sections_by_subject = {}
        for ss in section_subjects:
            if ss.subject_id not in sections_by_subject:
                sections_by_subject[ss.subject_id] = []
            sections_by_subject[ss.subject_id].append(ss)

        # Build subject data with sections
        subjects_with_sections = []
        for subject in subjects:
            # Get sections for this subject
            subject_section_subjects = sections_by_subject.get(subject.id, [])

            if not subject_section_subjects:
                continue

            # Get curriculum placement info
            curriculum_subject = next((cs for cs in curriculum_subjects if cs.subject_id == subject.id), None)

            # Check prerequisites
            prereqs_met, missing_prereqs = self.check_prerequisites(student, subject)

            # Check for INC prerequisites
            has_no_inc, inc_prereqs = self.check_inc_prerequisites(student, subject)

            # Determine enrollment status
            enrollment_status = 'available'
            enrollment_message = None

            if subject.id in passed_subjects:
                enrollment_status = 'passed'
                enrollment_message = 'Already passed'
            elif subject.id in current_subjects:
                enrollment_status = 'enrolled'
                enrollment_message = 'Currently enrolled'
            elif not prereqs_met:
                enrollment_status = 'blocked'
                enrollment_message = f'Missing prerequisites: {", ".join(missing_prereqs)}'
            elif not has_no_inc:
                enrollment_status = 'blocked'
                inc_list = ', '.join([f"{p['code']}" for p in inc_prereqs])
                enrollment_message = f'Prerequisites with INC: {inc_list}'

            # Build section data from SectionSubjects
            section_data = []
            for ss in subject_section_subjects:
                section = ss.section
                section_data.append({
                    'id': str(section.id),
                    'name': section.name,
                    'enrolled_count': section.enrolled_count,
                    'capacity': section.capacity
                })

            subject_data = {
                'id': str(subject.id),
                'code': subject.code,
                'title': subject.title,
                'units': subject.units,
                'year_level': curriculum_subject.year_level if curriculum_subject else None,
                'semester_number': curriculum_subject.semester_number if curriculum_subject else None,
                'is_required': curriculum_subject.is_required if curriculum_subject else False,
                'is_major': subject.is_major,
                'prerequisites': [
                    {'code': p.code, 'title': p.title}
                    for p in subject.prerequisites.all()
                ],
                'sections': section_data,
                'enrollment_status': enrollment_status,
                'enrollment_message': enrollment_message,
                'can_enroll': enrollment_status == 'available'
            }
            subjects_with_sections.append(subject_data)

        # Calculate unit information
        current_units = self.get_current_enrolled_units(student, semester)
        remaining_units = self.max_units - current_units

        return {
            'recommended_subjects': subjects_with_sections,
            'current_units': current_units,
            'max_units': self.max_units,
            'remaining_units': remaining_units,
            'curriculum_code': curriculum.code,
            'curriculum_name': f"{curriculum.program.code} - {curriculum.effective_year}"
        }
    
    def get_available_subjects(self, student, semester):
        """
        Get all subjects the student can enroll in (has sections, meets prerequisites).

        EPIC 7: Now uses curriculum-based filtering if student has curriculum assigned.

        Args:
            student: User object (student)
            semester: Semester object

        Returns:
            QuerySet: Available subjects with sections
        """
        from apps.academics.models import Section

        profile = student.student_profile
        program = profile.program

        # Use curriculum-based filtering
        allowed_subjects = self.get_allowed_subjects_by_curriculum(student, semester)

        # Filter to only those with sections in this semester
        sections_exist = Section.objects.filter(
            semester=semester,
            program=program,
            is_deleted=False
        ).values_list('section_subjects__subject_id', flat=True)

        available = allowed_subjects.filter(
            id__in=sections_exist
        ).prefetch_related('prerequisites')

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
        from ..models import SubjectEnrollment

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
        Respects Overload overrides.
        
        Args:
            student: User object
            semester: Semester object
            new_units: Units of the new subject
            
        Returns:
            tuple: (within_cap: bool, current_units: int, max_units: int)
        """
        current_units = self.get_current_enrolled_units(student, semester)
        total_after = current_units + new_units
        
        # Check for override
        try:
            profile = student.student_profile
            max_limit = profile.max_units_override if profile.max_units_override else self.max_units
        except StudentProfile.DoesNotExist:
            max_limit = self.max_units
            
        return total_after <= max_limit, current_units, max_limit

    def check_capacity(self, section_subject) -> tuple[bool, int, int]:
        """
        Check if section subject has available slots.
        
        Returns:
            tuple: (has_slots: bool, remaining: int, capacity: int)
        """
        return section_subject.remaining_slots > 0, section_subject.remaining_slots, section_subject.effective_capacity
    
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
    
    def check_schedule_conflict(self, student, section_subject, semester):
        """
        Check if enrolling in a subject (SectionSubject) would cause schedule conflicts.
        
        Args:
            student: User object
            section_subject: SectionSubject object
            semester: Semester object
            
        Returns:
            tuple: (has_conflict: bool, conflicting_slot_info: dict or None)
        """
        # Note: Ensure import matches actual location. Assuming apps.academics.services exists.
        from apps.academics.models import ScheduleSlot
        from apps.enrollment.models import SubjectEnrollment
        
        new_slots = section_subject.schedule_slots.all()
        
        # Get existing enrolled schedule slots
        existing_enrollments = SubjectEnrollment.objects.filter(
            enrollment__student=student,
            enrollment__semester=semester,
            status__in=[SubjectEnrollment.Status.ENROLLED, SubjectEnrollment.Status.PENDING_HEAD, SubjectEnrollment.Status.PENDING_PAYMENT]
        )
        
        for new_slot in new_slots:
            # Check against each existing subject's slots
            for enrollment in existing_enrollments:
                existing_slots = enrollment.section_subject.schedule_slots.all()
                for existing_slot in existing_slots:
                    if new_slot.day == existing_slot.day:
                        # Check overlap
                        # Overlap if (StartA < EndB) and (EndA > StartB)
                        if (new_slot.start_time < existing_slot.end_time and 
                            new_slot.end_time > existing_slot.start_time):
                            return True, {
                                'subject': enrollment.section_subject.subject.code,
                                'day': new_slot.day,
                                'time': f"{existing_slot.start_time}-{existing_slot.end_time}"
                            }
                            
        return False, None

    
    @transaction.atomic
    def enroll_in_subject(
        self, student, enrollment, subject, section, 
        override=False, override_reason=None, actor=None
    ) -> 'SubjectEnrollment':
        """
        Enroll a student in a subject with full validation.

        If override=True, bypasses validations if actor has sufficient permissions.
        """
        from ..models import SubjectEnrollment
        from apps.core.exceptions import (
            PrerequisiteNotSatisfiedError, UnitCapExceededError,
            PaymentRequiredError, ScheduleConflictError, ConflictError,
            ValidationError
        )
        from django.core.exceptions import PermissionDenied

        # Handle Override Request
        if override:
            if not actor:
                 raise ValidationError("Actor is required for overrides")
            
            # Check permission (Registrar, Dept Head, Admin)
            authorized_roles = ['REGISTRAR', 'HEAD_REGISTRAR', 'ADMIN', 'DEPARTMENT_HEAD']
            if actor.role not in authorized_roles:
                raise PermissionDenied(f"Role {actor.role} is not authorized to perform overrides")
            
            if not override_reason:
                raise ValidationError("Override reason is mandatory")

            return self.registrar_override_enroll(
                actor, student, enrollment, subject, section, override_reason
            )
        
        # Standard flow without override below...
        
        # Check if already enrolled
        existing = SubjectEnrollment.objects.filter(
            enrollment=enrollment,
            subject=subject,
            status__in=[
                SubjectEnrollment.Status.ENROLLED,
                SubjectEnrollment.Status.PENDING_HEAD,
                SubjectEnrollment.Status.PENDING_PAYMENT
            ]
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

        # Fetch SectionSubject for schedule/capacity check
        from apps.academics.models import SectionSubject, CurriculumSubject
        target_section_subject = SectionSubject.objects.filter(
            section=section, 
            subject=subject,
            is_deleted=False
        ).first()

        if target_section_subject:
            # Check capacity
            has_space, remaining, cap = self.check_capacity(target_section_subject)
            if not has_space:
                 raise UnitCapExceededError(f"Section {section.name} is full for this subject ({cap}/{cap})")

            # Check schedule conflicts
            has_conflict, conflict_info = self.check_schedule_conflict(
                student, target_section_subject, enrollment.semester
            )
            if has_conflict:
                raise ScheduleConflictError(
                    f"Schedule conflict on {conflict_info['day']} {conflict_info['time']} "
                    f"with {conflict_info['subject']}"
                )

        # EPIC 7: Curriculum validation and irregular determination
        profile = student.student_profile
        curriculum = profile.curriculum
        semester_number = self._get_semester_number(enrollment.semester)
        home_section = profile.home_section

        # Determine Enrollment Type and Validations based on Student Category
        if profile.is_irregular:
            # 2. Irregular Students: Home Section OR Retake subjects from OTHER sections
            if section == home_section:
                enrollment_type = SubjectEnrollment.EnrollmentType.HOME
            else:
                # Cross-section enrollment ONLY allowed for retake subjects
                # A subject is a retake if it was previously failed or if it's outside current year/sem
                is_failed = SubjectEnrollment.objects.filter(
                    enrollment__student=student,
                    subject=subject,
                    status=SubjectEnrollment.Status.FAILED
                ).exists()

                if not is_failed:
                    # Check if it's an "out of sequence" subject (retake or advanced)
                    # For simplicity, if it's not in their home section, we strictly require it to be a previously failed subject
                    # or at least not belonging to their current curriculum slot.
                    is_out_of_sequence = False
                    if curriculum:
                        curriculum_subject = CurriculumSubject.objects.filter(
                            curriculum=curriculum,
                            subject=subject,
                            is_deleted=False
                        ).first()
                        if not curriculum_subject or curriculum_subject.year_level < profile.year_level:
                            is_out_of_sequence = True
                    
                    if not (is_failed or is_out_of_sequence):
                        raise ValidationError(
                            f"Cross-section enrollment is ONLY allowed for retake subjects for irregular students."
                        )
                
                enrollment_type = SubjectEnrollment.EnrollmentType.RETAKE
        else:
            # 3. Regular Students: ONLY enroll in subjects offered by their Home Section
            if not home_section:
                raise ValidationError("Student has no Home Section assigned. Please contact the registrar.")
            
            if section != home_section:
                raise ValidationError(
                    f"Regular students can ONLY enroll in subjects from their Home Section ({home_section.name})."
                )
            enrollment_type = SubjectEnrollment.EnrollmentType.HOME

        # Determine if enrollment is considered irregular for curriculum tracking
        is_irregular_enrollment = False
        if curriculum:
            curriculum_subject = CurriculumSubject.objects.filter(
                curriculum=curriculum,
                subject=subject,
                is_deleted=False
            ).first()

            if not curriculum_subject:
                is_irregular_enrollment = True
            elif (curriculum_subject.year_level != profile.year_level or
                  curriculum_subject.semester_number != semester_number):
                is_irregular_enrollment = True
        else:
            is_irregular_enrollment = (
                subject.year_level != profile.year_level or
                semester_number != subject.semester_number
            )

        # Determine enrollment status:
        # NEW FLOW: Subject enrollments now require Head approval
        enrollment_status = SubjectEnrollment.Status.PENDING_HEAD

        # Create the enrollment with specific categorization
        subject_enrollment = SubjectEnrollment.objects.create(
            enrollment=enrollment,
            subject=subject,
            section=section,
            status=enrollment_status,
            enrollment_type=enrollment_type,
            is_irregular=is_irregular_enrollment,
            is_retake=(enrollment_type == SubjectEnrollment.EnrollmentType.RETAKE),
            payment_approved=enrollment.first_month_paid,
            head_approved=False
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
                'enrollment_type': enrollment_type,
                'is_irregular': is_irregular_enrollment
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
        from ..models import SubjectEnrollment
        
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
        from ..models import SubjectEnrollment
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
        from ..models import SubjectEnrollment
        
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
        
        # Create without validation, marking as overridden
        subject_enrollment = SubjectEnrollment.objects.create(
            enrollment=enrollment,
            subject=subject,
            section=section,
            status=SubjectEnrollment.Status.ENROLLED,
            is_irregular=is_irregular,
            is_overridden=True,
            override_reason=override_reason,
            overridden_by=registrar,
            head_approved=True, # Auto-approve for Registrar
            payment_approved=True # Auto-approve for Registrar
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


    @transaction.atomic
    def enroll_student_in_section_subjects(self, student, section):
        """Enroll student in all subjects of the section."""
        # Get all section subjects
        from apps.academics.models import SectionSubject
        from ..models import Enrollment
        from apps.core.exceptions import UnitCapExceededError, ConflictError

        section_subjects = SectionSubject.objects.filter(section=section, is_deleted=False)
        
        # Get or create Enrollment for this semester
        enrollment, _ = Enrollment.objects.get_or_create(
             student=student,
             semester=section.semester,
             defaults={'status': Enrollment.Status.PENDING, 'created_via': Enrollment.CreatedVia.ONLINE}
        )
        
        results = []
        for ss in section_subjects:
            try:
                # Use enroll_in_subject - pass Section model
                self.enroll_in_subject(student, enrollment, ss.subject, section)
                results.append(f"Enrolled in {ss.subject.code}")
            except (UnitCapExceededError, ConflictError) as e:
                 results.append(f"Failed {ss.subject.code}: {str(e)}")
            except Exception as e:
                results.append(f"Error {ss.subject.code}: {str(e)}")
        
        return results
