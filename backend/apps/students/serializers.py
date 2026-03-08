from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.accounts.serializers import UserSerializer
from apps.academics.serializers import ProgramSerializer, CurriculumVersionSerializer
from apps.terms.serializers import TermSerializer
from .models import Student, StudentEnrollment

User = get_user_model()

class StudentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    program_details = ProgramSerializer(source='program', read_only=True)
    curriculum_details = CurriculumVersionSerializer(source='curriculum', read_only=True)
    latest_enrollment = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = [
            'id', 'user', 'idn', 'middle_name', 'date_of_birth', 'gender',
            'address_municipality', 'address_barangay', 'address_full',
            'contact_number', 'guardian_name', 'guardian_contact',
            'program', 'program_details', 'curriculum', 'curriculum_details',
            'student_type', 'status', 'appointment_date', 'document_checklist',
            'latest_enrollment', 'created_at', 'updated_at'
        ]
        read_only_fields = ['idn', 'status', 'created_at', 'updated_at']

    def get_latest_enrollment(self, obj):
        enrollment = StudentEnrollment.objects.filter(student=obj).order_by('-enrollment_date').first()
        if enrollment:
            return {
                'id': enrollment.id,
                'term': enrollment.term.id,
                'term_code': enrollment.term.code,
                'monthly_commitment': enrollment.monthly_commitment,
                'year_level': enrollment.year_level,
                'advising_status': enrollment.advising_status
            }
        return None

class StudentApplicationSerializer(serializers.ModelSerializer):
    """
    Used for public initial application
    """
    first_name = serializers.CharField(write_only=True)
    last_name = serializers.CharField(write_only=True)
    email = serializers.EmailField(write_only=True)

    class Meta:
        model = Student
        fields = [
            'first_name', 'last_name', 'email', 'middle_name', 
            'date_of_birth', 'gender', 'address_municipality', 
            'address_barangay', 'address_full', 'contact_number', 
            'guardian_name', 'guardian_contact', 'program', 
            'curriculum', 'student_type'
        ]

class StudentEnrollmentSerializer(serializers.ModelSerializer):
    student_details = StudentSerializer(source='student', read_only=True)
    term_details = TermSerializer(source='term', read_only=True)

    class Meta:
        model = StudentEnrollment
        fields = [
            'id', 'student', 'student_details', 'term', 'term_details',
            'advising_status', 'advising_approved_by', 'advising_approved_at',
            'is_regular', 'year_level', 'monthly_commitment',
            'enrolled_by', 'enrollment_date'
        ]
        read_only_fields = ['enrollment_date']
