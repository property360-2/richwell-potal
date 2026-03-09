from django.db import models

class Section(models.Model):
    name = models.CharField(max_length=50, unique=True)
    term = models.ForeignKey('terms.Term', on_delete=models.CASCADE, related_name='sections')
    program = models.ForeignKey('academics.Program', on_delete=models.CASCADE, related_name='sections')
    year_level = models.PositiveSmallIntegerField()
    session = models.CharField(max_length=2, choices=[('AM', 'AM'), ('PM', 'PM')])
    
    max_students = models.PositiveSmallIntegerField(default=40)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
