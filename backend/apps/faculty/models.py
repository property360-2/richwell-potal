from django.db import models
from django.conf import settings
from apps.auditing.mixins import AuditMixin

class Professor(AuditMixin, models.Model):
    EMPLOYMENT_STATUS_CHOICES = [
        ('FULL_TIME', 'Full-time'),
        ('PART_TIME', 'Part-time'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='professor_profile'
    )
    employee_id = models.CharField(
        max_length=50, 
        unique=True, 
        help_text="Format: EMP-{YY}{seq} or custom"
    )
    department = models.CharField(max_length=100)
    employment_status = models.CharField(
        max_length=20, 
        choices=EMPLOYMENT_STATUS_CHOICES, 
        default='FULL_TIME'
    )
    date_of_birth = models.DateField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Professor"
        verbose_name_plural = "Professors"

    def __str__(self):
        return f"{self.user.first_name} {self.user.last_name} ({self.employee_id})"

class ProfessorSubject(AuditMixin, models.Model):
    professor = models.ForeignKey(
        'faculty.Professor', 
        on_delete=models.CASCADE, 
        related_name='assigned_subjects'
    )
    subject = models.ForeignKey(
        'academics.Subject', 
        on_delete=models.CASCADE, 
        related_name='professors'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('professor', 'subject')
        verbose_name = "Professor Subject"
        verbose_name_plural = "Professor Subjects"

    def __str__(self):
        return f"{self.professor.employee_id} - {self.subject.code}"

class ProfessorAvailability(AuditMixin, models.Model):
    DAY_CHOICES = [
        ('M', 'Monday'),
        ('T', 'Tuesday'),
        ('W', 'Wednesday'),
        ('TH', 'Thursday'),
        ('F', 'Friday'),
        ('S', 'Saturday'),
    ]
    SESSION_CHOICES = [
        ('AM', 'Morning'),
        ('PM', 'Afternoon'),
    ]
    
    professor = models.ForeignKey(
        'faculty.Professor', 
        on_delete=models.CASCADE, 
        related_name='availability'
    )
    day = models.CharField(max_length=2, choices=DAY_CHOICES)
    session = models.CharField(max_length=2, choices=SESSION_CHOICES)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('professor', 'day', 'session')
        verbose_name = "Professor Availability"
        verbose_name_plural = "Professor Availabilities"

    def __str__(self):
        return f"{self.professor.employee_id}: {self.get_day_display()} - {self.session}"
