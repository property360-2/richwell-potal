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
        DEPARTMENT_HEAD = 'DEPARTMENT_HEAD', 'Department Head'
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

    def has_permission(self, permission_code):
        """
        Check if user has a specific permission.
        Checks: role defaults + custom grants - custom revokes

        Args:
            permission_code: str - Permission code (e.g., 'schedule.edit')

        Returns:
            bool - True if user has permission, False otherwise
        """
        try:
            permission = Permission.objects.get(code=permission_code)

            # Check custom grant/revoke first
            custom = UserPermission.objects.filter(
                user=self,
                permission=permission
            ).first()

            if custom:
                return custom.granted

            # Fall back to role defaults
            return self.role in permission.default_for_roles
        except Permission.DoesNotExist:
            return False

    def get_permission_scope(self, permission_code):
        """
        Get the fine-grained scope for a specific permission.
        
        Args:
            permission_code: str - Permission code
            
        Returns:
            dict - The scope configuration or empty dict
        """
        custom = UserPermission.objects.filter(
            user=self,
            permission__code=permission_code
        ).first()
        
        if custom and custom.granted:
            return custom.scope or {}
        return {}

    def get_effective_permissions(self):
        """Get all effective permissions for user (role defaults + custom grants - custom revokes)"""
        # Get all permissions and filter in Python (SQLite doesn't support contains lookup on JSONField)
        all_permissions = Permission.objects.all()

        # Get custom permission overrides
        custom_overrides = {
            up.permission_id: up.granted
            for up in UserPermission.objects.filter(user=self)
        }

        # Filter permissions
        effective_perm_ids = []
        for perm in all_permissions:
            # Check if there's a custom override first
            if perm.id in custom_overrides:
                if custom_overrides[perm.id]:  # Custom grant
                    effective_perm_ids.append(perm.id)
                # Custom revoke - skip this permission
            # Otherwise check role defaults
            elif self.role in perm.default_for_roles:
                effective_perm_ids.append(perm.id)

        return Permission.objects.filter(id__in=effective_perm_ids)

    def get_permissions_by_category(self):
        """Get permissions grouped by category"""
        perms = self.get_effective_permissions()
        categories = PermissionCategory.objects.prefetch_related('permissions')

        result = {}
        for category in categories:
            result[category.code] = {
                'name': category.name,
                'permissions': [p.code for p in perms if p.category == category]
            }
        return result


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

    class AcademicStatus(models.TextChoices):
        REGULAR = 'REGULAR', 'Regular'
        PROBATION = 'PROBATION', 'Probation'
        DISMISSED = 'DISMISSED', 'Dismissed'
    
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
    curriculum = models.ForeignKey(
        'academics.Curriculum',
        on_delete=models.PROTECT,
        related_name='students',
        null=True,
        blank=True,
        help_text='The curriculum version the student is following'
    )
    year_level = models.PositiveIntegerField(
        default=1,
        help_text='Current year level (1-5)'
    )
    
    # Section Assignment
    home_section = models.ForeignKey(
        'academics.Section', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='home_students',
        help_text='Administrative home section for regular students'
    )
    
    # Status Flags
    is_irregular = models.BooleanField(
        default=False,
        help_text='Whether the student is an irregular student'
    )
    overload_approved = models.BooleanField(
        default=False,
        help_text='Whether overload is approved by registrar'
    )
    max_units_override = models.PositiveIntegerField(
        null=True, 
        blank=True,
        help_text='Override for maximum units (default is 24)'
    )
    
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
        help_text='Enrollment status (Active, LOA, etc.)'
    )
    academic_status = models.CharField(
        max_length=20,
        choices=AcademicStatus.choices,
        default=AcademicStatus.REGULAR,
        help_text='Academic standing'
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


class ProfessorProfile(BaseModel):
    """Extended profile for professors with teaching-related metadata."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='professor_profile',
        limit_choices_to={'role': User.Role.PROFESSOR}
    )

    department = models.CharField(max_length=100, blank=True)
    office_location = models.CharField(max_length=100, blank=True)
    specialization = models.CharField(max_length=200, blank=True)
    max_teaching_hours = models.PositiveIntegerField(
        default=24,
        help_text='Maximum teaching hours per week before overload'
    )
    assigned_subjects = models.ManyToManyField(
        'academics.Subject',
        related_name='qualified_professors',
        blank=True,
        help_text='Subjects this professor is qualified/assigned to teach'
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Professor Profile'
        verbose_name_plural = 'Professor Profiles'

    def __str__(self):
        return f"{self.user.get_full_name()} - Professor Profile"


class PermissionCategory(BaseModel):
    """Groups related permissions together for organization"""

    name = models.CharField(
        max_length=100,
        unique=True,
        help_text='Display name of the permission category (e.g., "Program Management")'
    )
    code = models.CharField(
        max_length=50,
        unique=True,
        help_text='Unique code for the category (e.g., "program_management")'
    )
    description = models.TextField(blank=True)
    icon = models.CharField(
        max_length=50,
        blank=True,
        help_text='Icon identifier for UI (e.g., "graduation-cap")'
    )
    order = models.IntegerField(
        default=0,
        help_text='Display order in UI'
    )

    class Meta:
        verbose_name = 'Permission Category'
        verbose_name_plural = 'Permission Categories'
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class Permission(BaseModel):
    """Individual permission definition"""

    category = models.ForeignKey(
        PermissionCategory,
        on_delete=models.CASCADE,
        related_name='permissions',
        help_text='The category this permission belongs to'
    )
    name = models.CharField(
        max_length=100,
        help_text='Display name of the permission (e.g., "Can View Programs")'
    )
    code = models.CharField(
        max_length=100,
        unique=True,
        help_text='Unique permission code (e.g., "program.view")'
    )
    description = models.TextField(blank=True)

    # Role defaults - which roles get this permission by default
    default_for_roles = models.JSONField(
        default=list,
        help_text='List of roles that have this permission by default (e.g., ["ADMIN", "REGISTRAR"])'
    )

    class Meta:
        verbose_name = 'Permission'
        verbose_name_plural = 'Permissions'
        ordering = ['category', 'name']
        unique_together = [['category', 'code']]

    def __str__(self):
        return f"{self.category.name}: {self.name}"


class UserPermission(BaseModel):
    """User-specific permission assignments (grants/revokes)"""

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='custom_permissions',
        help_text='The user this permission assignment applies to'
    )
    permission = models.ForeignKey(
        Permission,
        on_delete=models.CASCADE,
        help_text='The permission being granted or revoked'
    )
    granted = models.BooleanField(
        default=True,
        help_text='True = permission granted, False = permission revoked'
    )
    granted_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='permissions_granted',
        help_text='Admin user who granted/revoked this permission'
    )
    scope = models.JSONField(
        default=dict,
        blank=True,
        help_text='Fine-grained scope for this permission (e.g., {"permitted_roles": ["REGISTRAR"]})'
    )
    granted_at = models.DateTimeField(auto_now_add=True)
    reason = models.TextField(
        blank=True,
        help_text='Optional reason for granting/revoking this permission'
    )

    class Meta:
        verbose_name = 'User Permission'
        verbose_name_plural = 'User Permissions'
        unique_together = [['user', 'permission']]
        ordering = ['-granted_at']

    def __str__(self):
        action = 'granted' if self.granted else 'revoked'
        return f"{self.user.email}: {self.permission.code} ({action})"


class PasswordResetToken(BaseModel):
    """
    Password reset token for forgot password functionality.
    Tokens expire after 1 hour and can only be used once.
    """
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='password_reset_tokens',
        help_text='User requesting password reset'
    )
    token = models.CharField(
        max_length=100,
        unique=True,
        help_text='Unique reset token sent via email'
    )
    expires_at = models.DateTimeField(
        help_text='Token expiration time (1 hour from creation)'
    )
    used = models.BooleanField(
        default=False,
        help_text='Whether this token has been used'
    )
    used_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the token was used'
    )
    
    class Meta:
        verbose_name = 'Password Reset Token'
        verbose_name_plural = 'Password Reset Tokens'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token', 'used', 'expires_at']),
        ]
    
    def __str__(self):
        status = 'used' if self.used else 'pending'
        return f"{self.user.email} - {status} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"
    
    def is_valid(self):
        """Check if token is still valid (not used and not expired)"""
        from django.utils import timezone
        return not self.used and timezone.now() < self.expires_at
    
    def mark_as_used(self):
        """Mark token as used"""
        from django.utils import timezone
        self.used = True
        self.used_at = timezone.now()
        self.save()

