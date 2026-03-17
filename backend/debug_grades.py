import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.grades.models import Grade
from apps.terms.models import Term

term = Term.objects.filter(is_active=True).first()
if term:
    print(f"Active Term: {term.code} (ID: {term.id})")
    grades = Grade.objects.filter(term=term)
    print(f"Total grades for term: {grades.count()}")
    print(f"Finalized: {grades.filter(finalized_at__isnull=False).count()}")
    print(f"Pending (finalized_at is null): {grades.filter(finalized_at__isnull=True).count()}")
    
    statuses = grades.filter(finalized_at__isnull=True).values_list('grade_status', flat=True).distinct()
    print(f"Statuses of unfinalized grades: {list(statuses)}")
    
    for status in statuses:
        count = grades.filter(finalized_at__isnull=True, grade_status=status).count()
        print(f"  - {status}: {count}")
else:
    print("No active term found")
