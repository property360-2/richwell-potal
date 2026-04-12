from rest_framework import serializers
from apps.sections.models import Section, SectionStudent

class SectionSerializer(serializers.ModelSerializer):
    student_count = serializers.SerializerMethodField()
    subject_count = serializers.SerializerMethodField()
    scheduling_status = serializers.SerializerMethodField()
    subject_schedules = serializers.SerializerMethodField()
    program_code = serializers.CharField(source='program.code', read_only=True)
    program_name = serializers.CharField(source='program.name', read_only=True)

    def get_student_count(self, obj):
        return obj.student_assignments.count()

    def get_subject_count(self, obj):
        return obj.schedules.count()

    def get_subject_schedules(self, obj):
        """
        Returns schedule details for the specific subject being queried.
        Used by the frontend conflict detector.
        """
        request = self.context.get('request')
        if not request:
            return []
            
        subject_id = request.query_params.get('subject_id')
        if not subject_id:
            return []
        
        schedules = obj.schedules.filter(subject_id=subject_id)
        return [{
            'id': s.id,
            'days': s.days,
            'start_time': s.start_time.strftime('%H:%M') if s.start_time else None,
            'end_time': s.end_time.strftime('%H:%M') if s.end_time else None,
            'room': s.room.name if s.room else 'TBA',
            'component': s.component_type
        } for s in schedules]

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
            'max_students', 'student_count', 'subject_count', 'scheduling_status',
            'subject_schedules'
        ]

class SectionStudentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    student_idn = serializers.CharField(source='student.idn', read_only=True)
    student_id = serializers.IntegerField(source='student.id', read_only=True)

    class Meta:
        model = SectionStudent
        fields = ['id', 'section', 'term', 'student', 'student_id', 'student_name', 'student_idn', 'is_home_section']
