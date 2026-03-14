import os
import sys
import django

sys.path.append(r"c:\Users\Administrator\Desktop\richwell-potal\backend")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from apps.scheduling.models import Schedule
from apps.sections.models import Section
from apps.curriculum.models import Subject

scheds = Schedule.objects.filter(subject__code='CC113B', section__name='BS_Information_Systems 1-1 (2026-1)')
count, _ = scheds.delete()
print(f"Deleted {count} schedules")
