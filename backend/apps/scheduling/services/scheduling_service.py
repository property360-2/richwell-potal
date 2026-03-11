from django.db import transaction, models
from django.conf import settings
from apps.scheduling.models import Schedule
from apps.facilities.models import Room
from apps.faculty.models import Professor
from apps.sections.models import Section

class SchedulingService:
    @staticmethod
    @transaction.atomic
    def publish_schedule(term):
        """
        Marks the schedule as published, opening student picking.
        Notifies all students with approved advising for this term.
        """
        term.schedule_published = True
        term.save(update_fields=['schedule_published'])

        # Notify students with approved advising
        from apps.students.models import StudentEnrollment
        from apps.notifications.models import Notification

        enrollments = StudentEnrollment.objects.filter(
            term=term,
            advising_status='APPROVED'
        ).select_related('student__user')

        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        link_url = f"{frontend_url}/student/schedule-picking"

        for enrollment in enrollments:
            if enrollment.student.user_id:
                Notification.objects.create(
                    recipient=enrollment.student.user,
                    title="Schedule Published",
                    message=f"Class schedules for {term.code} are now available. You may pick your section/schedule.",
                    notification_type="SCHEDULE_PUBLISHED",
                    link_url=link_url
                )
    @transaction.atomic
    def create_or_update_schedule(self, term, section, subject, component_type, professor=None, room=None, days=None, start_time=None, end_time=None, exclude_id=None):
        """
        Main entry point for the Dean to assign professor, room, and time.
        Includes conflict checks for Professor, Room, and Section.
        """
        if days is None: days = []
        
        # 1. Conflict Checks (only if days and times are provided)
        if days and start_time and end_time:
            if professor:
                self.check_professor_conflict(professor, term, days, start_time, end_time, exclude_id=exclude_id)
            if room:
                self.check_room_conflict(room, term, days, start_time, end_time, exclude_id=exclude_id)
            if section:
                self.check_section_conflict(section, term, days, start_time, end_time, exclude_id=exclude_id)

        # 2. Update existing schedule slot or create a new one
        schedule, created = Schedule.objects.get_or_create(
            term=term,
            section=section,
            subject=subject,
            component_type=component_type,
            defaults={'days': days}
        )
        
        schedule.professor = professor
        schedule.room = room
        schedule.days = days
        schedule.start_time = start_time
        schedule.end_time = end_time
        schedule.save()
        
        return schedule

    def check_professor_conflict(self, professor, term, days, start_time, end_time, exclude_id=None):
        """
        A professor cannot be in two places at the same time on the same day.
        """
        conflicts = Schedule.objects.filter(
            term=term,
            professor=professor,
            start_time__lt=end_time,
            end_time__gt=start_time
        )
        if exclude_id:
            conflicts = conflicts.exclude(id=exclude_id)
            
        for conflict in conflicts:
            if any(day in conflict.days for day in days):
                raise ValueError(f"Professor {professor.user.last_name} has a conflict with {conflict.subject.code} in {conflict.section.name} at this time.")

    def check_room_conflict(self, room, term, days, start_time, end_time, exclude_id=None):
        """
        A room cannot be used for two different schedules at the same time.
        """
        conflicts = Schedule.objects.filter(
            term=term,
            room=room,
            start_time__lt=end_time,
            end_time__gt=start_time
        )
        if exclude_id:
            conflicts = conflicts.exclude(id=exclude_id)
            
        for conflict in conflicts:
            if any(day in conflict.days for day in days):
                raise ValueError(f"Room {room.name} is already occupied by {conflict.section.name} at this time.")

    def check_section_conflict(self, section, term, days, start_time, end_time, exclude_id=None):
        """
        A section cannot have two different subjects at the same time.
        """
        conflicts = Schedule.objects.filter(
            term=term,
            section=section,
            start_time__lt=end_time,
            end_time__gt=start_time
        )
        if exclude_id:
            conflicts = conflicts.exclude(id=exclude_id)
            
        for conflict in conflicts:
            if any(day in conflict.days for day in days):
                raise ValueError(f"Section {section.name} already has a schedule for {conflict.subject.code} at this time.")

    def auto_assign_room(self, subject, component_type, capacity_needed):
        """
        Finds an available room matching type and capacity for a given schedule request.
        """
        room_type = 'LECTURE'
        if component_type == 'LAB':
            room_type = 'COMPUTER_LAB'
            
        return Room.objects.filter(
            room_type=room_type,
            capacity__gte=capacity_needed,
            is_active=True
        ).order_by('capacity').first()
