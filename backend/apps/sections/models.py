"""
Richwell Portal — Sections Models

This module defines the organizational structure for student groupings (sections) 
within academic terms and programs.
"""

from django.db import models
from apps.auditing.mixins import AuditMixin

class Section(AuditMixin, models.Model):
    """
    Represents a specific group of students within a term and program.
    Tracks session timing (AM/PM) and capacity limits.
    """
    name = models.CharField(max_length=50)
    term = models.ForeignKey('terms.Term', on_delete=models.CASCADE, related_name='sections')
    program = models.ForeignKey('academics.Program', on_delete=models.CASCADE, related_name='sections')
    year_level = models.PositiveSmallIntegerField()
    section_number = models.PositiveIntegerField(default=1)
    session = models.CharField(max_length=2, choices=[('AM', 'AM'), ('PM', 'PM')])
    
    target_students = models.PositiveSmallIntegerField(default=35)
    max_students = models.PositiveSmallIntegerField(default=40)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('term', 'program', 'year_level', 'section_number')

    def __str__(self):
        """
        Returns a human readable section name.
        """
        return f"{self.name} ({self.session})"

class SectionStudent(AuditMixin, models.Model):
    """
    Relational model linking students to their assigned sections.
    Differentiates between home sections and elective/subject-based assignments.

    The `term` field is denormalized from `section.term` for efficient, join-free
    per-term queries. This ensures clean cross-term isolation — a student can only
    have one home-section assignment per term, enforced directly at the DB level.
    """
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='student_assignments')
    # NOTE: Denormalized from section.term — always set this when creating a SectionStudent
    term = models.ForeignKey(
        'terms.Term',
        on_delete=models.CASCADE,
        related_name='section_student_assignments',
        null=True,   # nullable for backwards compatibility with existing rows
        blank=True
    )
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='section_assignments')
    is_home_section = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # One home-section per student per term — no ambiguity across terms
        unique_together = ('student', 'term')

    def __str__(self):
        """
        Returns a summary of the student-section assignment.
        """
        return f"{self.student.idn} - {self.section.name}"
