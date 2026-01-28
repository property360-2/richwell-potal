"""
Document Release Serializers.
EPIC 6: Document Release
"""

from rest_framework import serializers
from .models import DocumentRelease

class DocumentReleaseSerializer(serializers.ModelSerializer):
    """Serializer for document releases."""
    
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    student_number = serializers.CharField(source='student.student_number', read_only=True)
    student_program = serializers.CharField(source='student.student_profile.program.code', read_only=True)
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)
    released_by_name = serializers.CharField(source='released_by.get_full_name', read_only=True)
    revoked_by_name = serializers.CharField(source='revoked_by.get_full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = DocumentRelease
        fields = [
            'id', 'document_code', 'document_type', 'document_type_display',
            'student', 'student_name', 'student_number', 'student_program',
            'released_by_name', 'released_at',
            'status', 'revoked_by_name', 'revoked_at', 'revocation_reason',
            'purpose', 'copies_released', 'notes'
        ]

class DocumentReleaseCreateSerializer(serializers.Serializer):
    """Serializer for creating a new document release."""
    
    student_id = serializers.UUIDField()
    document_type = serializers.ChoiceField(choices=DocumentRelease.DocumentType.choices)
    purpose = serializers.CharField(required=False, allow_blank=True)
    copies_released = serializers.IntegerField(min_value=1, default=1)
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate_student_id(self, value):
        from apps.accounts.models import User
        try:
            user = User.objects.get(id=value, role='STUDENT', is_active=True)
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("Student not found or inactive.")
            
    def save(self, **kwargs):
        """Custom save method to generate code and create object."""
        released_by = kwargs.get('released_by')
        student_id = self.validated_data['student_id']
        
        from django.utils import timezone
        code = f"DOC-{timezone.now().strftime('%Y%m%d')}-{str(student_id)[:8]}-{timezone.now().strftime('%H%M%S')}"
        
        return DocumentRelease.objects.create(
            document_code=code,
            student_id=student_id,
            document_type=self.validated_data['document_type'],
            purpose=self.validated_data.get('purpose', ''),
            copies_released=self.validated_data.get('copies_released', 1),
            notes=self.validated_data.get('notes', ''),
            released_by=released_by,
            status='ACTIVE'
        )
