# Data Seeder for Subject Advising Testing - Implementation Plan

**Date:** 2025-11-29
**Purpose:** Create realistic test data for subject advising testing across multiple student scenarios

---

## Overview

Create a Django management command `seed_advising_data` that generates realistic student data with varied academic histories to support comprehensive subject advising testing.

**Key Requirements:**
- Multiple students with distinct scenarios
- All scenario types: freshman, INC subjects, completed subjects, repeat subjects, etc.
- Idempotent operation (safe to run multiple times)
- Silent execution (minimal output)
- Payment transaction history for some students
- Management command format: `python manage.py seed_advising_data`

---

## Architecture & Approach

### 1. Command Structure
- **File:** `sis/management/commands/seed_advising_data.py`
- **Entry point:** Django management command handler
- **Strategy:** Define 8 distinct student scenarios
- **Idempotency:** Use `get_or_create()` patterns for all models
- **Factory reuse:** Leverage existing factories from `sis/tests/conftest.py`

### 2. Core Components

#### A. Base Data (Created Once, Reused for All Students)
- **Program:** Computer Science (CS) - 1 program for consistency
- **Subjects:** 40-50 subjects organized by level
  - Level 100 (Freshman core): 8-10 subjects (no prerequisites)
  - Level 200 (Sophomore): 8-10 subjects (Level 100 prerequisites)
  - Level 300 (Junior): 8-10 subjects (Level 200 prerequisites)
  - Level 400 (Senior): 8-10 subjects (Level 300 prerequisites)
  - Electives: 5-6 subjects (various prerequisite levels)
- **Semesters:** 4 semesters
  - Fall 2023
  - Spring 2024
  - Fall 2024
  - Spring 2025 (current/active)
- **Sections:** 2-3 sections per subject per semester
- **Professors:** 10 professors assigned to sections

#### B. Student Scenarios (8 Types)

**Scenario 1: Freshman (No History)**
- New student, just starting
- Enrolled in Spring 2025 (current semester)
- No previous enrollments or grades
- Clean payment history to start
- Purpose: Test basic advising workflow

**Scenario 2: Completed/Passing Student (Multiple Semesters)**
- All subjects PASSED across 3 previous semesters
- Currently in Spring 2025 with some subjects enrolled
- Healthy GPA (3.5+)
- Has paid all previous semester payments
- Purpose: Test advising for good academic standing

**Scenario 3: Student with 1-2 INC Subjects**
- 2 semesters of history with mostly PASSED grades
- 1-2 subjects with INC status from previous semester
- INC start dates set (not near expiry yet)
- Currently enrolled in Spring 2025
- Purpose: Test INC handling in advising

**Scenario 4: Student with Multiple OLD INC (Near Expiry)**
- 2-3 subjects with INC status started 5+ months ago
- Mix of MAJOR and MINOR subjects (different expiry rules)
- Currently in Spring 2025, needs urgent advising
- Purpose: Test expired/expiring INC detection in advising

**Scenario 5: Student with FAILED/RETAKE**
- Passed some subjects, FAILED 2-3 subjects
- Those subjects available for RETAKE
- Some FAILED subjects no longer being retaken (moving on)
- Currently in Spring 2025
- Purpose: Test RETAKE advising and prerequisite blocking

**Scenario 6: Student with Prerequisite Chain Issues**
- Enrolled in subjects but missing some prerequisites
- Or prerequisites are INC/FAILED, blocking future enrollment
- Created to test prerequisite validation in advising
- Purpose: Test prerequisite dependency chains

**Scenario 7: Transfer Student (CREDITED Subjects)**
- Some subjects with CREDITED status (from transfer)
- Credits satisfy prerequisites without formal grades
- Mix of CREDITED and regular PASSED subjects
- Currently in Spring 2025
- Purpose: Test CREDITED subject handling in advising

**Scenario 8: Low GPA / Academic Risk**
- Multiple semesters of history with mixed D/C grades
- GPA near probation threshold (2.0)
- Some repeated subjects after past failures
- Currently in Spring 2025
- Purpose: Test advising for at-risk students

---

## Implementation Details

### 1. File Structure

```
sis/management/
├── __init__.py (create if needed)
└── commands/
    ├── __init__.py (create if needed)
    └── seed_advising_data.py (NEW - main seeder)
```

### 2. Command Class Structure

```python
class Command(BaseCommand):
    def handle(self, *args, **options):
        # Phase 1: Create base data (Program, Subjects, Semesters, etc.)
        self._create_base_data()

        # Phase 2: Create 8 student scenarios
        self._create_freshman_student()
        self._create_passing_student()
        self._create_inc_student()
        self._create_old_inc_student()
        self._create_failed_student()
        self._create_prerequisite_issue_student()
        self._create_transfer_student()
        self._create_low_gpa_student()

        # Phase 3: Generate payment history for selected students
        self._create_payment_history_for_scenario(2)  # Passing student
        self._create_payment_history_for_scenario(3)  # INC student
        self._create_payment_history_for_scenario(8)  # Low GPA student
```

### 3. Idempotency Strategy

Use `get_or_create()` for all model creation:
```python
program, created = Program.objects.get_or_create(
    code='CS',
    defaults={'name': 'Computer Science', ...}
)
```

Use unique identifiers for each scenario student:
```python
student, created = Student.objects.get_or_create(
    student_id=f'SEED_SCENARIO_{scenario_num}_{year}',
    defaults={...}
)
```

### 4. Helper Methods

- `_create_program()` - Creates CS program once
- `_create_subjects()` - Creates 45 subjects with proper prerequisites
- `_create_semesters()` - Creates 4 semester records
- `_create_sections()` - Creates 2-3 sections per subject per semester
- `_create_professors()` - Creates 10 professor users
- `_create_student_with_scenario(scenario_type)` - Factory for each scenario
- `_enroll_student_in_subjects(student, subjects, semester, grades)` - Bulk enrollment + grading
- `_create_payment_history(enrollment, payment_schedule)` - Payment transaction creation

### 5. Subject Structure (45 Total)

**Level 100 (No Prerequisites):**
- CS101: Programming Fundamentals
- CS102: Digital Logic
- CS103: Discrete Mathematics
- CS104: Web Basics
- CS105: Data Structures Intro
- CS106: Database Intro
- CS107: System Thinking
- CS108: Tech Writing
- CS109: Professional Ethics

**Level 200 (Requires Level 100):**
- CS201: Object-Oriented Programming (prereq: CS101)
- CS202: Computer Architecture (prereq: CS102)
- CS203: Algorithms (prereq: CS103 + CS101)
- CS204: Advanced Web Dev (prereq: CS104)
- CS205: Data Structures (prereq: CS105)
- CS206: Database Design (prereq: CS106)
- CS207: OS Concepts (prereq: CS102)
- CS208: Software Engineering (prereq: CS201)
- CS209: Networks Intro (prereq: CS102)

**Level 300 (Requires Level 200):**
- CS301: AI Fundamentals (prereq: CS203)
- CS302: Advanced Databases (prereq: CS206)
- CS303: Web Security (prereq: CS204)
- CS304: Compilers (prereq: CS202 + CS203)
- CS305: Distributed Systems (prereq: CS209)
- CS306: Software Testing (prereq: CS208)
- CS307: Game Development (prereq: CS205)
- CS308: Computer Graphics (prereq: CS205)
- CS309: Mobile Development (prereq: CS204)

**Level 400 (Requires Level 300):**
- CS401: Machine Learning (prereq: CS301)
- CS402: Data Science (prereq: CS301)
- CS403: Big Data Analytics (prereq: CS305)
- CS404: Advanced AI (prereq: CS401)
- CS405: Thesis Part 1 (prereq: CS306)
- CS406: Thesis Part 2 (prereq: CS405)
- CS407: Cloud Computing (prereq: CS305)
- CS408: Cybersecurity (prereq: CS303)
- CS409: Advanced Networks (prereq: CS305)

**Electives (Various Prerequisites):**
- ELEC101: Presentation Skills (no prereq)
- ELEC102: Project Management (no prereq)
- ELEC201: Leadership (prereq: CS101)
- ELEC301: Innovation (prereq: CS208)

### 6. Semester-by-Semester Progression

For each scenario, define realistic enrollment per semester:

**Fall 2023 (Semester 1):**
- Freshman student: 4-5 Level 100 courses
- Passing student: 5 Level 200 courses
- INC student: 5 Level 200 courses (1 will become INC)
- Etc.

**Spring 2024 (Semester 2):**
- Building on Fall 2023
- Freshman still in Level 100
- Passing student moving to Level 300
- INC student continuing with INC subject pending
- Etc.

**Fall 2024 (Semester 3):**
- Similar pattern, advancing students further

**Spring 2025 (Semester 4 - Current):**
- Active semester for all students
- Some new enrollments being tested

### 7. Payment History Generation

For selected students (scenarios 2, 3, 8):
- Create 3 semesters of payment history
- Allocate payments sequentially through months
- For scenario 2 (passing): All paid on time
- For scenario 3 (INC): Some delays, but caught up
- For scenario 8 (low GPA): Late payments, some months still owing

Payment allocation uses existing `payment_service.allocate_payment()`:
```python
for payment_amount in payment_schedule:
    allocate_payment(
        enrollment=enrollment,
        amount=Decimal(str(payment_amount)),
        method='CASH',
        reference_number=f'SEED_{student_id}_{timestamp}',
        user=admin_user
    )
```

---

## Data Volume Summary

- **Program:** 1
- **Subjects:** 45
- **Semesters:** 4
- **Sections:** ~180 (45 subjects × 4 semesters ÷ mostly 1 section, some 2)
- **Professors:** 10
- **Students:** 8 (one per scenario)
- **Enrollments:** ~32 (8 students × 4 semesters)
- **SubjectEnrollments:** ~400-500 (varied enrollment per student)
- **Grades:** ~400-500 (one per completed subject enrollment)
- **PaymentMonths:** ~72 (8 students × 3 semesters × 6 months - some students skip)
- **Payments:** ~150-200 (for students 2, 3, 8 only)

---

## Critical Business Logic to Respect

1. **INC Expiry Dates:** Calculate `inc_start_date` correctly
   - Old INC students: inc_start_date from 5+ months ago
   - Recent INC students: inc_start_date from 2-3 months ago

2. **GPA Calculation:** Use existing `grade_service.calculate_gpa()`
   - Ensure grades are properly finalized before calculating
   - Update Student.gpa field after finalization

3. **Prerequisite Chains:** Ensure subject prerequisites match enrollment
   - Can't enroll in CS201 without CS101 PASSED
   - Test prerequisite blocking by having students with INC prerequisites

4. **Payment Gates:**
   - For Spring 2025 enrollments, ensure Month 1 is paid
   - Create payment history that respects sequential allocation

5. **Subject Types:**
   - Assign MAJOR vs MINOR correctly
   - This affects INC expiry thresholds (6 months vs 12 months)

---

## Success Criteria

1. ✅ Command runs without errors: `python manage.py seed_advising_data`
2. ✅ Creates 8 students with distinct scenarios
3. ✅ Can run multiple times without duplicate data (idempotent)
4. ✅ Freshman student has no history, clean state
5. ✅ Passing student has 3+ semesters of all PASSED grades, GPA 3.5+
6. ✅ INC student has recent INC subjects (not expired)
7. ✅ Old INC student has INC subjects from 5+ months ago
8. ✅ Failed student has FAILED + RETAKE scenarios available
9. ✅ Prerequisite student has subjects with missing prerequisites (tests blocking)
10. ✅ Transfer student has CREDITED subjects
11. ✅ Low GPA student has low grades, GPA ~2.0
12. ✅ Payment history created for students 2, 3, 8
13. ✅ All Grade records have is_finalized=True (for GPA to calculate)
14. ✅ GPA values updated on Student model after finalization

---

## Implementation Order

1. Create base data (program, subjects, semesters, sections, professors)
2. Create scenario 1: Freshman (simplest - no history)
3. Create scenario 2: Passing student
4. Create scenario 3: INC student (recent)
5. Create scenario 4: Old INC student
6. Create scenario 5: Failed/Retake student
7. Create scenario 6: Prerequisite issue student
8. Create scenario 7: Transfer/Credited student
9. Create scenario 8: Low GPA student
10. Create payment histories for scenarios 2, 3, 8
11. Run GPA recalculation for all students
12. Verify output and idempotency

---

## Notes

- Use Django's `get_or_create()` extensively for idempotency
- Consider creating utility classes for scenario-specific enrollment logic
- Document each scenario's purpose clearly in comments
- Test idempotency by running the command twice and verifying data count doesn't double
- Minimal console output - only print final summary (8 students created) or error messages

---

**Ready for Implementation**
