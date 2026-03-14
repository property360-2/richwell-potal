from apps.scheduling.models import Schedule
scheds = Schedule.objects.filter(professor__employee_id='EMP001')
for s in scheds:
    print(s.id, s.subject.code, s.section.name, s.days, s.start_time, s.end_time)
