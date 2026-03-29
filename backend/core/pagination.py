"""
Richwell Portal — Core Pagination

This module defines standardized pagination for the API to ensure 
consistent data delivery and performance.
"""

from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """
    Default pagination class for all public list endpoints.
    Provides a base page size of 20 with configurable overrides up to 100.
    """

    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
