"""
Accounts views - Authentication and profile endpoints.
"""

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema

from django.db.models import Q
from .models import User, StudentProfile, PermissionCategory, Permission, UserPermission
from .serializers import (
    LoginSerializer,
    UserProfileSerializer,
    UserProfileUpdateSerializer,
    UserWithPermissionsSerializer,
    PermissionCategoryDetailSerializer,
    PermissionCategorySerializer,
    RegistrarStudentSerializer, 
    StudentManualCreateSerializer,
    StudentDetailSerializer,
    HigherUserSerializer
)
from apps.audit.models import AuditLog
from apps.core.permissions import IsRegistrarOrAdmin
from apps.enrollment.models import SubjectEnrollment, Enrollment, Semester
from apps.academics.models import Subject
from django import db
from rest_framework import viewsets
from apps.core.decorators import ratelimit_method
from .validators import PasswordValidator


class LoginView(TokenObtainPairView):
    """
    User login endpoint.
    Returns access and refresh tokens.
    """
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer
    
    @extend_schema(
        summary="User Login",
        description="Authenticate user and return JWT tokens",
        tags=["Authentication"]
    )
    @ratelimit_method(key='ip', rate='5/m', method='POST')
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class LogoutView(APIView):
    """
    User logout endpoint.
    Blacklists the refresh token.
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="User Logout",
        description="Blacklist the refresh token to logout",
        tags=["Authentication"]
    )
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response(
                {"success": True, "message": "Successfully logged out"},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"success": False, "error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class ProfileView(APIView):
    """
    User profile endpoint.
    GET: Retrieve current user's profile
    PATCH: Update current user's profile
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="Get Profile",
        description="Retrieve the current user's profile information",
        tags=["Profile"],
        responses={200: UserProfileSerializer}
    )
    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response({
            "success": True,
            "data": serializer.data
        })


class UserCountView(APIView):
    """
    User count endpoint for Admin Dashboard.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role not in ['ADMIN', 'HEAD_REGISTRAR', 'REGISTRAR']:
            return Response({"error": "Unauthorized"}, status=403)
        return Response({"count": User.objects.count()})
    
    @extend_schema(
        summary="Update Profile",
        description="Update the current user's profile information",
        tags=["Profile"],
        request=UserProfileUpdateSerializer,
        responses={200: UserProfileSerializer}
    )
    def patch(self, request):
        serializer = UserProfileUpdateSerializer(
            request.user,
            data=request.data,
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            
            # Log the profile update
            AuditLog.log(
                action=AuditLog.Action.USER_UPDATED,
                target_model='User',
                target_id=request.user.id,
                payload={'action': 'profile_update', 'fields': list(request.data.keys())},
                actor=request.user
            )
            
            return Response({
                "success": True,
                "data": UserProfileSerializer(request.user).data
            })
        return Response({
            "success": False,
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    """
    Change password endpoint.
    Requires current password and new password.
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="Change Password",
        description="Change the current user's password",
        tags=["Profile"]
    )
    def post(self, request):
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        
        if not current_password or not new_password:
            return Response({
                "success": False,
                "error": "Both current_password and new_password are required"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify current password
        if not request.user.check_password(current_password):
            return Response({
                "success": False,
                "error": "Current password is incorrect"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate new password with enhanced security requirements
        is_valid, error_message = PasswordValidator.validate(new_password)
        if not is_valid:
            return Response({
                "success": False,
                "error": error_message
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Set new password
        request.user.set_password(new_password)
        request.user.save()
        
        # Log the password change
        AuditLog.log(
            action=AuditLog.Action.USER_UPDATED,
            target_model='User',
            target_id=request.user.id,
            payload={'action': 'password_change'},
            actor=request.user
        )
        
        return Response({
            "success": True,
            "message": "Password changed successfully"
        })


# ============================================================
# Role-Based User Management Views
# ============================================================

class UserListView(APIView):
    """
    List and search users based on Role access.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="List Users",
        description="List all users with search and filter capabilities",
        tags=["User Management"],
        responses={200: UserWithPermissionsSerializer(many=True)}
    )
    def get(self, request):
        # Role Check: Only Admin and Registrar staff can view user lists
        allowed_roles = ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR', 'ADMISSION_STAFF']
        if not request.user.is_admin and request.user.role not in allowed_roles:
             return Response({
                "success": False,
                "error": "You don't have permission to view users"
            }, status=status.HTTP_403_FORBIDDEN)

        # Get query parameters
        search = request.query_params.get('search', '')
        role = request.query_params.get('role', '')

        # Base queryset
        users = User.objects.filter(is_deleted=False) if hasattr(User, 'is_deleted') else User.objects.all()

        # Apply search filter
        if search:
            users = users.filter(
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(student_number__icontains=search)
            )

        # Apply role filter
        if role:
            users = users.filter(role=role)

        # Order by creation date (newest first)
        users = users.order_by('-created_at')

        serializer = UserWithPermissionsSerializer(users, many=True)
        return Response({
            "success": True,
            "users": serializer.data
        })


# NOTE: Granular Permission Views are DEPRECATED/REMOVED in favor of simplified Role-Based Access
# class UserPermissionsView(APIView): ...
# class UpdateUserPermissionView(APIView): ...
# class BulkUpdateUserPermissionsView(APIView): ...
# class PermissionCategoryListView(APIView): ...


class StudentViewSet(viewsets.ModelViewSet):
    """
    Registrar Student Management.
    """
    queryset = StudentProfile.objects.all()
    # Simplified permission: Must be authenticated. specific role checks in methods.
    permission_classes = [IsAuthenticated] 
    pagination_class = None
    
    def get_serializer_class(self):
        if self.action == 'create':
            return StudentManualCreateSerializer
        if self.action == 'retrieve':
            return StudentDetailSerializer
        return RegistrarStudentSerializer
        
    def get_queryset(self):
        # Role Check
        allowed_roles = ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR', 'ADMISSION_STAFF', 'PROFESSOR', 'DEPARTMENT_HEAD']
        if not self.request.user.is_admin and self.request.user.role not in allowed_roles:
            return StudentProfile.objects.none()

        # We need to filter StudentProfile, but ensure we select relations
        qs = StudentProfile.objects.filter(user__is_active=True).select_related(
            'user', 'program', 'curriculum', 'home_section'
        )

        # Apply Department Head scoping
        if self.request.user.role == 'DEPARTMENT_HEAD' and hasattr(self.request.user, 'department_head_profile'):
            qs = qs.filter(program__in=self.request.user.department_head_profile.programs.all())
        
        program = self.request.query_params.get('program')
        curriculum = self.request.query_params.get('curriculum')
        search = self.request.query_params.get('search')
        
        if program:
            qs = qs.filter(program_id=program)
        if curriculum:
            qs = qs.filter(curriculum_id=curriculum)
        if search:
            qs = qs.filter(
                Q(user__last_name__icontains=search) | 
                Q(user__first_name__icontains=search) | 
                Q(user__student_number__icontains=search)
            )
            
        return qs.order_by('user__last_name')

    def create(self, request, *args, **kwargs):
        # Role Check for Creation
        can_create = ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR', 'ADMISSION_STAFF']
        if not request.user.is_admin and request.user.role not in can_create:
             return Response({'error': 'You do not have permission to create students'}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            from .services import StudentService
            profile = StudentService.create_student(
                data=serializer.validated_data, 
                registrar=request.user
            )
            return Response(
                RegistrarStudentSerializer(profile).data, 
                status=status.HTTP_201_CREATED
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        """
        Reset student password to their student number.
        """
        # Role Check
        can_reset = ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR']
        if not request.user.is_admin and request.user.role not in can_reset:
             return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        student = self.get_object()
        user = student.user
        
        if not user.student_number:
            return Response({'error': 'Student has no student number defined'}, status=status.HTTP_400_BAD_REQUEST)
            
        user.set_password(user.student_number)
        user.save()
        
        # Log the action
        from apps.audit.models import AuditLog
        AuditLog.log(
            action=AuditLog.Action.USER_UPDATED,
            target_model='User',
            target_id=user.id,
            payload={'action': 'password_reset_to_default'},
            actor=request.user
        )
        
        return Response({'success': True, 'message': f'Password reset to {user.student_number}'})


class HigherUserViewSet(viewsets.ModelViewSet):
    """
    Admin & Scoped User Management for higher roles.
    Uses strict Role-Based Access Control logic in code.
    """
    serializer_class = HigherUserSerializer
    permission_classes = [IsAuthenticated]

    # DEFINED RBAC RULES FOR CREATION (Matches Frontend)
    CREATION_PERMISSIONS = {
        'ADMIN': ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR', 'ADMISSION_STAFF', 'CASHIER', 'DEPARTMENT_HEAD', 'PROFESSOR', 'STUDENT'],
        'REGISTRAR': ['PROFESSOR', 'STUDENT'],
        'HEAD_REGISTRAR': ['PROFESSOR', 'STUDENT', 'REGISTRAR'],
        'ADMISSION_STAFF': ['STUDENT'],
        # Others have no creation rights
    }

    def get_queryset(self):
        user = self.request.user
        
        # Admin sees all (except Students by default, unless included)
        if user.is_admin:
            qs = User.objects.all().order_by('-created_at')
            if self.request.query_params.get('include_students') != 'true':
                qs = qs.exclude(role='STUDENT')
            return qs
        
        # Others see only what they can create/manage
        allowed_roles = self.CREATION_PERMISSIONS.get(user.role, [])
        if allowed_roles:
            return User.objects.filter(role__in=allowed_roles).exclude(role='ADMIN').order_by('-created_at')
            
        return User.objects.none()

    def perform_create(self, serializer):
        role = self.request.data.get('role')
        user = self.request.user
        
        # Superuser bypass
        if user.is_superuser:
            serializer.save()
            return

        # Check RBAC
        allowed_roles = self.CREATION_PERMISSIONS.get(user.role, [])
        if role not in allowed_roles:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied(f"You do not have permission to create users with the {role} role.")
        
        serializer.save()

    def perform_update(self, serializer):
        role = self.request.data.get('role')
        user = self.request.user
        
        # Superuser bypass
        if user.is_superuser:
            serializer.save()
            return

        # Check RBAC
        allowed_roles = self.CREATION_PERMISSIONS.get(user.role, [])
        
        # If changing role, check if target role is allowed
        if role and role not in allowed_roles:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied(f"You do not have permission to set user role to {role}.")
            
        serializer.save()


class GenerateStudentIdView(APIView):
    """
    Generate the next unique student ID for the current year.
    Format: YYYY-XXXXX
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="Generate Student ID",
        description="Returns the next available sequential student ID for the current year",
        tags=["User Management"]
    )
    def get(self, request):
        from datetime import datetime
        year = datetime.now().year
        prefix = f"{year}-"
        
        # Find the max student number for current year
        # Order by descending to get the highest one efficiently
        # We query Users directly to catch deleted/inactive ones if possible (though default manager excludes inactive if overridden)
        # Using raw SQL or specific filtering is safest if using SoftDelete, but assuming standard deletion for now.
        
        last_student = User.objects.filter(student_number__startswith=prefix).order_by('-student_number').first()
        
        next_seq = 1
        if last_student and last_student.student_number:
            try:
                # Extract the sequence part
                # Expected format: 2025-00001
                parts = last_student.student_number.split('-')
                if len(parts) == 2 and parts[1].isdigit():
                    next_seq = int(parts[1]) + 1
            except (ValueError, IndexError):
                pass
        
        # Format: YYYY-00001
        new_id = f"{year}-{next_seq:05d}"
        
        # Double check existence loop to be absolutely sure (handles race conditions slightly better)
        while User.objects.filter(student_number=new_id).exists():
            next_seq += 1
            new_id = f"{year}-{next_seq:05d}"
            
        return Response({'student_id': new_id})


# ============================================================
# Permission Management Views
# ============================================================

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

        # Validate role exists in User.Role choices
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

        # Log action
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
