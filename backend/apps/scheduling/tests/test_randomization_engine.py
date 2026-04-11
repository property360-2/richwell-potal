"""
Richwell Portal — Randomization Engine Tests

This module tests the automatic scheduling engine's logic, including:
1. Session-based grid bounds (AM/PM).
2. LEC+LAB grouping and sequential packing.
3. Longest-First subject sorting for efficient packing.
4. Conflict avoidance (Professor, Room, Section).
"""

import pytest
from datetime import time
from django.utils import timezone
from apps.scheduling.models import Schedule
from apps.scheduling.services.scheduling_service import SchedulingService
from apps.terms.models import Term
from apps.academics.models import Program, CurriculumVersion as Curriculum, Subject
from apps.students.models import Student, StudentEnrollment
from apps.sections.models import Section

@pytest.mark.django_db
class TestRandomizationEngine:
    
    @pytest.fixture
    def setup_base_data(self, django_user_model):
        program = Program.objects.create(name="Randomizer Program", code="RP01")
        curriculum = Curriculum.objects.create(program=program, version_name="V2024")
        user = django_user_model.objects.create(
            username=f"randstudent_{timezone.now().timestamp()}", 
            email=f"student_{timezone.now().timestamp()}@example.com",
            first_name="Rand", last_name="Student"
        )
        student = Student.objects.create(
            user=user, idn="R2024", date_of_birth="2000-01-01", gender="MALE",
            program=program, curriculum=curriculum, student_type="CURRENT",
            document_checklist=Student.DEFAULT_CHECKLIST
        )
        term = Term.objects.create(
            code="2024-1", academic_year="2024-2025", semester_type="1",
            start_date="2024-08-01", end_date="2024-12-31", is_active=True,
            advising_start="2024-06-01", advising_end="2024-08-01",
            enrollment_start="2024-07-01", enrollment_end="2024-08-15"
        )
        section = Section.objects.create(
            name="RAND-SECTION", term=term, program=program, year_level=1, session="AM"
        )
        
        # Default subject
        subject = Subject.objects.create(
            curriculum=curriculum, code="SUBJ_A", description="Subject A", 
            year_level=1, semester="1", lec_units=3, total_units=3
        )
        
        # Qualified professor
        professor = django_user_model.objects.create(
            username=f"randprof_{timezone.now().timestamp()}", 
            email=f"prof_{timezone.now().timestamp()}@example.com",
            first_name="Rand", last_name="Prof"
        )
        from apps.faculty.models import Professor
        prof_profile = Professor.objects.create(
            user=professor,
            employee_id=f"EMP-RAND-{timezone.now().timestamp()}",
            date_of_birth="1980-01-01"
        )
        
        return {
            "program": program, "curriculum": curriculum, "student": student, 
            "term": term, "section": section, "subject": subject, "professor": prof_profile
        }

    def setup_method(self):
        self.service = SchedulingService()

    def test_grid_bounds_am(self, setup_base_data):
        """Verify AM session bounds are 7:00 AM - 1:00 PM (420 - 780 mins)."""
        section = setup_base_data["section"]
        section.session = 'AM'
        section.save()
        
        start_min, end_min = self.service._get_grid_bounds(section)
        assert start_min == 7 * 60
        assert end_min == 13 * 60

    def test_grid_bounds_pm(self, setup_base_data):
        """Verify PM session bounds are 1:00 PM - 7:00 PM (780 - 1140 mins)."""
        section = setup_base_data["section"]
        section.session = 'PM'
        section.save()
        
        start_min, end_min = self.service._get_grid_bounds(section)
        assert start_min == 13 * 60
        assert end_min == 19 * 60

    def test_subject_block_grouping_and_sorting(self, setup_base_data):
        """
        Verify that subjects with both LEC and LAB are grouped 
        and the engine sorts them by total weekly duration (Longest-First).
        """
        term = setup_base_data["term"]
        section = setup_base_data["section"]
        curriculum = setup_base_data["curriculum"]
        section.session = 'AM'
        section.save()

        # Create Subject A: 3 Units (3 hrs/week)
        subj_a = setup_base_data["subject"] # Default is 3 LEC
        Schedule.objects.create(term=term, section=section, subject=subj_a, component_type='LEC')
        
        # Create Subject B: 5 Units (3 LEC + 2 LAB = 5 hrs/week)
        subj_b = Subject.objects.create(
            curriculum=curriculum, code="SUBJ_B", description="Subject B",
            year_level=1, semester="1", lec_units=3, lab_units=2, 
            total_units=5, hrs_per_week=5
        )
        Schedule.objects.create(term=term, section=section, subject=subj_b, component_type='LEC')
        Schedule.objects.create(term=term, section=section, subject=subj_b, component_type='LAB')

        # Run randomization
        self.service.randomize_section_schedule(term, section)
        
        # Verify outcomes
        # SUBJ_B (5 hrs) should have been placed first on a day, starting at 7:00 AM
        results = Schedule.objects.filter(term=term, section=section, subject=subj_b).order_by('start_time')
        assert results.count() == 2
        # Start of first slot should be 7:00 AM (420 mins)
        assert results[0].start_time == time(7, 0)
        # End of group (LEC+LAB) should be 5 hours later (12:00 PM)
        # 3 LEC hrs + 2 LAB hrs = 5 hrs total
        assert results[1].end_time == time(12, 0)

    def test_professor_conflict_avoidance(self, setup_base_data):
        """
        Verify that if a professor is busy on one day/time, 
        the engine finds an alternative gap for the section.
        """
        term = setup_base_data["term"]
        section = setup_base_data["section"]
        professor = setup_base_data["professor"]
        subject = setup_base_data["subject"]
        
        # 1. Create a "Blocking" schedule for this professor in ANOTHER section
        other_section = Section.objects.create(
            name="BSIT-CONFLICT", term=term, program=setup_base_data["program"], 
            year_level=1, section_number=2, session="AM"
        )
        Schedule.objects.create(
            term=term,
            section=other_section,
            subject=subject,
            component_type='LEC',
            professor=professor,
            days=['M'],
            start_time=time(7, 0), # 07:00 - 10:00
            end_time=time(10, 0)
        )

        # 2. Add the professor as the ONLY qualified teacher for a subject in the target section
        from apps.faculty.models import ProfessorSubject, ProfessorAvailability
        ProfessorSubject.objects.create(professor=professor, subject=subject)
        
        # MUST set availability for the engine to even consider the professor
        for day_code, _ in ProfessorAvailability.DAY_CHOICES:
            ProfessorAvailability.objects.create(professor=professor, day=day_code, session="AM")
            
        Schedule.objects.create(term=term, section=section, subject=subject, component_type='LEC')

        # 3. Run randomization with respect_professor=True
        # It should NOT place it on Monday 7:00 AM.
        # It should either shift it on Monday to 10:00 AM or pick Tuesday.
        self.service.randomize_section_schedule(term, section, respect_professor=True)
        
        target_slot = Schedule.objects.get(term=term, section=section, subject=subject)
        
        # If Monday, must start AFTER 10:00 AM
        if 'M' in target_slot.days:
            assert target_slot.start_time >= time(10, 0)
        else:
            # If not Monday, any valid AM time is fine
            assert target_slot.start_time >= time(7, 0)

    def test_packing_failure_with_cumulative_overload(self, setup_base_data):
        """Verify that if subjects cumulatively exceed available session hours, it fails."""
        term = setup_base_data["term"]
        section = setup_base_data["section"]
        curriculum = setup_base_data["curriculum"]
        
        # Grid is 6 hours/day * 6 days = 36 hours.
        # Create 10 subjects of 5 hours each = 50 hours.
        for i in range(10):
            subj = Subject.objects.create(
                curriculum=curriculum, code=f"FULL_{i}", 
                description=f"Full Subject {i}", year_level=1, semester="1", 
                total_units=3, hrs_per_week=5
            )
            Schedule.objects.create(term=term, section=section, subject=subj, component_type='LEC')
        
        with pytest.raises(ValueError, match="Could not place"):
            self.service.randomize_section_schedule(term, section)
