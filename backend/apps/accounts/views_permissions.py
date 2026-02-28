"""
Permission management views — category listing and role toggle.
"""

from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema

from .models import User, PermissionCategory, Permission
from .serializers import PermissionCategorySerializer


class PermissionCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    List all permissions grouped by category.
    Only accessible by Admin.
    """
    queryset = PermissionCategory.objects.prefetch_related('permissions').order_by('order')
    serializer_class = PermissionCategorySerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        if not self.request.user.is_admin:
            return PermissionCategory.objects.none()
        return super().get_queryset()


class PermissionToggleView(APIView):
    """
    Toggle a role for a specific permission.
    POST /accounts/permissions/<id>/toggle/
    Body: { "role": "REGISTRAR" }
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Toggle Role Permission",
        description="Add or remove a role from a permission's default_for_roles list",
        tags=["User Management"],
        request={"type": "object", "properties": {"role": {"type": "string"}}}
    )
    def post(self, request, pk):
        if not request.user.is_admin:
            return Response(
                {"error": "Only admins can manage permissions"}, 
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            permission = Permission.objects.get(pk=pk)
        except Permission.DoesNotExist:
            return Response({"error": "Permission not found"}, status=status.HTTP_404_NOT_FOUND)

        role = request.data.get('role')
        if not role:
            return Response({"error": "Role is required"}, status=status.HTTP_400_BAD_REQUEST)

        valid_roles = [r[0] for r in User.Role.choices]
        if role not in valid_roles:
             return Response({"error": f"Invalid role. Choices: {valid_roles}"}, status=status.HTTP_400_BAD_REQUEST)

        current_roles = permission.default_for_roles or []
        
        if role in current_roles:
            current_roles.remove(role)
            action = "removed"
        else:
            current_roles.append(role)
            action = "added"

        permission.default_for_roles = current_roles
        permission.save()

        from apps.audit.models import AuditLog
        AuditLog.log(
            action=AuditLog.Action.SYSTEM_CONFIG_UPDATED,
            target_model='Permission',
            target_id=permission.id,
            payload={'action': action, 'role': role, 'code': permission.code},
            actor=request.user
        )

        return Response({
            "success": True,
            "message": f"Role {role} {action} for {permission.code}",
            "default_for_roles": current_roles
        })
