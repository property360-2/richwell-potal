"""
Enrollment Service - Core business logic for enrollment operations.

Handles student enrollment creation, validation, and related business rules.
"""

import uuid
from decimal import Decimal
from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from sis.models import User, Student, Enrollment, Program, Semester, MonthlyPaymentBucket
from sis.services.audit_service import AuditService


class EnrollmentService:
    """Service for handling enrollment-related operations."""

    @staticmethod
    def create_online_enrollment(
        first_name,
        last_name,
        email,
        program_id,
        monthly_commitment,
        is_transferee=False,
        previous_school=None,
        previous_course=None,
        phone=None,
        birthdate=None,
        address=None,
        city=None,
        province=None,
        zip_code=None,
        ip_address=None,
    ):
        """
        Create a new student enrollment through online form.

        Business Rules:
        - Creates User account with role=STUDENT
        - Generates unique student number
        - Auto-assigns to active semester
        - Creates 6 monthly payment buckets
        - All operations wrapped in transaction

        Args:
            first_name: Student first name
            last_name: Student last name
            email: Student email (must be unique)
            program_id: UUID of program
            monthly_commitment: Monthly payment amount (Decimal)
            is_transferee: Whether this is a transferee student
            previous_school: Previous school name (if transferee)
            previous_course: Previous course name (if transferee)
            phone: Contact phone
            birthdate: Date of birth
            address: Street address
            city: City
            province: Province/state
            zip_code: Postal code
            ip_address: IP address for audit

        Returns:
            dict: {
                'success': bool,
                'student': Student object or None,
                'student_number': str or None,
                'errors': list of error strings
            }
        """
        errors = []

        # Validate email uniqueness
        if User.objects.filter(email=email).exists():
            errors.append(f"Email {email} is already registered.")

        # Validate program exists
        try:
            program = Program.objects.get(id=program_id, is_active=True)
        except Program.DoesNotExist:
            errors.append(f"Selected program not found or inactive.")
            return {
                'success': False,
                'student': None,
                'student_number': None,
                'errors': errors,
            }

        # Validate monthly commitment
        if monthly_commitment <= 0:
            errors.append("Monthly commitment must be greater than 0.")

        if errors:
            return {
                'success': False,
                'student': None,
                'student_number': None,
                'errors': errors,
            }

        # Get current active semester
        active_semester = Semester.objects.filter(is_active=True).first()
        if not active_semester:
            errors.append("No active semester. Please contact administrator.")
            return {
                'success': False,
                'student': None,
                'student_number': None,
                'errors': errors,
            }

        try:
            with transaction.atomic():
                # Create user account
                user = User.objects.create_user(
                    username=email,  # Use email as username
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    role='STUDENT',
                )

                # Generate student number (format: YYYY-001, YYYY-002, etc.)
                year = timezone.now().year
                sequence = Student.objects.filter(
                    student_number__startswith=f"{year}-"
                ).count() + 1
                student_number = f"{year}-{sequence:06d}"

                # Create student profile
                student = Student.objects.create(
                    user=user,
                    student_number=student_number,
                    program=program,
                    year_level=1,
                    status='ACTIVE',
                )

                # Create enrollment for current semester
                enrollment = Enrollment.objects.create(
                    student=student,
                    semester=active_semester,
                    program=program,
                    status='ACTIVE',
                    monthly_commitment=Decimal(str(monthly_commitment)),
                    created_via='ONLINE',
                )

                # Note: MonthlyPaymentBuckets are auto-created via signal in models

                # Audit log
                AuditService.log_action(
                    actor=None,  # System action
                    action='STUDENT_ENROLLED_ONLINE',
                    target_model='Student',
                    target_id=str(student.id),
                    payload={
                        'student_number': student_number,
                        'email': email,
                        'program': program.code,
                        'semester': str(active_semester.id),
                        'monthly_commitment': str(monthly_commitment),
                        'is_transferee': is_transferee,
                        'previous_school': previous_school,
                        'previous_course': previous_course,
                    },
                    ip_address=ip_address,
                )

                return {
                    'success': True,
                    'student': student,
                    'student_number': student_number,
                    'errors': [],
                }

        except Exception as e:
            errors.append(f"Error creating enrollment: {str(e)}")
            return {
                'success': False,
                'student': None,
                'student_number': None,
                'errors': errors,
            }

    @staticmethod
    def get_enrollment_context(student):
        """
        Get enrollment context for student dashboard.

        Returns:
            dict: Enrollment data for current semester
        """
        enrollment = Enrollment.objects.filter(
            student=student,
            status='ACTIVE'
        ).first()

        if not enrollment:
            return {
                'has_enrollment': False,
                'enrollment': None,
            }

        # Get payment status
        buckets = enrollment.monthly_payment_buckets.all().order_by('month_number')
        first_month_paid = enrollment.first_month_paid

        return {
            'has_enrollment': True,
            'enrollment': enrollment,
            'semester': enrollment.semester,
            'monthly_commitment': enrollment.monthly_commitment,
            'payment_buckets': buckets,
            'first_month_paid': first_month_paid,
            'total_paid': sum(b.paid_amount for b in buckets),
            'total_due': sum(b.required_amount for b in buckets),
            'balance': sum(b.required_amount - b.paid_amount for b in buckets),
        }

    @staticmethod
    def is_first_month_paid(student):
        """
        Check if student has paid first month (critical for subject enrollment gate).

        Args:
            student: Student object

        Returns:
            bool: True if first month paid
        """
        enrollment = Enrollment.objects.filter(
            student=student,
            status='ACTIVE'
        ).first()

        if not enrollment:
            return False

        return enrollment.first_month_paid

    @staticmethod
    def mark_first_month_paid(enrollment):
        """
        Mark first month as paid on enrollment.
        Called when Month 1 payment bucket becomes fully paid.

        Args:
            enrollment: Enrollment object
        """
        enrollment.first_month_paid = True
        enrollment.save()

        # Audit log
        AuditService.log_action(
            actor=None,
            action='FIRST_MONTH_PAID',
            target_model='Enrollment',
            target_id=str(enrollment.id),
            payload={
                'student_number': enrollment.student.student_number,
                'semester': str(enrollment.semester.id),
            },
            ip_address=None,
        )
