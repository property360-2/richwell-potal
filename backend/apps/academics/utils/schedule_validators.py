"""
Schedule conflict validation utilities.
Strictly based on existing Django models - NO invented fields.

Provides validation for:
- Section schedule conflicts
- Professor schedule conflicts
- Room schedule conflicts
- Professor qualification validation
"""

from django.db.models import Q
from apps.academics.models import ScheduleSlot, SectionSubject


class ScheduleConflictValidator:
    """
    Validates schedule conflicts using existing ScheduleSlot model.
    
    Model fields used:
    - ScheduleSlot.section_subject (FK to SectionSubject)
    - ScheduleSlot.professor (FK to User)
    - ScheduleSlot.day (CharField)
    - ScheduleSlot.start_time (TimeField)
    - ScheduleSlot.end_time (TimeField)
    - ScheduleSlot.room (CharField)
    """
    
    @staticmethod
    def time_overlaps(start1, end1, start2, end2):
        """
        Check if two time ranges overlap.
        
        Args:
            start1, end1: First time range (datetime.time objects)
            start2, end2: Second time range (datetime.time objects)
            
        Returns:
            bool: True if ranges overlap, False otherwise
        """
        return start1 < end2 and end1 > start2
    
    @classmethod
    def check_section_conflict(cls, section, day, start_time, end_time, exclude_slot_id=None):
        """
        Check if a section already has a class at the given time.
        
        Args:
            section: Section instance
            day: Day code (e.g., 'MON', 'TUE')
            start_time: Start time (datetime.time)
            end_time: End time (datetime.time)
            exclude_slot_id: Optional slot ID to exclude (for updates)
            
        Returns:
            (has_conflict, conflicting_slots)
        """
        # Get all slots for this section on this day
        slots = ScheduleSlot.objects.filter(
            section_subject__section=section,
            day=day
        ).select_related('section_subject__subject')
        
        if exclude_slot_id:
            slots = slots.exclude(id=exclude_slot_id)
        
        conflicts = []
        for slot in slots:
            if cls.time_overlaps(start_time, end_time, slot.start_time, slot.end_time):
                conflicts.append({
                    'type': 'section',
                    'section': section.name,
                    'subject': slot.section_subject.subject.code,
                    'day': day,
                    'time': f'{slot.start_time}-{slot.end_time}',
                    'message': f'Section {section.name} already has {slot.section_subject.subject.code} on {day} at {slot.start_time}-{slot.end_time}'
                })
        
        return len(conflicts) > 0, conflicts
    
    @classmethod
    def check_professor_conflict(cls, professor, day, start_time, end_time, exclude_slot_id=None):
        """
        Check if a professor is already teaching at the given time.
        
        Args:
            professor: User instance (professor)
            day: Day code
            start_time: Start time
            end_time: End time
            exclude_slot_id: Optional slot ID to exclude
            
        Returns:
            (has_conflict, conflicting_slots)
        """
        if not professor:
            return False, []
        
        slots = ScheduleSlot.objects.filter(
            professor=professor,
            day=day
        ).select_related('section_subject__subject', 'section_subject__section')
        
        if exclude_slot_id:
            slots = slots.exclude(id=exclude_slot_id)
        
        conflicts = []
        for slot in slots:
            if cls.time_overlaps(start_time, end_time, slot.start_time, slot.end_time):
                conflicts.append({
                    'type': 'professor',
                    'professor': professor.get_full_name(),
                    'subject': slot.section_subject.subject.code,
                    'section': slot.section_subject.section.name,
                    'day': day,
                    'time': f'{slot.start_time}-{slot.end_time}',
                    'message': f'Professor {professor.get_full_name()} is already teaching {slot.section_subject.subject.code} ({slot.section_subject.section.name}) on {day} at {slot.start_time}-{slot.end_time}'
                })
        
        return len(conflicts) > 0, conflicts
    
    @classmethod
    def check_room_conflict(cls, room, day, start_time, end_time, exclude_slot_id=None):
        """
        Check if a room is already occupied at the given time.
        
        Args:
            room: Room name/number (string)
            day: Day code
            start_time: Start time
            end_time: End time
            exclude_slot_id: Optional slot ID to exclude
            
        Returns:
            (has_conflict, conflicting_slots)
        """
        if not room:
            return False, []
        
        slots = ScheduleSlot.objects.filter(
            room=room,
            day=day
        ).select_related('section_subject__subject', 'section_subject__section')
        
        if exclude_slot_id:
            slots = slots.exclude(id=exclude_slot_id)
        
        conflicts = []
        for slot in slots:
            if cls.time_overlaps(start_time, end_time, slot.start_time, slot.end_time):
                conflicts.append({
                    'type': 'room',
                    'room': room,
                    'subject': slot.section_subject.subject.code,
                    'section': slot.section_subject.section.name,
                    'day': day,
                    'time': f'{slot.start_time}-{slot.end_time}',
                    'message': f'Room {room} is already occupied by {slot.section_subject.subject.code} ({slot.section_subject.section.name}) on {day} at {slot.start_time}-{slot.end_time}'
                })
        
        return len(conflicts) > 0, conflicts
    
    @classmethod
    def validate_schedule(cls, section_subject, day, start_time, end_time, room=None, professor=None, exclude_slot_id=None):
        """
        Comprehensive schedule validation.
        Checks all three types of conflicts: section, professor, and room.
        
        Args:
            section_subject: SectionSubject instance
            day: Day code
            start_time: Start time
            end_time: End time
            room: Optional room name
            professor: Optional professor User instance
            exclude_slot_id: Optional slot ID to exclude (for updates)
            
        Returns:
            {
                'is_valid': bool,
                'conflicts': list of conflict dicts,
                'errors': list of error messages
            }
        """
        all_conflicts = []
        
        # Check section conflict
        has_section_conflict, section_conflicts = cls.check_section_conflict(
            section_subject.section, day, start_time, end_time, exclude_slot_id
        )
        all_conflicts.extend(section_conflicts)
        
        # Check professor conflict
        if professor:
            has_prof_conflict, prof_conflicts = cls.check_professor_conflict(
                professor, day, start_time, end_time, exclude_slot_id
            )
            all_conflicts.extend(prof_conflicts)
        
        # Check room conflict
        if room:
            has_room_conflict, room_conflicts = cls.check_room_conflict(
                room, day, start_time, end_time, exclude_slot_id
            )
            all_conflicts.extend(room_conflicts)
        
        return {
            'is_valid': len(all_conflicts) == 0,
            'conflicts': all_conflicts,
            'errors': [c['message'] for c in all_conflicts]
        }


class ProfessorQualificationValidator:
    """
    Validates professor qualifications for teaching subjects.
    
    Uses ProfessorProfile.assigned_subjects (ManyToMany field).
    """
    
    @staticmethod
    def is_qualified(professor, subject):
        """
        Check if a professor is qualified to teach a subject.
        
        Args:
            professor: User instance (role=PROFESSOR)
            subject: Subject instance
            
        Returns:
            bool: True if qualified, False otherwise
        """
        if not hasattr(professor, 'professor_profile'):
            return False
        
        return professor.professor_profile.assigned_subjects.filter(id=subject.id).exists()
    
    @staticmethod
    def get_qualified_professors(subject):
        """
        Get all professors qualified to teach a subject.
        
        Args:
            subject: Subject instance
            
        Returns:
            QuerySet of User instances
        """
        from apps.accounts.models import User
        
        return User.objects.filter(
            role=User.Role.PROFESSOR,
            professor_profile__assigned_subjects=subject,
            professor_profile__is_active=True
        ).distinct()
    
    @staticmethod
    def get_professor_subjects(professor):
        """
        Get all subjects a professor is qualified to teach.
        
        Args:
            professor: User instance
            
        Returns:
            QuerySet of Subject instances
        """
        if not hasattr(professor, 'professor_profile'):
            return Subject.objects.none()
        
        return professor.professor_profile.assigned_subjects.all()
    
    @classmethod
    def validate_assignment(cls, professor, subject):
        """
        Validate a professor-subject assignment.
        
        Args:
            professor: User instance
            subject: Subject instance
            
        Returns:
            {
                'is_valid': bool,
                'qualified': bool,
                'message': str
            }
        """
        if not professor:
            return {
                'is_valid': False,
                'qualified': False,
                'message': 'No professor assigned'
            }
        
        if professor.role != 'PROFESSOR':
            return {
                'is_valid': False,
                'qualified': False,
                'message': f'{professor.get_full_name()} is not a professor'
            }
        
        is_qualified = cls.is_qualified(professor, subject)
        
        return {
            'is_valid': is_qualified,
            'qualified': is_qualified,
            'message': 'Professor is qualified' if is_qualified else f'{professor.get_full_name()} is not qualified to teach {subject.code}'
        }


class CurriculumValidator:
    """
    Validates curriculum and section subject assignments.
    
    Ensures subjects assigned to sections match the section's curriculum and year level.
    """
    
    @staticmethod
    def validate_section_subject(section, subject):
        """
        Validate that a subject can be assigned to a section.
        
        Checks:
        1. Subject belongs to section's curriculum
        2. Subject's year level matches section's year level
        
        Args:
            section: Section instance
            subject: Subject instance
            
        Returns:
            {
                'is_valid': bool,
                'in_curriculum': bool,
                'correct_year': bool,
                'errors': list of error messages
            }
        """
        errors = []
        
        # Check if section has a curriculum
        if not section.curriculum:
            errors.append(f'Section {section.name} has no curriculum assigned')
            return {
                'is_valid': False,
                'in_curriculum': False,
                'correct_year': False,
                'errors': errors
            }
        
        # Check if subject is in curriculum
        from apps.academics.models import CurriculumSubject
        
        curriculum_subject = CurriculumSubject.objects.filter(
            curriculum=section.curriculum,
            subject=subject
        ).first()
        
        in_curriculum = curriculum_subject is not None
        
        if not in_curriculum:
            errors.append(
                f'Subject {subject.code} is not in curriculum {section.curriculum.code}'
            )
        
        # Check year level match
        correct_year = subject.year_level == section.year_level
        
        if not correct_year:
            errors.append(
                f'Subject {subject.code} is for year {subject.year_level}, but section {section.name} is year {section.year_level}'
            )
        
        return {
            'is_valid': in_curriculum and correct_year,
            'in_curriculum': in_curriculum,
            'correct_year': correct_year,
            'errors': errors
        }
    
    @staticmethod
    def get_available_subjects_for_section(section):
        """
        Get all subjects that can be assigned to a section.
        
        Returns subjects that:
        - Belong to the section's curriculum
        - Match the section's year level
        - Match the current semester number
        
        Args:
            section: Section instance
            
        Returns:
            QuerySet of Subject instances
        """
        if not section.curriculum:
            from apps.academics.models import Subject
            return Subject.objects.none()
        
        from apps.academics.models import CurriculumSubject
        
        # Determine semester number from section's semester
        semester_name = section.semester.name.lower()
        if '1st' in semester_name or 'first' in semester_name:
            semester_number = 1
        elif '2nd' in semester_name or 'second' in semester_name:
            semester_number = 2
        elif 'summer' in semester_name:
            semester_number = 3
        else:
            semester_number = 1  # Default
        
        curriculum_subjects = CurriculumSubject.objects.filter(
            curriculum=section.curriculum,
            year_level=section.year_level,
            semester_number=semester_number
        ).select_related('subject')
        
        return [cs.subject for cs in curriculum_subjects]


# Convenience function for API views
def validate_schedule_creation(section_subject, day, start_time, end_time, room=None, professor=None):
    """
    Validate a schedule creation request.
    Combines all validation checks.
    
    Returns:
        {
            'is_valid': bool,
            'schedule_conflicts': list,
            'qualification_valid': bool,
            'curriculum_valid': bool,
            'errors': list of all error messages
        }
    """
    all_errors = []
    
    # Validate schedule conflicts
    schedule_result = ScheduleConflictValidator.validate_schedule(
        section_subject, day, start_time, end_time, room, professor
    )
    all_errors.extend(schedule_result['errors'])
    
    # Validate professor qualification
    qualification_result = {'is_valid': True, 'qualified': True}
    if professor:
        qualification_result = ProfessorQualificationValidator.validate_assignment(
            professor, section_subject.subject
        )
        if not qualification_result['is_valid']:
            all_errors.append(qualification_result['message'])
    
    # Validate curriculum
    curriculum_result = CurriculumValidator.validate_section_subject(
        section_subject.section, section_subject.subject
    )
    all_errors.extend(curriculum_result['errors'])
    
    return {
        'is_valid': schedule_result['is_valid'] and qualification_result['is_valid'] and curriculum_result['is_valid'],
        'schedule_conflicts': schedule_result['conflicts'],
        'qualification_valid': qualification_result['is_valid'],
        'curriculum_valid': curriculum_result['is_valid'],
        'errors': all_errors
    }
