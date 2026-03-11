from django.db import models
from django.core.exceptions import ValidationError

class Term(models.Model):
    SEMESTER_CHOICES = [
        ('1', 'First Semester'),
        ('2', 'Second Semester'),
        ('S', 'Summer'),
    ]

    code = models.CharField(max_length=10, unique=True, help_text="e.g., 2027-1, 2027-2, 2027-S")
    academic_year = models.CharField(max_length=20, help_text="e.g., 2027-2028")
    semester_type = models.CharField(max_length=2, choices=SEMESTER_CHOICES)
    
    start_date = models.DateField()
    end_date = models.DateField()
    
    enrollment_start = models.DateField()
    enrollment_end = models.DateField()
    
    advising_start = models.DateField()
    advising_end = models.DateField()
    
    schedule_picking_start = models.DateField(null=True, blank=True)
    schedule_picking_end = models.DateField(null=True, blank=True)
    schedule_published = models.BooleanField(default=False, help_text="Dean publishes schedule to open student picking")
    
    midterm_grade_start = models.DateField(null=True, blank=True)
    midterm_grade_end = models.DateField(null=True, blank=True)
    
    final_grade_start = models.DateField(null=True, blank=True)
    final_grade_end = models.DateField(null=True, blank=True)
    
    is_active = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-academic_year', '-semester_type']

    def __str__(self):
        return f"{self.academic_year} - {self.get_semester_type_display()} ({self.code})"

    def save(self, *args, **kwargs):
        if self.is_active:
            # Deactivate all other terms if this one is active
            Term.objects.filter(is_active=True).exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)

    def clean(self):
        # Basic date validation
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValidationError("Start date cannot be after end date.")
        
        if self.enrollment_start and self.enrollment_end and self.enrollment_start > self.enrollment_end:
            raise ValidationError("Enrollment start cannot be after enrollment end.")
        
        # Ensure enrollment is within term range or starts before
        if self.enrollment_start and self.start_date and self.enrollment_start > self.start_date:
             # Enrollment usually starts before or on the term start
             pass
