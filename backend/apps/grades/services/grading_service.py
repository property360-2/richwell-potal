from django.db import transaction
from apps.grades.models import Grade

class GradingService:
    @transaction.atomic
    def drop_subject(self, student, subject, term):
        """
        Marks a student's subject as DROPPED and removes it from the assigned section.
        """
        grade = Grade.objects.filter(
            student=student, 
            subject=subject, 
            term=term
        ).first()

        if not grade:
            raise ValueError("No enrollment record found for this subject and term.")

        if grade.grade_status != Grade.STATUS_ENROLLED:
            raise ValueError(f"Cannot drop subject with status: {grade.get_grade_status_display()}")

        # 1. Update status and remove section assignment
        grade.grade_status = Grade.STATUS_DROPPED
        grade.section = None
        grade.save()

        # 2. TODO: Trigger notification to student
        # NotificationService.send_drop_notice(student, subject, term)

        return grade

    @transaction.atomic
    def bulk_drop_subjects(self, student, subjects, term):
        results = []
        for subject in subjects:
            results.append(self.drop_subject(student, subject, term))
        return results
