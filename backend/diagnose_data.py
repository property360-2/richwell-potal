import os
import django
import sys

# Assume script is run from backend/
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.grades.models import Grade
from apps.accounts.models import User
from apps.scheduling.models import Schedule
from django.db.models import Exists, OuterRef, Q

def check():
    u = User.objects.get(username='prof1')
    print(f"Prof: {u.username}")
    
    # All INC grades
    inc_all = Grade.objects.filter(grade_status='INC')
    print(f"Total INCs in system: {inc_all.count()}")
    
    # Check if prof1 is assigned to ANY of their sections/subjects
    for g in inc_all:
        is_assigned = Schedule.objects.filter(
            term=g.term,
            section=g.section,
            subject=g.subject,
            professor__user=u
        ).exists()
        print(f"  - Student {g.student.idn}, Subj {g.subject.code}, Term {g.term.code}, Section {g.section.name if g.section else 'None'}: Assigned to Prof1? {is_assigned}")
        
    # Test the viewset query logic
    sq = Schedule.objects.filter(
        term=OuterRef('term'),
        section=OuterRef('section'),
        subject=OuterRef('subject'),
        professor__user=u
    )
    qs = Grade.objects.filter(Exists(sq))
    print(f"Visible to prof1 (all): {qs.count()}")
    print(f"Visible to prof1 (INC): {qs.filter(grade_status='INC').count()}")

if __name__ == '__main__':
    check()
