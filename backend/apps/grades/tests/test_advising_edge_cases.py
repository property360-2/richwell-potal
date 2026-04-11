import pytest
from django.core.exceptions import ValidationError
from apps.terms.models import Term
from apps.academics.models import Program, CurriculumVersion as Curriculum, Subject, SubjectPrerequisite
from apps.students.models import Student, StudentEnrollment
from apps.grades.models import Grade
from apps.grades.services.advising_service import AdvisingService
from apps.scheduling.models import Schedule
from apps.sections.models import Section

@pytest.mark.django_db
class TestAdvisingEdgeCases:
    @pytest.fixture
    def setup_base_data(self, django_user_model):
        program = Program.objects.create(name="Edge Case Program", code="ECP01")
        curriculum = Curriculum.objects.create(program=program, version_name="V2024")
        user = django_user_model.objects.create(username="edgestudent", first_name="Edge", last_name="Student")
        student = Student.objects.create(
            user=user, idn="269999", date_of_birth="2000-01-01", gender="MALE",
            program=program, curriculum=curriculum, student_type="CURRENT",
            document_checklist=Student.DEFAULT_CHECKLIST
        )
        term = Term.objects.create(
            code="2024-1", academic_year="2024-2025", semester_type="1",
            start_date="2024-08-01", end_date="2024-12-31", is_active=True,
            advising_start="2024-06-01", advising_end="2024-08-01",
            enrollment_start="2024-07-01", enrollment_end="2024-08-15"
        )
        # Create a section since Schedule needs it
        section = Section.objects.create(
            name="TEST-SECTION", term=term, program=program, year_level=1, session="AM"
        )
        
        # Default enrollment
        enrollment = StudentEnrollment.objects.create(
            student=student, term=term, year_level=1, advising_status='DRAFT', max_units_override=24
        )
        
        return {
            "program": program, "curriculum": curriculum, "student": student, 
            "term": term, "enrollment": enrollment, "section": section
        }

    def create_subject(self, curriculum, code, year_level=1, semester="1", total_units=3):
        return Subject.objects.create(
            curriculum=curriculum,
            code=code,
            description=f"Description for {code}",
            year_level=year_level,
            semester=semester,
            total_units=total_units
        )

    def test_irregular_due_to_inc(self, setup_base_data):
        student = setup_base_data["student"]
        term = setup_base_data["term"]
        subject = self.create_subject(student.curriculum, "INC101")
        
        # Create an INC grade
        Grade.objects.create(student=student, subject=subject, term=term, grade_status=Grade.STATUS_INC)
        
        reg_data = AdvisingService.check_student_regularity(student, term)
        assert reg_data["is_regular"] is False
        assert "Unresolved grades (INC/No Grade)" in reg_data["reason"]

    def test_irregular_due_to_failed_prerequisite(self, setup_base_data):
        student = setup_base_data["student"]
        term = setup_base_data["term"]
        curriculum = setup_base_data["curriculum"]
        
        subj_a = self.create_subject(curriculum, "SUBJA", year_level=1, semester="1")
        subj_b = self.create_subject(curriculum, "SUBJB", year_level=1, semester="2")
        
        # SUBJA is prerequisite for SUBJB
        SubjectPrerequisite.objects.create(subject=subj_b, prerequisite_subject=subj_a, prerequisite_type='SPECIFIC')
        
        # Fail SUBJA
        Grade.objects.create(student=student, subject=subj_a, term=term, grade_status=Grade.STATUS_FAILED)
        
        reg_data = AdvisingService.check_student_regularity(student, term)
        assert reg_data["is_regular"] is False
        assert "Subjects requiring retake" in reg_data["reason"]

    def test_irregular_due_to_back_subjects(self, setup_base_data):
        student = setup_base_data["student"]
        term = setup_base_data["term"]
        curriculum = setup_base_data["curriculum"]
        
        # Current term is Year 1 Sem 2
        term.semester_type = "2"
        term.save()
        
        # Update enrollment to Year 1
        enrollment = setup_base_data["enrollment"]
        enrollment.year_level = 1
        enrollment.save()
        
        # Subject from Year 1 Sem 1 (previous semester)
        self.create_subject(curriculum, "BACK01", year_level=1, semester="1")
        
        # Student has NO grade for back_subj (missing)
        reg_data = AdvisingService.check_student_regularity(student, term)
        assert reg_data["is_regular"] is False
        assert "Missing back subjects" in reg_data["reason"]

    def test_manual_advising_missing_specific_prerequisite(self, setup_base_data):
        student = setup_base_data["student"]
        term = setup_base_data["term"]
        curriculum = setup_base_data["curriculum"]
        section = setup_base_data["section"]
        
        subj_pre = self.create_subject(curriculum, "PRE", year_level=1, semester="1")
        subj_main = self.create_subject(curriculum, "MAIN", year_level=1, semester="1")
        SubjectPrerequisite.objects.create(subject=subj_main, prerequisite_subject=subj_pre, prerequisite_type='SPECIFIC')
        
        # Ensure it is offered
        Schedule.objects.create(term=term, subject=subj_main, section=section)
        
        with pytest.raises(ValidationError) as excinfo:
            AdvisingService.manual_advise_irregular(student, term, [subj_main.id])
        
        assert "Missing prerequisite" in str(excinfo.value)

    def test_manual_advising_missing_year_standing(self, setup_base_data):
        student = setup_base_data["student"]
        term = setup_base_data["term"]
        curriculum = setup_base_data["curriculum"]
        section = setup_base_data["section"]
        
        subj_y3 = self.create_subject(curriculum, "Y3SUBJ", year_level=3, semester="1")
        SubjectPrerequisite.objects.create(subject=subj_y3, prerequisite_type='YEAR_STANDING', standing_year=3)
        
        Schedule.objects.create(term=term, subject=subj_y3, section=section)
        
        # Student is Year 1
        with pytest.raises(ValidationError) as excinfo:
            AdvisingService.manual_advise_irregular(student, term, [subj_y3.id])
        
        assert "requires Year 3 standing" in str(excinfo.value)

    def test_manual_advising_exceed_max_units(self, setup_base_data):
        student = setup_base_data["student"]
        term = setup_base_data["term"]
        curriculum = setup_base_data["curriculum"]
        section = setup_base_data["section"]
        
        # Set max units to low value
        enrollment = setup_base_data["enrollment"]
        enrollment.max_units_override = 3
        enrollment.save()
        
        s1 = self.create_subject(curriculum, "S1", total_units=3)
        s2 = self.create_subject(curriculum, "S2", total_units=3)
        
        Schedule.objects.create(term=term, subject=s1, section=section)
        Schedule.objects.create(term=term, subject=s2, section=section)
        
        with pytest.raises(ValidationError) as excinfo:
            AdvisingService.manual_advise_irregular(student, term, [s1.id, s2.id])
        
        assert "exceed allowed limit" in str(excinfo.value)

    def test_manual_advising_not_offered_this_term(self, setup_base_data):
        student = setup_base_data["student"]
        term = setup_base_data["term"]
        curriculum = setup_base_data["curriculum"]
        
        subj_not_offered = self.create_subject(curriculum, "OFF01", total_units=3)
        
        # No Schedule created for OFF01
        
        with pytest.raises(ValidationError) as excinfo:
            AdvisingService.manual_advise_irregular(student, term, [subj_not_offered.id])
        
        assert "is not offered this term" in str(excinfo.value)

    def test_new_transferee_start_irregular(self, setup_base_data):
        student = setup_base_data["student"]
        student.student_type = 'TRANSFEREE'
        student.save()
        
        term = setup_base_data["term"]
        
        # No grades yet
        reg_data = AdvisingService.check_student_regularity(student, term)
        assert reg_data["is_regular"] is False
        assert "New transferee student" in reg_data["reason"]

    def test_irregular_due_to_failed_non_prerequisite(self, setup_base_data):
        student = setup_base_data["student"]
        term = setup_base_data["term"]
        curriculum = setup_base_data["curriculum"]
        
        # Subject that is NOT a prerequisite for anything
        subj_standalone = self.create_subject(curriculum, "STANDALONE")
        
        # Fail it
        Grade.objects.create(student=student, subject=subj_standalone, term=term, grade_status=Grade.STATUS_FAILED)
        
        reg_data = AdvisingService.check_student_regularity(student, term)
        # Previously this might have been True if it wasn't a prerequisite. 
        # Now it MUST be False.
        assert reg_data["is_regular"] is False
        assert "Subjects requiring retake" in reg_data["reason"]

    def test_auto_advise_regular_validates_prerequisites(self, setup_base_data):
        student = setup_base_data["student"]
        term = setup_base_data["term"]
        curriculum = setup_base_data["curriculum"]
        section = setup_base_data["section"]
        
        # Current term is Year 1 Sem 1 (to avoid 'Missing back subjects' check)
        term.semester_type = "1"
        term.save()
        
        # Define Year 1 subjects for Sem 1
        subj_pre = self.create_subject(curriculum, "PRE", year_level=1, semester="1")
        subj_main = self.create_subject(curriculum, "MAIN", year_level=1, semester="1")
        
        # PRE is prerequisite for MAIN
        SubjectPrerequisite.objects.create(subject=subj_main, prerequisite_subject=subj_pre, prerequisite_type='SPECIFIC')
        
        # Create schedules for BOTH
        Schedule.objects.create(term=term, subject=subj_pre, section=section)
        Schedule.objects.create(term=term, subject=subj_main, section=section)
        
        # Student is Year 1
        enrollment = setup_base_data["enrollment"]
        enrollment.year_level = 1
        enrollment.save()
        
        # Try to auto-advise. It will find both in the block.
        # But MAIN will fail because PRE is not yet passed.
        # auto_advise_regular should then stop or fail with PREREQUISITE_FAILED because it can't find a valid block layout.
        
        with pytest.raises(ValidationError) as excinfo:
            AdvisingService.auto_advise_regular(student, term)
        
        assert "PREREQUISITE_FAILED" in str(excinfo.value)
