from django.core.management.base import BaseCommand
from apps.academics.models import Program, Curriculum, CurriculumSubject

class Command(BaseCommand):
    help = 'Compare BSIS duplicate programs'

    def handle(self, *args, **options):
        p1 = Program.objects.filter(code='BS_Information_Systems').first()
        p2 = Program.objects.filter(code='BSIS').first()
        
        if p1:
            c1 = Curriculum.objects.filter(program=p1).first()
            s1_count = CurriculumSubject.objects.filter(curriculum=c1).count() if c1 else 0
            self.stdout.write(f"P1: {p1.code} -> Curricula: {Curriculum.objects.filter(program=p1).count()}, Subjects: {s1_count}")
        else:
            self.stdout.write("P1 (BS_Information_Systems) not found")

        if p2:
            c2 = Curriculum.objects.filter(program=p2).first()
            s2_count = CurriculumSubject.objects.filter(curriculum=c2).count() if c2 else 0
            self.stdout.write(f"P2: {p2.code} -> Curricula: {Curriculum.objects.filter(program=p2).count()}, Subjects: {s2_count}")
        else:
            self.stdout.write("P2 (BSIS) not found")
