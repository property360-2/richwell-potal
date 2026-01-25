"""
Accounts views - Authentication and profile endpoints.
"""

from rest_framework import status
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
    StudentDetailSerializer
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
        
        return Response({
            "success": True,
            "message": "Password changed successfully"
        })


# ============================================================
# Permission Management Views
# ============================================================

class UserListView(APIView):
    """
    List and search all users for permission management.
    Admin only.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="List Users",
        description="List all users with search and filter capabilities",
        tags=["User Management"],
        responses={200: UserWithPermissionsSerializer(many=True)}
    )
    def get(self, request):
        # Check permission
        if not request.user.has_permission('user.view'):
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


class UserPermissionsView(APIView):
    """
    Get detailed permissions for a specific user.
    Shows all permission categories with the user's permission status.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Get User Permissions",
        description="Get detailed permission information for a user",
        tags=["User Management"],
        responses={200: PermissionCategoryDetailSerializer(many=True)}
    )
    def get(self, request, user_id):
        # Check permission
        if not request.user.has_permission('user.view'):
            return Response({
                "success": False,
                "error": "You don't have permission to view user permissions"
            }, status=status.HTTP_403_FORBIDDEN)

        # Get the user
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({
                "success": False,
                "error": "User not found"
            }, status=status.HTTP_404_NOT_FOUND)

        # Get all categories with permissions
        categories = PermissionCategory.objects.prefetch_related('permissions').all()
        effective_perms = user.get_effective_permissions()
        custom_perms = UserPermission.objects.filter(user=user)

        result = []
        for category in categories:
            category_data = {
                'code': category.code,
                'name': category.name,
                'icon': category.icon,
                'permissions': []
            }

            for perm in category.permissions.all():
                custom = custom_perms.filter(permission=perm).first()

                # Determine source of permission
                if custom and custom.granted:
                    source = 'custom_grant'
                elif custom and not custom.granted:
                    source = 'custom_revoke'
                elif user.role in perm.default_for_roles:
                    source = 'role_default'
                else:
                    source = 'none'

                perm_data = {
                    'code': perm.code,
                    'name': perm.name,
                    'description': perm.description,
                    'has_permission': perm in effective_perms,
                    'source': source,
                    'can_toggle': True  # Admin can always toggle
                }
                category_data['permissions'].append(perm_data)

            result.append(category_data)

        return Response({
            "success": True,
            "categories": result
        })


class UpdateUserPermissionView(APIView):
    """
    Grant or revoke a specific permission for a user.
    Creates a custom permission override.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Update User Permission",
        description="Grant or revoke a permission for a user",
        tags=["User Management"]
    )
    def post(self, request, user_id):
        # Check permission
        if not request.user.has_permission('user.manage_permissions'):
            return Response({
                "success": False,
                "error": "You don't have permission to manage user permissions"
            }, status=status.HTTP_403_FORBIDDEN)

        # Get the user
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({
                "success": False,
                "error": "User not found"
            }, status=status.HTTP_404_NOT_FOUND)

        # Get request data
        permission_code = request.data.get('permission_code')
        granted = request.data.get('granted')
        reason = request.data.get('reason', '')

        if not permission_code or granted is None:
            return Response({
                "success": False,
                "error": "permission_code and granted are required"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Get the permission
        try:
            permission = Permission.objects.get(code=permission_code)
        except Permission.DoesNotExist:
            return Response({
                "success": False,
                "error": f"Permission {permission_code} not found"
            }, status=status.HTTP_404_NOT_FOUND)

        # Create or update UserPermission
        user_perm, created = UserPermission.objects.update_or_create(
            user=user,
            permission=permission,
            defaults={
                'granted': granted,
                'granted_by': request.user,
                'reason': reason
            }
        )

        # Log the action
        AuditLog.log(
            user=request.user,
            action=AuditLog.Action.USER_UPDATED,
            target_model='UserPermission',
            target_id=user_perm.id,
            payload={
                'user_id': str(user.id),
                'user_email': user.email,
                'permission': permission_code,
                'granted': granted,
                'reason': reason
            }
        )

        return Response({
            "success": True,
            "message": f"Permission {'granted' if granted else 'revoked'} successfully"
        })


class BulkUpdateUserPermissionsView(APIView):
    """
    Update multiple permissions at once for a user.
    Useful for batch operations.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Bulk Update Permissions",
        description="Update multiple permissions for a user at once",
        tags=["User Management"]
    )
    def post(self, request, user_id):
        # Check permission
        if not request.user.has_permission('user.manage_permissions'):
            return Response({
                "success": False,
                "error": "You don't have permission to manage user permissions"
            }, status=status.HTTP_403_FORBIDDEN)

        # Get the user
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({
                "success": False,
                "error": "User not found"
            }, status=status.HTTP_404_NOT_FOUND)

        # Get updates list
        updates = request.data.get('permissions', [])
        if not isinstance(updates, list):
            return Response({
                "success": False,
                "error": "permissions must be a list"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Apply updates
        updated_count = 0
        for update in updates:
            permission_code = update.get('code')
            granted = update.get('granted')

            if not permission_code or granted is None:
                continue

            try:
                permission = Permission.objects.get(code=permission_code)
                UserPermission.objects.update_or_create(
                    user=user,
                    permission=permission,
                    defaults={
                        'granted': granted,
                        'granted_by': request.user
                    }
                )
                updated_count += 1
            except Permission.DoesNotExist:
                continue

        # Log the bulk action
        AuditLog.log(
            user=request.user,
            action=AuditLog.Action.USER_UPDATED,
            target_model='User',
            target_id=user.id,
            payload={
                'user_email': user.email,
                'bulk_permission_update': True,
                'permissions_updated': updated_count
            }
        )

        return Response({
            "success": True,
            "message": f"Updated {updated_count} permissions"
        })


class PermissionCategoryListView(APIView):
    """
    List all permission categories with their permissions.
    Useful for admin UI to show available permissions.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="List Permission Categories",
        description="Get all permission categories with their permissions",
        tags=["User Management"],
        responses={200: PermissionCategorySerializer(many=True)}
    )
    def get(self, request):
        categories = PermissionCategory.objects.prefetch_related('permissions').all()
        serializer = PermissionCategorySerializer(categories, many=True)
        return Response({
            "success": True,
            "categories": serializer.data
        })


class StudentViewSet(viewsets.ModelViewSet):
    """
    Registrar Student Management.
    """
    queryset = StudentProfile.objects.all()
    permission_classes = [IsRegistrarOrAdmin]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return StudentManualCreateSerializer
        if self.action == 'retrieve':
            return StudentDetailSerializer
        return RegistrarStudentSerializer
        
    def get_queryset(self):
        # We need to filter StudentProfile, but ensure we select relations
        qs = StudentProfile.objects.filter(user__is_active=True).select_related(
            'user', 'program', 'curriculum', 'home_section'
        )
        
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

    @db.transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        
        from apps.enrollment.services import EnrollmentService
        service = EnrollmentService()
        
        email = data['email']
        if User.objects.filter(email=email).exists():
             return Response({'error': 'Email already exists'}, status=status.HTTP_400_BAD_REQUEST)

        # Generate credentials
        school_email = service._generate_school_email(data['first_name'], data['last_name'])
        student_number = service.generate_student_number()
        password = service._generate_password()
        
        user = User.objects.create_user(
            email=email,
            password=password,
            first_name=data['first_name'],
            last_name=data['last_name'],
            role=User.Role.STUDENT,
            student_number=student_number,
            username=school_email
        )
        
        profile = StudentProfile.objects.create(
            user=user,
            program=data['program'],
            curriculum=data.get('curriculum'),
            year_level=data['year_level'],
            is_transferee=data.get('is_transferee', False),
            previous_school=data.get('previous_school', ''),
            birthdate=data['birthdate'],
            address=data.get('address', ''),
            contact_number=data.get('contact_number', ''),
            status='ACTIVE'
        )
        
        credited_subjects = data.get('credited_subjects', [])
        if credited_subjects:
            semester = Semester.objects.filter(is_current=True).first()
            if not semester:
                from datetime import date
                semester = Semester.objects.create(
                    name="Default", academic_year="2025", 
                    start_date=date.today(), end_date=date.today(), is_current=True
                )
                
            enrollment = Enrollment.objects.create(
                student=user,
                semester=semester,
                status=Enrollment.Status.ENROLLED,
                created_via=Enrollment.CreatedVia.TRANSFEREE
            )
            
            for credit in credited_subjects:
                 SubjectEnrollment.objects.create(
                     enrollment=enrollment,
                     subject_id=credit['subject_id'],
                     status=SubjectEnrollment.Status.CREDITED,
                     final_grade=credit.get('grade')
                 )
        
        return Response(RegistrarStudentSerializer(profile).data, status=status.HTTP_201_CREATED)
