import os
import django
import sys

sys.path.append(r"c:\Users\Administrator\Desktop\richwell-potal\backend")
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.scheduling.models import Schedule
scheds = Schedule.objects.filter(subject__code__icontains='CC113B')
for s in scheds:
    print(f"ID={s.id} SUBJ={s.subject.code} SEC={getattr(s.section, 'name', '')}")
    if 'BS_Information_Systems' in getattr(s.section, 'name', ''):
        s.professor = None
        s.room = None
        s.start_time = None
        s.end_time = None
        s.days = []
        s.save()
        print('CLEARED!')
