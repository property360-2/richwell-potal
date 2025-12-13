"""
User and StudentProfile models for Richwell Colleges Portal.
"""

import uuid
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models

from apps.core.models import BaseModel


class UserManager(BaseUserManager):
    """Custom manager for User model with email as unique identifier."""
    
    def create_user(self, email, password=None, **extra_fields):
        """Create and return a regular user with the given email and password."""
        if not email:
            raise ValueError('The Email field must be set')
        
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """Create and return a superuser with the given email and password."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', User.Role.ADMIN)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """
    Custom User model with email as the unique identifier.
    Includes role-based access control for all system actors.
    """
    
    class Role(models.TextChoices):
        STUDENT = 'STUDENT', 'Student'
        PROFESSOR = 'PROFESSOR', 'Professor'
        CASHIER = 'CASHIER', 'Cashier'
        REGISTRAR = 'REGISTRAR', 'Registrar'
        HEAD_REGISTRAR = 'HEAD_REGISTRAR', 'Head Registrar'
        ADMISSION_STAFF = 'ADMISSION_STAFF', 'Admission Staff'
        ADMIN = 'ADMIN', 'Admin'
    
    # Override id with UUID
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    # Use email as the primary identifier
    email = models.EmailField(
        'email address',
        unique=True,
        error_messages={
            'unique': 'A user with this email already exists.',
        }
    )
    
    # Role field for access control
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.STUDENT,
        help_text='User role for access control'
    )
    
    # Student-specific field (null for non-students)
    student_number = models.CharField(
        max_length=20,
        unique=True,
        null=True,
        blank=True,
        help_text='Unique student number (format: YYYY-XXXXX)'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Use email instead of username for authentication
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']
    
    objects = UserManager()
    
    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"
    
    def get_full_name(self):
        """Return the full name of the user."""
        full_name = f"{self.first_name} {self.last_name}".strip()
        return full_name or self.email
    
    @property
    def is_student(self):
        return self.role == self.Role.STUDENT
    
    @property
    def is_professor(self):
        return self.role == self.Role.PROFESSOR
    
    @property
    def is_registrar(self):
        return self.role in [self.Role.REGISTRAR, self.Role.HEAD_REGISTRAR]
    
    @property
    def is_head_registrar(self):
        return self.role == self.Role.HEAD_REGISTRAR
    
    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN or self.is_superuser


class StudentProfile(BaseModel):
    """
    Extended profile for students.
    Contains personal information and academic status.
    """
    
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        LOA = 'LOA', 'Leave of Absence'
        WITHDRAWN = 'WITHDRAWN', 'Withdrawn'
        GRADUATED = 'GRADUATED', 'Graduated'
    
    # Link to User
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='student_profile',
        limit_choices_to={'role': User.Role.STUDENT}
    )
    
    # Academic information
    program = models.ForeignKey(
        'academics.Program',
        on_delete=models.PROTECT,
        related_name='students',
        help_text='The program the student is enrolled in'
    )
    year_level = models.PositiveIntegerField(
        default=1,
        help_text='Current year level (1-5)'
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE
    )
    
    # Personal information
    middle_name = models.CharField(max_length=100, blank=True)
    suffix = models.CharField(
        max_length=20,
        blank=True,
        help_text='e.g., Jr., Sr., III'
    )
    birthdate = models.DateField()
    address = models.TextField()
    contact_number = models.CharField(max_length=20)
    
    # Transferee information
    is_transferee = models.BooleanField(
        default=False,
        help_text='Whether the student is a transferee'
    )
    previous_school = models.CharField(
        max_length=255,
        blank=True,
        help_text='Name of previous school (for transferees)'
    )
    previous_course = models.CharField(
        max_length=255,
        blank=True,
        help_text='Previous course taken (for transferees)'
    )
    
    # Academic standing (EPIC 5) - manually set by registrar
    academic_standing = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text='Academic standing (e.g., Good Standing, Dean\'s List, Probation)'
    )
    
    class Meta:
        verbose_name = 'Student Profile'
        verbose_name_plural = 'Student Profiles'

    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.user.student_number}"
    
    @property
    def full_name(self):
        """Returns full name including middle name and suffix."""
        parts = [self.user.first_name]
        if self.middle_name:
            parts.append(self.middle_name)
        parts.append(self.user.last_name)
        if self.suffix:
            parts.append(self.suffix)
        return ' '.join(parts)
    
    @property
    def is_active(self):
        return self.status == self.Status.ACTIVE
    
    @property
    def is_on_loa(self):
        return self.status == self.Status.LOA
