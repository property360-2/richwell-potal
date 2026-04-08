"""
Richwell Portal — Admission Report Service

Handles the aggregation and computation of enrollment monitoring data.
Provides daily, weekly, and monthly breakdowns of enrollee counts 
across different departments (SHS, CHED, TECHVOC) and individual programs.
"""

from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from apps.students.models import StudentEnrollment
from apps.academics.models import Program
from datetime import date, timedelta
import calendar

class AdmissionReportService:
    """
    Service for generating detailed enrollment monitoring reports.
    """

    @staticmethod
    def get_admission_report_data(term_id, year=None, month=None):
        """
        Retrieves aggregated enrollment data for a specific term and month.
        Returns daily breakdown, weekly summaries, and per-program counts.
        """
        # If no month/year provided, use current
        today = date.today()
        year = year or today.year
        month = month or today.month

        # Define data range
        _, last_day = calendar.monthrange(year, month)
        start_date = date(year, month, 1)
        end_date = date(year, month, last_day)

        # 1. Calculate "Previous Data" (Balance before this month)
        # This counts all approved enrollments for this term before the start of the month
        previous_balance = StudentEnrollment.objects.filter(
            term_id=term_id,
            advising_status='APPROVED',
            enrollment_date__lt=start_date
        ).values('student__program__department').annotate(count=Count('id'))

        prev_map = {item['student__program__department']: item['count'] for item in previous_balance}
        
        # 2. Get daily changes for this month
        daily_changes = StudentEnrollment.objects.filter(
            term_id=term_id,
            advising_status='APPROVED',
            enrollment_date__range=(start_date, end_date + timedelta(days=1))
        ).annotate(
            date=TruncDate('enrollment_date')
        ).values('date', 'student__program__department').annotate(count=Count('id')).order_by('date')

        # 3. Get Per-Program breakdown (To Date)
        program_data = StudentEnrollment.objects.filter(
            term_id=term_id,
            advising_status='APPROVED',
            enrollment_date__lte=end_date + timedelta(days=1)
        ).values(
            'student__program__code', 
            'student__program__name',
            'student__program__department'
        ).annotate(count=Count('id')).order_by('student__program__department', 'student__program__code')

        # Format Monthly Log (for vertical table)
        monthly_breakdown = []
        # Keep track of running totals per department
        running_totals = {dept[0]: prev_map.get(dept[0], 0) for dept in Program.DEPARTMENT_CHOICES}
        
        # Map daily changes for easy lookup
        change_map = {}
        for entry in daily_changes:
            d_key = entry['date'].isoformat()
            if d_key not in change_map:
                change_map[d_key] = {}
            change_map[d_key][entry['student__program__department']] = entry['count']

        for day in range(1, last_day + 1):
            cur_date = date(year, month, day)
            date_str = cur_date.isoformat()
            
            day_row = {
                "date": date_str,
                "day": day,
            }
            
            for dept_code, _ in Program.DEPARTMENT_CHOICES:
                new_enrollees = change_map.get(date_str, {}).get(dept_code, 0)
                prev_val = running_totals[dept_code]
                running_totals[dept_code] += new_enrollees
                
                day_row[dept_code] = {
                    "previous": prev_val,
                    "new": new_enrollees,
                    "total": running_totals[dept_code]
                }
            
            monthly_breakdown.append(day_row)

        # Comparative Summary List
        summary_list = []
        for dept_code, dept_name in Program.DEPARTMENT_CHOICES:
            current_total = running_totals.get(dept_code, 0)
            previous_count = prev_map.get(dept_code, 0)
            summary_list.append({
                "department": dept_code,
                "label": dept_name,
                "previous": previous_count,
                "total": current_total,
                "diff": current_total - previous_count
            })

        # Daily Breakdown (for weekly horizontal table)
        daily_breakdown_formatted = {}
        for date_str, depts in change_map.items():
            daily_breakdown_formatted[date_str] = depts

        # Enhanced Program Data (Previous vs New)
        # We calculate total count as of end_date
        total_program_counts = StudentEnrollment.objects.filter(
            term_id=term_id,
            advising_status='APPROVED',
            enrollment_date__lte=end_date + timedelta(days=1)
        ).values('student__program__code').annotate(total=Count('id'))
        
        total_map = {item['student__program__code']: item['total'] for item in total_program_counts}

        # New enrollees this month per program
        new_program_counts = StudentEnrollment.objects.filter(
            term_id=term_id,
            advising_status='APPROVED',
            enrollment_date__range=(start_date, end_date + timedelta(days=1))
        ).values('student__program__code').annotate(new=Count('id'))
        
        new_map = {item['student__program__code']: item['new'] for item in new_program_counts}

        enhanced_programs = []
        for p in program_data:
            code = p['student__program__code']
            total = total_map.get(code, 0)
            new = new_map.get(code, 0)
            enhanced_programs.append({
                "code": code,
                "name": p['student__program__name'],
                "department": p['student__program__department'],
                "total": total,
                "diff": new,
                "previous": total - new
            })

        return {
            "summary": summary_list,
            "daily_breakdown": daily_breakdown_formatted,
            "monthly_breakdown": monthly_breakdown,
            "programs": enhanced_programs
        }
