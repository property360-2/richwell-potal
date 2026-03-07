"""
Custom exception handler for consistent API error responses.
"""

from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    """
    Wraps DRF's default exception handler to return a consistent error format:
    {
        "error": true,
        "message": "...",
        "details": { ... }  // optional field-level errors
    }
    """
    response = exception_handler(exc, context)

    if response is not None:
        error_data = {
            'error': True,
            'message': _get_error_message(response),
        }

        # Preserve field-level validation errors
        if isinstance(response.data, dict) and not {'error', 'message', 'detail'}.intersection(response.data.keys()):
            error_data['details'] = response.data
        elif isinstance(response.data, dict) and 'detail' in response.data:
            error_data['message'] = str(response.data['detail'])

        response.data = error_data

    return response


def _get_error_message(response):
    """Extract a human-readable error message from the response."""
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
