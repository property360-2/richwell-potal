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
    def get_capacity_bottlenecks(term):
        """
        Identifies students who are 'APPROVED' for advising but have no section assignment,
        and compares this demand against available section capacity.
        
        @param {Term} term - The academic term to analyze.
        @returns {list} List of bottleneck objects per program/year.
        """
        from apps.students.models import StudentEnrollment
        from apps.sections.models import Section, SectionStudent
        from django.db.models import Count, Sum, F

        # 1. Get all students APPROVED for this term
        approved_enrollments = StudentEnrollment.objects.filter(
            term=term, 
            advising_status='APPROVED'
        ).select_related('student', 'student__program')

        # 2. Find those without a SectionStudent record for this term
        waiting_students = []
        for enrollment in approved_enrollments:
            has_section = SectionStudent.objects.filter(
                student=enrollment.student,
                term=term
            ).exists()
            
            if not has_section:
                waiting_students.append(enrollment)

        # 3. Group waiting students by Program and Year Level
        stats = {}
        for enrollment in waiting_students:
            key = (enrollment.student.program_id, enrollment.year_level)
            if key not in stats:
                stats[key] = {
                    "program_id": enrollment.student.program_id,
                    "program_name": enrollment.student.program.name,
                    "program_code": enrollment.student.program.code,
                    "year_level": enrollment.year_level,
                    "students_waiting": 0,
                    "available_slots": 0,
                    "existing_sections_count": 0
                }
            stats[key]["students_waiting"] += 1

        # 4. Calculate available slots from existing sections
        sections = Section.objects.filter(term=term, is_active=True).annotate(
            current_count=Count('student_assignments')
        )

        for section in sections:
            key = (section.program_id, section.year_level)
            if key in stats:
                remaining = max(0, section.max_students - section.current_count)
                stats[key]["available_slots"] += remaining
                stats[key]["existing_sections_count"] += 1

        # 5. Format the report
        report = []
        for key, data in stats.items():
            waiting = data["students_waiting"]
            available = data["available_slots"]
            deficit = max(0, waiting - available)
            
            import math
            data["sections_needed"] = math.ceil(deficit / 40.0) if deficit > 0 else 0
            data["deficit"] = deficit
            data["needs_assignment_only"] = waiting > 0 and deficit == 0
            
            report.append(data)

        return report

    @staticmethod
    def get_sectioning_dashboard_report(term):
        """
        Retrieves high-level metrics for the Sectioning Dashboard.
        Includes total sections, capacity vs enrollment, and student segments.
        
        @param {Term} term - The academic term to analyze.
        @returns {dict} Metrics summary.
        """
        from apps.sections.models import Section, SectionStudent
        from apps.students.models import StudentEnrollment
        from django.db.models import Sum, Count

        # 1. Sections and Capacity
        active_sections = Section.objects.filter(term=term, is_active=True)
        total_sections = active_sections.count()
        total_capacity = active_sections.aggregate(total=Sum('max_students'))['total'] or 0

        # 2. Student Segments (Approved only)
        approved_qs = StudentEnrollment.objects.filter(term=term, advising_status='APPROVED')
        total_approved = approved_qs.count()
        regular_count = approved_qs.filter(is_regular=True).count()
        irregular_count = approved_qs.filter(is_regular=False).count()

        # 3. Enrollment Progress
        enrolled_count = SectionStudent.objects.filter(term=term).count()
        
        # 4. Backlog (Approved but not assigned to a section)
        backlog_count = approved_qs.exclude(
            student__section_assignments__term=term
        ).count()


        # 6. Unique Courses
        from apps.scheduling.models import Schedule
        unique_courses = Schedule.objects.filter(term=term).values('subject').distinct().count()

        # 7. Program Metrics (Minimal Cards)
        from apps.academics.models import Program
        program_metrics = []
        for prog in Program.objects.filter(is_active=True).order_by('code'):
            year_levels = []
            for y_lvl in range(1, 5):
                # Count approved students for this program/year
                students_qs = approved_qs.filter(
                    student__program=prog, 
                    year_level=y_lvl
                )
                total_students = students_qs.count()
                
                secs = active_sections.filter(program=prog, year_level=y_lvl).annotate(
                    enrolled=Count('student_assignments')
                )
                sec_count = secs.count()
                
                # Backlog for THIS specific program/year
                unassigned_count = students_qs.exclude(
                    student__section_assignments__term=term
                ).count()

                total_enrolled = sum(s.enrolled for s in secs)
                avg_students = total_enrolled / sec_count if sec_count > 0 else 0
                
                year_levels.append({
                    "year_level": y_lvl,
                    "section_count": sec_count,
                    "avg_students": round(avg_students, 1),
                    "unassigned_count": unassigned_count,
                    "total_students": total_students,
                    "total_target": sum(s.target_students for s in secs) if sec_count > 0 else 0
                })
            
            if year_levels:
                program_metrics.append({
                    "program_id": prog.id,
                    "program_code": prog.code.replace('_', ' '),
                    "program_name": prog.name,
                    "year_levels": year_levels,
                })

        total_target_capacity = active_sections.aggregate(total=Sum('target_students'))['total'] or 0
        excess_students = max(0, total_approved - total_target_capacity)

        return {
            "total_sections": total_sections,
            "total_capacity": total_capacity,
            "total_target_capacity": total_target_capacity,
            "total_approved": total_approved,
            "regular_students": regular_count,
            "irregular_students": irregular_count,
            "enrolled_count": enrolled_count,
            "backlog_count": backlog_count,
            "unique_courses": unique_courses,
            "utilization_rate": round((enrolled_count / total_capacity * 100), 1) if total_capacity > 0 else 0,
            "program_metrics": program_metrics,
            "excess_students": excess_students
        }

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
