from apps.scheduling.models import Schedule

scheds = Schedule.objects.filter(subject__code__icontains='CC113B')
for s in scheds:
    print(f"ID={s.id} SUBJ={s.subject.code} SEC={s.section.name}")
