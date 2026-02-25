from django.core.management.base import BaseCommand
from apps.accounts.models import User
from apps.academics.models import Section
from apps.enrollment.models import Semester, Enrollment

class Command(BaseCommand):
    help = 'Debug teststudent@gmail.com'

    def handle(self, *args, **options):
        u = User.objects.filter(email='teststudent@gmail.com').first()
        if not u:
            self.stdout.write("User teststudent@gmail.com not found.")
            return

        self.stdout.write(f"User: {u.email}")
        prof = getattr(u, 'student_profile', None)
        if not prof:
            self.stdout.write("No student_profile found!")
            return

        self.stdout.write(f"Program: {prof.program.code if prof.program else 'None'} | Year Level: {prof.year_level}")
        self.stdout.write(f"Home Section: {prof.home_section.name if prof.home_section else 'None'}")
        
        current_sem = Semester.objects.filter(is_current=True).first()
        if not current_sem:
            self.stdout.write("No active semester!")
            return
            
        self.stdout.write(f"Active Semester: {current_sem.name} ({current_sem.academic_year})")
        
        enrollment = Enrollment.objects.filter(student=u).first()
        if not enrollment:
            self.stdout.write("No Enrollment found!")
        else:
            self.stdout.write(f"Enrollment Semester: {enrollment.semester.name if enrollment.semester else 'None'} | Status: {enrollment.status}")
            
            if prof.program:
                sections = Section.objects.filter(
                    program=prof.program,
                    year_level=prof.year_level,
                    semester=enrollment.semester,
                    is_dissolved=False
                )
                self.stdout.write(f"Available sections for this program/year/semester: {sections.count()}")
                for s in sections:
                    self.stdout.write(f" - {s.name} (Capacity: {s.enrolled_count}/{s.capacity})")
