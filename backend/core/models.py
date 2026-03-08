from django.db import models

class SystemSequence(models.Model):
    """
    Stores sequential counters for generating unique IDs across the system.
    This helps prevent race conditions during concurrent approval processes.
    """
    key = models.CharField(max_length=50, unique=True, help_text="e.g., 'idn_2027'")
    last_value = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.key}: {self.last_value}"

    class Meta:
        verbose_name = "System Sequence"
        verbose_name_plural = "System Sequences"
