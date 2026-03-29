"""
Richwell Portal — Core Mixins

This module provides reusable model mixins to prevent code duplication 
and ensure consistent behavior across different database models.
"""

from django.db import models


class TimestampMixin(models.Model):
    """
    An abstract base class model that provides self-updating 
    'created_at' and 'updated_at' fields for tracking record lifecycles.
    """

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
