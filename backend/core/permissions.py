"""
Role-based permission classes for the Richwell Portal.
Each class checks the user's role field for authorization.
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdmin(BasePermission):
    """Allow access only to users with ADMIN role."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role == 'ADMIN' or request.user.is_superuser)


class IsHeadRegistrar(BasePermission):
    """Allow access only to users with HEAD_REGISTRAR or ADMIN role."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role in ('HEAD_REGISTRAR', 'ADMIN') or request.user.is_superuser)


class IsRegistrar(BasePermission):
    """Allow access only to users with REGISTRAR or ADMIN role."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role in ('REGISTRAR', 'HEAD_REGISTRAR', 'ADMIN') or request.user.is_superuser)


class IsAdmission(BasePermission):
    """Allow access to users with ADMISSION or ADMIN role."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role in ('ADMISSION', 'ADMIN') or request.user.is_superuser)


class IsCashier(BasePermission):
    """Allow access only to users with CASHIER or ADMIN role."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role in ('CASHIER', 'ADMIN') or request.user.is_superuser)


class IsDean(BasePermission):
    """Allow access only to users with DEAN or ADMIN role."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role in ('DEAN', 'ADMIN') or request.user.is_superuser)


class IsProgramHead(BasePermission):
    """Allow access only to users with PROGRAM_HEAD, DEAN, or ADMIN role."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role in ('PROGRAM_HEAD', 'DEAN', 'ADMIN') or request.user.is_superuser)


from django.contrib.auth import get_user_model
User = get_user_model()


class IsProgramHeadOfStudent(BasePermission):
    """
    Object-level permission to only allow Program Heads to manage students 
    within their own program.
    """

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_superuser or user.role in ('ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR'):
            return True
        
        # Resolve the student object from common models
        student = obj
        if hasattr(obj, 'student'):
            student = obj.student
        
        # If the object is a User (student's user), we can't easily check program 
        # unless it has a student profile attached.
        if isinstance(student, User) and hasattr(student, 'student_profile'):
            student = student.student_profile
            
        if hasattr(student, 'program') and student.program:
            return student.program.program_head == user
            
        return False


class IsProfessor(BasePermission):
    """Allow access only to users with PROFESSOR or ADMIN role."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role in ('PROFESSOR', 'ADMIN') or request.user.is_superuser)


class IsStudent(BasePermission):
    """Allow access only to users with STUDENT role."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'STUDENT'


class IsAdminOrRegistrar(BasePermission):
    """Allow access to ADMIN or REGISTRAR roles."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role in ('ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR') or request.user.is_superuser)


class IsAdminOrCashier(BasePermission):
    """Allow access only to ADMIN or CASHIER roles."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role in ('ADMIN', 'CASHIER') or request.user.is_superuser)


class IsAdmissionOrRegistrar(BasePermission):
    """Allow access to ADMISSION, REGISTRAR, or ADMIN roles."""

    def has_permission(self, request, view):
        staff_roles = ('ADMISSION', 'REGISTRAR', 'HEAD_REGISTRAR', 'ADMIN')
        return request.user.is_authenticated and (request.user.role in staff_roles or request.user.is_superuser)


class IsStaff(BasePermission):
    """Allow access to any non-student role."""

    STAFF_ROLES = {
        'ADMIN', 'HEAD_REGISTRAR', 'REGISTRAR', 'ADMISSION',
        'CASHIER', 'DEAN', 'PROGRAM_HEAD', 'PROFESSOR',
    }

    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role in self.STAFF_ROLES or request.user.is_superuser)


class IsStudentRecordsStaff(BasePermission):
    """Allow access to student-record management roles."""

    ALLOWED_ROLES = {'ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR', 'ADMISSION'}

    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role in self.ALLOWED_ROLES or request.user.is_superuser)


class IsAdminOrReadOnly(BasePermission):
    """
    The request is authenticated as an admin, or is a read-only request.
    Use for objects that anyone can view but only admins can modify.
    """

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_authenticated and (request.user.role == 'ADMIN' or request.user.is_superuser)


class IsAdminOrRegistrarOrReadOnly(BasePermission):
    """
    The request is authenticated as an admin or registrar, or is a read-only request.
    Use for objects that anyone can view but only admins/registrars can modify.
    """

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        staff_roles = ('ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR')
        return request.user.is_authenticated and (request.user.role in staff_roles or request.user.is_superuser)
