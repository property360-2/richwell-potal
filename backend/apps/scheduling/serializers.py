from rest_framework import serializers
from apps.scheduling.models import Schedule

class ScheduleSerializer(serializers.ModelSerializer):
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    subject_description = serializers.CharField(source='subject.description', read_only=True)
    professor_name = serializers.CharField(source='professor.user.get_full_name', read_only=True)
    room_name = serializers.CharField(source='room.name', read_only=True)
    section_name = serializers.CharField(source='section.name', read_only=True)
    section_session = serializers.CharField(source='section.session', read_only=True)
    subject_units = serializers.IntegerField(source='subject.total_units', read_only=True)
    
    class Meta:
        model = Schedule
        fields = [
            'id', 'term', 'section', 'subject', 'component_type', 
            'professor', 'room', 'days', 'start_time', 'end_time',
            'subject_code', 'subject_description', 'professor_name', 
            'room_name', 'section_name', 'section_session', 'subject_units'
        ]
