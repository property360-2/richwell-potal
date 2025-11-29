"""
Subject enrollment service for Richwell Colleges Portal.
Handles student subject enrollment with payment gates, prerequisite validation,
unit cap enforcement, and schedule conflict detection.

CRITICAL BUSINESS RULES:
1. Month 1 payment must be completed before enrolling in subjects (payment gate)
2. Student cannot exceed 30 units per semester (unit cap)
3. All prerequisites must be met (PASSED or CREDITED status)
4. No schedule conflicts between sections
5. Uses select_for_update() for concurrency control on Enrollment record
"""
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError

from sis.models import SubjectEnrollment, Enrollment, Section
from sis.validators import (
    validate_prerequisites,
    validate_unit_cap,
    check_student_conflict,
    PrerequisiteNotMet,
    UnitCapExceeded,
    ScheduleConflict,
)
from sis.services.payment_service import is_month_1_paid
from sis.services.audit_service import log_subject_enrolled, log_subject_dropped


class EnrollmentError(Exception):
    """Base exception for enrollment errors."""
    pass


class StudentNotEligibleToEnroll(EnrollmentError):
    """Raised when student cannot enroll (payment gate, etc)."""
    pass


class SubjectAlreadyEnrolled(EnrollmentError):
    """Raised when student is already enrolled in the subject."""
    pass


class NoSectionAvailable(EnrollmentError):
    """Raised when subject has no available sections."""
    pass


@transaction.atomic
def add_subject_to_enrollment(
    enrollment,
    subject,
    section=None,
    user=None,
    ip_address="127.0.0.1",
    override_schedule_conflict=False,
    override_reason=None
):
    """
    Enroll student in a subject for the semester.

    BUSINESS LOGIC:
    1. Check Month 1 payment gate
    2. Validate prerequisites
    3. Check unit cap
    4. Assign section (default or specified)
    5. Check schedule conflicts (unless overridden)
    6. Create SubjectEnrollment
    7. Update Enrollment.total_units
    8. Create audit log

    Args:
        enrollment: Enrollment instance (semester-level)
        subject: Subject instance to enroll in
        section: Optional Section instance. If not provided, uses first available.
        user: User performing enrollment (registrar/student)
        ip_address: IP address of requester
        override_schedule_conflict: Whether to override schedule conflicts (registrar override)
        override_reason: Reason for override (required if override_schedule_conflict=True)

    Returns:
        Dictionary with enrollment details:
        {
            'subject_enrollment': SubjectEnrollment instance,
            'section': Section instance,
            'units_added': int,
            'total_units': int,
            'has_conflict': bool,
            'override_applied': bool
        }

    Raises:
        ValidationError: If validation fails
        StudentNotEligibleToEnroll: If payment gate not met
        PrerequisiteNotMet: If prerequisites not met
        UnitCapExceeded: If unit cap exceeded
        ScheduleConflict: If schedule conflict and not overridden
        SubjectAlreadyEnrolled: If already enrolled in subject
        NoSectionAvailable: If no section available
    """
    # Check if student is already enrolled in this subject
    existing = SubjectEnrollment.objects.filter(
        enrollment=enrollment,
        subject=subject,
        enrollment_status='ENROLLED'
    ).first()
    if existing:
        raise SubjectAlreadyEnrolled(
            f"Student already enrolled in {subject.code} this semester"
        )

    # Payment gate: Month 1 must be paid
    if not is_month_1_paid(enrollment):
        raise StudentNotEligibleToEnroll(
            "Month 1 payment must be completed before enrolling in subjects"
        )

    # Validate prerequisites
    try:
        validate_prerequisites(enrollment.student, subject)
    except PrerequisiteNotMet:
        raise

    # Lock enrollment for concurrency control (unit cap enforcement)
    enrollment = Enrollment.objects.select_for_update().get(id=enrollment.id)

    # Check unit cap before validation
    try:
        validate_unit_cap(enrollment, subject, max_units=30)
    except UnitCapExceeded:
        raise

    # If no section specified, find first available section
    if not section:
        section = Section.objects.filter(
            subject=subject,
            semester=enrollment.semester
        ).first()

        if not section:
            raise NoSectionAvailable(
                f"No sections available for {subject.code} this semester"
            )

    # Check schedule conflicts
    has_conflict, conflicting_sections = check_student_conflict(
        enrollment.student,
        section
    )

    if has_conflict and not override_schedule_conflict:
        raise ScheduleConflict(
            "student_schedule",
            [s.subject.code for s in conflicting_sections]
        )

    if has_conflict and not override_reason:
        raise ValueError(
            "override_reason required when override_schedule_conflict=True"
        )

    # Create SubjectEnrollment
    subject_enrollment = SubjectEnrollment.objects.create(
        enrollment=enrollment,
        subject=subject,
        section=section,
        enrollment_status='ENROLLED',
        subject_status='PASSED',
        grade_status='PENDING'
    )

    # Update Enrollment.total_units
    enrollment.total_units += subject.units
    enrollment.save()

    # Create audit log
    if user:
        log_subject_enrolled(user, subject_enrollment, ip_address)

    return {
        'subject_enrollment': subject_enrollment,
        'section': section,
        'units_added': subject.units,
        'total_units': enrollment.total_units,
        'has_conflict': has_conflict,
        'override_applied': has_conflict and override_schedule_conflict
    }


@transaction.atomic
def drop_subject(
    subject_enrollment,
    user=None,
    ip_address="127.0.0.1"
):
    """
    Drop a subject from enrollment.

    BUSINESS LOGIC:
    1. Check if subject is already dropped
    2. Mark SubjectEnrollment as DROPPED
    3. Update Enrollment.total_units
    4. Set dropped_date
    5. Create audit log

    Args:
        subject_enrollment: SubjectEnrollment instance to drop
        user: User performing drop
        ip_address: IP address of requester

    Returns:
        Dictionary with drop details:
        {
            'subject_enrollment': SubjectEnrollment instance,
            'subject_code': str,
            'units_removed': int,
            'new_total_units': int
        }

    Raises:
        ValueError: If subject already dropped
    """
    if subject_enrollment.enrollment_status == 'DROPPED':
        raise ValueError(f"Subject already dropped")

    # Lock enrollment for concurrency control
    enrollment = Enrollment.objects.select_for_update().get(
        id=subject_enrollment.enrollment.id
    )

    # Mark as dropped
    subject_enrollment.enrollment_status = 'DROPPED'
    subject_enrollment.dropped_date = timezone.now()
    subject_enrollment.save()

    # Update Enrollment.total_units
    units_to_remove = subject_enrollment.subject.units
    enrollment.total_units -= units_to_remove
    enrollment.save()

    # Create audit log
    if user:
        log_subject_dropped(user, subject_enrollment, ip_address)

    return {
        'subject_enrollment': subject_enrollment,
        'subject_code': subject_enrollment.subject.code,
        'units_removed': units_to_remove,
        'new_total_units': enrollment.total_units
    }


def get_enrolled_subjects(enrollment, include_dropped=False):
    """
    Get list of subjects enrolled for an enrollment.

    Args:
        enrollment: Enrollment instance
        include_dropped: Whether to include dropped subjects

    Returns:
        QuerySet of SubjectEnrollment instances
    """
    query = SubjectEnrollment.objects.filter(enrollment=enrollment)

    if not include_dropped:
        query = query.exclude(enrollment_status='DROPPED')

    return query.select_related(
        'subject',
        'section',
        'section__professor'
    ).order_by('enrolled_date')


def can_enroll(enrollment):
    """
    Check if student can enroll in subjects (payment gate).

    Args:
        enrollment: Enrollment instance

    Returns:
        Tuple (can_enroll: bool, reason: str or None)
    """
    if not is_month_1_paid(enrollment):
        return False, "Month 1 payment must be completed before enrolling"
    return True, None


def get_student_load(enrollment):
    """
    Get current unit load and capacity information.

    Args:
        enrollment: Enrollment instance

    Returns:
        Dictionary with unit load info:
        {
            'current_units': int,
            'max_units': 30,
            'remaining_units': int,
            'capacity_percent': float
        }
    """
    current = enrollment.total_units
    max_units = 30
    remaining = max_units - current

    return {
        'current_units': current,
        'max_units': max_units,
        'remaining_units': remaining,
        'capacity_percent': (current / max_units) * 100
    }


def get_available_sections(enrollment, subject):
    """
    Get available sections for a subject with conflict info.

    Args:
        enrollment: Enrollment instance
        subject: Subject instance

    Returns:
        List of dictionaries with section info:
        [
            {
                'section': Section instance,
                'professor': User (professor),
                'schedule': [ScheduleSlot objects],
                'has_conflict': bool,
                'capacity': int,
                'enrollment_count': int
            }
        ]
    """
    sections = Section.objects.filter(
        subject=subject,
        semester=enrollment.semester
    ).select_related('professor')

    result = []
    for section in sections:
        has_conflict, _ = check_student_conflict(enrollment.student, section)

        result.append({
            'section': section,
            'professor': section.professor,
            'schedule': list(section.schedule_slots.all()),
            'has_conflict': has_conflict,
            'capacity': section.capacity,
            'enrollment_count': section.enrollments.filter(
                enrollment_status='ENROLLED'
            ).count()
        })

    return result
