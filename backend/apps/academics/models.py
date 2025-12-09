"""
Academic models - Programs and Subjects with prerequisites.
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

from apps.core.models import BaseModel


class Program(BaseModel):
    """
    Academic program (e.g., BSIT, BSCS, BSBA).
    Students enroll in one program at a time.
    """
    
    code = models.CharField(
        max_length=20,
        unique=True,
        help_text='Short code (e.g., BSIT, BSCS)'
    )
    name = models.CharField(
        max_length=255,
        help_text='Full program name (e.g., Bachelor of Science in Information Technology)'
    )
    description = models.TextField(
        blank=True,
        help_text='Program description and overview'
    )
    duration_years = models.PositiveIntegerField(
        default=4,
        validators=[MinValueValidator(1), MaxValueValidator(6)],
        help_text='Normal duration of the program in years'
    )
    is_active = models.BooleanField(
        default=True,
        help_text='Whether the program is currently offered'
    )
    
    class Meta:
        verbose_name = 'Program'
        verbose_name_plural = 'Programs'
        ordering = ['code']
    
    def __str__(self):
        return f"{self.code} - {self.name}"
    
    @property
    def total_subjects(self):
        return self.subjects.count()
    
    @property
    def total_units(self):
        return self.subjects.aggregate(
            total=models.Sum('units')
        )['total'] or 0


class Subject(BaseModel):
    """
    Academic subject/course within a program.
    Includes prerequisite relationships.
    """
    
    program = models.ForeignKey(
        Program,
        on_delete=models.CASCADE,
        related_name='subjects',
        help_text='The program this subject belongs to'
    )
    code = models.CharField(
        max_length=20,
        help_text='Subject code (e.g., CS101, MATH1)'
    )
    title = models.CharField(
        max_length=255,
        help_text='Subject title'
    )
    description = models.TextField(
        blank=True,
        help_text='Subject description'
    )
    units = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(6)],
        help_text='Number of units (typically 1-6)'
    )
    is_major = models.BooleanField(
        default=False,
        help_text='Whether this is a major subject (affects INC expiry: 6 months for major, 1 year for minor)'
    )
    year_level = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text='Recommended year level for this subject'
    )
    semester_number = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(3)],
        help_text='Recommended semester (1 = First, 2 = Second, 3 = Summer)'
    )
    allow_multiple_sections = models.BooleanField(
        default=False,
        help_text='Whether a student can enroll in multiple sections (for irregular students)'
    )
    
    # Prerequisites - subjects that must be passed before taking this subject
    prerequisites = models.ManyToManyField(
        'self',
        symmetrical=False,
        blank=True,
        related_name='required_for',
        help_text='Subjects that must be completed before taking this subject'
    )
    
    class Meta:
        verbose_name = 'Subject'
        verbose_name_plural = 'Subjects'
        unique_together = ['program', 'code']
        ordering = ['year_level', 'semester_number', 'code']
    
    def __str__(self):
        return f"{self.code} - {self.title}"
    
    @property
    def prerequisite_list(self):
        """Returns list of prerequisite subject codes."""
        return list(self.prerequisites.values_list('code', flat=True))
    
    def has_prerequisites(self):
        """Check if this subject has any prerequisites."""
        return self.prerequisites.exists()
    
    def get_inc_expiry_months(self):
        """
        Returns the INC expiry period in months.
        Major subjects: 6 months
        Minor subjects: 12 months
        """
        return 6 if self.is_major else 12


class Section(BaseModel):
    """
    A section groups students for a semester (e.g., BSIT-1A).
    Contains multiple SectionSubject entries linking subjects to professors.
    """
    
    name = models.CharField(
        max_length=50,
        help_text='Section name (e.g., BSIT-1A, BSCS-2B)'
    )
    program = models.ForeignKey(
        Program,
        on_delete=models.CASCADE,
        related_name='sections'
    )
    semester = models.ForeignKey(
        'enrollment.Semester',
        on_delete=models.PROTECT,
        related_name='sections'
    )
    year_level = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text='Year level of this section'
    )
    capacity = models.PositiveIntegerField(
        default=40,
        help_text='Maximum number of students in this section'
    )
    
    class Meta:
        verbose_name = 'Section'
        verbose_name_plural = 'Sections'
        unique_together = ['name', 'semester']
        ordering = ['program', 'year_level', 'name']
    
    def __str__(self):
        return f"{self.name} - {self.semester}"
    
    @property
    def enrolled_count(self):
        """Number of students enrolled in this section."""
        from apps.enrollment.models import SubjectEnrollment
        return SubjectEnrollment.objects.filter(
            section=self,
            status='ENROLLED'
        ).values('enrollment__student').distinct().count()
    
    @property
    def available_slots(self):
        """Number of available slots."""
        return max(0, self.capacity - self.enrolled_count)


class SectionSubject(BaseModel):
    """
    Links a subject to a section with professor assignment.
    One professor per subject in a section.
    """
    
    section = models.ForeignKey(
        Section,
        on_delete=models.CASCADE,
        related_name='section_subjects'
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.PROTECT,
        related_name='section_subjects'
    )
    professor = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='teaching_assignments',
        limit_choices_to={'role': 'PROFESSOR'}
    )
    is_tba = models.BooleanField(
        default=True,
        help_text='Schedule is To Be Announced'
    )
    
    class Meta:
        verbose_name = 'Section Subject'
        verbose_name_plural = 'Section Subjects'
        unique_together = ['section', 'subject']
    
    def __str__(self):
        return f"{self.section.name} - {self.subject.code}"


class ScheduleSlot(BaseModel):
    """
    Schedule slot for a section subject.
    Defines day, time, and room.
    """
    
    class Day(models.TextChoices):
        MON = 'MON', 'Monday'
        TUE = 'TUE', 'Tuesday'
        WED = 'WED', 'Wednesday'
        THU = 'THU', 'Thursday'
        FRI = 'FRI', 'Friday'
        SAT = 'SAT', 'Saturday'
    
    section_subject = models.ForeignKey(
        SectionSubject,
        on_delete=models.CASCADE,
        related_name='schedule_slots'
    )
    day = models.CharField(
        max_length=3,
        choices=Day.choices
    )
    start_time = models.TimeField()
    end_time = models.TimeField()
    room = models.CharField(
        max_length=50,
        blank=True,
        help_text='Room number or name'
    )
    
    class Meta:
        verbose_name = 'Schedule Slot'
        verbose_name_plural = 'Schedule Slots'
        ordering = ['day', 'start_time']
    
    def __str__(self):
        return f"{self.section_subject} - {self.get_day_display()} {self.start_time}-{self.end_time}"
