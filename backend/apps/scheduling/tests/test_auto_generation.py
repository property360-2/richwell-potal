import pytest
from apps.scheduling.services.scheduling_service import SchedulingService
from apps.sections.models import Section
from apps.academics.models import Subject, Program, CurriculumVersion
from apps.terms.models import Term
from apps.scheduling.models import Schedule
from django.contrib.auth import get_user_model
from datetime import date, time

User = get_user_model()

@pytest.mark.django_db
class TestAutoGeneration:
    @pytest.fixture(autouse=True)
    def setup_data(self):
        self.program = Program.objects.create(code='AUTO', name='Auto Gen Test')
        self.curriculum = CurriculumVersion.objects.create(program=self.program, version_name='V1')
        self.term = Term.objects.create(
            code='2024-AUTO', academic_year='2024-2025', semester_type='1', is_active=True,
            start_date=date(2024,1,1), end_date=date(2024,6,1),
            enrollment_start=date(2023,12,1), enrollment_end=date(2023,12,31),
            advising_start=date(2023,12,1), advising_end=date(2023,12,31)
        )
        self.section_am = Section.objects.create(name='AM-SEC', term=self.term, program=self.program, year_level=1, section_number=1, session='AM')
        self.section_pm = Section.objects.create(name='PM-SEC', term=self.term, program=self.program, year_level=1, section_number=2, session='PM')
        
        # Create subjects with various units/hours
        self.sub1 = Subject.objects.create(curriculum=self.curriculum, code='A1', description='S1', year_level=1, semester='1', lec_units=3, lab_units=0, total_units=3, hrs_per_week=3)
        self.sub2 = Subject.objects.create(curriculum=self.curriculum, code='A2', description='S2', year_level=1, semester='1', lec_units=2, lab_units=3, total_units=5, hrs_per_week=5)
        
        # Create base schedule slots (without days/times)
        Schedule.objects.create(term=self.term, section=self.section_am, subject=self.sub1, component_type='LEC')
        Schedule.objects.create(term=self.term, section=self.section_am, subject=self.sub2, component_type='LEC')
        Schedule.objects.create(term=self.term, section=self.section_am, subject=self.sub2, component_type='LAB')
        
        self.service = SchedulingService()

    def test_randomize_am_section(self):
        """
        Verify that auto-generation respects the AM time window (7:00 - 13:00) 
        and creates non-overlapping slots.
        """
        results = self.service.randomize_section_schedule(self.term, self.section_am)
        
        assert results.count() == 3
        
        for slot in results:
            assert slot.days is not None
            assert len(slot.days) == 1
            # Check AM window: 7:00 to 13:00
            assert slot.start_time >= time(7, 0)
            assert slot.end_time <= time(13, 0)
            assert slot.start_time < slot.end_time

        # Verify no collisions in the same section on the same day
        day_slots = {}
        for slot in results:
            day = slot.days[0]
            if day not in day_slots: day_slots[day] = []
            
            # Check for overlaps with others on the same day
            for other_st, other_en in day_slots[day]:
                assert slot.start_time >= other_en or slot.end_time <= other_st
            
            day_slots[day].append((slot.start_time, slot.end_time))

    def test_randomize_pm_section(self):
        """
        Verify that auto-generation respects the PM time window (13:00 - 19:00).
        """
        # Create slots for PM section
        Schedule.objects.create(term=self.term, section=self.section_pm, subject=self.sub1, component_type='LEC')
        
        results = self.service.randomize_section_schedule(self.term, self.section_pm)
        
        for slot in results:
            # Check PM window: 13:00 to 19:00
            assert slot.start_time >= time(13, 0)
            assert slot.end_time <= time(19, 0)
