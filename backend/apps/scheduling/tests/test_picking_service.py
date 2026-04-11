import pytest
from datetime import timedelta
from django.utils import timezone
from unittest.mock import patch
from apps.scheduling.services.picking_service import PickingService
from apps.sections.models import Section, SectionStudent
from apps.academics.models import Subject, Program, CurriculumVersion
from apps.terms.models import Term
from apps.students.models import Student, StudentEnrollment
from apps.grades.models import Grade
from apps.scheduling.models import Schedule
from django.contrib.auth import get_user_model
from rest_framework.exceptions import PermissionDenied, ValidationError
from core.exceptions import ConflictError
from datetime import date, time, timedelta

User = get_user_model()

@pytest.mark.django_db
class TestPickingService:
    @pytest.fixture(autouse=True)
    def setup_data(self):
        self.program = Program.objects.create(code='PICK', name='Pick Test')
        self.curriculum = CurriculumVersion.objects.create(program=self.program, version_name='V1')
        
        today = date.today()
        self.term = Term.objects.create(
            code='2024-PICK', academic_year='2024-2025', semester_type='1', is_active=True,
            start_date=today, end_date=today + timedelta(days=100),
            enrollment_start=today - timedelta(days=30), enrollment_end=today + timedelta(days=30),
            advising_start=today - timedelta(days=30), advising_end=today + timedelta(days=30),
            schedule_published=True,
            picking_published_at=timezone.now() - timedelta(hours=1)
        )
        
        # Create Student
        user = User.objects.create(username='stud_pick', email='stud@test.com', role='STUDENT')
        self.student = Student.objects.create(
            user=user, 
            idn='270001', 
            program=self.program, 
            curriculum=self.curriculum,
            date_of_birth=date(2000,1,1),
            gender='MALE',
            student_type='FRESHMAN'
        )
        
        # Enrollment
        self.enrollment = StudentEnrollment.objects.create(
            student=self.student, term=self.term, year_level=1, 
            is_regular=True, advising_status='APPROVED'
        )
        
        # Sections
        self.section_am = Section.objects.create(
            name='AM-1', term=self.term, program=self.program, 
            year_level=1, section_number=1, session='AM', max_students=1
        )
        self.section_pm = Section.objects.create(
            name='PM-1', term=self.term, program=self.program, 
            year_level=1, section_number=2, session='PM', max_students=30
        )
        
        # Subject and Grade
        self.subject = Subject.objects.create(curriculum=self.curriculum, code='S1', description='S1', year_level=1, semester='1', total_units=3)
        self.grade = Grade.objects.create(
            student=self.student, subject=self.subject, term=self.term, 
            advising_status=Grade.ADVISING_APPROVED
        )
        
        # Schedule Slot
        Schedule.objects.create(term=self.term, section=self.section_am, subject=self.subject, component_type='LEC', days=['M'], start_time=time(8,0), end_time=time(10,0))
        Schedule.objects.create(term=self.term, section=self.section_pm, subject=self.subject, component_type='LEC', days=['M'], start_time=time(14,0), end_time=time(16,0))

        self.service = PickingService()

    def test_regular_picking_success(self):
        section, redirected = self.service.pick_schedule_regular(self.student, self.term, 'AM')
        assert section == self.section_am
        assert redirected is False
        assert Grade.objects.get(id=self.grade.id).section == self.section_am

    def test_regular_picking_fallback_to_pm(self):
        # Occupy the AM section (max_students is 1)
        other_user = User.objects.create(username='other', email='other@test.com')
        other_student = Student.objects.create(
            user=other_user, 
            idn='270002', 
            program=self.program, 
            curriculum=self.curriculum,
            date_of_birth=date(2000,1,1),
            gender='MALE',
            student_type='FRESHMAN'
        )
        SectionStudent.objects.create(student=other_student, section=self.section_am, term=self.term, is_home_section=True)
        
        # Try to pick AM, should fallback to PM
        section, redirected = self.service.pick_schedule_regular(self.student, self.term, 'AM')
        
        assert section == self.section_pm
        assert redirected is True
        assert Grade.objects.get(id=self.grade.id).section == self.section_pm

    def test_irregular_picking_conflict(self):
        # Set student as irregular
        self.enrollment.is_regular = False
        self.enrollment.save()
        
        # Create another subject/section that overlaps
        sub2 = Subject.objects.create(curriculum=self.curriculum, code='S2', description='S2', year_level=1, semester='1', total_units=3)
        Grade.objects.create(student=self.student, subject=sub2, term=self.term, advising_status=Grade.ADVISING_APPROVED)
        
        section_other = Section.objects.create(name='OTHER', term=self.term, program=self.program, year_level=1, section_number=3, session='AM')
        # Overlaps with section_am (8-10) on Monday
        Schedule.objects.create(term=self.term, section=section_other, subject=sub2, component_type='LEC', days=['M'], start_time=time(9,0), end_time=time(11,0))
        
        selections = [
            {'subject_id': self.subject.id, 'section_id': self.section_am.id},
            {'subject_id': sub2.id, 'section_id': section_other.id}
        ]
        
        with pytest.raises(ConflictError, match="conflicts with another selected subject"):
            self.service.pick_schedule_irregular(self.student, self.term, selections)
