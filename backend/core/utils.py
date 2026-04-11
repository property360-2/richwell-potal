"""
Richwell Portal — Core Utilities

This module contains shared utility functions used across multiple apps, 
specifically focusing on cross-framework compatibility (e.g., mapping 
Django exceptions to DRF exceptions).
"""

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError

def map_django_error(e):
    """
    Maps a Django ValidationError to a DRF ValidationError for consistent 
    API responses.
    
    Ensures that errors are returned as dictionaries, prioritizing field-specific 
    errors if present, and always including a 'detail' key as a fallback.
    
    Args:
        e (DjangoValidationError): The Django validation error to map.
        
    Raises:
        DRFValidationError: The mapped DRF validation error.
    """
    if not isinstance(e, DjangoValidationError):
        return e

    # Handle dictionary-based validation errors (field-specific)
    if hasattr(e, 'message_dict'):
        err_data = {
            k: v[0] if isinstance(v, list) and len(v) == 1 else v 
            for k, v in e.message_dict.items()
        }
        
        # Ensure 'detail' exists if not present, using the first general message
        if 'detail' not in err_data and e.messages:
            err_data['detail'] = e.messages[0]
            
        return DRFValidationError(err_data)
    
    # Fallback for simple message-list validation errors
    detail = e.messages[0] if e.messages else "Validation failed."
    return DRFValidationError({'detail': detail})
