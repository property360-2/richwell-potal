"""
Richwell Portal — Grades Filters

This module contains filter sets for Grade records, allowing for 
flexible querying of academic performance data.
"""

import django_filters
from apps.grades.models import Grade

class GradeFilter(django_filters.FilterSet):
    """
    Filter set for Grade records.
    
    Provides filters for student, term, advising status, resolution status, 
    and credit status. Supports 'in' lookups for status fields.
    """
    grade_status__in = django_filters.BaseInFilter(field_name='grade_status', lookup_expr='in')
    resolution_status__in = django_filters.BaseInFilter(field_name='resolution_status', lookup_expr='in')
    
    class Meta:
        model = Grade
        fields = {
            'student': ['exact'], 
            'is_credited': ['exact'], 
            'term': ['exact'], 
            'advising_status': ['exact'],
            'resolution_status': ['exact']
        }
