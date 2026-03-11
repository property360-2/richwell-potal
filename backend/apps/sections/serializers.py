from rest_framework import serializers
from apps.sections.models import Section, SectionStudent

class SectionSerializer(serializers.ModelSerializer):
    student_count = serializers.SerializerMethodField()
    program_code = serializers.CharField(source='program.code', read_only=True)

    def get_student_count(self, obj):
        return obj.student_assignments.count()
    
    class Meta:
        model = Section
        fields = '__all__'

class SectionStudentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    student_idn = serializers.CharField(source='student.idn', read_only=True)
    
    class Meta:
        model = SectionStudent
        fields = '__all__'
