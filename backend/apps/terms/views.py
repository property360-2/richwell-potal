from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from core.permissions import IsAdmin, IsAdminOrRegistrarOrReadOnly
from .models import Term
from .serializers import TermSerializer

class TermViewSet(viewsets.ModelViewSet):
    queryset = Term.objects.all()
    serializer_class = TermSerializer
    permission_classes = [IsAdminOrRegistrarOrReadOnly]
    filterset_fields = ['is_active', 'semester_type', 'academic_year']
    search_fields = ['code', 'academic_year']

    def partial_update(self, request, *args, **kwargs):
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
        term = self.get_object()
        term.is_active = True
        term.save()  # logic in model.save handles deactivating others
        return Response({'status': f'Term {term.code} activated'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """
        Closes the term and locks all grades.
        """
        term = self.get_object()
        term.is_grades_locked = True
        term.is_active = False # Deactivate on close
        term.save()
        return Response({'status': f'Term {term.code} closed and grades locked.'}, status=status.HTTP_200_OK)
