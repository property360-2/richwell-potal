from django.db import models

class Schedule(models.Model):
    COMPONENT_CHOICES = [
        ('LEC', 'Lecture'),
        ('LAB', 'Laboratory'),
    ]
    
    term = models.ForeignKey('terms.Term', on_delete=models.CASCADE, related_name='schedules')
    section = models.ForeignKey('sections.Section', on_delete=models.CASCADE, related_name='schedules')
    subject = models.ForeignKey('academics.Subject', on_delete=models.CASCADE, related_name='schedules')
    component_type = models.CharField(max_length=3, choices=COMPONENT_CHOICES, default='LEC')
    
    professor = models.ForeignKey('faculty.Professor', on_delete=models.CASCADE, related_name='schedules', null=True, blank=True)
    room = models.ForeignKey('facilities.Room', on_delete=models.SET_NULL, null=True, blank=True, related_name='schedules')
    
    days = models.JSONField(default=list)  # e.g., ["M", "W", "F"]
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('term', 'section', 'subject', 'component_type')

    def __str__(self):
        prof_name = self.professor.user.last_name if self.professor else "TBA"
        return f"{self.section.name} - {self.subject.code} ({self.get_component_type_display()}) - {prof_name}"
