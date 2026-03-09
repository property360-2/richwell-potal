from django.db import models

# Create your models here.

class Schedule(models.Model):
    term = models.ForeignKey('terms.Term', on_delete=models.CASCADE, related_name='schedules')
    section = models.ForeignKey('sections.Section', on_delete=models.CASCADE, related_name='schedules')
    subject = models.ForeignKey('academics.Subject', on_delete=models.CASCADE, related_name='schedules')
    professor = models.ForeignKey('faculty.Professor', on_delete=models.CASCADE, related_name='schedules')
    room = models.ForeignKey('facilities.Room', on_delete=models.SET_NULL, null=True, related_name='schedules')
    
    days = models.JSONField()  # e.g., ["M", "W", "F"]
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('term', 'section', 'subject')

    def __str__(self):
        return f"{self.section.name} - {self.subject.code} ({self.professor.user.last_name})"
