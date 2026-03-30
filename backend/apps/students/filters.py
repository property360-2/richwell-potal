from django_filters import rest_framework as filters
from .models import Student, StudentEnrollment
from django.db.models import Subquery, OuterRef

class StudentFilter(filters.FilterSet):
    status = filters.CharFilter(method='filter_status')
    program = filters.NumberFilter(field_name='program__id')
    year_level = filters.NumberFilter(method='filter_year_level')
    
    def filter_status(self, queryset, name, value):
        if not value:
            return queryset
        status_list = value.split(',')
        return queryset.filter(status__in=status_list)

    def filter_year_level(self, queryset, name, value):
        if not value:
            return queryset
        # Filter students whose LATEST enrollment matches the year level
        latest_enrollments = StudentEnrollment.objects.filter(
            student=OuterRef('pk')
        ).order_by('-enrollment_date')
        
        return queryset.annotate(
            current_year=Subquery(latest_enrollments.values('year_level')[:1])
        ).filter(current_year=value)

    class Meta:
        model = Student
        fields = ['student_type', 'program', 'year_level']
