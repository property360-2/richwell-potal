from rest_framework import serializers
from .models import Term

class TermSerializer(serializers.ModelSerializer):
    semester_display = serializers.CharField(source='get_semester_type_display', read_only=True)
    
    class Meta:
        model = Term
        fields = [
            'id', 'code', 'academic_year', 'semester_type', 'semester_display',
            'start_date', 'end_date', 'enrollment_start', 'enrollment_end',
            'advising_start', 'advising_end', 'schedule_picking_start',
            'schedule_picking_end', 'midterm_grade_start', 'midterm_grade_end',
            'final_grade_start', 'final_grade_end', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
