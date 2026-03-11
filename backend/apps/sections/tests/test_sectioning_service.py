import pytest
from apps.sections.services.sectioning_service import SectioningService
from apps.students.models import StudentEnrollment, Student
from apps.academics.models import Program, CurriculumVersion, Subject
from apps.terms.models import Term
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.mark.django_db
class TestSectioningService:
    @pytest.fixture(autouse=True)
    def setup_data(self):
        self.user = User.objects.create(username='testregistrar', role='REGISTRAR')
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
        
        # Create subjects
        self.subject1 = Subject.objects.create(
            curriculum=self.curriculum, code='IS111', description='Intro to IS',
            year_level=1, semester='1', lec_units=3, lab_units=0, total_units=3
        )
        self.subject2 = Subject.objects.create(
            curriculum=self.curriculum, code='IS112', description='Programming 1',
            year_level=1, semester='1', lec_units=2, lab_units=1, total_units=3
        )
        
        self.service = SectioningService()

    def create_students(self, count):
        students = []
        for i in range(count):
            user = User.objects.create(username=f'student{i}', email=f's{i}@test.com')
            student = Student.objects.create(
                user=user, idn=f'2400{i:02d}', program=self.program, 
                curriculum=self.curriculum, date_of_birth='2000-01-01'
            )
            StudentEnrollment.objects.create(
                student=student, term=self.term, year_level=1, 
                advising_status='APPROVED', is_regular=True
            )
            students.append(student)
        return students

    def test_generate_sections_35_students(self):
        self.create_students(35)
        sections = self.service.generate_sections(self.term, self.program, 1)
        
        assert len(sections) == 1
        assert sections[0].name == f'BSIS 1-1 ({self.term.code})'
        assert sections[0].session == 'AM'
        
        # Check if schedules were created
        from apps.scheduling.models import Schedule
        schedules = Schedule.objects.filter(section=sections[0])
        # IS111 (LEC), IS112 (LEC), IS112 (LAB) -> 3 slots
        assert schedules.count() == 3

    def test_generate_sections_70_students(self):
        self.create_students(70)
        sections = self.service.generate_sections(self.term, self.program, 1)
        
        assert len(sections) == 2
        assert sections[0].session == 'AM'
        assert sections[1].session == 'PM'
        assert sections[1].name == f'BSIS 1-2 ({self.term.code})'

    def test_manual_transfer(self):
        from apps.sections.models import Section, SectionStudent
        from apps.grades.models import Grade
        
        students = self.create_students(1)
        student = students[0]
        
        # Manually create Grade records (simulating advising approval)
        Grade.objects.create(student=student, subject=self.subject1, term=self.term, grade_status='ENROLLED')

        # Generate sections
        self.service.generate_sections(self.term, self.program, 1)
        section1 = Section.objects.get(section_number=1)
        
        # Perform transfer
        self.service.manual_transfer_student(student, section1, self.term)
        
        assert Grade.objects.filter(student=student, section=section1).exists()
        assert SectionStudent.objects.filter(student=student, section=section1).exists()
