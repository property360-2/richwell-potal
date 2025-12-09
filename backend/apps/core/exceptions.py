"""
Core exceptions and custom exception handler for the API.
"""

from rest_framework.views import exception_handler
from rest_framework.exceptions import APIException
from rest_framework import status


def custom_exception_handler(exc, context):
    """
    Custom exception handler that formats all errors consistently.
    
    Response format:
    {
        "success": false,
        "error": {
            "code": "ERROR_CODE",
            "message": "Human-readable message",
            "details": {...}  # Optional additional details
        }
    }
    """
    response = exception_handler(exc, context)

    if response is not None:
        custom_response = {
            'success': False,
            'error': {
                'code': getattr(exc, 'default_code', 'error'),
                'message': str(exc.detail) if hasattr(exc, 'detail') else str(exc),
            }
        }
        
        # Include field errors for validation errors
        if hasattr(exc, 'detail') and isinstance(exc.detail, dict):
            custom_response['error']['details'] = exc.detail
        
        response.data = custom_response

    return response


# ============================================================
# Custom Business Exceptions
# ============================================================

class BusinessLogicError(APIException):
    """Base exception for business logic violations."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'A business logic error occurred.'
    default_code = 'business_logic_error'


class DuplicateEmailError(BusinessLogicError):
    """Raised when attempting to create a user with an existing email."""
    default_detail = 'A user with this email already exists.'
    default_code = 'duplicate_email'


class DuplicateStudentNumberError(BusinessLogicError):
    """Raised when student number generation produces a duplicate."""
    default_detail = 'Failed to generate unique student number. Please try again.'
    default_code = 'duplicate_student_number'


class EnrollmentLinkDisabledError(APIException):
    """Raised when enrollment link is disabled but user tries to enroll."""
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = 'Online enrollment is currently closed.'
    default_code = 'enrollment_link_disabled'


class ValidationError(BusinessLogicError):
    """General validation error with custom message."""
    default_detail = 'Validation failed.'
    default_code = 'validation_error'
    
    def __init__(self, detail=None, code=None, field=None):
        if field and isinstance(detail, str):
            detail = {field: [detail]}
        super().__init__(detail, code)


class PrerequisiteNotSatisfiedError(BusinessLogicError):
    """Raised when student tries to enroll in subject without completing prerequisites."""
    default_detail = 'Prerequisites for this subject are not satisfied.'
    default_code = 'prerequisite_not_satisfied'


class UnitCapExceededError(BusinessLogicError):
    """Raised when enrollment would exceed the semester unit cap."""
    default_detail = 'Enrollment would exceed the maximum units allowed per semester.'
    default_code = 'unit_cap_exceeded'


class PaymentRequiredError(APIException):
    """Raised when payment is required before proceeding."""
    status_code = status.HTTP_402_PAYMENT_REQUIRED
    default_detail = 'Month 1 payment is required before subject enrollment.'
    default_code = 'payment_required'


class ConflictError(BusinessLogicError):
    """Raised when there's a scheduling or data conflict."""
    status_code = status.HTTP_409_CONFLICT
    default_detail = 'A conflict was detected.'
    default_code = 'conflict_error'


class ScheduleConflictError(ConflictError):
    """Raised when there's a schedule conflict."""
    default_detail = 'A schedule conflict was detected.'
    default_code = 'schedule_conflict'


class NotFoundError(APIException):
    """Raised when a requested resource is not found."""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'The requested resource was not found.'
    default_code = 'not_found'


class PermissionDeniedError(APIException):
    """Raised when user doesn't have permission for an action."""
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = 'You do not have permission to perform this action.'
    default_code = 'permission_denied'
