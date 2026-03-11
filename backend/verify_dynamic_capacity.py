from apps.sections.services.sectioning_service import SectioningService
from apps.academics.models import Program
from apps.terms.models import Term
from apps.students.models import StudentEnrollment

try:
    term = Term.objects.get(code='2026-1')
    program = Program.objects.get(code='BS_Information_Systems')
    
    count = StudentEnrollment.objects.filter(
        term=term,
        student__program=program,
        year_level=1,
        advising_status='APPROVED'
    ).count()
    print(f"Total Students for BSIS Y1: {count}")

    svc = SectioningService()
    sections = svc.generate_sections(term, program, 1)
    
    print(f"\nGenerated {len(sections)} sections.")
    for s in sections:
        current_enrollment = s.student_assignments.count()
        print(f"- {s.name}: Target {s.target_students}, Max {s.max_students}, Session {s.session}")

except Exception as e:
    import traceback
    print(f"Error: {e}")
    traceback.print_exc()
