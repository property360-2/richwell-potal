"""
Core models - Base classes for all models in the system.
"""

import uuid
from django.db import models


class BaseModel(models.Model):
    """
    Abstract base model providing common fields for all models:
    - UUID primary key
    - Timestamps (created_at, updated_at)
    - Soft delete support (is_deleted)
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for this record"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when this record was created"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp when this record was last updated"
    )
    is_deleted = models.BooleanField(
        default=False,
        help_text="Soft delete flag - if True, record is considered deleted"
    )

    class Meta:
        abstract = True
        ordering = ['-created_at']

    def soft_delete(self):
        """Mark record as deleted without actually removing from database."""
        self.is_deleted = True
        self.save(update_fields=['is_deleted', 'updated_at'])

    def restore(self):
        """Restore a soft-deleted record."""
        self.is_deleted = False
        self.save(update_fields=['is_deleted', 'updated_at'])


class ActiveManager(models.Manager):
    """Manager that returns only non-deleted records by default."""
    
    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)


class BaseModelWithActiveManager(BaseModel):
    """
    BaseModel with ActiveManager as default.
    Use `all_objects` to include soft-deleted records.
    """
    
    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        abstract = True
