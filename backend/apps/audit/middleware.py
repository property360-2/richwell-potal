"""
Audit middleware to capture request context for audit logging.
"""

import threading
from django.utils.deprecation import MiddlewareMixin

# Thread-local storage for request context
_request_context = threading.local()


def get_current_request():
    """Get the current request from thread-local storage."""
    return getattr(_request_context, 'request', None)


def get_current_user():
    """Get the current user from the request."""
    request = get_current_request()
    if request and hasattr(request, 'user') and request.user.is_authenticated:
        return request.user
    return None


def get_client_ip():
    """Get the client IP address from the current request."""
    request = get_current_request()
    if not request:
        return None
    
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


class AuditMiddleware(MiddlewareMixin):
    """
    Middleware that stores the current request in thread-local storage.
    This allows audit logging to access request context (user, IP) from anywhere.
    """
    
    def process_request(self, request):
        _request_context.request = request
    
    def process_response(self, request, response):
        # Clean up after request is processed
        if hasattr(_request_context, 'request'):
            del _request_context.request
        return response
    
    def process_exception(self, request, exception):
        # Clean up on exception as well
        if hasattr(_request_context, 'request'):
            del _request_context.request
        return None
