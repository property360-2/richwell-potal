from rest_framework import serializers
from .models import Term

class TermSerializer(serializers.ModelSerializer):
    semester_display = serializers.CharField(source='get_semester_type_display', read_only=True)
    
    picking_deadline = serializers.SerializerMethodField()

    class Meta:
        model = Term
        fields = [
            'id', 'code', 'academic_year', 'semester_type', 'semester_display',
            'start_date', 'end_date', 'enrollment_start', 'enrollment_end',
            'advising_start', 'advising_end', 'picking_published_at', 'picking_deadline', 
            'schedule_published', 'midterm_grade_start', 'midterm_grade_end',
            'final_grade_start', 'final_grade_end', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_picking_deadline(self, obj):
        # Prefer the explicit picking window end date if set
        if obj.schedule_picking_end:
            return obj.schedule_picking_end
        # Fallback to legacy 3-day logic
        if obj.picking_published_at:
            from datetime import timedelta
            return obj.picking_published_at + timedelta(days=3)
        return None
