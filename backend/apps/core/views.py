from rest_framework import viewsets
from .models import SystemConfig
from .serializers import SystemConfigSerializer
from .permissions import IsAdminOrReadOnly

class SystemConfigViewSet(viewsets.ModelViewSet):
    """
    API endpoint for system configuration.
    Admins can create/update. Others can read (if authenticated).
    """
    queryset = SystemConfig.objects.all()
    serializer_class = SystemConfigSerializer
    permission_classes = [IsAdminOrReadOnly]
    lookup_field = 'key'