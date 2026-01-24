"""
Request Logging Middleware - Logs all HTTP requests for audit and debugging.
"""

import logging
import time
from django.utils import timezone

logger = logging.getLogger('django.request')


class RequestLoggingMiddleware:
    """
    Middleware to log all incoming requests with timing information.
    
    Logs:
    - Request method, path, and query parameters
    - User (if authenticated)
    - Response status code
    - Request duration in milliseconds
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Record start time
        start_time = time.time()
        
        # Process request
        response = self.get_response(request)
        
        # Calculate duration
        duration_ms = (time.time() - start_time) * 1000
        
        # Get user info
        user_info = 'Anonymous'
        if hasattr(request, 'user') and request.user.is_authenticated:
            user_info = f"{request.user.email} ({request.user.role})"
        
        # Log request
        log_data = {
            'method': request.method,
            'path': request.path,
            'query_params': dict(request.GET),
            'user': user_info,
            'status_code': response.status_code,
            'duration_ms': round(duration_ms, 2),
            'timestamp': timezone.now().isoformat(),
        }
        
        # Log at different levels based on status code
        if response.status_code >= 500:
            logger.error(f"Request completed: {log_data}")
        elif response.status_code >= 400:
            logger.warning(f"Request completed: {log_data}")
        else:
            logger.info(f"Request completed: {log_data}")
        
        # Add custom header with request duration
        response['X-Request-Duration-Ms'] = str(round(duration_ms, 2))
        
        return response
