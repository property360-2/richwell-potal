from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
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

    # Added to fix related_name clashes if needed, though they don't typically clash 
    # unless you have another user model in the project. The default related names 
    # work fine for AbstractUser if this is AUTH_USER_MODEL.

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
