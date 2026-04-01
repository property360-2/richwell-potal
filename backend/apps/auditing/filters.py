"""
Richwell Portal — Auditing Filters

Custom FilterSet for AuditLog model to support date ranges,
partial name matches, multi-choice action filtering, and complex field queries.

Usage:
    ?action=RELEASE&action=PASSWORD_RESET  → multiple action types in one query
    ?start_date=2025-01-01&end_date=2025-12-31 → date range filtering
    ?model_name=Student → partial model name match
"""

import django_filters
from .models import AuditLog


class AuditLogFilter(django_filters.FilterSet):
    """
    FilterSet for AuditLog instances.
    Supports date range, model name search, and multi-action filtering.

    Fields:
        start_date  - Filter logs created on or after this datetime.
        end_date    - Filter logs created on or before this datetime.
        model_name  - Case-insensitive partial match on the model name.
        object_repr - Case-insensitive partial match on the string representation.
        user        - Exact match on the user's database ID.
        action      - Multi-choice filter; accepts one or more ACTION_CHOICES values.
    """
    start_date = django_filters.DateTimeFilter(field_name="created_at", lookup_expr='gte')
    end_date = django_filters.DateTimeFilter(field_name="created_at", lookup_expr='lte')
    model_name = django_filters.CharFilter(lookup_expr='icontains')
    object_repr = django_filters.CharFilter(lookup_expr='icontains')
    user = django_filters.NumberFilter(field_name='user__id')

    # NOTE: MultipleChoiceFilter allows ?action=RELEASE&action=PASSWORD_RESET in one request.
    # This is preferred over a simple CharFilter now that we have 11 distinct action types.
    action = django_filters.MultipleChoiceFilter(
        choices=AuditLog.ACTION_CHOICES,
        label='Action Type(s)'
    )

    class Meta:
        model = AuditLog
        fields = ['user', 'action', 'model_name', 'object_id']

