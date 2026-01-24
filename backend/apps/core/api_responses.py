"""
Standardized API response helpers for consistent responses across all endpoints.
"""

from rest_framework import status
from rest_framework.response import Response
from typing import Any, Optional, Dict


def success_response(
    data: Any = None,
    message: Optional[str] = None,
    status_code: int = status.HTTP_200_OK,
    **kwargs
) -> Response:
    """
    Create a standardized success response.
    
    Args:
        data: Response data (can be dict, list, or any serializable type)
        message: Success message
        status_code: HTTP status code (default 200)
        **kwargs: Additional fields to include in response
    
    Returns:
        Response: DRF Response object
        
    Example:
        return success_response(
            data={'user': user_data},
            message='Profile updated successfully'
        )
        
        Response:
        {
            "success": true,
            "message": "Profile updated successfully",
            "data": {"user": {...}}
        }
    """
    response_data = {
        'success': True,
    }
    
    if message:
        response_data['message'] = message
    
    if data is not None:
        response_data['data'] = data
    
    # Add any additional fields
    response_data.update(kwargs)
    
    return Response(response_data, status=status_code)


def error_response(
    message: str,
    errors: Optional[Dict[str, Any]] = None,
    status_code: int = status.HTTP_400_BAD_REQUEST,
    **kwargs
) -> Response:
    """
    Create a standardized error response.
    
    Args:
        message: Error message
        errors: Dict of field-specific errors (optional)
        status_code: HTTP status code (default 400)
        **kwargs: Additional fields to include in response
    
    Returns:
        Response: DRF Response object
        
    Example:
        return error_response(
            message='Validation failed',
            errors={'email': ['This field is required']},
            status_code=400
        )
        
        Response:
        {
            "success": false,
            "message": "Validation failed",
            "errors": {"email": ["This field is required"]}
        }
    """
    response_data = {
        'success': False,
        'message': message,
    }
    
    if errors:
        response_data['errors'] = errors
    
    # Add any additional fields
    response_data.update(kwargs)
    
    return Response(response_data, status=status_code)


def paginated_response(
    data: list,
    total: int,
    page: int = 1,
    page_size: int = 10,
    message: Optional[str] = None,
    **kwargs
) -> Response:
    """
    Create a standardized paginated response.
    
    Args:
        data: List of items for current page
        total: Total count of all items
        page: Current page number
        page_size: Items per page
        message: Optional success message
        **kwargs: Additional fields to include in response
    
    Returns:
        Response: DRF Response object
        
    Example:
        return paginated_response(
            data=students,
            total=150,
            page=2,
            page_size=20
        )
        
        Response:
        {
            "success": true,
            "data": [...],
            "pagination": {
                "total": 150,
                "page": 2,
                "page_size": 20,
                "total_pages": 8
            }
        }
    """
    total_pages = (total + page_size - 1) // page_size
    
    response_data = {
        'success': True,
        'data': data,
        'pagination': {
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': total_pages,
        }
    }
    
    if message:
        response_data['message'] = message
    
    # Add any additional fields
    response_data.update(kwargs)
    
    return Response(response_data, status=status.HTTP_200_OK)


def created_response(
    data: Any,
    message: str = 'Resource created successfully',
    **kwargs
) -> Response:
    """
    Shorthand for 201 Created response.
    
    Args:
        data: Created resource data
        message: Success message
        **kwargs: Additional fields
    
    Returns:
        Response: DRF Response with 201 status
    """
    return success_response(
        data=data,
        message=message,
        status_code=status.HTTP_201_CREATED,
        **kwargs
    )


def no_content_response(message: Optional[str] = None) -> Response:
    """
    Shorthand for 204 No Content response (e.g., DELETE operations).
    
    Args:
        message: Optional success message
    
    Returns:
        Response: DRF Response with 204 status
    """
    if message:
        return success_response(message=message, status_code=status.HTTP_204_NO_CONTENT)
    return Response(status=status.HTTP_204_NO_CONTENT)


def unauthorized_response(message: str = 'Authentication required') -> Response:
    """
    Shorthand for 401 Unauthorized response.
    
    Args:
        message: Error message
    
    Returns:
        Response: DRF Response with 401 status
    """
    return error_response(message, status_code=status.HTTP_401_UNAUTHORIZED)


def forbidden_response(message: str = 'Permission denied') -> Response:
    """
    Shorthand for 403 Forbidden response.
    
    Args:
        message: Error message
    
    Returns:
        Response: DRF Response with 403 status
    """
    return error_response(message, status_code=status.HTTP_403_FORBIDDEN)


def not_found_response(message: str = 'Resource not found') -> Response:
    """
    Shorthand for 404 Not Found response.
    
    Args:
        message: Error message
    
    Returns:
        Response: DRF Response with 404 status
    """
    return error_response(message, status_code=status.HTTP_404_NOT_FOUND)
