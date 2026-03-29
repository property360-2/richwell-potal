from django.db import models
from apps.auditing.mixins import AuditMixin

class Room(AuditMixin, models.Model):
    ROOM_TYPES = [
        ('LECTURE', 'Lecture Room'),
        ('COMPUTER_LAB', 'Computer Laboratory'),
        ('SCIENCE_LAB', 'Science Laboratory'),
        ('OTHER', 'Other'),
    ]

    name = models.CharField(max_length=50, unique=True, help_text="e.g., Room 101, Lab 201")
    room_type = models.CharField(max_length=15, choices=ROOM_TYPES)
    capacity = models.PositiveIntegerField()
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.get_room_type_display()}) - Cap: {self.capacity}"
