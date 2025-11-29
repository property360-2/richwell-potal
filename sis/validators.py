"""
Business rule validators for Richwell Colleges Portal.
Handles validation of prerequisites, unit caps, schedule conflicts, and payments.
"""
from django.core.exceptions import ValidationError
from datetime import datetime, timedelta
from django.utils import timezone


class PrerequisiteNotMet(ValidationError):
    """Raised when a student hasn't met prerequisite requirements."""
    def __init__(self, subject, missing_prerequisites):
        self.subject = subject
        self.missing_prerequisites = missing_prerequisites
        message = f"Subject {subject.code} has unmet prerequisites: {missing_prerequisites}"
        super().__init__(message)


class UnitCapExceeded(ValidationError):
    """Raised when adding a subject would exceed the unit cap."""
    def __init__(self, current_units, new_units, cap=30):
        self.current_units = current_units
        self.new_units = new_units
        self.cap = cap
        message = (
            f"Cannot enroll in subject worth {new_units} units. "
            f"Current load: {current_units} units, maximum allowed: {cap} units"
        )
        super().__init__(message)


class ScheduleConflict(ValidationError):
    """Raised when there's a schedule conflict with enrollment."""
    def __init__(self, conflict_type, conflicting_items):
        self.conflict_type = conflict_type
        self.conflicting_items = conflicting_items
        message = f"Schedule conflict ({conflict_type}): {conflicting_items}"
        super().__init__(message)


class PaymentNotSequential(ValidationError):
    """Raised when attempting to pay a month out of sequence."""
    def __init__(self, target_month, unpaid_months):
        self.target_month = target_month
        self.unpaid_months = unpaid_months
        message = (
            f"Cannot pay month {target_month}. "
            f"Previous months must be fully paid: {unpaid_months}"
        )
        super().__init__(message)


class StudentNotEligibleForExam(ValidationError):
    """Raised when student is not eligible to sit exam."""
    def __init__(self, reason):
        self.reason = reason
        message = f"Student not eligible to sit exam: {reason}"
        super().__init__(message)


# ============================================================================
# PREREQUISITE VALIDATION
# ============================================================================

def validate_prerequisites(student, subject):
    """
    Validate that student has met all prerequisites for a subject.

    A prerequisite is met if the student has a SubjectEnrollment with:
    - Subject matching the prerequisite
    - subject_status in ['PASSED', 'CREDITED']

    A prerequisite blocks enrollment if:
    - SubjectEnrollment doesn't exist
    - subject_status in ['INC', 'FAILED', 'RETAKE']

    Args:
        student: Student instance
        subject: Subject instance to check prerequisites for

    Returns:
        True if all prerequisites are met

    Raises:
        PrerequisiteNotMet: If any prerequisite is not met
    """
    prerequisites = subject.prerequisites.all()

    if not prerequisites.exists():
        return True

    from sis.models import SubjectEnrollment

    missing = []
    for prereq in prerequisites:
        # Find if student has taken this prerequisite
        prev_enrollment = SubjectEnrollment.objects.filter(
            enrollment__student=student,
            subject=prereq
        ).first()

        if not prev_enrollment:
            missing.append(f"{prereq.code} (not taken)")
        elif prev_enrollment.subject_status in [
            SubjectEnrollment.INC,
            SubjectEnrollment.FAILED,
            SubjectEnrollment.RETAKE
        ]:
            missing.append(f"{prereq.code} (status: {prev_enrollment.subject_status})")

    if missing:
        raise PrerequisiteNotMet(subject, missing)

    return True


def get_prerequisite_chain(subject):
    """
    Get all prerequisites for a subject, including transitive dependencies.

    Args:
        subject: Subject instance

    Returns:
        List of Subject instances (prerequisites)
    """
    chain = []
    to_process = list(subject.prerequisites.all())
    processed = set()

    while to_process:
        current = to_process.pop(0)
        if current.id in processed:
            continue

        chain.append(current)
        processed.add(current.id)

        # Add prerequisites of this subject
        to_process.extend(current.prerequisites.all())

    return chain


# ============================================================================
# UNIT CAP VALIDATION
# ============================================================================

def validate_unit_cap(enrollment, subject_to_add, max_units=30):
    """
    Validate that adding a subject won't exceed the unit cap.

    Args:
        enrollment: Enrollment instance (semester-level)
        subject_to_add: Subject instance to validate
        max_units: Maximum units allowed per semester (default 30)

    Returns:
        True if unit cap is not exceeded

    Raises:
        UnitCapExceeded: If adding the subject would exceed the cap
    """
    current_units = enrollment.total_units
    new_units = subject_to_add.units
    total = current_units + new_units

    if total > max_units:
        raise UnitCapExceeded(current_units, new_units, max_units)

    return True


def get_student_unit_load(enrollment):
    """
    Get the current unit load for a student in an enrollment.

    Args:
        enrollment: Enrollment instance

    Returns:
        Integer total of units currently enrolled
    """
    return enrollment.total_units


# ============================================================================
# SCHEDULE CONFLICT DETECTION
# ============================================================================

def check_professor_conflict(professor, new_section):
    """
    Check if professor has a schedule conflict with new section.

    Conflict exists if professor is already teaching another section
    with overlapping schedule slots.

    Args:
        professor: User instance (professor)
        new_section: Section instance to check for conflicts

    Returns:
        Tuple (has_conflict: bool, conflicting_sections: list)
    """
    from sis.models import Section

    # Get all sections taught by this professor in same semester
    existing_sections = Section.objects.filter(
        professor=professor,
        semester=new_section.semester
    ).exclude(id=new_section.id)

    new_slots = new_section.scheduleslot_set.all()
    conflicting = []

    for existing in existing_sections:
        existing_slots = existing.scheduleslot_set.all()

        for new_slot in new_slots:
            for existing_slot in existing_slots:
                # Check if same day
                if new_slot.day != existing_slot.day:
                    continue

                # Check if times overlap
                new_start = datetime.strptime(new_slot.start_time, "%H:%M")
                new_end = datetime.strptime(new_slot.end_time, "%H:%M")
                existing_start = datetime.strptime(existing_slot.start_time, "%H:%M")
                existing_end = datetime.strptime(existing_slot.end_time, "%H:%M")

                # Overlap if new_start < existing_end AND existing_start < new_end
                if new_start < existing_end and existing_start < new_end:
                    conflicting.append(existing)
                    break

    return len(conflicting) > 0, conflicting


def check_student_conflict(student, new_section):
    """
    Check if student has a schedule conflict with new section.

    Conflict exists if student is already enrolled in another section
    with overlapping schedule slots in the same semester.

    Args:
        student: Student instance
        new_section: Section instance to check for conflicts

    Returns:
        Tuple (has_conflict: bool, conflicting_sections: list)
    """
    from sis.models import SubjectEnrollment

    # Get all subject enrollments for this student in same semester
    semester = new_section.semester
    existing_enrollments = SubjectEnrollment.objects.filter(
        enrollment__student=student,
        enrollment__semester=semester
    ).select_related('section')

    new_slots = new_section.scheduleslot_set.all()
    conflicting = []

    for enrollment in existing_enrollments:
        if not enrollment.section:
            continue

        existing_slots = enrollment.section.scheduleslot_set.all()

        for new_slot in new_slots:
            for existing_slot in existing_slots:
                # Check if same day
                if new_slot.day != existing_slot.day:
                    continue

                # Check if times overlap
                new_start = datetime.strptime(new_slot.start_time, "%H:%M")
                new_end = datetime.strptime(new_slot.end_time, "%H:%M")
                existing_start = datetime.strptime(existing_slot.start_time, "%H:%M")
                existing_end = datetime.strptime(existing_slot.end_time, "%H:%M")

                # Overlap if new_start < existing_end AND existing_start < new_end
                if new_start < existing_end and existing_start < new_end:
                    conflicting.append(enrollment.section)
                    break

    return len(conflicting) > 0, conflicting


# ============================================================================
# PAYMENT VALIDATION
# ============================================================================

def validate_payment_sequence(enrollment, target_month):
    """
    Validate that payment to target month doesn't skip unpaid months.

    Sequential rule: Month N cannot be paid until Month N-1 is fully paid.

    Args:
        enrollment: Enrollment instance
        target_month: Month number trying to pay (1-6)

    Returns:
        True if payment is allowed

    Raises:
        PaymentNotSequential: If previous months are not fully paid
    """
    from sis.models import PaymentMonth

    # Get all payment months before target
    payment_months = PaymentMonth.objects.filter(
        enrollment=enrollment,
        month_number__lt=target_month
    ).order_by('month_number')

    unpaid = []
    for pm in payment_months:
        if not pm.is_paid:
            unpaid.append(pm.month_number)

    if unpaid:
        raise PaymentNotSequential(target_month, unpaid)

    return True


def validate_month_1_paid(enrollment):
    """
    Validate that Month 1 has been fully paid.

    Used before allowing subject enrollment or exam access.

    Args:
        enrollment: Enrollment instance

    Returns:
        True if Month 1 is fully paid

    Raises:
        StudentNotEligibleForExam: If Month 1 is not paid
    """
    from sis.models import PaymentMonth

    month_1 = PaymentMonth.objects.filter(
        enrollment=enrollment,
        month_number=1
    ).first()

    if not month_1 or not month_1.is_paid:
        raise StudentNotEligibleForExam("Month 1 payment not completed")

    return True


def get_payment_balance(enrollment):
    """
    Get payment balance for an enrollment.

    Args:
        enrollment: Enrollment instance

    Returns:
        Dictionary with payment information
    """
    from sis.models import PaymentMonth

    months = PaymentMonth.objects.filter(enrollment=enrollment).order_by('month_number')

    total_due = sum(m.due_amount for m in months)
    total_paid = sum(m.amount_paid for m in months)
    balance = total_due - total_paid

    return {
        'total_due': total_due,
        'total_paid': total_paid,
        'balance': balance,
        'months': [
            {
                'month_number': m.month_number,
                'due_amount': m.due_amount,
                'amount_paid': m.amount_paid,
                'balance': m.due_amount - m.amount_paid,
                'is_paid': m.is_paid,
                'due_date': m.due_date
            }
            for m in months
        ]
    }


# ============================================================================
# INC EXPIRY VALIDATION
# ============================================================================

def calculate_inc_clock(subject_enrollment):
    """
    Calculate how many months have elapsed for INC expiry.

    Clock is based on enrolled_date and excludes LOA periods.

    Args:
        subject_enrollment: SubjectEnrollment instance with INC status

    Returns:
        Integer: months elapsed (excluding LOA)
    """
    from sis.models import SubjectEnrollment

    if subject_enrollment.subject_status != SubjectEnrollment.INC:
        return 0

    if not subject_enrollment.inc_start_date:
        return 0

    start = subject_enrollment.inc_start_date
    now = timezone.now().date()

    # Calculate days elapsed
    days_elapsed = (now - start).days

    # Subtract LOA pause days
    loa_days = subject_enrollment.loa_pause_days or 0
    clock_days = days_elapsed - loa_days

    # Convert to months (30 days per month)
    months = clock_days // 30

    return months


def check_inc_expiry(subject_enrollment):
    """
    Check if an INC has expired based on subject type.

    Major subjects: 6 months
    Minor subjects: 12 months

    Args:
        subject_enrollment: SubjectEnrollment instance

    Returns:
        Tuple (is_expired: bool, months_elapsed: int, months_until_expiry: int)
    """
    from sis.models import Subject, SubjectEnrollment

    if subject_enrollment.subject_status != SubjectEnrollment.INC:
        return False, 0, 0

    subject = subject_enrollment.subject
    months_elapsed = calculate_inc_clock(subject_enrollment)

    if subject.subject_type == Subject.MAJOR:
        expiry_months = 6
    else:
        expiry_months = 12

    months_until = max(0, expiry_months - months_elapsed)
    is_expired = months_elapsed >= expiry_months

    return is_expired, months_elapsed, months_until
