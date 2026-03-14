from apps.scheduling.models import Schedule
scheds = Schedule.objects.filter(subject__code='CC113B', section__name='BS_Information_Systems 1-1 (2026-1)')
count, _ = scheds.delete()
print(f"DEL_RES: Deleted {count} schedules")
