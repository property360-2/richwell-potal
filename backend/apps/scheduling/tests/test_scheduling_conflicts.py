import pytest
from apps.scheduling.services.scheduling_service import SchedulingService
from apps.sections.models import Section
from apps.academics.models import Subject, Program, CurriculumVersion
from apps.terms.models import Term
from apps.faculty.models import Professor
from apps.facilities.models import Room
from django.contrib.auth import get_user_model
from datetime import date, time

User = get_user_model()

@pytest.mark.django_db
class TestSchedulingConflicts:
    @pytest.fixture(autouse=True)
    def setup_data(self):
        # Create Dean
        self.user = User.objects.create(username='dean_conflict', role='DEAN', email='dean_conflict@test.com')
        
        # Create Academic Structure
        self.program = Program.objects.create(code='BSIS_C', name='BS Information Systems Conflict Test')
        self.curriculum = CurriculumVersion.objects.create(program=self.program, version_name='2024V1_C')
        
        self.term = Term.objects.create(
            code='2024-1-C', 
            academic_year='2024-2025',
            semester_type='1', 
            is_active=True,
            start_date=date(2024, 6, 1),
            end_date=date(2024, 10, 31),
            enrollment_start=date(2024, 5, 1),
            enrollment_end=date(2024, 6, 15),
            advising_start=date(2024, 5, 1),
            advising_end=date(2024, 5, 30)
        )
        
        # Create Common Subjects
        self.subject1 = Subject.objects.create(
            curriculum=self.curriculum, code='S1', description='Sub 1',
            year_level=1, semester='1', lec_units=3, lab_units=0, total_units=3
        )
        self.subject2 = Subject.objects.create(
            curriculum=self.curriculum, code='S2', description='Sub 2',
            year_level=1, semester='1', lec_units=3, lab_units=0, total_units=3
        )
        
        # Create Common Professors
        prof_user1 = User.objects.create(username='p1', last_name='P1', email='p1@test.com')
        self.professor1 = Professor.objects.create(user=prof_user1, employee_id='E-P1', department='IT', date_of_birth=date(1980,1,1))
        
        prof_user2 = User.objects.create(username='p2', last_name='P2', email='p2@test.com')
        self.professor2 = Professor.objects.create(user=prof_user2, employee_id='E-P2', department='IT', date_of_birth=date(1980,1,1))
        
        # Create Common Rooms
        self.room1 = Room.objects.create(name='R1', room_type='LECTURE', capacity=40)
        self.room2 = Room.objects.create(name='R2', room_type='LECTURE', capacity=40)
        
        # Create Sections
        self.section1 = Section.objects.create(name='SEC 1', term=self.term, program=self.program, year_level=1, section_number=1, session='AM')
        self.section2 = Section.objects.create(name='SEC 2', term=self.term, program=self.program, year_level=1, section_number=2, session='AM')
        
        self.service = SchedulingService()

    def test_professor_time_overlap_conflict(self):
        """
        Verify that a professor cannot be scheduled for two different subjects/sections 
        at overlapping times on the same day.
        """
        # Assign Prof 1 to Section 1
        self.service.create_or_update_schedule(
            self.term, self.section1, self.subject1, 'LEC',
            professor=self.professor1, room=self.room1,
            days=['M'], start_time=time(8, 0), end_time=time(10, 0)
        )
        
        # Try assigning Prof 1 to Section 2 at overlapping time (9:00 - 11:00)
        with pytest.raises(ValueError) as excinfo:
            self.service.create_or_update_schedule(
                self.term, self.section2, self.subject2, 'LEC',
                professor=self.professor1, room=self.room2,
                days=['M'], start_time=time(9, 0), end_time=time(11, 0)
            )
        assert "Professor is currently using this slot" in str(excinfo.value)

    def test_room_time_overlap_conflict(self):
        """
        Verify that a room cannot be scheduled for two different classes 
        at overlapping times on the same day.
        """
        # Occupy Room 1
        self.service.create_or_update_schedule(
            self.term, self.section1, self.subject1, 'LEC',
            professor=self.professor1, room=self.room1,
            days=['T'], start_time=time(13, 0), end_time=time(15, 0)
        )
        
        # Try occupying Room 1 for another class at overlapping time (14:00 - 16:00)
        with pytest.raises(ValueError) as excinfo:
            self.service.create_or_update_schedule(
                self.term, self.section2, self.subject2, 'LEC',
                professor=self.professor2, room=self.room1,
                days=['T'], start_time=time(14, 0), end_time=time(16, 0)
            )
        assert "Room is already occupied" in str(excinfo.value)

    def test_section_time_overlap_conflict(self):
        """
        Verify that a section cannot have two different subjects scheduled 
        at the same time on the same day.
        """
        # Assign Sub 1 to Section 1
        self.service.create_or_update_schedule(
            self.term, self.section1, self.subject1, 'LEC',
            professor=self.professor1, room=self.room1,
            days=['W'], start_time=time(8, 0), end_time=time(10, 0)
        )
        
        # Try assigning Sub 2 to Section 1 at overlapping time (9:30 - 11:30)
        with pytest.raises(ValueError) as excinfo:
            self.service.create_or_update_schedule(
                self.term, self.section1, self.subject2, 'LEC',
                professor=self.professor2, room=self.room2,
                days=['W'], start_time=time(9, 30), end_time=time(11, 30)
            )
        assert "Section already has a subject scheduled" in str(excinfo.value)

    def test_no_conflict_on_different_days(self):
        """
        Verify that the same professor/room/section can be used at the same time 
        if the days are different.
        """
        # Prof 1 in Room 1 on Monday
        self.service.create_or_update_schedule(
            self.term, self.section1, self.subject1, 'LEC',
            professor=self.professor1, room=self.room1,
            days=['M'], start_time=time(8, 0), end_time=time(10, 0)
        )
        
        # Prof 1 in Room 1 on Wednesday at the same time - SHOULD WORK
        schedule = self.service.create_or_update_schedule(
            self.term, self.section2, self.subject2, 'LEC',
            professor=self.professor1, room=self.room1,
            days=['W'], start_time=time(8, 0), end_time=time(10, 0)
        )
        assert schedule is not None

    def test_update_existing_schedule_no_self_conflict(self):
        """
        Verify that updating an existing schedule record with it's own data 
        doesn't trigger a conflict.
        """
        schedule = self.service.create_or_update_schedule(
            self.term, self.section1, self.subject1, 'LEC',
            professor=self.professor1, room=self.room1,
            days=['TH'], start_time=time(8, 0), end_time=time(10, 0)
        )
        
        # Update it (e.g. change days but keep same time)
        updated = self.service.create_or_update_schedule(
            self.term, self.section1, self.subject1, 'LEC',
            professor=self.professor1, room=self.room1,
            days=['F'], start_time=time(8, 0), end_time=time(10, 0),
            exclude_id=schedule.id
        )
        assert updated.days == ['F']
