from apps.sections.services.sectioning_service import SectioningService
from apps.academics.models import Program
from apps.terms.models import Term
from apps.scheduling.models import Schedule

try:
    term = Term.objects.get(code='2026-1')
    program = Program.objects.get(code='BS_Information_Systems')
    service = SectioningService()

    # 1. Generate sections
    sections = service.generate_sections(term, program, 1)
    print(f"Generated {len(sections)} sections.")

    # 2. Print schedule for the first section
    if sections:
        section = sections[0]
        print(f"\nSchedule for {section.name} ({section.session}):")
        scheds = Schedule.objects.filter(section=section).exclude(start_time=None).order_by('days', 'start_time')
        print(f"{'Subject':<15} | {'Day':<5} | {'Time':<15}")
        print("-" * 45)
        for s in scheds:
            day_str = ",".join(s.days)
            time_str = f"{s.start_time.strftime('%I:%M %p')} - {s.end_time.strftime('%I:%M %p')}"
            print(f"{s.subject.code:<15} | {day_str:<5} | {time_str:<15}")

    # 3. Check distribution across days for the first section
    day_stats = {}
    for s in Schedule.objects.filter(section=sections[0]).exclude(start_time=None):
        for d in s.days:
            # Approximate load by number of hours/units
            load = (s.subject.lec_units if s.component_type == 'LEC' else s.subject.lab_units)
            day_stats[d] = day_stats.get(d, 0) + load

    print("\nLoad distribution (Units per day) for " + sections[0].name + ":")
    for day in ['M', 'T', 'W', 'TH', 'F', 'S']:
        print(f"{day}: {day_stats.get(day, 0)} units")

except Exception as e:
    import traceback
    print(f"Error: {e}")
    traceback.print_exc()
