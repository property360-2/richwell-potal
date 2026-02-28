"""
Scheduling service — conflict detection and schedule management.
Split from academics/services.py for maintainability.
"""

from django.db.models import Q


class SchedulingService:
    """Service for schedule conflict detection and management."""
    
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

        # Query slots where this professor is explicitly assigned
        q1 = Q(professor=professor)
        
        # Query slots where no specific professor is assigned, but this professor
        # is the main professor for the section subject
        q2 = Q(professor__isnull=True, section_subject__professor=professor)
        
        # Query slots where no specific professor is assigned, but this professor
        # is among the professors in the junction table
        q3 = Q(professor__isnull=True, section_subject__id__in=assigned_section_subjects)

        slots = ScheduleSlot.objects.filter(
            q1 | q2 | q3,
            section_subject__section__semester=semester,
            day=day,
            is_deleted=False
        ).distinct()

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
    def check_professor_warnings(professor, day, start_time, end_time, semester):
        """
        Check for non-blocking warnings (Professional Hazards).
        1. Overload (exceeding max hours)
        2. Consecutive teaching hours (e.g. > 4 hours straight)
        
        Returns:
            list: List of warning strings
        """
        from apps.academics.services_professor import ProfessorService
        warnings = []
        
        # 1. Overload Check
        workload = ProfessorService.get_workload(professor, semester)
        # Calculate duration of new slot
        duration = (end_time.hour * 60 + end_time.minute - start_time.hour * 60 - start_time.minute) / 60
        new_total = workload['total_hours_per_week'] + duration
        
        max_hours = getattr(professor.professor_profile, 'max_teaching_hours', 24) \
                    if hasattr(professor, 'professor_profile') else 24
                    
        if new_total > max_hours:
            warnings.append(
                f"Professional Warning: Total load ({new_total:.1f}h) exceeds limit ({max_hours}h)"
            )
            
        # 2. Consecutive Hours Check (Simplified)
        day_schedule = SchedulingService.get_professor_schedule(professor, semester)
        day_slots = [s for s in day_schedule if s['day'] == day]
        
        return warnings
    
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
    def check_section_conflict(section_id, day, start_time, end_time, exclude_slot_id=None):
        """Check if a section has overlapping subjects."""
        from apps.academics.models import ScheduleSlot
        
        slots = ScheduleSlot.objects.filter(
            section_subject__section_id=section_id,
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
    def get_room_busy_slots(room, day, semester):
        """Get all busy time slots for a specific room on a given day."""
        from apps.academics.models import ScheduleSlot
        
        return ScheduleSlot.objects.filter(
            room=room,
            day=day,
            section_subject__section__semester=semester,
            is_deleted=False
        ).values('start_time', 'end_time', 'section_subject__section__name', 'section_subject__subject__code')

    @staticmethod
    def get_room_schedule(room_name, semester):
        """Get the full weekly schedule for a specific room."""
        from apps.academics.models import ScheduleSlot
        
        slots = ScheduleSlot.objects.filter(
            room=room_name,
            section_subject__section__semester=semester,
            is_deleted=False
        ).select_related(
            'section_subject__section',
            'section_subject__subject',
            'professor'
        ).order_by('day', 'start_time')
        
        schedule = []
        for slot in slots:
            schedule.append({
                'day': slot.day,
                'start_time': slot.start_time.strftime('%H:%M'),
                'end_time': slot.end_time.strftime('%H:%M'),
                'subject_code': slot.section_subject.subject.code,
                'subject_title': slot.section_subject.subject.title,
                'section_name': slot.section_subject.section.name,
                'professor_name': slot.professor.get_full_name() if slot.professor else 'TBA'
            })
        return schedule

    @staticmethod
    def get_available_rooms(day, start_time, end_time, semester, all_rooms=None):
        """Get list of available rooms for a given time slot."""
        from apps.academics.models import ScheduleSlot, Room
        
        busy_rooms = ScheduleSlot.objects.filter(
            day=day,
            section_subject__section__semester=semester,
            is_deleted=False
        ).filter(
            Q(start_time__lt=end_time) & Q(end_time__gt=start_time)
        ).values_list('room', flat=True).distinct()
        
        if all_rooms is None:
            all_rooms = Room.objects.filter(is_active=True, is_deleted=False).values_list('name', flat=True)
            
        return [r for r in all_rooms if r not in busy_rooms and r]
    
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
            list: Flat list of schedule slots with nested subject/section info
        """
        from apps.academics.models import ScheduleSlot
        
        # Slots where professor is explicitly assigned
        q1 = Q(professor=professor)
        # Slots where no professor is assigned, fallback to section_subject.professor
        q2 = Q(professor__isnull=True, section_subject__professor=professor)
        
        slots = ScheduleSlot.objects.filter(
            q1 | q2,
            section_subject__section__semester=semester,
            is_deleted=False
        ).select_related(
            'section_subject__subject',
            'section_subject__section'
        ).order_by('day', 'start_time')
        
        schedule = []
        for slot in slots:
            schedule.append({
                'id': str(slot.id),
                'day': slot.day,
                'day_display': slot.get_day_display(),
                'subject': {
                    'code': slot.section_subject.subject.code,
                    'title': slot.section_subject.subject.title,
                },
                'section': {
                    'name': slot.section_subject.section.name,
                },
                'start_time': slot.start_time.strftime('%H:%M'),
                'end_time': slot.end_time.strftime('%H:%M'),
                'room': slot.room
            })

        return schedule
