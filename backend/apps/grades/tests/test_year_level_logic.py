import pytest
from apps.students.models import Student
from apps.academics.models import Program, CurriculumVersion, Subject
from apps.grades.models import Grade
from apps.terms.models import Term
from apps.grades.services.advising_service import AdvisingService
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.fixture
def setup_data(db):
    user = User.objects.create(username='teststudent', email='test@example.com')
    program = Program.objects.create(code='BSIS', name='BS Information Systems')
    curriculum = CurriculumVersion.objects.create(program=program, version_name='v1')
    from datetime import date
    term = Term.objects.create(
        code='2025-1SEM', 
        semester_type='1', 
        academic_year='2025-2026',
        start_date=date(2025, 6, 1),
        end_date=date(2025, 10, 31),
        enrollment_start=date(2025, 5, 1),
        enrollment_end=date(2025, 5, 31),
        advising_start=date(2025, 4, 1),
        advising_end=date(2025, 4, 30),
        is_active=True
    )
    
    student = Student.objects.create(
        user=user,
        idn='260014',
        date_of_birth='2005-01-01',
        program=program,
        curriculum=curriculum
    )
    
    # Create some subjects for Year 1 and Year 2
    s1_1 = Subject.objects.create(curriculum=curriculum, code='S1-1', description='Subj 1-1', year_level=1, semester='1', total_units=3)
    s1_2 = Subject.objects.create(curriculum=curriculum, code='S1-2', description='Subj 1-2', year_level=1, semester='2', total_units=3)
    
    s2_1 = Subject.objects.create(curriculum=curriculum, code='S2-1', description='Subj 2-1', year_level=2, semester='1', total_units=3)
    s2_2 = Subject.objects.create(curriculum=curriculum, code='S2-2', description='Subj 2-2', year_level=2, semester='2', total_units=3)
    s2_3 = Subject.objects.create(curriculum=curriculum, code='S2-3', description='Subj 2-3', year_level=2, semester='1', total_units=3)
    
    return {
        'student': student,
        'term': term,
        'subjects': [s1_1, s1_2, s2_1, s2_2, s2_3]
    }

@pytest.mark.django_db
def test_year_level_highest_year(setup_data):
    student = setup_data['student']
    term = setup_data['term']
    subjects = setup_data['subjects'] 
    
    # CASE: Pass a Year 1 subject and a Year 2 subject
    Grade.objects.create(student=student, subject=subjects[0], term=term, grade_status=Grade.STATUS_PASSED) # Y1
    Grade.objects.create(student=student, subject=subjects[2], term=term, grade_status=Grade.STATUS_PASSED) # Y2
    
    year_level = AdvisingService.get_year_level(student)
    assert year_level == 2, f"Should be Year 2 because that's the highest year with a passed subject. Got {year_level}"

@pytest.mark.django_db
def test_regularity_failed_prereq(setup_data):
    student = setup_data['student']
    term = setup_data['term']
    subjects = setup_data['subjects']
    from apps.academics.models import SubjectPrerequisite

    # Make S1-1 a prerequisite for S2-1
    SubjectPrerequisite.objects.create(
        subject=subjects[2], 
        prerequisite_type='SPECIFIC', 
        prerequisite_subject=subjects[0]
    )
    
    # Fail the prerequisite S1-1
    Grade.objects.create(student=student, subject=subjects[0], term=term, grade_status=Grade.STATUS_FAILED)
    
    is_regular = AdvisingService.check_student_regularity(student, term)
    assert is_regular is False, "Should be Irregular because a prerequisite was failed."

@pytest.mark.django_db
def test_regularity_skipped_subject(setup_data):
    student = setup_data['student']
    term = setup_data['term']
    subjects = setup_data['subjects']
    
    # Student is in Year 2 (passed a Year 2 subject)
    Grade.objects.create(student=student, subject=subjects[2], term=term, grade_status=Grade.STATUS_PASSED)
    
    # But skipped a Year 1 subject (S1-1 is not passed)
    is_regular = AdvisingService.check_student_regularity(student, term)
    assert is_regular is False, "Should be Irregular because a Year 1 subject was skipped."

@pytest.mark.django_db
def test_regularity_inc(setup_data):
    student = setup_data['student']
    term = setup_data['term']
    subjects = setup_data['subjects']
    
    # Has an INC
    Grade.objects.create(student=student, subject=subjects[0], term=term, grade_status=Grade.STATUS_INC)
    
    is_regular = AdvisingService.check_student_regularity(student, term)
    assert is_regular is False, "Should be Irregular because of INC."

@pytest.mark.django_db
def test_regularity_clean_pass(setup_data):
    student = setup_data['student']
    term = setup_data['term']
    subjects = setup_data['subjects']
    
    # Pass all subjects in Year 1
    Grade.objects.create(student=student, subject=subjects[0], term=term, grade_status=Grade.STATUS_PASSED)
    Grade.objects.create(student=student, subject=subjects[1], term=term, grade_status=Grade.STATUS_PASSED)
    
    # Now in Year 1 still (or Year 2 if we move to Year 2 term)
    # Let's say we are checking for the 2nd Semester of Year 1
    is_regular = AdvisingService.check_student_regularity(student, term)
    assert is_regular is True, "Should be Regular because all prior subjects are passed."

@pytest.mark.django_db
def test_regularity_new_transferee(setup_data):
    student = setup_data['student']
    term = setup_data['term']
    
    # Set student as transferee
    student.student_type = 'TRANSFEREE'
    student.save()
    
    # No grades yet
    is_regular = AdvisingService.check_student_regularity(student, term)
    assert is_regular is False, "New transferee without credited subjects should be Irregular by default."
