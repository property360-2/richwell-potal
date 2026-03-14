from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.accounts.serializers import UserSerializer
from .models import Professor, ProfessorSubject, ProfessorAvailability
from apps.terms.models import Term
from django.db.models import Sum

User = get_user_model()

class ProfessorSubjectSerializer(serializers.ModelSerializer):
    subject_details = serializers.SerializerMethodField()

    class Meta:
        model = ProfessorSubject
        fields = ['id', 'professor', 'subject', 'subject_details', 'created_at']

    def get_subject_details(self, obj):
        return {
            'code': obj.subject.code,
            'name': obj.subject.description,
            'units': obj.subject.total_units,
            'is_major': obj.subject.is_major,
            'curriculum': obj.subject.curriculum.version_name if obj.subject.curriculum else None
        }

class ProfessorAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfessorAvailability
        fields = ['id', 'day', 'session']

class ProfessorSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    assigned_subjects = ProfessorSubjectSerializer(many=True, read_only=True)
    availability = ProfessorAvailabilitySerializer(many=True, read_only=True)
    assignment_count = serializers.SerializerMethodField()

    class Meta:
        model = Professor
        fields = [
            'id', 'user', 'employee_id', 'department', 
            'employment_status', 'date_of_birth', 'is_active', 
            'assigned_subjects', 'availability', 'hours_assigned', 
            'assignment_count', 'created_at', 'updated_at'
        ]

    hours_assigned = serializers.SerializerMethodField()

    def get_hours_assigned(self, obj):
        active_term = Term.objects.filter(is_active=True).first()
        if not active_term:
            return 0
        total = obj.schedules.filter(term=active_term).aggregate(
            total=Sum('subject__hrs_per_week')
        )['total'] or 0
        return float(total)

    def get_assignment_count(self, obj):
        active_term = Term.objects.filter(is_active=True).first()
        if not active_term:
            return 0
        return obj.schedules.filter(term=active_term).count()

class ProfessorCreateUpdateSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(write_only=True)
    last_name = serializers.CharField(write_only=True)
    email = serializers.EmailField(write_only=True)
    employee_id = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Professor
        fields = [
            'first_name', 'last_name', 'email', 'employee_id',
            'department', 'employment_status', 'date_of_birth', 'is_active'
        ]

    def update(self, instance, validated_data):
        user_data = {
            'first_name': validated_data.pop('first_name', instance.user.first_name),
            'last_name': validated_data.pop('last_name', instance.user.last_name),
            'email': validated_data.pop('email', instance.user.email)
        }
        
        user = instance.user
        for attr, value in user_data.items():
            setattr(user, attr, value)
        user.save()

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
