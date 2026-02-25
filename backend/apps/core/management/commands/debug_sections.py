from django.core.management.base import BaseCommand
from apps.academics.models import Section
from apps.enrollment.models import Semester
from apps.accounts.models import User

class Command(BaseCommand):
    help = 'Check section and semester status for debugging'

    def handle(self, *args, **options):
        current_sem = Semester.objects.filter(is_current=True).first()
        if not current_sem:
            self.stdout.write("No active semester found!")
            return
            
        self.stdout.write(f"\n--- ACTIVE SEMESTER ---")
        self.stdout.write(f"Name: {current_sem.name} ({current_sem.academic_year})")
        self.stdout.write(f"ID: {current_sem.id}")
        
        self.stdout.write(f"\n--- ALL SECTIONS IN DB ---")
        for s in Section.objects.all():
            sem_status = "ACTIVE" if s.semester.is_current else "INACTIVE"
            self.stdout.write(f"Section: {s.name} | Year: {s.year_level} | Program: {s.program.code}")
            self.stdout.write(f"   -> Belongs to Semester ID: {s.semester.id} ({s.semester.name}) [{sem_status}]")
            
        self.stdout.write(f"\n--- TEST USER INFO ---")
        u = User.objects.filter(email='test@gmail.com').first()
        if u and hasattr(u, 'student_profile'):
            prof = u.student_profile
            self.stdout.write(f"User: {u.get_full_name()} ({u.email})")
            self.stdout.write(f"Program: {prof.program.code}, Year: {prof.year_level}")
            
            # Show matching sections for THIS user specifically in the ACTIVE semester
            matching = Section.objects.filter(
                program=prof.program,
                year_level=prof.year_level,
                semester=current_sem,
                is_dissolved=False
            )
            self.stdout.write(f"\nMatching available sections in ACTIVE semester for this user: {matching.count()}")
            for m in matching:
                self.stdout.write(f" - {m.name} (Capacity: {m.enrolled_count}/{m.capacity})")
        else:
            self.stdout.write("Test user not found or no profile.")
