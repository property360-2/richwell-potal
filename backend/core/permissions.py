"""
Richwell Portal — Core Permissions

This module defines role-based access control (RBAC) permission classes 
for the Richwell Portal. Each class validates the user's role 
and authentication status before granting access to views or objects.
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdmin(BasePermission):
    """
    Grants access only to users with the 'ADMIN' role or superuser status.
    Used for system-wide administrative tasks.
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role == 'ADMIN' or request.user.is_superuser)


class IsHeadRegistrar(BasePermission):
    """
    Grants access to 'HEAD_REGISTRAR', 'ADMIN', or superuser roles.
    Used for high-level registrar operations and curriculum management.
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role in ('HEAD_REGISTRAR', 'ADMIN') or request.user.is_superuser)


class IsRegistrar(BasePermission):
    """
    Grants access to 'REGISTRAR', 'HEAD_REGISTRAR', 'ADMIN', or superuser roles.
    Used for standard student record management and enrollment tasks.
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role in ('REGISTRAR', 'HEAD_REGISTRAR', 'ADMIN') or request.user.is_superuser)


class IsAdmission(BasePermission):
    """
    Grants access to 'ADMISSION', 'ADMIN', or superuser roles.
    Focused on prospective student management and initial intake.
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role in ('ADMISSION', 'ADMIN') or request.user.is_superuser)


class IsCashier(BasePermission):
    """
    Grants access to 'CASHIER', 'ADMIN', or superuser roles.
    Restricted to financial transactions and payment processing.
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role in ('CASHIER', 'ADMIN') or request.user.is_superuser)


class IsDean(BasePermission):
    """
    Grants access to 'DEAN', 'ADMIN', or superuser roles.
    Used for college-level oversight and faculty management.
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role in ('DEAN', 'ADMIN') or request.user.is_superuser)


class IsProgramHead(BasePermission):
    """
    Grants access to 'PROGRAM_HEAD', 'DEAN', 'ADMIN', or superuser roles.
    Used for program-specific oversight and student record access.
    """

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
    """
    Grants access to 'PROFESSOR', 'ADMIN', or superuser roles.
    Restricted to academic management within assigned sections.
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role in ('PROFESSOR', 'ADMIN') or request.user.is_superuser)


class IsStudent(BasePermission):
    """
    Grants access strictly to users with the 'STUDENT' role.
    Used for personal record viewing and enrollment requests.
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'STUDENT'


class IsAdminOrRegistrar(BasePermission):
    """
    Composite permission allowing 'ADMIN' or 'REGISTRAR' staff to access.
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role in ('ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR') or request.user.is_superuser)


class IsAdminOrCashier(BasePermission):
    """
    Composite permission allowing 'ADMIN' or 'CASHIER' staff to access.
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role in ('ADMIN', 'CASHIER') or request.user.is_superuser)


class IsAdmissionOrRegistrar(BasePermission):
    """
    Composite permission allowing 'ADMISSION' or 'REGISTRAR' staff to access.
    """

    def has_permission(self, request, view):
        staff_roles = ('ADMISSION', 'REGISTRAR', 'HEAD_REGISTRAR', 'ADMIN')
        return request.user.is_authenticated and (request.user.role in staff_roles or request.user.is_superuser)


class IsStaff(BasePermission):
    """
    Grants access to any authenticated user with a staff-level role.
    Excludes students and unauthenticated users.
    """

    STAFF_ROLES = {
        'ADMIN', 'HEAD_REGISTRAR', 'REGISTRAR', 'ADMISSION',
        'CASHIER', 'DEAN', 'PROGRAM_HEAD', 'PROFESSOR',
    }

    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role in self.STAFF_ROLES or request.user.is_superuser)


class IsStudentRecordsStaff(BasePermission):
    """
    Grants access to staff roles explicitly authorized to manage 
    official student records and configurations.
    """

    ALLOWED_ROLES = {'ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR', 'ADMISSION'}

    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role in self.ALLOWED_ROLES or request.user.is_superuser)


class IsAdminOrReadOnly(BasePermission):
    """
    Grants 'ADMIN' or superuser write access, while allowing 'SAFE_METHODS' 
    (GET, HEAD, OPTIONS) for any authenticated user.
    """

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_authenticated and (request.user.role == 'ADMIN' or request.user.is_superuser)


class IsAdminOrRegistrarOrReadOnly(BasePermission):
    """
    Grants 'ADMIN', 'REGISTRAR', or superuser write access, while 
    allowing 'SAFE_METHODS' for any authenticated user.
    """

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        staff_roles = ('ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR')
        return request.user.is_authenticated and (request.user.role in staff_roles or request.user.is_superuser)
