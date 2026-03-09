from django.db import models

class Section(models.Model):
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
        return f"{self.name} ({self.session})"

class SectionStudent(models.Model):
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='student_assignments')
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='section_assignments')
    is_home_section = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('section', 'student')

    def __str__(self):
        return f"{self.student.idn} - {self.section.name}"
