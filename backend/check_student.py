
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.students.models import Student, StudentEnrollment
from apps.academics.models import Subject
from apps.grades.models import Grade

def audit_curriculum(idn):
    try:
        s = Student.objects.get(idn=idn)
        print(f"Student IDN: {s.idn}")
        print(f"Curriculum: {s.curriculum}")
        
        # Get all subjects in curriculum
        subjects = Subject.objects.filter(curriculum=s.curriculum)
        print(f"Total Subjects in Curriculum: {subjects.count()}")
        
        # Get all grades
        passed_grades = Grade.objects.filter(student=s, grade_status='PASSED')
        passed_subject_ids = set(passed_grades.values_list('subject_id', flat=True))
        print(f"Passed Subjects: {len(passed_subject_ids)}")
        
        # Get current term enrollment grades (grades this term)
        e = s.enrollments.all().first()
        current_grades = Grade.objects.filter(student=s, term=e.term, is_credited=False)
        current_subject_ids = set(current_grades.values_list('subject_id', flat=True))
        print(f"Current Term Subjects: {len(current_subject_ids)}")
        
        # What's available to select?
        available = subjects.exclude(id__in=passed_subject_ids).exclude(id__in=current_subject_ids)
        print(f"Available to pick: {available.count()}")
        for sub in available[:5]:
             print(f" - {sub.code}: {sub.description}")
             
        # If available is 0, we might want to "remove" one current grade to make it available
        if available.count() == 0 and current_grades.exists():
            grade_to_remove = current_grades.first()
            subject_to_free = grade_to_remove.subject
            print(f"Freeing up {subject_to_free.code} by deleting current grade for testing.")
            grade_to_remove.delete()
            print(f"Deleted Grade for {subject_to_free.code}")

    except Exception as ex:
        print(f"Error: {ex}")

if __name__ == "__main__":
    audit_curriculum('270131')
