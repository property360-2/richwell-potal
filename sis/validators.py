"""
Business logic validators for SIS application.
Validates enrollment, payments, grades, and other operations.
"""

from django.core.exceptions import ValidationError
from django.db.models import Sum
from . import models


def validate_unit_cap(enrollment, additional_units=0):
    """
    Validate that total enrolled units doesn't exceed MAX_UNITS_PER_SEMESTER.
    Returns True if valid, raises ValidationError if not.
    """
    from django.conf import settings

    max_units = settings.MAX_UNITS_PER_SEMESTER
    current_units = enrollment.subject_enrollments.filter(
        status__in=['ENROLLED', 'RETAKE']
    ).aggregate(total=Sum('units'))['total'] or 0

    if current_units + additional_units > max_units:
        raise ValidationError(
            f"Cannot enroll. Total units would be {current_units + additional_units}, "
            f"exceeding maximum of {max_units}."
        )
    return True


def validate_prerequisites(student, subject):
    """
    Validate that student has completed all prerequisites for a subject.
    Prerequisites are blocked if status is INC/FAILED/RETAKE.
    """
    for prereq in subject.prerequisites.all():
        # Get the latest enrollment of this prerequisite
        latest_enrollment = models.SubjectEnrollment.objects.filter(
            enrollment__student=student,
            subject=prereq
        ).order_by('-enrollment__semester').first()

        if not latest_enrollment:
            raise ValidationError(f"Missing prerequisite: {prereq.code}")

        if latest_enrollment.status in ['INC', 'FAILED', 'RETAKE']:
            raise ValidationError(
                f"Prerequisite {prereq.code} not satisfied (status: {latest_enrollment.status})"
            )

    return True


def validate_schedule_conflict(section_subject, student):
    """
    Check if student's new schedule conflicts with existing enrolled subjects.
    """
    # Get student's currently enrolled sections
    enrolled_sections = models.SubjectEnrollment.objects.filter(
        enrollment__student=student,
        enrollment__semester=section_subject.section.semester,
        status='ENROLLED'
    ).values_list('section', flat=True)

    if not enrolled_sections:
        return True

    # Get schedule slots for new section
    new_slots = section_subject.schedule_slots.all()

    # Check for conflicts with existing sections
    for existing_section_id in enrolled_sections:
        existing_section = models.SectionSubject.objects.filter(
            section_id=existing_section_id
        ).first()

        if existing_section:
            existing_slots = existing_section.schedule_slots.all()
            for new_slot in new_slots:
                for existing_slot in existing_slots:
                    if _times_overlap(new_slot, existing_slot):
                        raise ValidationError(
                            f"Schedule conflict: {existing_section.subject.code} "
                            f"also meets on {new_slot.day} {new_slot.start_time}-{new_slot.end_time}"
                        )

    return True


def _times_overlap(slot1, slot2):
    """
    Check if two schedule slots overlap.
    Same day and overlapping times = conflict.
    """
    if slot1.day != slot2.day:
        return False

    return slot1.start_time < slot2.end_time and slot2.start_time < slot1.end_time


def validate_payment_allocation(enrollment, target_month):
    """
    Validate sequential payment allocation.
    Cannot allocate to month N if month N-1 is not fully paid.
    """
    if target_month <= 1:
        return True

    # Check if previous month is fully paid
    previous_bucket = models.MonthlyPaymentBucket.objects.get(
        enrollment=enrollment,
        month_number=target_month - 1
    )

    if not previous_bucket.is_fully_paid:
        raise ValidationError(
            f"Cannot allocate to Month {target_month}. "
            f"Month {target_month - 1} must be fully paid first."
        )

    return True


def validate_grade_value(grade_value):
    """
    Validate that grade is in allowed list.
    """
    ALLOWED_NUMERIC_GRADES = [1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 5.0]

    if grade_value not in ALLOWED_NUMERIC_GRADES:
        raise ValidationError(
            f"Invalid grade: {grade_value}. "
            f"Allowed grades: {ALLOWED_NUMERIC_GRADES}"
        )

    return True
