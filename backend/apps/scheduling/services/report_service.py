"""
Richwell Portal — Scheduling Report Service

Handles complex analytical queries for scheduling, including faculty load reports, 
section completion tracking, and real-time resource availability checks.
"""

from django.db import models
from apps.scheduling.models import Schedule
from apps.faculty.models import Professor
from apps.facilities.models import Room
from apps.sections.models import Section

class ReportService:
    """
    Provides data for Dean's insights and real-time resource validation.
    """

    @staticmethod
    def get_faculty_load_report(term):
        """
        Calculates current teaching hours vs target for all active faculty.
        
        @param {Term} term - The academic term to analyze.
        @returns {list} List of faculty load summaries.
        """
        professors = Professor.objects.filter(is_active=True).select_related('user')
        report = []
        for prof in professors:
            hours = Schedule.objects.filter(term=term, professor=prof).aggregate(
                total=models.Sum('subject__hrs_per_week')
            )['total'] or 0
            
            target = 24 if prof.employment_status == 'FULL_TIME' else 12
            report.append({
                "professor_id": prof.id,
                "name": f"{prof.user.first_name} {prof.user.last_name}",
                "status": prof.employment_status,
                "current_hours": float(hours),
                "target_hours": target,
                "is_underloaded": hours < target
            })
        return report

    @staticmethod
    def get_section_completion_report(term):
        """
        Tracks how many schedule slots have been fully assigned (Time/Room/Prof) per section.
        
        @param {Term} term - The academic term to analyze.
        @returns {list} List of section completion objects.
        """
        sections = Section.objects.filter(term=term)
        report = []
        for section in sections:
            total_slots = Schedule.objects.filter(term=term, section=section).count()
            assigned_slots = Schedule.objects.filter(
                term=term, 
                section=section,
                professor__isnull=False,
                room__isnull=False,
                start_time__isnull=False
            ).exclude(days=[]).count()
            
            report.append({
                "section_id": section.id,
                "section_name": section.name,
                "assigned": assigned_slots,
                "total": total_slots
            })
        return report

    @staticmethod
    def check_resource_availability(term, days, start_time, end_time, exclude_id, scheduling_service):
        """
        Batch checks availability for all active professors and rooms for a specific time slot.
        """
        # 1. Professors
        professors = Professor.objects.filter(is_active=True).select_related('user')
        prof_status = []
        for prof in professors:
            err = scheduling_service.check_professor_conflict(prof, term, days, start_time, end_time, exclude_id=exclude_id)
            prof_status.append({"id": prof.id, "is_available": err is None, "conflict": err})

        # 2. Rooms
        rooms = Room.objects.filter(is_active=True)
        room_status = []
        for r in rooms:
            err = scheduling_service.check_room_conflict(r, term, days, start_time, end_time, exclude_id=exclude_id)
            room_status.append({"id": r.id, "is_available": err is None, "conflict": err})

        return {"professors": prof_status, "rooms": room_status}
