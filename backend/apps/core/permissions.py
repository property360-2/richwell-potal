"""
Core permission classes for role-based access control.
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsStudent(BasePermission):
    """
    Permission class for student-only access.
    """
    message = 'Only students can access this resource.'
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'STUDENT'
        )


class IsProfessor(BasePermission):
    """
    Permission class for professor-only access.
    """
    message = 'Only professors can access this resource.'
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'PROFESSOR'
        )


class IsCashier(BasePermission):
    """
    Permission class for cashier-only access.
    """
    message = 'Only cashiers can access this resource.'
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'CASHIER'
        )


class IsRegistrar(BasePermission):
    """
    Permission class for registrar access (includes Head-Registrar).
    """
    message = 'Only registrar staff can access this resource.'
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['REGISTRAR', 'HEAD_REGISTRAR']
        )


class IsHeadRegistrar(BasePermission):
    """
    Permission class for head registrar only access.
    """
    message = 'Only the head registrar can access this resource.'
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'HEAD_REGISTRAR'
        )


class IsAdmissionStaff(BasePermission):
    """
    Permission class for admission staff access.
    """
    message = 'Only admission staff can access this resource.'
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'ADMISSION_STAFF'
        )


class IsDepartmentHead(BasePermission):
    """
    Permission class for department head access.
    """
    message = 'Only department heads can access this resource.'
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'DEPARTMENT_HEAD'
        )


class IsAdmin(BasePermission):
    """
    Permission class for admin-only access.
    """
    message = 'Only administrators can access this resource.'
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            (request.user.role == 'ADMIN' or request.user.is_superuser)
        )


class IsAdminOrRegistrar(BasePermission):
    """
    Permission class for admin or registrar access.
    """
    message = 'Only administrators or registrar staff can access this resource.'
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR']
        )


# Alias for consistency
IsRegistrarOrAdmin = IsAdminOrRegistrar


class IsProfessorOrRegistrar(BasePermission):
    """
    Permission class for professor or registrar access.
    Used for grading endpoints where both roles can submit grades.
    """
    message = 'Only professors or registrar staff can access this resource.'
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['PROFESSOR', 'REGISTRAR', 'HEAD_REGISTRAR']
        )


class IsStaff(BasePermission):
    """
    Permission class for any staff member (non-student).
    """
    message = 'Only staff members can access this resource.'
    
    STAFF_ROLES = [
        'PROFESSOR', 'CASHIER', 'REGISTRAR', 
        'HEAD_REGISTRAR', 'ADMISSION_STAFF', 'ADMIN'
    ]
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            (request.user.role in self.STAFF_ROLES or request.user.is_staff)
        )


class CanViewAuditLogs(BasePermission):
    """
    Permission to view audit logs.
    - Admin: Full access
    - Head-Registrar: Registrar actions, document releases, grade changes
    - Registrar: Own actions only (handled in view)
    """
    message = 'You do not have permission to view audit logs.'
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['ADMIN', 'HEAD_REGISTRAR', 'REGISTRAR']
        )


class IsAdminOrReadOnly(BasePermission):
    """
    Custom permission to only allow admin users to edit objects.
    All authenticated users can read.
    """

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return request.user and request.user.is_authenticated
        
        return (
            request.user and 
            request.user.is_authenticated and 
            (request.user.role == 'ADMIN' or request.user.is_superuser)
        )