"""
Pytest configuration and fixtures for Richwell Colleges Portal.
"""
import pytest
from datetime import datetime, timedelta
from django.contrib.auth import get_user_model
from django.utils import timezone
import factory
from factory.django import DjangoModelFactory

from sis.models import (
    Program, Semester, Subject, Student, Enrollment, SubjectEnrollment,
    Section, ScheduleSlot, PaymentMonth, Payment, Grade, ExamPermit,
    AuditLog, Notification, TransferCredit
)

User = get_user_model()


# ============================================================================
# FACTORIES
# ============================================================================

class UserFactory(DjangoModelFactory):
    """Factory for creating test User instances."""
    class Meta:
        model = User

    username = factory.Sequence(lambda n: f"user{n}")
    email = factory.Sequence(lambda n: f"user{n}@richwell.edu")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    password = factory.django.Password("testpass123")
    role = "STUDENT"
    is_active = True


class StudentUserFactory(UserFactory):
    """Factory for creating Student User instances."""
    role = "STUDENT"


class ProfessorUserFactory(UserFactory):
    """Factory for creating Professor User instances."""
    role = "PROFESSOR"


class RegistrarUserFactory(UserFactory):
    """Factory for creating Registrar User instances."""
    role = "REGISTRAR"


class AdminUserFactory(UserFactory):
    """Factory for creating Admin User instances."""
    role = "ADMIN"


class CashierUserFactory(UserFactory):
    """Factory for creating Cashier User instances."""
    role = "CASHIER"


class ProgramFactory(DjangoModelFactory):
    """Factory for creating Program instances."""
    class Meta:
        model = Program

    code = factory.Sequence(lambda n: f"PROG{n:03d}")
    name = factory.Faker("sentence", nb_words=3)
    description = factory.Faker("text")
    duration_years = 4
    total_units_required = 120


class SemesterFactory(DjangoModelFactory):
    """Factory for creating Semester instances."""
    class Meta:
        model = Semester

    year = timezone.now().year
    semester = "FIRST"
    start_date = timezone.now().date()
    end_date = (timezone.now() + timedelta(days=120)).date()
    enrollment_start = timezone.now().date()
    enrollment_end = (timezone.now() + timedelta(days=14)).date()
    is_active = True


class SubjectFactory(DjangoModelFactory):
    """Factory for creating Subject instances."""
    class Meta:
        model = Subject

    code = factory.Sequence(lambda n: f"SUBJ{n:04d}")
    name = factory.Faker("sentence", nb_words=4)
    description = factory.Faker("text")
    units = 3
    subject_type = "MAJOR"
    program = factory.SubFactory(ProgramFactory)


class StudentFactory(DjangoModelFactory):
    """Factory for creating Student profile instances."""
    class Meta:
        model = Student

    user = factory.SubFactory(StudentUserFactory)
    program = factory.SubFactory(ProgramFactory)
    student_id = factory.Sequence(lambda n: f"STU{n:06d}")
    status = "ACTIVE"
    enrollment_year = timezone.now().year


class EnrollmentFactory(DjangoModelFactory):
    """Factory for creating Enrollment (semester-level) instances."""
    class Meta:
        model = Enrollment

    student = factory.SubFactory(StudentFactory)
    semester = factory.SubFactory(SemesterFactory)
    total_units = 0
    enrollment_date = timezone.now()


class SubjectEnrollmentFactory(DjangoModelFactory):
    """Factory for creating SubjectEnrollment (course-level) instances."""
    class Meta:
        model = SubjectEnrollment

    enrollment = factory.SubFactory(EnrollmentFactory)
    subject = factory.SubFactory(SubjectFactory)
    section = None
    enrollment_status = "ENROLLED"
    grade_status = "PENDING"
    subject_status = "PASSED"


class SectionFactory(DjangoModelFactory):
    """Factory for creating Section instances."""
    class Meta:
        model = Section

    code = factory.Sequence(lambda n: f"SEC{n:03d}")
    subject = factory.SubFactory(SubjectFactory)
    semester = factory.SubFactory(SemesterFactory)
    professor = factory.SubFactory(ProfessorUserFactory)
    room = "Room 101"
    capacity = 40
    current_enrollment = 0


class ScheduleSlotFactory(DjangoModelFactory):
    """Factory for creating ScheduleSlot instances."""
    class Meta:
        model = ScheduleSlot

    section = factory.SubFactory(SectionFactory)
    day = "MON"
    start_time = "08:00"
    end_time = "09:30"


class PaymentMonthFactory(DjangoModelFactory):
    """Factory for creating PaymentMonth instances."""
    class Meta:
        model = PaymentMonth

    enrollment = factory.SubFactory(EnrollmentFactory)
    month_number = 1
    amount_due = 10000.00
    amount_paid = 0.00
    is_paid = False
    due_date = (timezone.now() + timedelta(days=30)).date()


class PaymentFactory(DjangoModelFactory):
    """Factory for creating Payment instances."""
    class Meta:
        model = Payment

    student = factory.SubFactory(StudentFactory)
    enrollment = factory.SubFactory(EnrollmentFactory)
    amount = 10000.00
    payment_method = "CASH"
    reference_number = factory.Sequence(lambda n: f"REF{n:08d}")
    status = "COMPLETED"


class GradeFactory(DjangoModelFactory):
    """Factory for creating Grade instances."""
    class Meta:
        model = Grade

    subject_enrollment = factory.SubFactory(SubjectEnrollmentFactory)
    grade_value = "A"
    submitted_date = None
    finalized_date = None
    is_finalized = False


class ExamPermitFactory(DjangoModelFactory):
    """Factory for creating ExamPermit instances."""
    class Meta:
        model = ExamPermit

    enrollment = factory.SubFactory(EnrollmentFactory)
    status = "LOCKED"
    issued_date = None
    expiry_date = None


class AuditLogFactory(DjangoModelFactory):
    """Factory for creating AuditLog instances."""
    class Meta:
        model = AuditLog

    actor = factory.SubFactory(AdminUserFactory)
    action = "SUBJECT_ENROLLED"
    target_model = "SubjectEnrollment"
    target_id = 1
    before_data = {}
    after_data = {}
    ip_address = "127.0.0.1"


class NotificationFactory(DjangoModelFactory):
    """Factory for creating Notification instances."""
    class Meta:
        model = Notification

    user = factory.SubFactory(StudentUserFactory)
    title = "Test Notification"
    message = "This is a test notification"
    notification_type = "PAYMENT"
    read = False


class TransferCreditFactory(DjangoModelFactory):
    """Factory for creating TransferCredit instances."""
    class Meta:
        model = TransferCredit

    student = factory.SubFactory(StudentFactory)
    subject = factory.SubFactory(SubjectFactory)
    prior_institution = "Previous University"
    credited_subject_code = factory.Sequence(lambda n: f"TRN{n:04d}")
    credited_subject_name = factory.Faker("sentence", nb_words=3)
    units = 3


# ============================================================================
# PYTEST FIXTURES
# ============================================================================

@pytest.fixture
def db_setup(db):
    """Ensure database is available for tests."""
    return db


@pytest.fixture
def student_user():
    """Create a student user for testing."""
    return StudentUserFactory()


@pytest.fixture
def professor_user():
    """Create a professor user for testing."""
    return ProfessorUserFactory()


@pytest.fixture
def registrar_user():
    """Create a registrar user for testing."""
    return RegistrarUserFactory()


@pytest.fixture
def admin_user():
    """Create an admin user for testing."""
    return AdminUserFactory()


@pytest.fixture
def cashier_user():
    """Create a cashier user for testing."""
    return CashierUserFactory()


@pytest.fixture
def program():
    """Create a program for testing."""
    return ProgramFactory()


@pytest.fixture
def semester():
    """Create a semester for testing."""
    return SemesterFactory()


@pytest.fixture
def subject(semester, professor):
    """Create a subject with a section for testing."""
    subj = SubjectFactory()
    SectionFactory(subject=subj, semester=semester, professor=professor)
    return subj


@pytest.fixture
def student(student_user, program):
    """Create a student profile for testing."""
    return StudentFactory(user=student_user, program=program)


@pytest.fixture
def enrollment(student, semester):
    """Create an enrollment for testing."""
    return EnrollmentFactory(student=student, semester=semester)


@pytest.fixture
def subject_enrollment(enrollment, subject):
    """Create a subject enrollment for testing."""
    return SubjectEnrollmentFactory(enrollment=enrollment, subject=subject)


@pytest.fixture
def professor(professor_user):
    """Create a professor profile for testing."""
    return professor_user


@pytest.fixture
def section(subject, semester, professor):
    """Create a section for testing."""
    return SectionFactory(subject=subject, semester=semester, professor=professor)


@pytest.fixture
def schedule_slot(section):
    """Create a schedule slot for testing."""
    return ScheduleSlotFactory(section=section)


@pytest.fixture
def payment_month(enrollment):
    """Create a payment month for testing."""
    return PaymentMonthFactory(enrollment=enrollment, month_number=1)


@pytest.fixture
def payment(enrollment):
    """Create a payment for testing."""
    return PaymentFactory(enrollment=enrollment)


@pytest.fixture
def grade(subject_enrollment):
    """Create a grade for testing."""
    return GradeFactory(subject_enrollment=subject_enrollment)


@pytest.fixture
def exam_permit(enrollment):
    """Create an exam permit for testing."""
    return ExamPermitFactory(enrollment=enrollment)


@pytest.fixture
def audit_log(admin_user):
    """Create an audit log entry for testing."""
    return AuditLogFactory(actor=admin_user)


@pytest.fixture
def notification(student_user):
    """Create a notification for testing."""
    return NotificationFactory(user=student_user)


@pytest.fixture
def setup_payment_scenario(enrollment, semester):
    """Set up a complete payment scenario with all 6 months."""
    months = []
    for month_num in range(1, 7):
        month = PaymentMonthFactory(
            enrollment=enrollment,
            month_number=month_num,
            amount_due=10000.00,
            amount_paid=0.00,
            is_paid=False,
        )
        months.append(month)
    return enrollment, months


@pytest.fixture
def setup_enrollment_scenario(student, semester):
    """Set up a complete enrollment scenario with multiple subjects."""
    enrollment = EnrollmentFactory(student=student, semester=semester)

    program = student.program

    # Create 3 subjects with different requirements
    subject1 = SubjectFactory(code="SUBJ001", units=4, subject_type="MAJOR", program=program)
    subject2 = SubjectFactory(code="SUBJ002", units=3, subject_type="MAJOR", program=program)
    subject3 = SubjectFactory(code="SUBJ003", units=3, subject_type="MINOR", program=program)

    return enrollment, [subject1, subject2, subject3]


@pytest.fixture
def setup_grade_scenario(enrollment, semester):
    """Set up a complete grading scenario with multiple enrollments."""
    program = enrollment.student.program

    # Create multiple subjects (3 is enough for most grade tests)
    subjects = [
        SubjectFactory(code=f"SUBJ{i:03d}", units=3, subject_type="MAJOR", program=program)
        for i in range(1, 4)
    ]

    # Enroll student in all subjects
    subject_enrollments = []
    for subject in subjects:
        se = SubjectEnrollmentFactory(
            enrollment=enrollment,
            subject=subject,
            enrollment_status="ENROLLED",
            subject_status="PASSED",
            grade_status="PENDING"
        )
        # Don't create pre-grades - let tests create their own
        subject_enrollments.append(se)

    return enrollment, subject_enrollments


@pytest.fixture
def subject_factory():
    """Factory fixture for creating subjects dynamically."""
    return SubjectFactory


@pytest.fixture
def subject_with_prereq(program, semester, professor):
    """Create a subject with prerequisites."""
    # Create prerequisite subject
    prerequisite = SubjectFactory(
        code="PREREQ001",
        units=3,
        subject_type="MAJOR",
        program=program
    )

    # Create section for prerequisite
    SectionFactory(subject=prerequisite, semester=semester, professor=professor)

    # Create main subject with prerequisite
    main_subject = SubjectFactory(
        code="MAIN001",
        units=3,
        subject_type="MAJOR",
        program=program
    )
    main_subject.prerequisites.add(prerequisite)

    # Create section for main subject
    SectionFactory(subject=main_subject, semester=semester, professor=professor)

    return main_subject


@pytest.fixture
def subject_no_sections(program):
    """Create a subject with no sections."""
    return SubjectFactory(
        code="NOSEC001",
        units=3,
        subject_type="MAJOR",
        program=program
    )


@pytest.fixture
def heavy_load_subjects(program, semester, professor):
    """Create subjects with various unit loads for testing unit cap."""
    subjects = []

    # Small subjects (3 units each) - for building up to cap
    for i in range(3):
        subject = SubjectFactory(
            code=f"SMALL{i:03d}",
            units=3,
            subject_type="MAJOR",
            program=program
        )
        SectionFactory(subject=subject, semester=semester, professor=professor)
        subjects.append(subject)

    # Large subject (25 units) - would exceed cap
    large_subject = SubjectFactory(
        code="LARGE001",
        units=25,
        subject_type="MAJOR",
        program=program
    )
    SectionFactory(subject=large_subject, semester=semester, professor=professor)
    subjects.append(large_subject)

    # Medium subject (21 units) - for exact cap testing
    medium_subject = SubjectFactory(
        code="MEDIUM001",
        units=21,
        subject_type="MAJOR",
        program=program
    )
    SectionFactory(subject=medium_subject, semester=semester, professor=professor)
    subjects.append(medium_subject)

    return subjects


@pytest.fixture
def setup_enrollment_scenario(student, semester, professor):
    """Set up a complete enrollment scenario with prerequisites."""
    enrollment = EnrollmentFactory(student=student, semester=semester)
    program = student.program

    # Create prerequisite subject
    prerequisite = SubjectFactory(
        code="PREREQ001",
        units=3,
        subject_type="MAJOR",
        program=program
    )
    prereq_section = SectionFactory(
        subject=prerequisite,
        semester=semester,
        professor=professor
    )

    # Create subject with prerequisite
    subject_with_prereq = SubjectFactory(
        code="ADVANCED001",
        units=3,
        subject_type="MAJOR",
        program=program
    )
    subject_with_prereq.prerequisites.add(prerequisite)
    main_section = SectionFactory(
        subject=subject_with_prereq,
        semester=semester,
        professor=professor
    )

    # Enroll student in prerequisite with PASSED status
    SubjectEnrollmentFactory(
        enrollment=enrollment,
        subject=prerequisite,
        section=prereq_section,
        enrollment_status='COMPLETED',
        subject_status='PASSED',
        grade_status='FINALIZED'
    )

    # Create payment months for enrollment
    for month_num in range(1, 7):
        PaymentMonthFactory(
            enrollment=enrollment,
            month_number=month_num,
            amount_due=10000.00,
            amount_paid=0.00,
            is_paid=False,
        )

    return enrollment, prerequisite, subject_with_prereq
