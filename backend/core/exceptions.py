"""
Richwell Portal — Core Exceptions

This module defines custom API exceptions and a global exception handler 
to ensure consistent error responses across the entire application.
"""

from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.views import exception_handler


class ConflictError(APIException):
    """
    Exception raised when a request conflicts with the current state of the server.
    Commonly used for duplicate records or invalid state transitions.
    """
    status_code = status.HTTP_409_CONFLICT
    default_detail = 'Conflict detected.'
    default_code = 'conflict'


def custom_exception_handler(exc, context):
    """
    Wraps DRF's default exception handler to return a consistent error format.
    
    Format:
    {
        "error": true,
        "message": "Human readable message",
        "reason": "ERROR_CODE",  // Optional machine-readable code
        "details": { "field": ["error"] }  // Optional field-level details
    }
    
    Args:
        exc: The exception instance being handled.
        context: Dictionary containing view and request context.
        
    Returns:
        Response: A DRF Response object with standardized data.
    """
    response = exception_handler(exc, context)

    if response is not None:
        # Extract initial message
        message = _get_error_message(response)
        reason = None
        details = None

        if isinstance(response.data, dict):
            # Capture 'reason' if provided (custom logic)
            reason = response.data.get('reason')
            if isinstance(reason, list) and reason:
                reason = reason[0]

            # Capture 'detail' specifically
            if 'detail' in response.data:
                message = str(response.data['detail'])
                if isinstance(response.data['detail'], list) and response.data['detail']:
                    message = str(response.data['detail'][0])

            # Treat everything else as 'details' if it's not a standard key
            standard_keys = {'error', 'message', 'detail', 'reason', 'non_field_errors'}
            other_keys = set(response.data.keys()) - standard_keys
            if other_keys:
                details = {k: v for k, v in response.data.items() if k in other_keys}

        error_data = {
            'error': True,
            'message': message,
        }
        
        if reason:
            error_data['reason'] = reason
        if details:
            error_data['details'] = details

        response.data = error_data

    return response


def _get_error_message(response):
    """
    Extracts a human-readable error message from the response data.
    
    Args:
        response: The DRF Response object.
        
    Returns:
        str: A descriptive error message.
    """
    if isinstance(response.data, dict):
        if 'detail' in response.data:
            return str(response.data['detail'])
        if 'non_field_errors' in response.data:
            errors = response.data['non_field_errors']
            return str(errors[0]) if errors else 'Validation error.'
    if isinstance(response.data, list):
        return str(response.data[0]) if response.data else 'An error occurred.'

    status_messages = {
        400: 'Invalid request.',
        401: 'Authentication required.',
        403: 'Permission denied.',
        404: 'Resource not found.',
        405: 'Method not allowed.',
        500: 'Internal server error.',
    }
    return status_messages.get(response.status_code, 'An error occurred.')
