import math
from datetime import time
from django.db import transaction, models
from apps.sections.models import Section
from apps.scheduling.models import Schedule
from apps.students.models import StudentEnrollment
from apps.academics.models import Subject

# AM: 7am start, up to 12 hours (7am-6pm). PM: 1pm start, up to 8 hours (1pm-8pm)
AM_START = 7
AM_HOURS = list(range(7, 19))
PM_START = 13
PM_HOURS = list(range(13, 21))
DAYS_ORDER = ['M', 'T', 'W', 'TH', 'F', 'S']


def _allocate_slots(used_slots, session, num_hours):
    """
    Block scheduling: allocates num_hours as one contiguous block on one day.
    AM starts 7:00, PM starts 13:00. Returns (days, start_time, end_time) or None.
    """
    hours = AM_HOURS if session == 'AM' else PM_HOURS
    if num_hours <= 0 or num_hours > len(hours):
        return None

    for day in DAYS_ORDER:
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
    def generate_sections(self, term, program, year_level):
        """
        Generates sections based on student counts (optimal 35, max 40).
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

        # 2. Calculate num sections: ceil(count / 35)
        num_sections = math.ceil(count / 35.0)
        
        # 3. AM/PM split (Balance evenly)
        num_am = math.ceil(num_sections / 2.0)
        num_pm = num_sections - num_am
        
        created_sections = []
        
        # 4. Fetch subjects for this program/year/semester (exclude practicum)
        subjects = Subject.objects.filter(
            curriculum__program=program,
            curriculum__is_active=True,
            year_level=year_level,
            semester=term.semester_type,
            is_practicum=False
        ).order_by('code')

        for i in range(1, num_sections + 1):
            session = 'AM' if i <= num_am else 'PM'
            section_name = f"{program.code} {year_level}-{i}"

            section, created = Section.objects.get_or_create(
                term=term,
                program=program,
                year_level=year_level,
                section_number=i,
                defaults={
                    'name': section_name,
                    'session': session,
                    'target_students': 35,
                    'max_students': 40
                }
            )
            created_sections.append(section)

            used_slots = set()
            for subject in subjects:
                if subject.lec_units > 0:
                    allocation = _allocate_slots(used_slots, session, subject.lec_units)
                    defaults = {'days': [], 'start_time': None, 'end_time': None}
                    if allocation:
                        days, start_t, end_t = allocation
                        defaults = {'days': days, 'start_time': start_t, 'end_time': end_t}
                    Schedule.objects.get_or_create(
                        term=term,
                        section=section,
                        subject=subject,
                        component_type='LEC',
                        defaults=defaults
                    )
                if subject.lab_units > 0:
                    allocation = _allocate_slots(used_slots, session, subject.lab_units)
                    defaults = {'days': [], 'start_time': None, 'end_time': None}
                    if allocation:
                        days, start_t, end_t = allocation
                        defaults = {'days': days, 'start_time': start_t, 'end_time': end_t}
                    Schedule.objects.get_or_create(
                        term=term,
                        section=section,
                        subject=subject,
                        component_type='LAB',
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

        # 3. Update SectionStudent record (Home Section)
        # Find existing assignment for this term
        existing = SectionStudent.objects.filter(student=student, section__term=term).first()
        if existing:
            existing.section = target_section
            existing.save()
        else:
            SectionStudent.objects.create(
                student=student,
                section=target_section,
                is_home_section=True
            )

        return updated_count
