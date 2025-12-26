"""
Academic services - Curriculum and Scheduling business logic.
"""

from django.db import transaction
from django.db.models import Q
from apps.audit.models import AuditLog


class CurriculumService:
    """
    Service for curriculum management operations.
    """
    
    @staticmethod
    def add_prerequisite(subject, prerequisite):
        """
        Add a prerequisite to a subject with circular dependency check.
        
        Args:
            subject: The subject to add prerequisite to
            prerequisite: The prerequisite subject
            
        Returns:
            tuple: (success: bool, error_message: str or None)
        """
        # Check if already a prerequisite
        if prerequisite in subject.prerequisites.all():
            return False, f"{prerequisite.code} is already a prerequisite"
        
        # Check for circular dependency
        if CurriculumService.has_circular_prerequisite(subject, prerequisite):
            return False, f"Adding {prerequisite.code} would create a circular dependency"
        
        # Check if same subject
        if subject.id == prerequisite.id:
            return False, "A subject cannot be its own prerequisite"
        
        # Add the prerequisite
        subject.prerequisites.add(prerequisite)
        
        # Log to audit
        AuditLog.log(
            action=AuditLog.Action.CURRICULUM_CHANGED,
            target_model='Subject',
            target_id=subject.id,
            payload={
                'action': 'add_prerequisite',
                'subject': subject.code,
                'prerequisite': prerequisite.code
            }
        )
        
        return True, None
    
    @staticmethod
    def remove_prerequisite(subject, prerequisite):
        """
        Remove a prerequisite from a subject.
        """
        if prerequisite not in subject.prerequisites.all():
            return False, f"{prerequisite.code} is not a prerequisite"
        
        subject.prerequisites.remove(prerequisite)
        
        # Log to audit
        AuditLog.log(
            action=AuditLog.Action.CURRICULUM_CHANGED,
            target_model='Subject',
            target_id=subject.id,
            payload={
                'action': 'remove_prerequisite',
                'subject': subject.code,
                'prerequisite': prerequisite.code
            }
        )
        
        return True, None
    
    @staticmethod
    def has_circular_prerequisite(subject, new_prereq, visited=None):
        """
        Check if adding new_prereq as a prerequisite would create a cycle.
        Uses DFS to detect cycles.
        
        Args:
            subject: The subject we want to add prerequisite to
            new_prereq: The proposed new prerequisite
            visited: Set of already visited subject IDs (for recursion)
            
        Returns:
            bool: True if adding would create a cycle
        """
        if visited is None:
            visited = set()
        
        # If the new prereq is the subject itself, it's circular
        if new_prereq.id == subject.id:
            return True
        
        # Check if new_prereq has the subject in its prerequisite chain
        for prereq in new_prereq.prerequisites.all():
            if prereq.id == subject.id:
                return True
            
            if prereq.id not in visited:
                visited.add(prereq.id)
                if CurriculumService.has_circular_prerequisite(subject, prereq, visited):
                    return True
        
        return False
    
    @staticmethod
    def get_prerequisite_tree(subject, depth=0, max_depth=10):
        """
        Get the prerequisite tree for a subject.
        
        Args:
            subject: The subject to get prerequisites for
            depth: Current recursion depth
            max_depth: Maximum depth to prevent infinite loops
            
        Returns:
            dict: Tree structure of prerequisites
        """
        if depth >= max_depth:
            return {'subject': subject.code, 'prerequisites': '...truncated...'}
        
        tree = {
            'id': str(subject.id),
            'code': subject.code,
            'title': subject.title,
            'units': subject.units,
            'prerequisites': []
        }
        
        for prereq in subject.prerequisites.all():
            tree['prerequisites'].append(
                CurriculumService.get_prerequisite_tree(prereq, depth + 1, max_depth)
            )
        
        return tree
    
    @staticmethod
    def get_all_prerequisites(subject, collected=None):
        """
        Get all prerequisites recursively (flat list).
        """
        if collected is None:
            collected = set()
        
        for prereq in subject.prerequisites.all():
            if prereq.id not in collected:
                collected.add(prereq.id)
                CurriculumService.get_all_prerequisites(prereq, collected)
        
        return collected


class SchedulingService:
    """
    Service for schedule conflict detection and management.
    """
    
    @staticmethod
    def times_overlap(start1, end1, start2, end2):
        """
        Check if two time ranges overlap.
        
        Returns:
            bool: True if times overlap
        """
        return start1 < end2 and start2 < end1
    
    @staticmethod
    def check_professor_conflict(professor, day, start_time, end_time, semester, exclude_slot_id=None):
        """
        Check if a professor has a schedule conflict using junction table.

        Args:
            professor: User object (professor)
            day: Day of the week (e.g., 'MON')
            start_time: Start time
            end_time: End time
            semester: Semester to check
            exclude_slot_id: Optional slot ID to exclude (for updates)

        Returns:
            tuple: (has_conflict: bool, conflicting_slot: ScheduleSlot or None)
        """
        from apps.academics.models import ScheduleSlot, SectionSubjectProfessor

        # Get all section_subjects assigned to this professor
        assigned_section_subjects = SectionSubjectProfessor.objects.filter(
            professor=professor,
            section_subject__section__semester=semester,
            is_deleted=False
        ).values_list('section_subject_id', flat=True)

        # Get all slots for the assigned section_subjects on this day
        slots = ScheduleSlot.objects.filter(
            section_subject_id__in=assigned_section_subjects,
            day=day,
            is_deleted=False
        )

        if exclude_slot_id:
            slots = slots.exclude(id=exclude_slot_id)

        for slot in slots:
            if SchedulingService.times_overlap(
                start_time, end_time,
                slot.start_time, slot.end_time
            ):
                return True, slot

        return False, None
    
    @staticmethod
    def check_room_conflict(room, day, start_time, end_time, semester, exclude_slot_id=None):
        """
        Check if a room is double-booked.
        
        Returns:
            tuple: (has_conflict: bool, conflicting_slot: ScheduleSlot or None)
        """
        from apps.academics.models import ScheduleSlot
        
        if not room:  # Empty room is allowed
            return False, None
        
        slots = ScheduleSlot.objects.filter(
            room=room,
            section_subject__section__semester=semester,
            day=day,
            is_deleted=False
        )
        
        if exclude_slot_id:
            slots = slots.exclude(id=exclude_slot_id)
        
        for slot in slots:
            if SchedulingService.times_overlap(
                start_time, end_time,
                slot.start_time, slot.end_time
            ):
                return True, slot
        
        return False, None
    
    @staticmethod
    def check_student_conflict(student, day, start_time, end_time, semester, exclude_section_subject_id=None):
        """
        Check if a student has a schedule conflict.
        
        Args:
            student: User object (student)
            day: Day of the week
            start_time: Start time
            end_time: End time
            semester: Semester to check
            exclude_section_subject_id: Optional section_subject to exclude
            
        Returns:
            tuple: (has_conflict: bool, conflicting_slot: ScheduleSlot or None)
        """
        from apps.enrollment.models import SubjectEnrollment
        from apps.academics.models import ScheduleSlot
        
        # Get student's enrolled section subjects for this semester
        enrolled_section_subjects = SubjectEnrollment.objects.filter(
            enrollment__student=student,
            enrollment__semester=semester,
            status='ENROLLED',
            section__isnull=False
        ).values_list('section_id', flat=True)
        
        # Get schedule slots for enrolled sections on this day
        slots = ScheduleSlot.objects.filter(
            section_subject__section_id__in=enrolled_section_subjects,
            day=day,
            is_deleted=False
        )
        
        if exclude_section_subject_id:
            slots = slots.exclude(section_subject_id=exclude_section_subject_id)
        
        for slot in slots:
            if SchedulingService.times_overlap(
                start_time, end_time,
                slot.start_time, slot.end_time
            ):
                return True, slot
        
        return False, None
    
    @staticmethod
    def get_professor_schedule(professor, semester):
        """
        Get a professor's full schedule for a semester.
        
        Returns:
            list: List of schedule slots grouped by day
        """
        from apps.academics.models import ScheduleSlot
        
        slots = ScheduleSlot.objects.filter(
            section_subject__professor=professor,
            section_subject__section__semester=semester,
            is_deleted=False
        ).select_related(
            'section_subject__subject',
            'section_subject__section'
        ).order_by('day', 'start_time')
        
        schedule = {}
        for slot in slots:
            day = slot.day
            if day not in schedule:
                schedule[day] = []
            
            schedule[day].append({
                'id': str(slot.id),
                'subject': slot.section_subject.subject.code,
                'section': slot.section_subject.section.name,
                'start_time': slot.start_time.strftime('%H:%M'),
                'end_time': slot.end_time.strftime('%H:%M'),
                'room': slot.room
            })

        return schedule


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

        for assignment in assignments:
            ss = assignment.section_subject
            sections.add(ss.section.id)
            subjects.add(ss.subject.id)

            # Calculate hours from schedule slots
            slots = ScheduleSlot.objects.filter(section_subject=ss, is_deleted=False)
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
                'hours_per_week': section_hours,
                'is_primary': assignment.is_primary
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
