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
                    message=f"Class schedules for {term.code} are now available. You may pick your section/schedule.",
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
        Each subject (with all its components like LEC+LAB) gets ONE continuous block on ONE day.
        Respects section session (AM → 7:00-13:00, PM → 13:00-19:00).
        Optionally respects existing professor availability grids and other room/professor schedules.
        """
        import random
        from datetime import time as dt_time
        from collections import defaultdict
        from apps.faculty.models import ProfessorAvailability

        DAYS = ['M', 'T', 'W', 'TH', 'F', 'S']

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

        # Pre-fetch existing global constraints if respecting limits
        global_prof_schedules = defaultdict(list)
        global_room_schedules = defaultdict(list)
        prof_availabilities = defaultdict(list)

        if respect_professor or respect_room:
            # Get all other schedules in the term that are assigned a time
            other_schedules = Schedule.objects.filter(
                term=term, start_time__isnull=False, end_time__isnull=False
            ).exclude(section=section)

            for s in other_schedules:
                duration_mins = (s.end_time.hour * 60 + s.end_time.minute) - (s.start_time.hour * 60 + s.start_time.minute)
                sc_start = s.start_time.hour * 60 + s.start_time.minute
                sc_end = sc_start + duration_mins
                
                for d in s.days:
                    if respect_professor and s.professor_id:
                        global_prof_schedules[s.professor_id].append((d, sc_start, sc_end))
                    if respect_room and s.room_id:
                        global_room_schedules[s.room_id].append((d, sc_start, sc_end))

        if respect_professor:
            prof_ids = [s.professor_id for s in slots if s.professor_id]
            avails = ProfessorAvailability.objects.filter(professor_id__in=prof_ids)
            for av in avails:
                prof_availabilities[av.professor_id].append((av.day, av.session))

        all_available_rooms = []
        if respect_room:
            capacity_needed = section.students.count() if hasattr(section, 'students') else 40
            all_available_rooms = list(Room.objects.filter(is_active=True, capacity__gte=capacity_needed).values_list('id', 'room_type'))
            random.shuffle(all_available_rooms)

        qualified_profs = defaultdict(list)
        if respect_professor:
            from apps.faculty.models import ProfessorSubject
            p_subs = ProfessorSubject.objects.filter(subject_id__in=[s.subject_id for s in slots])
            for ps in p_subs:
                qualified_profs[ps.subject_id].append(ps.professor_id)

        # Track occupied intervals per day (Section constraints)
        occupied = {d: [] for d in DAYS}

        def find_gap_for_group(day, total_duration, subject_id, slots_in_group, rejection_reasons=None):
            """Find available gap for a subject (all components together)."""
            
            # For simplicity, we assume if one component has a prof/room assigned, 
            # we respect those. If multiple have different ones (unusual), we'd need more logic.
            # Here we just take the first assigned prof/room if any.
            prof_id = next((s.professor_id for s in slots_in_group if s.professor_id), None)
            room_id = next((s.room_id for s in slots_in_group if s.room_id), None)
            
            # Determine candidate professors
            candidate_profs = [prof_id] if prof_id else []
            if respect_professor and not prof_id:
                candidate_profs = list(qualified_profs.get(subject_id, []))
                random.shuffle(candidate_profs)
                if not candidate_profs: candidate_profs = [None]
            elif not respect_professor and not prof_id:
                candidate_profs = [None]

            # Determine candidate rooms (matching first component's type usually)
            candidate_rooms = [room_id] if room_id else []
            if respect_room and not room_id:
                # We'll just look for a LECTURE room by default for the block
                candidate_rooms = [r_id for r_id, r_type in all_available_rooms if r_type == 'LECTURE']
                if not candidate_rooms: candidate_rooms = [None]
            elif not respect_room and not room_id:
                candidate_rooms = [None]

            for p_id in candidate_profs:
                # Check professor availability grid if p_id exists
                if respect_professor and p_id and p_id in prof_availabilities:
                    has_avail = False
                    for av_day, av_session in prof_availabilities[p_id]:
                        if av_day == day and av_session == section.session:
                            has_avail = True
                            break
                    if not has_avail: continue
                
                for r_id in candidate_rooms:
                    blocking_intervals = []
                    
                    # 1. Section Conflicts
                    for st, en in occupied[day]:
                        blocking_intervals.append((st, en))
                        
                    # 2. Prof Conflicts
                    if respect_professor and p_id:
                        for d, st, en in global_prof_schedules.get(p_id, []):
                            if d == day: blocking_intervals.append((st, en))
                                
                    # 3. Room Conflicts
                    if respect_room and r_id:
                        for d, st, en in global_room_schedules.get(r_id, []):
                            if d == day: blocking_intervals.append((st, en))
                                
                    blocking_intervals = sorted(blocking_intervals, key=lambda x: x[0])
                    candidate = GRID_START
                    valid_time = False

                    # Packing logic
                    for occ_start, occ_end in blocking_intervals:
                        if candidate + total_duration <= occ_start:
                            valid_time = True
                            break
                        candidate = max(candidate, occ_end)

                    if not valid_time and candidate + total_duration <= GRID_END:
                        valid_time = True

                    if valid_time:
                        return candidate, p_id, r_id

            if rejection_reasons is not None:
                rejection_reasons.append(f"No valid combination on {day}.")
            return None, None, None

        # Group slots by subject
        subject_groups = defaultdict(list)
        for slot in slots:
            subject_groups[slot.subject_id].append(slot)

        # Calculate duration for each group (Total weekly hours for the subject)
        subject_durations = []
        for subject_id, group in subject_groups.items():
            subject = group[0].subject
            total_hrs = float(subject.hrs_per_week or subject.total_units or 3)
            duration_minutes = int(total_hrs * 60)
            
            # Cap at grid window
            duration_minutes = min(duration_minutes, (GRID_END - GRID_START))
            subject_durations.append({
                'subject_id': subject_id,
                'slots': group,
                'total_minutes': duration_minutes
            })

        # Sort by longest duration first for better packing
        subject_durations.sort(key=lambda x: x['total_minutes'], reverse=True)

        day_index = 0
        for item in subject_durations:
            placed = False
            rejection_reasons = []

            for attempt in range(len(DAYS)):
                day = DAYS[(day_index + attempt) % len(DAYS)]
                gap_start, assigned_prof_id, assigned_room_id = find_gap_for_group(
                    day, item['total_minutes'], item['subject_id'], item['slots'], rejection_reasons
                )

                if gap_start is not None:
                    # Place all components sequentially in this gap
                    current_start = gap_start
                    
                    # Split the total duration among components based on unit ratio IF multiple slots
                    # (Similar to old logic but strictly sequential now)
                    subject = item['slots'][0].subject
                    total_units = (subject.lec_units or 0) + (subject.lab_units or 0)
                    
                    for slot in item['slots']:
                        # Calculate slot specific duration within the block
                        if len(item['slots']) == 1:
                            slot_duration = item['total_minutes']
                        elif total_units > 0:
                            units = subject.lab_units if slot.component_type == 'LAB' else subject.lec_units
                            slot_duration = int(item['total_minutes'] * (units / total_units))
                        else:
                            slot_duration = item['total_minutes'] // len(item['slots'])
                        
                        slot_end = current_start + slot_duration
                        
                        start_h, start_m = divmod(current_start, 60)
                        end_h, end_m = divmod(slot_end, 60)

                        slot.days = [day]
                        slot.start_time = dt_time(start_h, start_m)
                        slot.end_time = dt_time(end_h, end_m)
                        
                        if respect_professor and not slot.professor_id and assigned_prof_id:
                            slot.professor_id = assigned_prof_id
                        if respect_room and not slot.room_id and assigned_room_id:
                            slot.room_id = assigned_room_id
                            
                        slot.save(update_fields=['days', 'start_time', 'end_time', 'professor', 'room'])
                        current_start = slot_end

                    occupied[day].append((gap_start, gap_start + item['total_minutes']))
                    day_index = (day_index + attempt + 1) % len(DAYS)
                    placed = True
                    break

            if not placed:
                raise ValueError(
                    f"Could not place {item['slots'][0].subject.code} — "
                    f"tried all days for {section.session} session."
                )

        return Schedule.objects.filter(
            term=term, section=section
        ).select_related('subject', 'professor__user', 'room', 'section', 'term')
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
