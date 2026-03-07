"""
Role-based permission classes for the Richwell Portal.
Each class checks the user's role field for authorization.
"""

from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Allow access only to users with ADMIN role."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'ADMIN'


class IsHeadRegistrar(BasePermission):
    """Allow access only to users with HEAD_REGISTRAR role."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'HEAD_REGISTRAR'


class IsRegistrar(BasePermission):
    """Allow access only to users with REGISTRAR role."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'REGISTRAR'


class IsAdmission(BasePermission):
    """Allow access only to users with ADMISSION role."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'ADMISSION'


class IsCashier(BasePermission):
    """Allow access only to users with CASHIER role."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'CASHIER'


class IsDean(BasePermission):
    """Allow access only to users with DEAN role."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'DEAN'


class IsProgramHead(BasePermission):
    """Allow access only to users with PROGRAM_HEAD role."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'PROGRAM_HEAD'


class IsProfessor(BasePermission):
    """Allow access only to users with PROFESSOR role."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'PROFESSOR'


class IsStudent(BasePermission):
    """Allow access only to users with STUDENT role."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'STUDENT'


class IsAdminOrRegistrar(BasePermission):
    """Allow access to ADMIN or REGISTRAR roles."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('ADMIN', 'REGISTRAR')


class IsStaff(BasePermission):
    """Allow access to any non-student role."""

    STAFF_ROLES = {
        'ADMIN', 'HEAD_REGISTRAR', 'REGISTRAR', 'ADMISSION',
        'CASHIER', 'DEAN', 'PROGRAM_HEAD', 'PROFESSOR',
    }

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in self.STAFF_ROLES
