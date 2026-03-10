from rest_framework import serializers
from apps.sections.models import Section, SectionStudent

class SectionSerializer(serializers.ModelSerializer):
    student_count = serializers.IntegerField(source='student_assignments.count', read_only=True)
    program_code = serializers.CharField(source='program.code', read_only=True)
    
    class Meta:
        model = Section
        fields = '__all__'

class SectionStudentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    student_idn = serializers.CharField(source='student.idn', read_only=True)
    
    class Meta:
        model = SectionStudent
        fields = '__all__'
