from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from core.permissions import IsAdmin
from .models import Term
from .serializers import TermSerializer

class TermViewSet(viewsets.ModelViewSet):
    queryset = Term.objects.all()
    serializer_class = TermSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ['is_active', 'semester_type', 'academic_year']
    search_fields = ['code', 'academic_year']

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        term = self.get_object()
        term.is_active = True
        term.save()  # logic in model.save handles deactivating others
        return Response({'status': 'Term activated'}, status=status.HTTP_200_OK)
