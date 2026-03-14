from apps.scheduling.models import Schedule
for s in Schedule.objects.all()[:100]:
    print("SCHED:", s.id, getattr(s.subject, 'code', ''), getattr(s.section, 'name', ''))
