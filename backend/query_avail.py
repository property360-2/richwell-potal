import json
from apps.scheduling.models import ProfessorAvailability
avail = ProfessorAvailability.objects.filter(professor__employee_id='EMP001')
res = [{"day": a.day, "session": a.session} for a in avail]
print(json.dumps(res))
