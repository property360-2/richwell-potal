import math
from datetime import time
from django.db import transaction, models
from apps.sections.models import Section
from apps.scheduling.models import Schedule
from apps.students.models import StudentEnrollment
from apps.academics.models import Subject

# AM: 7am to 12pm. PM: 1pm to 6pm
AM_HOURS = list(range(7, 12))  # [7, 8, 9, 10, 11] -> 7am to 12pm
PM_HOURS = list(range(13, 18)) # [13, 14, 15, 16, 17] -> 1pm to 6pm
DAYS_ORDER = ['M', 'T', 'W', 'TH', 'F', 'S']


def _allocate_slots(used_slots, session, num_hours):
    """
    Block scheduling: allocates num_hours as one contiguous block on one day.
    To ensure even distribution, it tries days with the least load first.
    """
    hours = AM_HOURS if session == 'AM' else PM_HOURS
    if num_hours <= 0 or num_hours > len(hours):
        return None

    # Calculate current load per day to distribute evenly
    day_loads = {day: 0 for day in DAYS_ORDER}
    for day, hr in used_slots:
        day_loads[day] += 1
    
    # Sort days by load (least busy first)
    sorted_days = sorted(DAYS_ORDER, key=lambda d: day_loads[d])

    for day in sorted_days:
        for start_idx in range(len(hours) - num_hours + 1):
            block = [(day, hours[start_idx + i]) for i in range(num_hours)]
            if all(slot not in used_slots for slot in block):
                for slot in block:
                    used_slots.add(slot)
                start_hour = hours[start_idx]
                end_hour = start_hour + num_hours
                return ([day], time(start_hour, 0), time(end_hour, 0))
    return None


class SectioningService:
    @staticmethod
    def get_enrollment_stats(term):
        """
        Returns counts of approved students per program + year_level.
        Useful for the Registrar's sectioning matrix.
        """
        stats = StudentEnrollment.objects.filter(
            term=term, 
            advising_status='APPROVED'
        ).values(
            'student__program__id', 
            'student__program__code', 
            'student__program__name', 
            'year_level'
        ).annotate(
            count=models.Count('id')
        ).order_by('student__program__code', 'year_level')
        return stats

    @transaction.atomic
    def generate_sections(self, term, program, year_level, num_sections=None, auto_schedule=False):
        """
        Generates sections based on student counts or provided num_sections.
        Automatically attaches curriculum subjects as empty schedule slots.
        """
        # 1. Count students
        count = StudentEnrollment.objects.filter(
            term=term,
            student__program=program,
            year_level=year_level,
            advising_status='APPROVED'
        ).count()
        
        if count == 0:
            return []

        # 2. Calculate num sections if not provided
        if num_sections is None:
            num_sections = math.ceil(count / 40.0)
        
        # 3. Dynamic target capacity (e.g., 150/4 = 37.5 -> 38)
        target_capacity = math.ceil(count / num_sections) if num_sections > 0 else 40
        
        # 4. AM/PM split (Balance evenly)
        num_am = math.ceil(num_sections / 2.0)
        num_pm = num_sections - num_am
        
        created_sections = []
        
        # 5. Fetch subjects for this program/year/semester (exclude practicum)
        subjects = Subject.objects.filter(
            curriculum__program=program,
            curriculum__is_active=True,
            year_level=year_level,
            semester=term.semester_type,
            is_practicum=False
        ).order_by('code')

        for i in range(1, num_sections + 1):
            session = 'AM' if i <= num_am else 'PM'
            section_name = f"{program.code} {year_level}-{i} ({term.code})"

            # Use update_or_create to refresh target_students if count changes
            section, created = Section.objects.update_or_create(
                term=term,
                program=program,
                year_level=year_level,
                section_number=i,
                defaults={
                    'name': section_name,
                    'session': session,
                    'target_students': target_capacity,
                    'max_students': 40
                }
            )
            created_sections.append(section)

            # 6. Build allocation tasks (Lec and Lab)
            allocation_tasks = []
            for subject in subjects:
                if subject.lec_units > 0:
                    allocation_tasks.append((subject, 'LEC', subject.lec_units))
                if subject.lab_units > 0:
                    allocation_tasks.append((subject, 'LAB', subject.lab_units))
            
            # Sort by hours descending. This minimizes fragmentation!
            allocation_tasks.sort(key=lambda x: x[2], reverse=True)

            used_slots = set()
            for subject, component_type, hours in allocation_tasks:
                allocation = _allocate_slots(used_slots, session, hours) if auto_schedule else None
                defaults = {'days': [], 'start_time': None, 'end_time': None}
                if allocation:
                    days, start_t, end_t = allocation
                    defaults = {'days': days, 'start_time': start_t, 'end_time': end_t}
                
                Schedule.objects.get_or_create(
                    term=term,
                    section=section,
                    subject=subject,
                    component_type=component_type,
                    defaults=defaults
                )
        
        return created_sections

    @transaction.atomic
    def manual_transfer_student(self, student, target_section, term, override_capacity=False):
        """
        Manually transfers a student to a target section.
        Updates all Grade records for the term and the StudentSection home record.
        """
        from apps.grades.models import Grade
        from apps.sections.models import SectionStudent

        # 1. Capacity Check
        current_count = target_section.student_assignments.count()
        if not override_capacity and current_count >= target_section.max_students:
            raise ValueError(f"Section {target_section.name} is full (Max: {target_section.max_students})")
        
        # 2. Update Grade records for this term
        updated_count = Grade.objects.filter(
            student=student,
            term=term
        ).update(section=target_section)

        # 3. Update SectionStudent record (Home Section) — query by direct term field
        existing = SectionStudent.objects.filter(student=student, term=term).first()
        if existing:
            existing.section = target_section
            existing.save()
        else:
            SectionStudent.objects.create(
                student=student,
                section=target_section,
                term=term,
                is_home_section=True
            )

        return updated_count
