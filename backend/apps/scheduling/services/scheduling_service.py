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

    @staticmethod
    @transaction.atomic
    def randomize_section_schedule(term, section):
        """
        Auto-generates day/time assignments for all schedule slots of a section.
        Each subject component gets ONE continuous block on ONE day.
        Professor and room are NOT touched.
        Respects section session (AM → 7:00-13:00, PM → 13:00-19:00).
        Splits hrs_per_week between LEC and LAB components of the same subject.
        """
        import random
        from datetime import time as dt_time
        from collections import defaultdict

        slots = Schedule.objects.filter(
            term=term, section=section
        ).select_related('subject').order_by('id')

        if not slots.exists():
            raise ValueError("No schedule slots found for this section.")

        # Reset existing time assignments
        slots.update(days=[], start_time=None, end_time=None)

        # Determine time window based on section session
        if section.session == 'AM':
            GRID_START = 7 * 60    # 7:00 AM
            GRID_END = 13 * 60     # 1:00 PM (6 hours)
        else:
            GRID_START = 13 * 60   # 1:00 PM
            GRID_END = 19 * 60     # 7:00 PM (6 hours)

        DAYS = ['M', 'T', 'W', 'TH', 'F', 'S']

        # Track occupied intervals per day
        occupied = {d: [] for d in DAYS}

        def find_gap(day, duration_minutes):
            """Find the first available gap on a given day for the required duration."""
            day_slots = sorted(occupied[day], key=lambda x: x[0])
            candidate = GRID_START

            for occ_start, occ_end in day_slots:
                if candidate + duration_minutes <= occ_start:
                    return candidate
                candidate = max(candidate, occ_end)

            if candidate + duration_minutes <= GRID_END:
                return candidate
            return None

        # Group slots by subject to split hours between LEC and LAB
        subject_slots = defaultdict(list)
        for slot in slots:
            subject_slots[slot.subject_id].append(slot)

        # Calculate duration for each individual slot
        slot_durations = {}
        for subject_id, group in subject_slots.items():
            subject = group[0].subject
            total_hrs = float(subject.hrs_per_week or subject.total_units or 3)

            if len(group) == 1:
                # Only one component — gets all hours
                slot_durations[group[0].id] = total_hrs
            else:
                # Multiple components (LEC + LAB) — split by unit ratio
                total_units = (subject.lec_units or 0) + (subject.lab_units or 0)
                if total_units == 0:
                    # Equal split as fallback
                    each = total_hrs / len(group)
                    for s in group:
                        slot_durations[s.id] = each
                else:
                    for s in group:
                        if s.component_type == 'LAB':
                            ratio = (subject.lab_units or 0) / total_units
                        else:
                            ratio = (subject.lec_units or 0) / total_units
                        slot_durations[s.id] = total_hrs * ratio

        # Build placement list, randomize then sort longest-first for better packing
        slot_list = list(slots)
        random.shuffle(slot_list)
        slot_list.sort(key=lambda s: slot_durations.get(s.id, 3), reverse=True)

        # Cycle through days to distribute load
        day_index = 0

        for slot in slot_list:
            hrs = slot_durations.get(slot.id, 3)
            duration_minutes = int(hrs * 60)

            # Minimum 30 minutes, cap at grid window
            duration_minutes = max(duration_minutes, 30)
            if duration_minutes > (GRID_END - GRID_START):
                duration_minutes = GRID_END - GRID_START

            placed = False

            for attempt in range(len(DAYS)):
                day = DAYS[(day_index + attempt) % len(DAYS)]
                gap_start = find_gap(day, duration_minutes)

                if gap_start is not None:
                    gap_end = gap_start + duration_minutes
                    occupied[day].append((gap_start, gap_end))

                    start_h, start_m = divmod(gap_start, 60)
                    end_h, end_m = divmod(gap_end, 60)

                    slot.days = [day]
                    slot.start_time = dt_time(start_h, start_m)
                    slot.end_time = dt_time(end_h, end_m)
                    slot.save(update_fields=['days', 'start_time', 'end_time'])

                    day_index = (day_index + attempt + 1) % len(DAYS)
                    placed = True
                    break

            if not placed:
                raise ValueError(
                    f"Could not place {slot.subject.code} ({slot.component_type}) — "
                    f"all days are full for {section.session} session. "
                    f"Try reducing subject hours or adding Saturday."
                )

        return Schedule.objects.filter(
            term=term, section=section
        ).select_related('subject', 'professor__user', 'room', 'section', 'term')
