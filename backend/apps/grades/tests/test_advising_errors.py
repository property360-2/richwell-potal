import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone
from apps.terms.models import Term
from apps.academics.models import Program, CurriculumVersion as Curriculum, Subject
from apps.students.models import Student, StudentEnrollment
from apps.grades.models import Grade
from apps.grades.services.advising_service import AdvisingService

@pytest.mark.django_db
class TestAdvisingErrors:
    @pytest.fixture
    def setup_data(self, django_user_model):
        program = Program.objects.create(name="Test Program", code="TP01")
        curriculum = Curriculum.objects.create(program=program, version_name="V2023")
        user = django_user_model.objects.create(
            username="teststudent",
            first_name="Test",
            last_name="Student"
        )
        student = Student.objects.create(
            user=user,
            idn="260001",
            date_of_birth="2000-01-01",
            gender="MALE",
            program=program,
            curriculum=curriculum,
            student_type="TRANSFEREE"
        )
        term = Term.objects.create(
            code="2023-1",
            academic_year="2023-2024",
            semester_type="1",
            start_date="2023-08-01",
            end_date="2023-12-31",
            enrollment_start="2023-07-01",
            enrollment_end="2023-08-15",
            advising_start="2023-06-01",
            advising_end="2023-08-01",
            is_active=True
        )

        # Create at least one grade to make the student "regular" for auto-advising tests
        dummy_subject = Subject.objects.create(
            curriculum=curriculum,
            code="CREDIT01",
            description="Credited Subject",
            year_level=1,
            semester="1",
            total_units=3
        )
        Grade.objects.create(
            student=student,
            subject=dummy_subject,
            term=term,
            grade_status='PASSED',
            final_grade="1.0"
        )

        return {
            "curriculum": curriculum,
            "student": student,
            "term": term,
            "dummy_subject": dummy_subject
        }

    def test_auto_advise_already_submitted(self, setup_data):
        student = setup_data["student"]
        term = setup_data["term"]
        
        # Create an existing enrollment with PENDING status
        StudentEnrollment.objects.create(
            student=student,
            term=term,
            advising_status='PENDING',
            year_level=1
        )
        
        with pytest.raises(ValidationError) as excinfo:
            AdvisingService.auto_advise_regular(student, term)
        
        assert excinfo.value.message_dict['reason'][0] == 'ALREADY_SUBMITTED'

    def test_auto_advise_out_of_sync(self, setup_data):
        student = setup_data["student"]
        term = setup_data["term"]
        curriculum = setup_data["curriculum"]
        
        # Create an enrollment but with no subjects available for the year level 1
        # (e.g. they are all already passed)
        subject = Subject.objects.create(
            curriculum=curriculum,
            code="SUBJ1",
            description="Subject 1",
            year_level=1,
            semester="1",
            total_units=3
        )
        
        # Pass the subject
        Grade.objects.create(
            student=student,
            subject=subject,
            term=term,
            grade_status='PASSED',
            final_grade="1.0"
        )
        
        with pytest.raises(ValidationError) as excinfo:
            AdvisingService.auto_advise_regular(student, term)
        
        assert excinfo.value.message_dict['reason'][0] == 'OUT_OF_SYNC_TRANSFEREE'
