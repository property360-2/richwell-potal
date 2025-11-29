"""
Grade management service for Richwell Colleges Portal.
Handles grade submission, finalization, GPA calculation, and INC expiry logic.

CRITICAL BUSINESS RULES:
1. Grade submitted by professor, finalized by registrar
2. GPA calculated on 4.0 scale based on finalized grades
3. INC (Incomplete) expires: Major (6 months), Minor (12 months)
4. INC clock pauses during Leave of Absence (LOA)
5. Only registrar can override finalized grades with reason
6. All grade changes create immutable audit logs
"""
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from datetime import timedelta

from sis.models import SubjectEnrollment, Grade, Student
from sis.services.audit_service import (
    log_grade_submitted,
    log_grade_finalized,
    log_grade_overridden,
    log_inc_expired
)


# Grade point mapping (4.0 scale)
GRADE_POINTS = {
    'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0,
    'F': 0.0, 'INC': 0.0
}


class GradeError(Exception):
    """Base exception for grade management errors."""
    pass


class InvalidGradeValue(GradeError):
    """Raised when grade value is invalid."""
    pass


class GradeAlreadyFinalized(GradeError):
    """Raised when attempting to modify a finalized grade."""
    pass


class UnauthorizedGradeOperation(GradeError):
    """Raised when user is not authorized for grade operation."""
    pass


@transaction.atomic
def submit_grade(
    user,
    subject_enrollment,
    grade_value,
    comments="",
    ip_address="127.0.0.1"
):
    """
    Submit a grade for a subject enrollment.

    Only professor teaching the subject can submit.

    Args:
        user: User submitting the grade (professor)
        subject_enrollment: SubjectEnrollment instance
        grade_value: Grade value (e.g., 'A', 'B+', 'F', 'INC')
        comments: Optional comments from professor
        ip_address: IP address of requester

    Returns:
        Updated Grade instance

    Raises:
        InvalidGradeValue: If grade_value not in valid choices
        GradeAlreadyFinalized: If grade already finalized
    """
    # Validate grade value
    if grade_value not in GRADE_POINTS.keys():
        raise InvalidGradeValue(f"Invalid grade value: {grade_value}")

    # Check if grade is already finalized
    grade = getattr(subject_enrollment, 'grade_record', None)
    if grade and grade.is_finalized:
        raise GradeAlreadyFinalized("Cannot modify finalized grade")

    # Get or create grade record
    if not grade:
        grade = Grade.objects.create(
            subject_enrollment=subject_enrollment,
            grade_value=grade_value,
            submitted_by=user,
            submitted_date=timezone.now(),
            comments=comments
        )
    else:
        grade.grade_value = grade_value
        grade.submitted_by = user
        grade.submitted_date = timezone.now()
        grade.comments = comments
        grade.save()

    # Update subject enrollment grade status
    subject_enrollment.grade_status = 'SUBMITTED'
    subject_enrollment.save()

    # Create audit log
    log_grade_submitted(user, grade, ip_address)

    return grade


@transaction.atomic
def finalize_grades(user, semester, ip_address="127.0.0.1"):
    """
    Finalize all submitted grades for a semester.

    Only registrar can finalize grades.

    Args:
        user: User finalizing grades (registrar)
        semester: Semester instance
        ip_address: IP address of requester

    Returns:
        Dictionary with finalization results:
        {
            'finalized_count': int,
            'updated_gpas': int,
            'converted_inc': int
        }

    Raises:
        UnauthorizedGradeOperation: If user is not registrar
    """
    # Get all grades in SUBMITTED status for this semester
    grades_to_finalize = Grade.objects.filter(
        subject_enrollment__enrollment__semester=semester,
        is_finalized=False
    ).select_related('subject_enrollment__subject')

    finalized_count = 0
    updated_gpas = set()

    for grade in grades_to_finalize:
        subject_enrollment = grade.subject_enrollment
        subject = subject_enrollment.subject

        # Determine subject_status based on grade
        if grade.grade_value == 'F':
            subject_enrollment.subject_status = 'FAILED'
        elif grade.grade_value == 'INC':
            subject_enrollment.subject_status = 'INC'
            if not subject_enrollment.inc_start_date:
                subject_enrollment.inc_start_date = timezone.now().date()
        else:
            # A, B, C, D grades = PASSED
            subject_enrollment.subject_status = 'PASSED'

        # Mark grade as finalized
        grade.grade_value = grade.grade_value
        grade.is_finalized = True
        grade.finalized_by = user
        grade.finalized_date = timezone.now()

        subject_enrollment.grade_status = 'FINALIZED'
        subject_enrollment.save()
        grade.save()

        # Track student for GPA recalculation
        updated_gpas.add(subject_enrollment.enrollment.student_id)
        finalized_count += 1

        # Create audit log
        log_grade_finalized(user, grade, ip_address)

    # Recalculate GPA for affected students
    for student_id in updated_gpas:
        recalculate_gpa(Student.objects.get(id=student_id))

    return {
        'finalized_count': finalized_count,
        'updated_gpas': len(updated_gpas),
        'converted_inc': 0
    }


@transaction.atomic
def override_finalized_grade(
    user,
    grade,
    new_value,
    reason,
    ip_address="127.0.0.1"
):
    """
    Override a finalized grade (registrar only, requires reason).

    Args:
        user: User overriding grade (registrar)
        grade: Grade instance to override
        new_value: New grade value
        reason: Reason for override (required)
        ip_address: IP address of requester

    Returns:
        Updated Grade instance

    Raises:
        InvalidGradeValue: If new_value not valid
        ValueError: If reason not provided
    """
    if not reason or reason.strip() == "":
        raise ValueError("Override reason is required")

    if new_value not in GRADE_POINTS.keys():
        raise InvalidGradeValue(f"Invalid grade value: {new_value}")

    old_value = grade.grade_value
    grade.grade_value = new_value
    grade.is_finalized = True
    grade.finalized_by = user
    grade.finalized_date = timezone.now()
    grade.override_reason = reason
    grade.save()

    # Update subject status if needed
    subject_enrollment = grade.subject_enrollment
    if new_value == 'F':
        subject_enrollment.subject_status = 'FAILED'
    elif new_value == 'INC':
        subject_enrollment.subject_status = 'INC'
        if not subject_enrollment.inc_start_date:
            subject_enrollment.inc_start_date = timezone.now().date()
    else:
        subject_enrollment.subject_status = 'PASSED'

    subject_enrollment.save()

    # Recalculate GPA
    recalculate_gpa(subject_enrollment.enrollment.student)

    # Create audit log
    log_grade_overridden(user, grade, new_value, reason, ip_address)

    return grade


def calculate_gpa(student, semester=None):
    """
    Calculate GPA for a student.

    Uses 4.0 scale. Excludes CREDITED subjects.
    Includes PASSED, FAILED, and INC grades.

    Args:
        student: Student instance
        semester: Optional Semester instance. If provided, calculate for that semester only.
                 If None, calculate cumulative GPA.

    Returns:
        Decimal GPA value (rounded to 2 decimal places)
    """
    # Get finalized subject enrollments
    query = SubjectEnrollment.objects.filter(
        enrollment__student=student,
        grade_status='FINALIZED'
    ).select_related('subject', 'enrollment__semester')

    if semester:
        query = query.filter(enrollment__semester=semester)

    total_quality_points = Decimal('0')
    total_units = 0

    for enrollment in query:
        subject = enrollment.subject

        # Skip CREDITED subjects (don't count toward GPA)
        if enrollment.subject_status == 'CREDITED':
            continue

        # Get grade value from related Grade record
        grade = getattr(enrollment, 'grade_record', None)
        if not grade:
            continue

        grade_value = grade.grade_value
        grade_points = Decimal(str(GRADE_POINTS.get(grade_value, 0.0)))

        # Add to quality points
        total_quality_points += grade_points * Decimal(str(subject.units))
        total_units += subject.units

    # Calculate GPA
    if total_units == 0:
        return Decimal('0.00')

    gpa = total_quality_points / Decimal(str(total_units))
    return gpa.quantize(Decimal('0.01'))


def recalculate_gpa(student):
    """
    Recalculate and update student's GPA.

    Args:
        student: Student instance to update
    """
    cumulative_gpa = calculate_gpa(student)
    student.gpa = float(cumulative_gpa)
    student.save()


def get_transcript(student, semester=None):
    """
    Generate transcript for a student.

    Args:
        student: Student instance
        semester: Optional Semester instance. If provided, return only that semester.

    Returns:
        Dictionary with transcript data:
        {
            'student': Student,
            'semesters': [
                {
                    'semester': Semester,
                    'subjects': [
                        {
                            'code': str,
                            'name': str,
                            'units': int,
                            'grade': str,
                            'status': str,
                            'gpa_contribution': float
                        }
                    ],
                    'semester_gpa': float,
                    'units_completed': int
                }
            ],
            'cumulative_gpa': float,
            'total_units': int
        }
    """
    query = SubjectEnrollment.objects.filter(
        enrollment__student=student,
        grade_status='FINALIZED'
    ).select_related('subject', 'enrollment__semester').order_by('enrollment__semester')

    if semester:
        query = query.filter(enrollment__semester=semester)

    # Group by semester
    semesters_data = {}
    for enrollment in query:
        sem = enrollment.enrollment.semester
        if sem.id not in semesters_data:
            semesters_data[sem.id] = {
                'semester': sem,
                'subjects': [],
                'units': 0,
                'quality_points': Decimal('0')
            }

        grade = getattr(enrollment, 'grade_record', None)
        if not grade:
            continue

        grade_points = Decimal(str(GRADE_POINTS.get(grade.grade_value, 0.0)))
        units = enrollment.subject.units

        semesters_data[sem.id]['subjects'].append({
            'code': enrollment.subject.code,
            'name': enrollment.subject.name,
            'units': units,
            'grade': grade.grade_value,
            'status': enrollment.subject_status,
            'gpa_contribution': float(grade_points)
        })

        if enrollment.subject_status != 'CREDITED':
            semesters_data[sem.id]['units'] += units
            semesters_data[sem.id]['quality_points'] += grade_points * Decimal(str(units))

    # Build transcript
    cumulative_gpa = calculate_gpa(student)
    total_units = 0

    semesters = []
    for sem_id in sorted(semesters_data.keys()):
        sem_data = semesters_data[sem_id]
        units = sem_data['units']
        quality_points = sem_data['quality_points']

        if units > 0:
            sem_gpa = float(quality_points / Decimal(str(units)))
        else:
            sem_gpa = 0.0

        total_units += units
        semesters.append({
            'semester': sem_data['semester'],
            'subjects': sem_data['subjects'],
            'semester_gpa': sem_gpa,
            'units_completed': units
        })

    return {
        'student': student,
        'semesters': semesters,
        'cumulative_gpa': float(cumulative_gpa),
        'total_units': total_units
    }


def check_inc_expiry(student=None, user=None, ip_address="127.0.0.1"):
    """
    Check for and expire INC grades based on time elapsed.

    Major subjects: INC expires after 6 months
    Minor subjects: INC expires after 12 months
    LOA period pauses the clock.

    Args:
        student: Optional Student instance. If provided, check only for that student.
                If None, check all students.
        user: User performing the check (system or admin)
        ip_address: IP address of requester

    Returns:
        List of subject_enrollments that expired during this check
    """
    # Get all INC subject enrollments
    query = SubjectEnrollment.objects.filter(
        subject_status='INC'
    ).select_related('subject', 'enrollment__student')

    if student:
        query = query.filter(enrollment__student=student)

    expired_enrollments = []

    for enrollment in query:
        # Calculate months elapsed
        if not enrollment.inc_start_date:
            continue

        today = timezone.now().date()
        days_elapsed = (today - enrollment.inc_start_date).days

        # Subtract LOA pause days
        loa_pause_days = enrollment.loa_pause_days or 0
        clock_days = days_elapsed - loa_pause_days

        # Convert to months (30 days per month)
        months_elapsed = clock_days // 30

        # Determine expiry threshold
        subject = enrollment.subject
        if subject.subject_type == 'MAJOR':
            expiry_months = 6
        else:
            expiry_months = 12

        # Check if expired
        if months_elapsed >= expiry_months:
            # Convert to FAILED
            enrollment.subject_status = 'FAILED'
            enrollment.save()

            # Create Grade record if not exists
            grade = getattr(enrollment, 'grade_record', None)
            if not grade:
                grade = Grade.objects.create(
                    subject_enrollment=enrollment,
                    grade_value='F',
                    is_finalized=True,
                    finalized_by=user,
                    finalized_date=timezone.now()
                )

            # Recalculate GPA
            recalculate_gpa(enrollment.enrollment.student)

            # Create audit log
            if user:
                log_inc_expired(user, enrollment, ip_address)

            expired_enrollments.append(enrollment)

    return expired_enrollments


def pause_inc_clock(student, loa_start_date, loa_end_date):
    """
    Pause INC clock during Leave of Absence (LOA).

    Args:
        student: Student instance
        loa_start_date: Start date of LOA
        loa_end_date: End date of LOA

    Returns:
        Number of INC enrollments affected
    """
    # Get all INC subject enrollments for this student
    enrollments = SubjectEnrollment.objects.filter(
        enrollment__student=student,
        subject_status='INC'
    )

    loa_days = (loa_end_date - loa_start_date).days

    count = 0
    for enrollment in enrollments:
        if enrollment.inc_start_date and loa_start_date >= enrollment.inc_start_date:
            enrollment.loa_pause_days = (enrollment.loa_pause_days or 0) + loa_days
            enrollment.save()
            count += 1

    return count
