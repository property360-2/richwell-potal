from django_filters import rest_framework as filters
from .models import Student

class StudentFilter(filters.FilterSet):
    status = filters.CharFilter(method='filter_status')
    
    def filter_status(self, queryset, name, value):
        if not value:
            return queryset
        status_list = value.split(',')
        return queryset.filter(status__in=status_list)

    class Meta:
        model = Student
        fields = ['student_type', 'program']
