"""
Richwell Portal — Audit Middleware

Captures the current request's user and IP address in a thread-safe
storage to automate audit log attribution in the AuditMixin.
"""

from threading import local

# Thread-local storage to hold request context
_audit_context = local()

def get_current_user():
    """Returns the currently authenticated user from the thread-local storage."""
    request = getattr(_audit_context, 'request', None)
    user = getattr(request, 'user', None)
    
    # In some custom tasks or if request isn't attached properly
    if user is None:
        user = getattr(_audit_context, 'user', None)
        
    return user

def get_current_ip():
    """Returns the current request IP address from the thread-local storage."""
    return getattr(_audit_context, 'ip', None)

class AuditMiddleware:
    """
    Middleware that captures the current user and IP address for every request.
    This enables AuditMixin to pick up the actor even when not explicitly passed.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Store request, user and IP on the current thread
        _audit_context.request = request
        _audit_context.user = getattr(request, 'user', None)
        _audit_context.ip = self._get_client_ip(request)
        
        try:
            response = self.get_response(request)
        finally:
            # Clean up to prevent context leakage across requests
            _audit_context.request = None
            _audit_context.user = None
            _audit_context.ip = None
            
        return response

    def _get_client_ip(self, request):
        """Extracts the client's real IP address from request headers."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
