"""
User management views — user listing, student CRUD, higher-role management, student ID generation.
"""

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema

from django.db.models import Q
from .models import User, StudentProfile
from .serializers import (
    UserWithPermissionsSerializer,
    RegistrarStudentSerializer,
    StudentManualCreateSerializer,
    StudentDetailSerializer,
    HigherUserSerializer,
)


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
        allowed_roles = ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR', 'ADMISSION_STAFF']
        if not request.user.is_admin and request.user.role not in allowed_roles:
             return Response({
                "success": False,
                "error": "You don't have permission to view users"
            }, status=status.HTTP_403_FORBIDDEN)

        search = request.query_params.get('search', '')
        role = request.query_params.get('role', '')

        users = User.objects.filter(is_deleted=False) if hasattr(User, 'is_deleted') else User.objects.all()

        if search:
            users = users.filter(
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(student_number__icontains=search)
            )

        if role:
            users = users.filter(role=role)

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
    permission_classes = [IsAuthenticated] 
    pagination_class = None
    
    def get_serializer_class(self):
        if self.action == 'create':
            return StudentManualCreateSerializer
        if self.action == 'retrieve':
            return StudentDetailSerializer
        return RegistrarStudentSerializer
        
    def get_queryset(self):
        allowed_roles = ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR', 'ADMISSION_STAFF', 'PROFESSOR', 'DEPARTMENT_HEAD']
        if not self.request.user.is_admin and self.request.user.role not in allowed_roles:
            return StudentProfile.objects.none()

        qs = StudentProfile.objects.filter(user__is_active=True).select_related(
            'user', 'program', 'curriculum', 'home_section'
        )

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
        can_reset = ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR']
        if not request.user.is_admin and request.user.role not in can_reset:
             return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        student = self.get_object()
        user = student.user
        
        if not user.student_number:
            return Response({'error': 'Student has no student number defined'}, status=status.HTTP_400_BAD_REQUEST)
            
        user.set_password(user.student_number)
        user.save()
        
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
    }

    def get_queryset(self):
        user = self.request.user
        
        if user.is_admin:
            qs = User.objects.all().order_by('-created_at')
            if self.request.query_params.get('include_students') != 'true':
                qs = qs.exclude(role='STUDENT')
            return qs
        
        allowed_roles = self.CREATION_PERMISSIONS.get(user.role, [])
        if allowed_roles:
            return User.objects.filter(role__in=allowed_roles).exclude(role='ADMIN').order_by('-created_at')
            
        return User.objects.none()

    def perform_create(self, serializer):
        role = self.request.data.get('role')
        user = self.request.user
        
        if user.is_superuser:
            serializer.save()
            return

        allowed_roles = self.CREATION_PERMISSIONS.get(user.role, [])
        if role not in allowed_roles:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied(f"You do not have permission to create users with the {role} role.")
        
        serializer.save()

    def perform_update(self, serializer):
        role = self.request.data.get('role')
        user = self.request.user
        
        if user.is_superuser:
            serializer.save()
            return

        allowed_roles = self.CREATION_PERMISSIONS.get(user.role, [])
        
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
        
        last_student = User.objects.filter(student_number__startswith=prefix).order_by('-student_number').first()
        
        next_seq = 1
        if last_student and last_student.student_number:
            try:
                parts = last_student.student_number.split('-')
                if len(parts) == 2 and parts[1].isdigit():
                    next_seq = int(parts[1]) + 1
            except (ValueError, IndexError):
                pass
        
        new_id = f"{year}-{next_seq:05d}"
        
        while User.objects.filter(student_number=new_id).exists():
            next_seq += 1
            new_id = f"{year}-{next_seq:05d}"
            
        return Response({'student_id': new_id})
