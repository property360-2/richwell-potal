"""
Richwell Portal — Academics Models

This module defines the core academic data structures including Programs, 
Curriculum Versions, Subjects, and their Prerequisite relationships.
"""

from django.db import models
from django.conf import settings
from core.mixins import TimestampMixin
from apps.auditing.mixins import AuditMixin

class Program(AuditMixin, TimestampMixin):
    """
    Represents an Academic Program (e.g., BS Information Systems).
    Tracks the program head, versioning, and whether it includes summer terms.
    """
    DEPARTMENT_CHOICES = [
        ('SHS', 'Senior High School'),
        ('CHED', 'College (CHED)'),
        ('TECHVOC', 'Technical Vocational (Diploma)'),
    ]

    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    department = models.CharField(
        max_length=10, 
        choices=DEPARTMENT_CHOICES, 
        default='CHED',
        help_text="Academic level for reporting and monitoring."
    )
    effective_year = models.CharField(max_length=50, null=True, blank=True)
    has_summer = models.BooleanField(default=False)
    program_head = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='headed_programs'
    )
    is_active = models.BooleanField(default=True)

    def __str__(self):
        """
        Returns a human readable program identifier.
        Format: CODE - Full Name
        """
        return f"{self.code} - {self.name}"


class CurriculumVersion(AuditMixin, models.Model):
    """
    Groups subjects into a specific version for a program. 
    Only one version should typically be active at a time for a program.
    """
    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name='curriculum_versions')
    version_name = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('program', 'version_name')

    def __str__(self):
        """
        Returns a human readable curriculum version identifier.
        Format: PROGRAM_CODE - Version Name
        """
        return f"{self.program.code} - {self.version_name}"


class Subject(AuditMixin, models.Model):
    """
    Represents a specific subject/course within a curriculum version.
    Tracks units, hours, and whether it's a major/practicum.
    """
    SEMESTER_CHOICES = [
        ('1', 'First Semester'),
        ('2', 'Second Semester'),
        ('S', 'Summer'),
    ]

    curriculum = models.ForeignKey(CurriculumVersion, on_delete=models.CASCADE, related_name='subjects')
    code = models.CharField(max_length=30)
    description = models.CharField(max_length=300)
    year_level = models.PositiveIntegerField()
    semester = models.CharField(max_length=2, choices=SEMESTER_CHOICES)  # '1', '2', 'S'
    lec_units = models.PositiveIntegerField(default=0)
    lab_units = models.PositiveIntegerField(default=0)
    total_units = models.PositiveIntegerField()
    hrs_per_week = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    is_major = models.BooleanField(default=False)
    is_practicum = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('curriculum', 'code')
        indexes = [
            models.Index(fields=['curriculum', 'year_level', 'semester']),
        ]

    def __str__(self):
        """
        Returns a human readable subject identifier.
        Format: SUBJECT_CODE (PROGRAM_CODE)
        """
        return f"{self.code} ({self.curriculum.program.code})"


class SubjectPrerequisite(AuditMixin, models.Model):
    """
    Defines requirements for taking a specific subject. 
    Can be another specific subject, a year standing, or percentage of units.
    """
    PREREQ_TYPES = (
        ('SPECIFIC', 'Specific Subject'),
        ('YEAR_STANDING', 'Year Standing'),
        ('ALL_MAJOR', 'All Major Subjects'),
        ('PROGRAM_PERCENTAGE', 'Program Percentage'),
        ('GROUP', 'Subject Group'),
        ('PERCENTAGE', 'Units Percentage'),
    )

    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='prerequisites')
    prerequisite_type = models.CharField(max_length=20, choices=PREREQ_TYPES)
    prerequisite_subject = models.ForeignKey(
        Subject, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='is_prerequisite_for'
    )
    standing_year = models.PositiveIntegerField(null=True, blank=True)
    min_units = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    min_subjects = models.PositiveIntegerField(null=True, blank=True)
    description = models.CharField(max_length=200, null=True, blank=True)

    def __str__(self):
        """
        Returns a descriptive string explaining the prerequisite requirement.
        """
        if self.prerequisite_type == 'SPECIFIC' and self.prerequisite_subject:
            return f"{self.subject.code} requires {self.prerequisite_subject.code}"
        elif self.prerequisite_type == 'YEAR_STANDING':
            return f"{self.subject.code} requires Year {self.standing_year} Standing"
        elif self.description:
            return f"{self.subject.code} requires {self.description}"
        return f"{self.subject.code} requires {self.get_prerequisite_type_display()}"
