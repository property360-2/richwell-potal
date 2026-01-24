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
    syllabus = models.FileField(
        upload_to='syllabi/%Y/%m/',
        null=True,
        blank=True,
        help_text='Syllabus file for this subject'
    )
    
    # Prerequisites - subjects that must be passed before taking this subject
    prerequisites = models.ManyToManyField(
        'self',
        symmetrical=False,
        blank=True,
        related_name='required_for',
        help_text='Subjects that must be completed before taking this subject'
    )

    # Multi-program support - allows subject to belong to multiple programs
    programs = models.ManyToManyField(
        Program,
        related_name='multi_program_subjects',
        blank=True,
        help_text='All programs this subject belongs to (includes primary program)'
    )

    class Meta:
        verbose_name = 'Subject'
        verbose_name_plural = 'Subjects'
        constraints = [
            models.UniqueConstraint(
                fields=['code'],
                name='unique_subject_code',
                violation_error_message='Subject code must be globally unique'
            )
        ]
        ordering = ['year_level', 'semester_number', 'code']
    
    def __str__(self):
        return f"{self.code} - {self.title}"

    def save(self, *args, **kwargs):
        """Override save to ensure primary program is always in programs list"""
        super().save(*args, **kwargs)
        # Ensure primary program is always in programs list
        if self.program and not self.programs.filter(id=self.program.id).exists():
            self.programs.add(self.program)

    def get_all_programs(self):
        """Return queryset of all programs (primary + additional)"""
        return self.programs.all()

    def validate_prerequisites_for_programs(self):
        """
        Validate that all prerequisites exist in ALL of this subject's programs.
        User decision: Prerequisites must exist in ALL subject's programs.

        Returns: (is_valid, error_messages)
        """
        errors = []
        subject_programs = set(self.programs.values_list('id', flat=True))

        for prereq in self.prerequisites.all():
            prereq_programs = set(prereq.programs.values_list('id', flat=True))
            missing_programs = subject_programs - prereq_programs

            if missing_programs:
                missing_codes = Program.objects.filter(id__in=missing_programs).values_list('code', flat=True)
                errors.append(
                    f"Prerequisite {prereq.code} is not available in programs: {', '.join(missing_codes)}"
                )

        return len(errors) == 0, errors

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


class SectionSubjectProfessor(BaseModel):
    """
    Junction table for many-to-many relationship between SectionSubject and Professors.
    Allows multiple professors to teach the same subject in a section.
    """
    section_subject = models.ForeignKey(
        SectionSubject,
        on_delete=models.CASCADE,
        related_name='professor_assignments'
    )
    professor = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='section_subject_assignments',
        limit_choices_to={'role': 'PROFESSOR'}
    )
    is_primary = models.BooleanField(
        default=False,
        help_text='Primary/lead professor for this section-subject'
    )

    class Meta:
        verbose_name = 'Section Subject Professor'
        verbose_name_plural = 'Section Subject Professors'
        unique_together = ['section_subject', 'professor']
        ordering = ['-is_primary', 'professor__last_name']

    def __str__(self):
        return f"{self.section_subject} - {self.professor.get_full_name()}"


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
        SUN = 'SUN', 'Sunday'
    
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


class CurriculumVersion(BaseModel):
    """
    Tracks curriculum versions per program per semester.
    Allows rollback and audit of curriculum changes.
    """
    
    program = models.ForeignKey(
        Program,
        on_delete=models.CASCADE,
        related_name='curriculum_versions'
    )
    semester = models.ForeignKey(
        'enrollment.Semester',
        on_delete=models.PROTECT,
        related_name='curriculum_versions'
    )
    version_number = models.PositiveIntegerField(
        default=1,
        help_text='Version number for this semester'
    )
    subjects_snapshot = models.JSONField(
        help_text='JSON snapshot of subjects and prerequisites at the time of version creation'
    )
    is_active = models.BooleanField(
        default=True,
        help_text='Whether this is the active curriculum version for the semester'
    )
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='curriculum_versions_created'
    )
    notes = models.TextField(
        blank=True,
        help_text='Notes about this curriculum version'
    )
    
    class Meta:
        verbose_name = 'Curriculum Version'
        verbose_name_plural = 'Curriculum Versions'
        unique_together = ['program', 'semester', 'version_number']
        ordering = ['-semester', '-version_number']
    
    def __str__(self):
        return f"{self.program.code} - {self.semester} v{self.version_number}"
    
    def save(self, *args, **kwargs):
        # Ensure only one active version per program/semester
        if self.is_active:
            CurriculumVersion.objects.filter(
                program=self.program,
                semester=self.semester,
                is_active=True
            ).exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)
    
    @classmethod
    def create_snapshot(cls, program, semester, user=None, notes=''):
        """
        Create a snapshot of the current curriculum.
        """
        # Get all subjects for this program
        subjects = program.subjects.filter(is_deleted=False)
        
        snapshot = []
        for subject in subjects:
            snapshot.append({
                'id': str(subject.id),
                'code': subject.code,
                'title': subject.title,
                'units': subject.units,
                'is_major': subject.is_major,
                'year_level': subject.year_level,
                'semester_number': subject.semester_number,
                'prerequisites': list(subject.prerequisites.values_list('code', flat=True))
            })
        
        # Get next version number
        last_version = cls.objects.filter(
            program=program,
            semester=semester
        ).order_by('-version_number').first()
        
        next_version = (last_version.version_number + 1) if last_version else 1
        
        return cls.objects.create(
            program=program,
            semester=semester,
            version_number=next_version,
            subjects_snapshot=snapshot,
            created_by=user,
            notes=notes,
            is_active=True
        )


class Curriculum(BaseModel):
    """
    A curriculum is a specific version/revision of a Program.
    Example: BSIS-REV3, BSIT-2023, BSCS-K12

    Each student is assigned to exactly ONE curriculum and never auto-switches.
    This allows the school to maintain multiple curriculum versions over time
    while keeping students on their assigned curriculum.
    """

    program = models.ForeignKey(
        Program,
        on_delete=models.PROTECT,
        related_name='curricula',
        help_text='The program this curriculum belongs to'
    )
    code = models.CharField(
        max_length=50,
        help_text='Curriculum code (e.g., REV3, 2023, K12)'
    )
    name = models.CharField(
        max_length=200,
        help_text='Curriculum name (e.g., BSIS Revision 3, BSIT Curriculum 2023)'
    )
    description = models.TextField(
        blank=True,
        help_text='Description of this curriculum version'
    )
    effective_year = models.PositiveIntegerField(
        help_text='Year this curriculum became effective'
    )
    is_active = models.BooleanField(
        default=True,
        help_text='Whether new students can be assigned to this curriculum'
    )

    class Meta:
        verbose_name = 'Curriculum'
        verbose_name_plural = 'Curricula'
        unique_together = [['program', 'code']]
        ordering = ['-effective_year', 'code']

    def __str__(self):
        return f"{self.program.code} - {self.name}"

    @property
    def total_subjects(self):
        """Returns total number of subjects in this curriculum."""
        return self.curriculum_subjects.filter(is_deleted=False).count()

    @property
    def total_units(self):
        """Returns total units across all subjects in this curriculum."""
        from django.db.models import Sum
        return self.curriculum_subjects.filter(
            is_deleted=False
        ).aggregate(
            total=Sum('subject__units')
        )['total'] or 0

    def get_subjects_for_year_semester(self, year_level, semester_number):
        """Get all subjects for a specific year and semester."""
        return self.curriculum_subjects.filter(
            year_level=year_level,
            semester_number=semester_number,
            is_deleted=False
        ).select_related('subject')


class CurriculumSubject(BaseModel):
    """
    Assigns a Subject to a specific year/semester within a Curriculum.
    This is the ONLY table that defines "what subjects are in which year/semester".

    The same subject can appear in different year/semester slots across different curricula,
    allowing flexibility in curriculum design over time.
    """

    curriculum = models.ForeignKey(
        Curriculum,
        on_delete=models.CASCADE,
        related_name='curriculum_subjects',
        help_text='The curriculum this assignment belongs to'
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.PROTECT,
        related_name='curriculum_assignments',
        help_text='The subject being assigned'
    )
    year_level = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text='Year level for this subject (1-5)'
    )
    semester_number = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(3)],
        help_text='Semester number (1 = First, 2 = Second, 3 = Summer)'
    )
    semester = models.ForeignKey(
        'enrollment.Semester',
        on_delete=models.SET_NULL,
        related_name='curriculum_assignments',
        null=True,
        blank=True,
        help_text='Optional: Bind this subject to a specific semester instance for date-based enrollment'
    )
    is_required = models.BooleanField(
        default=True,
        help_text='Whether this is a required subject (vs elective)'
    )

    class Meta:
        verbose_name = 'Curriculum Subject'
        verbose_name_plural = 'Curriculum Subjects'
        unique_together = [['curriculum', 'subject']]
        ordering = ['year_level', 'semester_number', 'subject__code']

    def __str__(self):
        return f"{self.curriculum.code} - {self.subject.code} (Y{self.year_level}S{self.semester_number})"

