"""
Richwell Portal — Accounts Models

This module defines the custom User model for the application, implementing 
role-based access control (RBAC) and audit tracking.
"""

from django.db import models
from django.contrib.auth.models import AbstractUser
from apps.auditing.mixins import AuditMixin

class User(AuditMixin, AbstractUser):
    """
    Custom user model extending AbstractUser. Adds role-based classification 
    and password change enforcement.
    """
    class RoleChoices(models.TextChoices):
        ADMIN = 'ADMIN', 'Admin'
        HEAD_REGISTRAR = 'HEAD_REGISTRAR', 'Head Registrar'
        REGISTRAR = 'REGISTRAR', 'Registrar'
        ADMISSION = 'ADMISSION', 'Admission'
        CASHIER = 'CASHIER', 'Cashier'
        DEAN = 'DEAN', 'Dean'
        PROGRAM_HEAD = 'PROGRAM_HEAD', 'Program Head'
        PROFESSOR = 'PROFESSOR', 'Professor'
        STUDENT = 'STUDENT', 'Student'

    role = models.CharField(max_length=20, choices=RoleChoices.choices)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    must_change_password = models.BooleanField(default=False)

    def __str__(self):
        """
        Returns a human readable user identifier.
        Format: username (Role Display Name)
        """
        return f"{self.username} ({self.get_role_display()})"
