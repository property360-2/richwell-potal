import pytest
import math
from apps.scheduling.services.report_service import ReportService
from apps.sections.models import Section, SectionStudent
from apps.students.models import StudentEnrollment, Student
from apps.terms.models import Term
from apps.academics.models import Program, CurriculumVersion
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.mark.django_db
class TestCapacityBottlenecks:
    @pytest.fixture
    def setup_data(self):
        from datetime import date, timedelta
        today = date.today()
        # 1. Setup Term with all mandatory fields
        term = Term.objects.create(
            code="2026-1S", 
            academic_year="2026-2027",
            semester_type="1", 
            is_active=True,
            start_date=today,
            end_date=today + timedelta(days=120),
            enrollment_start=today - timedelta(days=30),
            enrollment_end=today + timedelta(days=15),
            advising_start=today - timedelta(days=30),
            advising_end=today + timedelta(days=15)
        )
        
        # 2. Setup Program and Curriculum
        program = Program.objects.create(code="BSIS", name="BS Information Systems")
        curriculum = CurriculumVersion.objects.create(program=program, version_name="V1", is_active=True)
        
        # 3. Setup Dean User
        dean = User.objects.create_user(username="dean", role="DEAN")
        
        return term, program, curriculum, dean

    def test_detect_deficit(self, setup_data):
        term, program, curriculum, dean = setup_data
        
        # 1. Create 45 Approved Students (BSIS Year 1)
        for i in range(45):
            user = User.objects.create_user(username=f"student_{i}", email=f"s{i}@test.com")
            student = Student.objects.create(
                user=user, idn=f"IDN_{i}", 
                program=program, curriculum=curriculum,
                date_of_birth="2000-01-01", gender="MALE",
                student_type="CURRENT", status="ENROLLED"
            )
            StudentEnrollment.objects.create(
                student=student, term=term, 
                advising_status="APPROVED", year_level=1
            )
            
        # 2. Create 1 Section (Max 40)
        section = Section.objects.create(
            name="BSIS 1-1", term=term, program=program, 
            year_level=1, section_number=1, session="AM", max_students=40
        )
        
        # 3. Put 40 students in the section
        enrollments = StudentEnrollment.objects.filter(term=term, year_level=1)[:40]
        for enroll in enrollments:
            SectionStudent.objects.create(student=enroll.student, section=section, term=term)
            
        # 4. Check Bottlenecks
        # There are 45 approved students. 40 are in a section. 5 are waiting.
        # Available slots = 40 (max) - 40 (current) = 0.
        # Deficit = 5 (waiting) - 0 (slots) = 5.
        report = ReportService.get_capacity_bottlenecks(term)
        
        assert len(report) == 1
        data = report[0]
        assert data["waiting_count"] == 5
        assert data["available_slots"] == 0
        assert data["deficit"] == 5
        assert data["suggested_new_sections"] == 1

    def test_re_sync_resolution(self, setup_data):
        from apps.sections.services.sectioning_service import SectioningService
        term, program, curriculum, dean = setup_data
        service = SectioningService()
        
        # 1. Create 50 Approved Students
        for i in range(50):
            user = User.objects.create_user(username=f"s2_{i}", email=f"s2_{i}@test.com")
            student = Student.objects.create(
                user=user, idn=f"IDN2_{i}", 
                program=program, curriculum=curriculum,
                date_of_birth="2000-01-01", gender="MALE",
                student_type="CURRENT", status="ENROLLED"
            )
            StudentEnrollment.objects.create(
                student=student, term=term, 
                advising_status="APPROVED", year_level=2
            )
            
        # 2. Generate sections (should create 2 sections for 50 students, i.e. 50/40 = 1.25 -> 2)
        service.generate_sections(term, program, 2)
        
        sections_count = Section.objects.filter(term=term, year_level=2).count()
        assert sections_count == 2
        
        # 3. Add 40 more students (Total 90)
        for i in range(50, 90):
            user = User.objects.create_user(username=f"s2_{i}", email=f"s2_{i}@test.com")
            student = Student.objects.create(
                user=user, idn=f"IDN2_{i}", 
                program=program, curriculum=curriculum,
                date_of_birth="2000-01-01", gender="MALE",
                student_type="CURRENT", status="ENROLLED"
            )
            StudentEnrollment.objects.create(
                student=student, term=term, 
                advising_status="APPROVED", year_level=2
            )
            
        # 4. Re-run generate_sections (Now 90 students -> 3 sections)
        service.generate_sections(term, program, 2)
        
        new_sections_count = Section.objects.filter(term=term, year_level=2).count()
        assert new_sections_count == 3
