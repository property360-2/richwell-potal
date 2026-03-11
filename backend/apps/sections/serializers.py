from rest_framework import serializers
from apps.sections.models import Section, SectionStudent

class SectionSerializer(serializers.ModelSerializer):
    student_count = serializers.SerializerMethodField()
    subject_count = serializers.SerializerMethodField()
    scheduling_status = serializers.SerializerMethodField()
    program_code = serializers.CharField(source='program.code', read_only=True)
    program_name = serializers.CharField(source='program.name', read_only=True)

    def get_student_count(self, obj):
        return obj.student_assignments.count()

    def get_subject_count(self, obj):
        return obj.schedules.count()

    def get_scheduling_status(self, obj):
        schedules = obj.schedules.all()
        if not schedules.exists():
            return 'UNSCHEDULED'
        
        total = schedules.count()
        # Scheduled means has professor AND time/days
        fully_configured = sum(1 for s in schedules if s.professor and s.days and s.start_time)
        
        if fully_configured == 0:
            return 'UNSCHEDULED'
        if fully_configured < total:
            return 'PARTIAL'
        return 'FULL'
    
    class Meta:
        model = Section
        fields = [
            'id', 'name', 'program', 'program_code', 'program_name', 
            'year_level', 'section_number', 'session', 'target_students', 
            'max_students', 'student_count', 'subject_count', 'scheduling_status'
        ]

class SectionStudentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    student_idn = serializers.CharField(source='student.idn', read_only=True)
    
    class Meta:
        model = SectionStudent
        fields = ['id', 'section', 'student', 'student_name', 'student_idn']
