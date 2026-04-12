"""
Richwell Portal — Scheduling Service

This service handles the core logic for academic scheduling, including 
publishing schedules, creating/updating manual assignments, and 
the automatic randomization engine for section schedules.

It implements complex conflict detection for Professors, Rooms, and Sections.
"""

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
        link_url = f"{frontend_url}/student/picking"

        for enrollment in enrollments:
            if enrollment.student.user_id:
                Notification.objects.create(
                    recipient=enrollment.student.user,
                    title="Schedule Published",
                    message=f"Class schedules for {term.code} are now available. You may now view your assigned schedule or pick your preferred section (if applicable).",
                    type=Notification.NotificationType.SCHEDULE,
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
                err = self.check_professor_conflict(professor, term, days, start_time, end_time, exclude_id=exclude_id)
                if err: raise ValueError(err)
            if room:
                err = self.check_room_conflict(room, term, days, start_time, end_time, exclude_id=exclude_id)
                if err: raise ValueError(err)
            if section:
                err = self.check_section_conflict(section, term, days, start_time, end_time, exclude_id=exclude_id)
                if err: raise ValueError(err)

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
        ).select_related('subject', 'section', 'room')

        if exclude_id:
            conflicts = conflicts.exclude(id=exclude_id)
            
        for conflict in conflicts:
            if any(day in conflict.days for day in days):
                return {
                    "type": "professor_conflict",
                    "message": "Professor is currently using this slot:",
                    "time": f"{conflict.days} {conflict.start_time.strftime('%H:%M')} - {conflict.end_time.strftime('%H:%M')}",
                    "subject": f"{conflict.subject.code} - {conflict.subject.description}",
                    "section": conflict.section.name,
                    "professor": f"Prof. {professor.user.last_name}",
                    "room": conflict.room.name if conflict.room else "TBA"
                }
        return None

    def check_room_conflict(self, room, term, days, start_time, end_time, exclude_id=None):
        """
        A room cannot be used for two different schedules at the same time.
        """
        conflicts = Schedule.objects.filter(
            term=term,
            room=room,
            start_time__lt=end_time,
            end_time__gt=start_time
        ).select_related('subject', 'section', 'professor__user')

        if exclude_id:
            conflicts = conflicts.exclude(id=exclude_id)
            
        for conflict in conflicts:
            if any(day in conflict.days for day in days):
                return {
                    "type": "room_conflict",
                    "message": "Room is already occupied by another session:",
                    "time": f"{conflict.days} {conflict.start_time.strftime('%H:%M')} - {conflict.end_time.strftime('%H:%M')}",
                    "subject": f"{conflict.subject.code} - {conflict.subject.description}",
                    "section": conflict.section.name,
                    "professor": f"Prof. {conflict.professor.user.last_name}" if conflict.professor else "TBA",
                    "room": room.name
                }
        return None

    def check_section_conflict(self, section, term, days, start_time, end_time, exclude_id=None):
        """
        A section cannot have two different subjects at the same time.
        """
        conflicts = Schedule.objects.filter(
            term=term,
            section=section,
            start_time__lt=end_time,
            end_time__gt=start_time
        ).select_related('subject', 'room', 'professor__user')

        if exclude_id:
            conflicts = conflicts.exclude(id=exclude_id)
            
        for conflict in conflicts:
            if any(day in conflict.days for day in days):
                return {
                    "type": "section_conflict",
                    "message": "Section already has a subject scheduled at this time:",
                    "time": f"{conflict.days} {conflict.start_time.strftime('%H:%M')} - {conflict.end_time.strftime('%H:%M')}",
                    "subject": f"{conflict.subject.code} - {conflict.subject.description}",
                    "section": section.name,
                    "professor": f"Prof. {conflict.professor.user.last_name}" if conflict.professor else "TBA",
                    "room": conflict.room.name if conflict.room else "TBA"
                }
        return None

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
    def randomize_section_schedule(term, section, respect_professor=False, respect_room=False):
        """
        Auto-generates day/time assignments for all schedule slots of a section.
        
        This is the main orchestration method for the automatic scheduling engine.
        It groups subject components (LEC+LAB) into continuous blocks to ensure 
        students don't have fragmented schedules. It respects section sessions 
        (AM/PM) and optionally checks for professor and room availability.
        
        Args:
            term (Term): The academic term for which to generate the schedule.
            section (Section): The student section to schedule.
            respect_professor (bool): If True, checks professor availability and conflicts.
            respect_room (bool): If True, checks for room capacity and scheduling conflicts.
            
        Returns:
            QuerySet: The updated Schedule records for the section.
        """
        import random
        from collections import defaultdict
        
        DAYS = ['M', 'T', 'W', 'TH', 'F', 'S']
        service = SchedulingService()

        # 1. Initialize and clean existing assignments
        slots = Schedule.objects.filter(term=term, section=section).select_related('subject').order_by('id')
        if not slots.exists(): raise ValueError("No schedule slots found for this section.")
        slots.update(days=[], start_time=None, end_time=None)

        # 2. Get Constraints and Configuration
        grid_start, grid_end = service._get_grid_bounds(section)
        constraints = service._prepare_constraints(term, section, respect_professor, respect_room)
        qualified_profs = service._get_qualified_profs(slots) if respect_professor else {}
        available_rooms = service._get_available_rooms(section) if respect_room else []
        
        # Track occupied intervals per day for the current section
        section_occupied = {d: [] for d in DAYS}

        # 3. Group and Sort Subject Blocks
        # Group LEC and LAB components of the same subject to keep them together in the schedule
        subject_groups = defaultdict(list)
        for slot in slots: subject_groups[slot.subject_id].append(slot)

        subject_durations = service._calculate_subject_durations(subject_groups, grid_start, grid_end)
        subject_durations.sort(key=lambda x: x['total_minutes'], reverse=True) # Longest first for better packing

        # 4. Placement Loop
        day_index = 0
        for item in subject_durations:
            placed = False
            for attempt in range(len(DAYS)):
                day = DAYS[(day_index + attempt) % len(DAYS)]
                
                gap_start, assigned_prof_id, assigned_room_id = service._find_gap_for_subject_group(
                    day=day,
                    total_duration=item['total_minutes'],
                    slots_in_group=item['slots'],
                    section=section,
                    grid_start=grid_start,
                    grid_end=grid_end,
                    constraints=constraints,
                    section_occupied=section_occupied[day],
                    qualified_profs=qualified_profs.get(item['subject_id'], []),
                    available_rooms=available_rooms,
                    respect_professor=respect_professor,
                    respect_room=respect_room
                )

                if gap_start is not None:
                    service._assign_slots_to_gap(
                        day=day,
                        gap_start=gap_start,
                        total_duration=item['total_minutes'],
                        slots=item['slots'],
                        assigned_prof_id=assigned_prof_id,
                        assigned_room_id=assigned_room_id,
                        respect_professor=respect_professor,
                        respect_room=respect_room
                    )
                    
                    section_occupied[day].append((gap_start, gap_start + item['total_minutes']))
                    day_index = (day_index + attempt + 1) % len(DAYS)
                    placed = True
                    break

            if not placed:
                # Diagnostics to explain WHY it failed
                subject_code = item['slots'][0].subject.code
                total_mins = item['total_minutes']
                
                # Check if it would fit WITHOUT prof/room constraints
                can_fit_anywhere = False
                for d in DAYS:
                    gap, _, _ = service._find_gap_for_subject_group(
                        day=d, total_duration=total_mins, slots_in_group=item['slots'],
                        section=section, grid_start=grid_start, grid_end=grid_end,
                        constraints=constraints, section_occupied=section_occupied[d],
                        qualified_profs={}, available_rooms=[],
                        respect_professor=False, respect_room=False
                    )
                    if gap is not None:
                        can_fit_anywhere = True
                        break
                
                if not can_fit_anywhere:
                    reason = f"the {section.session} session grid is physically full or contains too many gaps."
                elif respect_professor and respect_room:
                    reason = "professor or room availability constraints are too restrictive."
                elif respect_professor:
                    reason = "professor availability or existing schedule conflicts."
                elif respect_room:
                    reason = "no available rooms with sufficient capacity in this time slot."
                else:
                    reason = f"conflict with {total_mins // 60}h {total_mins % 60}m subject block."

                raise ValueError(
                    f"Could not place {subject_code} — {reason} "
                    f"Try disabling 'Respect Professor/Room' or manually adjusting the grid."
                )

        return Schedule.objects.filter(term=term, section=section).select_related(
            'subject', 'professor__user', 'room', 'section', 'term'
        )

    def _get_grid_bounds(self, section):
        """Returns the (START, END) minutes for the section's session (AM/PM)."""
        if section.session == 'AM':
            return 7 * 60, 13 * 60 # 7:00 AM - 1:00 PM
        return 13 * 60, 19 * 60     # 1:00 PM - 7:00 PM

    def _prepare_constraints(self, term, section, respect_prof, respect_room):
        """Fetches existing schedules and availability grids to act as constraints."""
        from collections import defaultdict
        from apps.faculty.models import ProfessorAvailability

        constraints = {
            'prof_schedules': defaultdict(list),
            'room_schedules': defaultdict(list),
            'prof_availabilities': defaultdict(list)
        }

        if respect_prof or respect_room:
            other_schedules = Schedule.objects.filter(
                term=term, start_time__isnull=False, end_time__isnull=False
            ).exclude(section=section)

            for s in other_schedules:
                duration_mins = (s.end_time.hour * 60 + s.end_time.minute) - (s.start_time.hour * 60 + s.start_time.minute)
                sc_start = s.start_time.hour * 60 + s.start_time.minute
                sc_end = sc_start + duration_mins
                for d in s.days:
                    if respect_prof and s.professor_id:
                        constraints['prof_schedules'][s.professor_id].append((d, sc_start, sc_end))
                    if respect_room and s.room_id:
                        constraints['room_schedules'][s.room_id].append((d, sc_start, sc_end))

        if respect_prof:
            avails = ProfessorAvailability.objects.all() # Optimization: Could filter by profs in section
            for av in avails:
                constraints['prof_availabilities'][av.professor_id].append((av.day, av.session))
        
        return constraints

    def _get_qualified_profs(self, slots):
        """Returns a mapping of subject IDs to professor IDs qualified to teach them."""
        from collections import defaultdict
        from apps.faculty.models import ProfessorSubject
        qualified = defaultdict(list)
        p_subs = ProfessorSubject.objects.filter(subject_id__in=[s.subject_id for s in slots])
        for ps in p_subs: qualified[ps.subject_id].append(ps.professor_id)
        return qualified

    def _get_available_rooms(self, section):
        """Returns a list of rooms with sufficient capacity for the section."""
        import random
        capacity = section.students.count() if hasattr(section, 'students') else 40
        rooms = list(Room.objects.filter(is_active=True, capacity__gte=capacity).values_list('id', 'room_type'))
        random.shuffle(rooms)
        return rooms

    def _calculate_subject_durations(self, subject_groups, grid_start, grid_end):
        """Calculates total weekly minutes for each subject group."""
        durations = []
        max_duration = grid_end - grid_start
        for subject_id, group in subject_groups.items():
            subject = group[0].subject
            total_hrs = float(subject.hrs_per_week or subject.total_units or 3)
            duration_minutes = min(int(total_hrs * 60), max_duration)
            durations.append({'subject_id': subject_id, 'slots': group, 'total_minutes': duration_minutes})
        return durations

    def _find_gap_for_subject_group(self, **kwargs):
        """
        Internal logic to find a valid time gap on a specific day for a subject block.
        Considers section, professor, and room constraints.
        """
        import random
        # Extract params from kwargs for cleaner signature in long list
        day = kwargs['day']
        total_duration = kwargs['total_duration']
        slots_in_group = kwargs['slots_in_group']
        section = kwargs['section']
        grid_start, grid_end = kwargs['grid_start'], kwargs['grid_end']
        constraints = kwargs['constraints']
        section_occupied = kwargs['section_occupied']
        qualified_profs = kwargs['qualified_profs']
        available_rooms = kwargs['available_rooms']
        respect_prof = kwargs['respect_professor']
        respect_room = kwargs['respect_room']

        # Determine fixed/candidate professor
        fixed_prof_id = next((s.professor_id for s in slots_in_group if s.professor_id), None)
        candidate_profs = [fixed_prof_id] if fixed_prof_id else (list(qualified_profs) if respect_prof else [None])
        random.shuffle(candidate_profs)
        if not candidate_profs: candidate_profs = [None]

        # Determine fixed/candidate room (usually LEC by default for the block)
        fixed_room_id = next((s.room_id for s in slots_in_group if s.room_id), None)
        candidate_rooms = [fixed_room_id] if fixed_room_id else ([r_id for r_id, r_type in available_rooms if r_type == 'LECTURE'] if respect_room else [None])
        if not candidate_rooms: candidate_rooms = [None]

        for p_id in candidate_profs:
            if respect_prof and p_id:
                has_avail = any(av_day == day and av_session == section.session for av_day, av_session in constraints['prof_availabilities'].get(p_id, []))
                if not has_avail: continue
            
            for r_id in candidate_rooms:
                blocking = sorted(
                    section_occupied + 
                    ([(st, en) for d, st, en in constraints['prof_schedules'].get(p_id, []) if d == day] if respect_prof and p_id else []) +
                    ([(st, en) for d, st, en in constraints['room_schedules'].get(r_id, []) if d == day] if respect_room and r_id else []),
                    key=lambda x: x[0]
                )
                
                candidate = grid_start
                for occ_start, occ_end in blocking:
                    if candidate + total_duration <= occ_start: return candidate, p_id, r_id
                    candidate = max(candidate, occ_end)
                
                if candidate + total_duration <= grid_end: return candidate, p_id, r_id
                
        return None, None, None

    def _assign_slots_to_gap(self, **kwargs):
        """Saves final assignments to the database for all slots in a subject block."""
        from datetime import time as dt_time
        day, current_start, total_duration = kwargs['day'], kwargs['gap_start'], kwargs['total_duration']
        slots, prof_id, room_id = kwargs['slots'], kwargs['assigned_prof_id'], kwargs['assigned_room_id']
        
        subject = slots[0].subject
        total_units = (subject.lec_units or 0) + (subject.lab_units or 0)
        
        for slot in slots:
            if len(slots) == 1: slot_duration = total_duration
            elif total_units > 0:
                units = subject.lab_units if slot.component_type == 'LAB' else subject.lec_units
                slot_duration = int(total_duration * (units / total_units))
            else: slot_duration = total_duration // len(slots)
            
            slot_end = current_start + slot_duration
            slot.days, slot.start_time, slot.end_time = [day], dt_time(*(divmod(current_start, 60))), dt_time(*(divmod(slot_end, 60)))
            
            if kwargs['respect_professor'] and not slot.professor_id and prof_id: slot.professor_id = prof_id
            if kwargs['respect_room'] and not slot.room_id and room_id: slot.room_id = room_id
                
            slot.save(update_fields=['days', 'start_time', 'end_time', 'professor', 'room'])
            current_start = slot_end
    @staticmethod
    def get_schedule_insights(queryset):
        """
        Groups a list of schedules by day for the insight panels.
        """
        days_map = {
            'M': 'Monday', 'T': 'Tuesday', 'W': 'Wednesday', 
            'TH': 'Thursday', 'F': 'Friday', 'S': 'Saturday'
        }
        results = {name: [] for name in days_map.values()}
        
        for sched in queryset.order_by('start_time'):
            if not sched.start_time or not sched.end_time:
                continue
                
            time_str = f"{sched.start_time.strftime('%H:%M')} - {sched.end_time.strftime('%H:%M')}"
            for d_code in sched.days:
                day_name = days_map.get(d_code)
                if day_name:
                    results[day_name].append({
                        "id": sched.id,
                        "time": time_str,
                        "subject": f"{sched.subject.code} - {sched.subject.description}",
                        "section": sched.section.name,
                        "room": sched.room.name if sched.room else "TBA",
                        "professor": f"Prof. {sched.professor.user.last_name}" if sched.professor else "TBA"
                    })
        return results
