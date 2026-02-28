"""
Curriculum views — CurriculumVersion detail + CurriculumViewSet CRUD.
"""

from django.db.models import Q
from rest_framework import generics, viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from drf_spectacular.utils import extend_schema, extend_schema_view

from apps.core.permissions import IsRegistrarOrAdmin
from apps.audit.models import AuditLog

from .models import Subject, CurriculumVersion, Curriculum, CurriculumSubject
from .serializers import (
    CurriculumVersionSerializer,
    CurriculumSerializer, CurriculumCreateSerializer,
    CurriculumSubjectSerializer, AssignSubjectsSerializer,
    CurriculumStructureSerializer
)
from .services import CurriculumService


# ============================================================
# Curriculum Version Views
# ============================================================

class CurriculumVersionDetailView(generics.RetrieveAPIView):
    """Get curriculum version details."""
    queryset = CurriculumVersion.objects.filter(is_deleted=False)
    serializer_class = CurriculumVersionSerializer
    permission_classes = [IsAuthenticated]


# ============================================================
# Curriculum Management Views
# ============================================================

@extend_schema_view(
    list=extend_schema(
        summary="List Curricula",
        description="Get all curricula with optional filtering by program",
        tags=["Curricula"]
    ),
    retrieve=extend_schema(
        summary="Get Curriculum",
        description="Get details of a specific curriculum",
        tags=["Curricula"]
    ),
    create=extend_schema(
        summary="Create Curriculum",
        description="Create a new curriculum version for a program",
        tags=["Curricula"]
    ),
    update=extend_schema(
        summary="Update Curriculum",
        description="Update curriculum details",
        tags=["Curricula"]
    ),
    partial_update=extend_schema(
        summary="Partial Update Curriculum",
        description="Partially update curriculum details",
        tags=["Curricula"]
    ),
    destroy=extend_schema(
        summary="Delete Curriculum",
        description="Soft delete a curriculum (students on it remain unaffected)",
        tags=["Curricula"]
    )
)
class CurriculumViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing curricula.

    Registrars can create, view, update, and manage curriculum versions.
    Each curriculum is a version of a program's course structure.
    """
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]

    def get_queryset(self):
        queryset = Curriculum.objects.filter(is_deleted=False).select_related('program')

        program_id = self.request.query_params.get('program')
        if program_id:
            queryset = queryset.filter(program_id=program_id)

        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        return queryset.order_by('-effective_year', 'code')

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return CurriculumCreateSerializer
        return CurriculumSerializer

    def perform_create(self, serializer):
        copy_from_id = serializer.validated_data.pop('copy_from', None)
        curriculum = serializer.save()

        if copy_from_id:
            try:
                source_curriculum = Curriculum.objects.get(id=copy_from_id, is_deleted=False)
                source_subjects = CurriculumSubject.objects.filter(
                    curriculum=source_curriculum,
                    is_deleted=False
                )
                
                cloned_subjects = [
                    CurriculumSubject(
                        curriculum=curriculum,
                        subject=ss.subject,
                        year_level=ss.year_level,
                        semester_number=ss.semester_number,
                        semester=ss.semester,
                        is_required=ss.is_required
                    )
                    for ss in source_subjects
                ]
                
                if cloned_subjects:
                    CurriculumSubject.objects.bulk_create(cloned_subjects)
            except Curriculum.DoesNotExist:
                pass

        AuditLog.log(
            action='CREATE_CURRICULUM',
            target_model='Curriculum',
            target_id=curriculum.id,
            actor=self.request.user,
            payload={
                'curriculum_code': curriculum.code,
                'program': curriculum.program.code,
                'cloned_from': str(copy_from_id) if copy_from_id else None
            }
        )

    def perform_update(self, serializer):
        curriculum = serializer.save()

        AuditLog.log(
            action='UPDATE_CURRICULUM',
            target_model='Curriculum',
            target_id=curriculum.id,
            actor=self.request.user,
            payload={
                'curriculum_code': curriculum.code,
                'changes': serializer.validated_data
            }
        )

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save()

        AuditLog.log(
            action='DELETE_CURRICULUM',
            target_model='Curriculum',
            target_id=instance.id,
            actor=self.request.user,
            payload={
                'curriculum_code': instance.code,
                'program': instance.program.code
            }
        )

    @extend_schema(
        summary="Get Curriculum Structure",
        description="Get curriculum structure grouped by year and semester",
        tags=["Curricula"],
        responses={200: CurriculumStructureSerializer}
    )
    @action(detail=True, methods=['get'])
    def structure(self, request, pk=None):
        """
        Get curriculum structure grouped by year and semester.
        """
        curriculum = self.get_object()

        assignments = CurriculumSubject.objects.filter(
            curriculum=curriculum,
            is_deleted=False
        ).select_related('subject', 'semester').prefetch_related('subject__prerequisites').order_by(
            'year_level', 'semester_number', 'subject__code'
        )

        structure = {}
        for assignment in assignments:
            year = str(assignment.year_level)
            sem = str(assignment.semester_number)

            if year not in structure:
                structure[year] = {}
            if sem not in structure[year]:
                structure[year][sem] = []

            subject_data = {
                'id': str(assignment.subject.id),
                'code': assignment.subject.code,
                'title': assignment.subject.title,
                'units': assignment.subject.units,
                'is_required': assignment.is_required,
                'is_major': assignment.subject.is_major,
                'prerequisites': [
                    {'code': p.code, 'title': p.title}
                    for p in assignment.subject.prerequisites.all()
                ]
            }

            if assignment.semester:
                subject_data['semester_name'] = f"{assignment.semester.name} {assignment.semester.academic_year}"
                subject_data['semester_dates'] = {
                    'start_date': assignment.semester.start_date,
                    'end_date': assignment.semester.end_date,
                    'enrollment_start': assignment.semester.enrollment_start_date,
                    'enrollment_end': assignment.semester.enrollment_end_date
                }
            else:
                subject_data['semester_name'] = None
                subject_data['semester_dates'] = None

            structure[year][sem].append(subject_data)

        return Response({
            'curriculum': CurriculumSerializer(curriculum).data,
            'structure': structure
        })

    @extend_schema(
        summary="Assign Subjects to Curriculum",
        description="Bulk assign subjects to curriculum year/semester slots",
        tags=["Curricula"],
        request=AssignSubjectsSerializer,
        responses={200: {'type': 'object'}}
    )
    @action(detail=True, methods=['post'])
    def assign_subjects(self, request, pk=None):
        """
        Bulk assign subjects to curriculum year/semester slots.
        """
        curriculum = self.get_object()
        serializer = AssignSubjectsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        assignments = serializer.validated_data['assignments']
        created_count = 0
        updated_count = 0
        errors = []

        for assignment in assignments:
            try:
                subject = Subject.objects.get(
                    id=assignment['subject_id'],
                    is_deleted=False
                )

                if not subject.is_global and subject.program_id != curriculum.program.id:
                    errors.append({
                        'subject_id': str(assignment['subject_id']),
                        'error': f"Subject {subject.code} does not belong to program {curriculum.program.code}"
                    })
                    continue

                defaults = {
                    'year_level': assignment['year_level'],
                    'semester_number': assignment['semester_number'],
                    'is_required': assignment['is_required'],
                    'is_deleted': False
                }

                if 'semester_id' in assignment and assignment['semester_id']:
                    from apps.enrollment.models import Semester
                    try:
                        semester = Semester.objects.get(id=assignment['semester_id'], is_deleted=False)
                        defaults['semester'] = semester
                    except Semester.DoesNotExist:
                        errors.append({
                            'subject_id': str(assignment['subject_id']),
                            'error': 'Semester not found'
                        })
                        continue

                obj, created = CurriculumSubject.objects.update_or_create(
                    curriculum=curriculum,
                    subject=subject,
                    defaults=defaults
                )

                if created:
                    created_count += 1
                else:
                    updated_count += 1

            except Subject.DoesNotExist:
                errors.append({
                    'subject_id': str(assignment['subject_id']),
                    'error': 'Subject not found'
                })

        AuditLog.log(
            action='ASSIGN_SUBJECTS_TO_CURRICULUM',
            target_model='Curriculum',
            target_id=curriculum.id,
            actor=request.user,
            payload={
                'curriculum_code': curriculum.code,
                'created': created_count,
                'updated': updated_count,
                'errors_count': len(errors)
            }
        )

        return Response({
            'success': True,
            'created': created_count,
            'updated': updated_count,
            'errors': errors
        })

    @extend_schema(
        summary="Remove Subject from Curriculum",
        description="Remove a subject assignment from curriculum",
        tags=["Curricula"]
    )
    @action(detail=True, methods=['delete'], url_path='subjects/(?P<subject_id>[^/.]+)')
    def remove_subject(self, request, pk=None, subject_id=None):
        """Remove a subject from curriculum."""
        curriculum = self.get_object()

        try:
            assignment = CurriculumSubject.objects.get(
                curriculum=curriculum,
                subject_id=subject_id,
                is_deleted=False
            )

            assignment.is_deleted = True
            assignment.save()

            AuditLog.log(
                action='REMOVE_SUBJECT_FROM_CURRICULUM',
                target_model='Curriculum',
                target_id=curriculum.id,
                actor=request.user,
                payload={
                    'curriculum_code': curriculum.code,
                    'subject_code': assignment.subject.code
                }
            )

            return Response({
                'success': True,
                'message': f'Subject {assignment.subject.code} removed from curriculum'
            })

        except CurriculumSubject.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Subject not found in curriculum'
            }, status=status.HTTP_404_NOT_FOUND)

    @extend_schema(
        summary="Validate Curriculum",
        description="Validate curriculum completeness and get statistics",
        tags=["Curricula"]
    )
    @action(detail=True, methods=['get'])
    def validate(self, request, pk=None):
        """Validate curriculum completeness and structure."""
        curriculum = self.get_object()

        is_valid, errors = CurriculumService.validate_curriculum_completeness(curriculum)
        stats = CurriculumService.get_curriculum_statistics(curriculum)

        return Response({
            'is_valid': is_valid,
            'errors': errors,
            'statistics': stats
        })
