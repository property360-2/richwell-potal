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
            'student_type', 'previous_school', 'is_advising_unlocked', 'status', 'appointment_date', 'document_checklist',
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
                'is_regular': enrollment.is_regular,
                'regularity_reason': enrollment.regularity_reason,
                'advising_status': enrollment.advising_status
            }
        return None


class StudentRecordSerializer(StudentSerializer):
    """
    Full serializer for student-record management roles.
    """


class StudentSelfSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    program_details = ProgramSerializer(source='program', read_only=True)
    curriculum_details = CurriculumVersionSerializer(source='curriculum', read_only=True)
    latest_enrollment = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = [
            'id', 'user', 'idn', 'middle_name', 'contact_number',
            'program', 'program_details', 'curriculum', 'curriculum_details',
            'student_type', 'previous_school', 'is_advising_unlocked', 'status',
            'appointment_date', 'document_checklist', 'latest_enrollment',
            'created_at', 'updated_at'
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
                'is_regular': enrollment.is_regular,
                'regularity_reason': enrollment.regularity_reason,
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
            'curriculum', 'student_type', 'previous_school'
        ]


class StudentEnrollmentSerializer(serializers.ModelSerializer):
    student_details = StudentSerializer(source='student', read_only=True)
    term_details = TermSerializer(source='term', read_only=True)
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    student_idn = serializers.CharField(source='student.idn', read_only=True)
    program_code = serializers.CharField(source='student.program.code', read_only=True)

    is_schedule_picked = serializers.SerializerMethodField()
    
    class Meta:
        model = StudentEnrollment
        fields = [
            'id', 'student', 'student_details', 'student_name', 'student_idn', 
            'program_code', 'term', 'term_details',
            'advising_status', 'advising_approved_by', 'advising_approved_at',
            'is_regular', 'regularity_reason', 'max_units_override', 'year_level', 'monthly_commitment',
            'enrolled_by', 'enrollment_date', 'is_schedule_picked'
        ]
        read_only_fields = ['enrollment_date']

    def get_is_schedule_picked(self, obj):
        from apps.sections.models import SectionStudent
        return SectionStudent.objects.filter(student=obj.student, section__term=obj.term).exists()


class StudentEnrollmentSelfSerializer(serializers.ModelSerializer):
    student_details = StudentSelfSerializer(source='student', read_only=True)
    term_details = TermSerializer(source='term', read_only=True)
    is_schedule_picked = serializers.SerializerMethodField()

    class Meta:
        model = StudentEnrollment
        fields = [
            'id', 'student', 'student_details', 'term', 'term_details',
            'advising_status', 'advising_approved_at', 'is_regular', 'regularity_reason',
            'year_level', 'monthly_commitment', 'max_units_override', 'enrollment_date',
            'is_schedule_picked'
        ]
        read_only_fields = ['enrollment_date']

    def get_is_schedule_picked(self, obj):
        from apps.sections.models import SectionStudent
        return SectionStudent.objects.filter(student=obj.student, section__term=obj.term).exists()


