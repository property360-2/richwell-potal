"""
Academics serializers.
"""

from rest_framework import serializers

from .models import Program, Subject


class SubjectMinimalSerializer(serializers.ModelSerializer):
    """Minimal subject serializer for nested use."""
    
    class Meta:
        model = Subject
        fields = ['id', 'code', 'title', 'units']


class SubjectSerializer(serializers.ModelSerializer):
    """Full subject serializer with prerequisites."""
    
    program_code = serializers.CharField(source='program.code', read_only=True)
    prerequisites = SubjectMinimalSerializer(many=True, read_only=True)
    inc_expiry_months = serializers.IntegerField(source='get_inc_expiry_months', read_only=True)
    
    class Meta:
        model = Subject
        fields = [
            'id', 'code', 'title', 'description', 'units',
            'is_major', 'year_level', 'semester_number',
            'allow_multiple_sections', 'program_code',
            'prerequisites', 'inc_expiry_months'
        ]


class ProgramSerializer(serializers.ModelSerializer):
    """Program serializer."""
    
    total_subjects = serializers.IntegerField(read_only=True)
    total_units = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Program
        fields = [
            'id', 'code', 'name', 'description', 
            'duration_years', 'is_active',
            'total_subjects', 'total_units'
        ]


class ProgramWithSubjectsSerializer(serializers.ModelSerializer):
    """Program serializer with full subject list."""
    
    subjects = SubjectSerializer(many=True, read_only=True)
    
    class Meta:
        model = Program
        fields = [
            'id', 'code', 'name', 'description', 
            'duration_years', 'is_active', 'subjects'
        ]
