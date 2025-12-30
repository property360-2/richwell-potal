"""
Custom decorators for views.
"""

from functools import wraps
from django.core.cache import cache
from django.conf import settings
from rest_framework.response import Response
from rest_framework import status
import time


def ratelimit_method(key='ip', rate='5/m', method='POST', block=True):
    """
    Rate limiting decorator for DRF class-based view methods.

    Args:
        key: What to use as rate limit key ('ip', 'user', or callable)
        rate: Rate limit in format 'num/period' (e.g., '5/m' for 5 per minute)
        method: HTTP method to rate limit (default: 'POST')
        block: Whether to block or just track (default: True)

    Usage:
        @ratelimit_method(key='ip', rate='5/m', method='POST')
        def post(self, request):
            # Your view logic
    """
    def decorator(func):
        @wraps(func)
        def wrapper(self, request, *args, **kwargs):
            # Only apply rate limit to specified HTTP method
            if request.method != method:
                return func(self, request, *args, **kwargs)

            # Parse rate
            num, period = rate.split('/')
            num = int(num)

            # Convert period to seconds
            period_seconds = {
                's': 1,
                'm': 60,
                'h': 3600,
                'd': 86400
            }.get(period, 60)

            # Get rate limit key
            if key == 'ip':
                identifier = get_client_ip(request)
            elif key == 'user':
                identifier = str(request.user.id) if request.user.is_authenticated else get_client_ip(request)
            elif callable(key):
                identifier = key(request)
            else:
                identifier = get_client_ip(request)

            # Create cache key
            cache_key = f'ratelimit:{func.__name__}:{identifier}'

            # Get current count
            current = cache.get(cache_key, {'count': 0, 'reset': time.time() + period_seconds})

            # Check if we need to reset
            if time.time() > current['reset']:
                current = {'count': 0, 'reset': time.time() + period_seconds}

            # Increment count
            current['count'] += 1

            # Save to cache
            cache.set(cache_key, current, period_seconds)

            # Check if rate limit exceeded
            if current['count'] > num:
                if block:
                    retry_after = int(current['reset'] - time.time())
                    return Response({
                        'success': False,
                        'error': f'Rate limit exceeded. Too many requests. Please try again in {retry_after} seconds.',
                        'retry_after': retry_after
                    }, status=status.HTTP_429_TOO_MANY_REQUESTS)

            # Add rate limit headers to response
            response = func(self, request, *args, **kwargs)
            if hasattr(response, '__setitem__'):
                response['X-RateLimit-Limit'] = str(num)
                response['X-RateLimit-Remaining'] = str(max(0, num - current['count']))
                response['X-RateLimit-Reset'] = str(int(current['reset']))

            return response

        return wrapper
    return decorator


def get_client_ip(request):
    """
    Get client IP address from request.
    Handles proxies and load balancers.
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def require_permission(permission_code):
    """
    Decorator to require a specific permission for a view method.

    Args:
        permission_code: Permission code string (e.g., 'user.manage_permissions')

    Usage:
        @require_permission('user.manage_permissions')
        def post(self, request):
            # Your view logic
    """
    def decorator(func):
        @wraps(func)
        def wrapper(self, request, *args, **kwargs):
            if not request.user.has_permission(permission_code):
                return Response({
                    "success": False,
                    "error": f"Permission denied. Required permission: {permission_code}"
                }, status=status.HTTP_403_FORBIDDEN)
            return func(self, request, *args, **kwargs)
        return wrapper
    return decorator
