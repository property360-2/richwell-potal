"""
Standard pagination for the Richwell Portal API.
"""

from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """Default pagination: 20 per page, max 100."""

    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
