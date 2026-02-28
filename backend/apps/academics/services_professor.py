"""
Professor service — workload calculation and assignment management.
Split from academics/services.py for maintainability.
"""

from django.db.models import Q


class ProfessorService:
    """Service for professor-related operations."""

    @staticmethod
    def get_workload(professor, semester):
        """
        Calculate professor workload for a semester.
        Returns: {total_sections, total_subjects, total_hours_per_week,
                  is_overloaded, sections_detail}
        """
        from apps.academics.models import SectionSubjectProfessor, ScheduleSlot

        assignments = SectionSubjectProfessor.objects.filter(
            professor=professor,
            section_subject__section__semester=semester,
            is_deleted=False
        ).select_related('section_subject__subject', 'section_subject__section')

        sections = set()
        subjects = set()
        total_hours = 0
        sections_detail = []

        q1 = Q(professor=professor)
        q2 = Q(professor__isnull=True, section_subject__professor=professor)
        
        assigned_ss_ids = SectionSubjectProfessor.objects.filter(
            professor=professor,
            is_deleted=False
        ).values_list('section_subject_id', flat=True)
        q3 = Q(professor__isnull=True, section_subject_id__in=assigned_ss_ids)

        all_slots = ScheduleSlot.objects.filter(
            (q1 | q2 | q3),
            section_subject__section__semester=semester,
            is_deleted=False
        ).select_related('section_subject__subject', 'section_subject__section')

        # Group slots by SectionSubject to build detail
        ss_slots = {}
        for slot in all_slots:
            ss_id = slot.section_subject_id
            if ss_id not in ss_slots:
                ss_slots[ss_id] = []
            ss_slots[ss_id].append(slot)

        for ss_id, slots in ss_slots.items():
            ss = slots[0].section_subject
            sections.add(ss.section.id)
            subjects.add(ss.subject.id)

            section_hours = sum([
                (slot.end_time.hour * 60 + slot.end_time.minute -
                 slot.start_time.hour * 60 - slot.start_time.minute) / 60
                for slot in slots
            ])

            total_hours += section_hours
            sections_detail.append({
                'section': ss.section.name,
                'subject_code': ss.subject.code,
                'subject_title': ss.subject.title,
                'hours_per_week': round(section_hours, 2)
            })

        max_hours = getattr(professor.professor_profile, 'max_teaching_hours', 24) \
                    if hasattr(professor, 'professor_profile') else 24

        return {
            'total_sections': len(sections),
            'total_subjects': len(subjects),
            'total_hours_per_week': round(total_hours, 2),
            'is_overloaded': total_hours > max_hours,
            'sections_detail': sections_detail
        }

    @staticmethod
    def assign_to_section_subject(section_subject, professor, is_primary=False):
        """Assign professor to section-subject."""
        from apps.academics.models import SectionSubjectProfessor

        existing = SectionSubjectProfessor.objects.filter(
            section_subject=section_subject,
            professor=professor,
            is_deleted=False
        ).first()

        if existing:
            return False, "Professor already assigned", None

        # Ensure only one primary professor
        if is_primary:
            SectionSubjectProfessor.objects.filter(
                section_subject=section_subject,
                is_primary=True,
                is_deleted=False
            ).update(is_primary=False)

        assignment = SectionSubjectProfessor.objects.create(
            section_subject=section_subject,
            professor=professor,
            is_primary=is_primary
        )

        return True, None, assignment
