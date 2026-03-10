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
class TestSchedulingService:
    @pytest.fixture(autouse=True)
    def setup_data(self):
        self.user = User.objects.create(username='testdean', role='DEAN', email='dean@test.com')
        self.program = Program.objects.create(code='BSIS', name='BS Information Systems')
        self.curriculum = CurriculumVersion.objects.create(program=self.program, version_name='2024V1')
        from datetime import date
        self.term = Term.objects.create(
            code='2024-1', 
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
        self.section = Section.objects.create(
            name='BSIS 1-1', term=self.term, program=self.program, 
            year_level=1, section_number=1, session='AM'
        )
        self.subject = Subject.objects.create(
            curriculum=self.curriculum, code='IS111', description='Intro to IS',
            year_level=1, semester='1', lec_units=3, lab_units=0, total_units=3
        )
        
        prof_user = User.objects.create(username='prof1', last_name='Smith', email='prof1@test.com')
        self.professor = Professor.objects.create(
            user=prof_user, 
            employee_id='EMP-001', 
            department='IT', 
            date_of_birth=date(1980, 1, 1)
        )
        self.room = Room.objects.create(name='Room 101', room_type='LECTURE', capacity=40)
        
        self.service = SchedulingService()

    def test_create_schedule_success(self):
        schedule = self.service.create_or_update_schedule(
            self.term, self.section, self.subject, 'LEC',
            professor=self.professor, room=self.room,
            days=['M', 'W'], start_time=time(8, 0), end_time=time(9, 30)
        )
        assert schedule.professor == self.professor
        assert schedule.days == ['M', 'W']

    def test_professor_conflict(self):
        # Create first schedule
        self.service.create_or_update_schedule(
            self.term, self.section, self.subject, 'LEC',
            professor=self.professor, room=self.room,
            days=['M'], start_time=time(8, 0), end_time=time(10, 0)
        )
        
        # Try to create another schedule for same professor at same time in different section/subject
        subject2 = Subject.objects.create(
            curriculum=self.curriculum, code='IS112', description='Prog 1',
            year_level=1, semester='1', lec_units=3, lab_units=0, total_units=3
        )
        section2 = Section.objects.create(
            name='BSIS 1-2', term=self.term, program=self.program, 
            year_level=1, section_number=2, session='AM'
        )
        
        with pytest.raises(ValueError, match="conflict"):
            self.service.create_or_update_schedule(
                self.term, section2, subject2, 'LEC',
                professor=self.professor, room=self.room,
                days=['M'], start_time=time(9, 0), end_time=time(11, 0)
            )

    def test_room_conflict(self):
        # Occupy room
        self.service.create_or_update_schedule(
            self.term, self.section, self.subject, 'LEC',
            professor=self.professor, room=self.room,
            days=['T'], start_time=time(8, 0), end_time=time(10, 0)
        )
        
        section2 = Section.objects.create(
            name='BSIS 1-2', term=self.term, program=self.program, 
            year_level=1, section_number=2, session='AM'
        )
        prof_user2 = User.objects.create(username='prof2', last_name='Jones', email='prof2@test.com')
        professor2 = Professor.objects.create(
            user=prof_user2, 
            employee_id='EMP-002', 
            department='IT', 
            date_of_birth=date(1985, 1, 1)
        )
        
        with pytest.raises(ValueError, match="occupied"):
            self.service.create_or_update_schedule(
                self.term, section2, self.subject, 'LEC',
                professor=professor2, room=self.room,
                days=['T'], start_time=time(9, 0), end_time=time(11, 0)
            )
