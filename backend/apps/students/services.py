from .models import StudentEnrollment
from django.db import models

class AdvisingService:
    @staticmethod
    def get_year_level(student, term):
        """
        Computes the target year level of a student for a specific term.
        Criteria:
        1. If freshman, year_level = 1.
        2. If returning student, looks at previously completed subjects 
           against the curriculum requirements.
        
        This is a simplified version. A precise one would check total units earned.
        """
        # For simplicity, returning the current logic 
        # but extensible for complex unit-based rules later.
        
        # Check if they have existing enrollments
        previous_enrollments = StudentEnrollment.objects.filter(
            student=student, 
            term__start_date__lt=term.start_date
        ).order_by('-term__start_date')
        
        if not previous_enrollments.exists():
            return 1 # Baseline for new students
            
        last_enrollment = previous_enrollments.first()
        # If they finished a 2nd sem, increment year for next term if it's a 1st sem.
        # This logic is instituion-specific.
        
        if last_enrollment.year_level:
            # Basic logic: increment if the term is a new year 
            # (e.g., transitioning from 2nd sem/summer to 1st sem)
            if term.semester == '1' and last_enrollment.term.semester in ['2', 'S']:
                return min(last_enrollment.year_level + 1, 4) # Max 4th year
            return last_enrollment.year_level
            
        return 1
