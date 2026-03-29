"""
Richwell Portal — Terms Views

This module provides API endpoints for managing academic terms and lifecycle 
operations such as activation and closure.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from core.permissions import IsAdmin, IsAdminOrRegistrarOrReadOnly
from .models import Term
from .serializers import TermSerializer

class TermViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing academic terms. Enforces strict role-based access 
    for administrative operations.
    """
    queryset = Term.objects.all()
    serializer_class = TermSerializer
    permission_classes = [IsAdminOrRegistrarOrReadOnly]
    filterset_fields = ['is_active', 'semester_type', 'academic_year']
    search_fields = ['code', 'academic_year']

    def get_permissions(self):
        """
        Applies admin-only permissions for activation and closure actions.
        """
        if self.action in ['activate', 'close']:
            return [IsAdmin()]
        return super().get_permissions()

    def partial_update(self, request, *args, **kwargs):
        """
        Handles partial updates. Restricts Registrars to grading window modifications only.
        """
        user = request.user
        if user.role in ['REGISTRAR', 'HEAD_REGISTRAR'] and not user.is_superuser:
            # Registrar can ONLY update grading window dates
            allowed_fields = {
                'midterm_grade_start', 'midterm_grade_end',
                'final_grade_start', 'final_grade_end'
            }
            if not set(request.data.keys()).issubset(allowed_fields):
                return Response(
                    {"error": "Registrar is only allowed to update grading window dates."},
                    status=status.HTTP_403_FORBIDDEN
                )
        return super().partial_update(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        """
        Disables full PUT updates for Registrars to prevent accidental data loss.
        """
        # Disable full PUT for Registrar to be safe, force PATCH
        user = request.user
        if user.role in ['REGISTRAR', 'HEAD_REGISTRAR'] and not user.is_superuser:
            return Response(
                {"error": "Please use PATCH (partial update) to modify dates."},
                status=status.HTTP_405_METHOD_NOT_ALLOWED
            )
        return super().update(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """
        Activates the specified term and deactivates all others.
        """
        term = self.get_object()
        term.is_active = True
        term.save()  # logic in model.save handles deactivating others
        return Response({'status': f'Term {term.code} activated'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """
        Closes the term, deactivates it, and locks all grades for integrity.
        """
        term = self.get_object()
        term.is_grades_locked = True
        term.is_active = False # Deactivate on close
        term.save()
        return Response({'status': f'Term {term.code} closed and grades locked.'}, status=status.HTTP_200_OK)
