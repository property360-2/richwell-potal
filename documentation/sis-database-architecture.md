# SIS Database Architecture (From Actual Models)

> **Document Version**: 1.0  
> **Generated**: 2026-01-27  
> **Source**: Reverse-engineered from Django models in `backend/apps/`

---

## Table of Contents

1. [Current ERD (Reverse-Engineered)](#1-current-erd-reverse-engineered)
2. [Issues & Technical Debt](#2-issues--technical-debt)
3. [Proposed ERD (Refactored)](#3-proposed-erd-refactored)
4. [Entity Definitions (Final)](#4-entity-definitions-final)
5. [Relationship Matrix](#5-relationship-matrix)
6. [Constraints & Business Rules](#6-constraints--business-rules)
7. [Enrollment / Retake / Overload Logic](#7-enrollment--retake--overload-logic)
8. [Migration Impact Notes](#8-migration-impact-notes)
9. [Seeder Architecture](#9-seeder-architecture)
10. [Scalability & Future-Proofing](#10-scalability--future-proofing)

---

## 1. Current ERD (Reverse-Engineered)

### 1.1 Core Models Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BASE MODELS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  BaseModel (abstract)                                                        │
│  ├── id: UUID (PK)                                                          │
│  ├── created_at: DateTime                                                   │
│  ├── updated_at: DateTime                                                   │
│  └── is_deleted: Boolean (soft delete)                                      │
│                                                                              │
│  BaseModelWithActiveManager (abstract, extends BaseModel)                   │
│  └── objects = ActiveManager() (filters is_deleted=False)                  │
│  └── all_objects = Manager() (includes deleted)                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 User & Profile Domain

```
┌──────────────────┐       1:1        ┌────────────────────┐
│      User        │──────────────────│   StudentProfile   │
│  (AbstractUser)  │                  │                    │
├──────────────────┤                  ├────────────────────┤
│ id: UUID (PK)    │                  │ user_id: FK        │
│ email: unique    │                  │ program_id: FK     │
│ role: enum       │                  │ curriculum_id: FK  │
│ student_number   │                  │ year_level: int    │
│ first_name       │                  │ home_section_id:FK │
│ last_name        │                  │ is_irregular: bool │
│ created_at       │                  │ overload_approved  │
│ updated_at       │                  │ status: enum       │
└──────────────────┘                  │ academic_status    │
        │                             │ middle_name        │
        │ 1:1                         │ birthdate          │
        ▼                             │ address            │
┌──────────────────┐                  │ contact_number     │
│ ProfessorProfile │                  │ is_transferee      │
├──────────────────┤                  └────────────────────┘
│ user_id: FK      │
│ department       │
│ specialization   │
│ max_teaching_hrs │
│ assigned_subjects│ ◄── M:N to Subject
│ is_active        │
└──────────────────┘
```

### 1.3 Academic Domain

```
┌─────────────┐    1:N     ┌─────────────┐    N:1     ┌─────────────────┐
│   Program   │◄───────────│   Subject   │───────────►│   Curriculum    │
├─────────────┤            ├─────────────┤            ├─────────────────┤
│ code: uniq  │            │ code: uniq  │            │ program_id: FK  │
│ name        │            │ title       │            │ code            │
│ description │            │ program_id  │            │ name            │
│ duration_yrs│            │ units       │            │ effective_year  │
│ is_active   │            │ year_level  │            │ is_active       │
└─────────────┘            │ semester_num│            └─────────────────┘
      │                    │ is_major    │                    │
      │ 1:N                │ prerequisites│ ◄── M:N self      │ 1:N
      ▼                    │ programs    │ ◄── M:N Program    ▼
┌─────────────┐            └─────────────┘            ┌─────────────────┐
│  Section    │                   │                   │CurriculumSubject│
├─────────────┤                   │ 1:N               ├─────────────────┤
│ name        │                   ▼                   │ curriculum_id   │
│ program_id  │            ┌─────────────┐            │ subject_id      │
│ semester_id │            │SectionSubject│           │ year_level      │
│ curriculum_id│           ├─────────────┤            │ semester_number │
│ year_level  │            │ section_id  │            │ is_required     │
│ capacity    │            │ subject_id  │            └─────────────────┘
│ is_dissolved│            │ professor_id│
│ parent_sect │            │ capacity    │
└─────────────┘            │ is_tba      │
      │                    └─────────────┘
      │ 1:N                       │
      ▼                           │ 1:N
┌─────────────────────┐           ▼
│SectionSubjectProfessor│  ┌──────────────┐
├─────────────────────┤   │ ScheduleSlot │
│ section_subject_id  │   ├──────────────┤
│ professor_id        │   │ section_subj │
│ is_primary          │   │ professor_id │
└─────────────────────┘   │ day: enum    │
                          │ start_time   │
                          │ end_time     │
                          │ room: str    │
                          └──────────────┘
```

### 1.4 Enrollment Domain

```
┌──────────────┐    1:N     ┌───────────────────┐
│   Semester   │◄───────────│    Enrollment     │
├──────────────┤            ├───────────────────┤
│ name         │            │ student_id: FK    │
│ academic_year│            │ semester_id: FK   │
│ start_date   │            │ status: enum      │
│ end_date     │            │ created_via       │
│ enroll_start │            │ monthly_commitment│
│ enroll_end   │            │ first_month_paid  │
│ is_current   │            └───────────────────┘
└──────────────┘                    │
                                    │ 1:N
                                    ▼
                          ┌───────────────────┐
                          │ SubjectEnrollment │
                          ├───────────────────┤
                          │ enrollment_id     │
                          │ subject_id        │
                          │ section_id        │
                          │ enrollment_type   │ HOME/RETAKE/OVERLOAD
                          │ status            │
                          │ grade             │
                          │ is_irregular      │
                          │ is_retake         │
                          │ original_enrollment│ ◄── self FK
                          │ payment_approved  │
                          │ head_approved     │
                          │ registrar_approved│
                          │ is_finalized      │
                          └───────────────────┘
```

### 1.5 Payment & Exam Domain

```
┌───────────────────┐         ┌─────────────────────┐
│MonthlyPaymentBucket│         │  PaymentTransaction │
├───────────────────┤         ├─────────────────────┤
│ enrollment_id     │         │ enrollment_id       │
│ month_number(1-6) │         │ amount              │
│ event_label       │         │ payment_mode        │
│ required_amount   │         │ receipt_number      │
│ paid_amount       │         │ allocated_buckets   │
│ is_fully_paid     │         │ processed_by        │
└───────────────────┘         └─────────────────────┘

┌───────────────────┐         ┌─────────────────────┐
│  ExamMonthMapping │         │     ExamPermit      │
├───────────────────┤         ├─────────────────────┤
│ semester_id       │         │ enrollment_id       │
│ exam_period       │         │ exam_period         │
│ required_month    │         │ permit_code: uniq   │
│ is_active         │         │ required_month      │
└───────────────────┘         │ is_printed          │
                              └─────────────────────┘
```

---

## 2. Issues & Technical Debt

### 2.1 Normalization Issues

| Issue | Location | Severity | Description |
|-------|----------|----------|-------------|
| **Redundant year_level** | `Subject.year_level` vs `CurriculumSubject.year_level` | HIGH | Subject has year_level but CurriculumSubject also has it. Intent is flexible curriculum placement, but creates ambiguity. |
| **Redundant semester_number** | Same as above | HIGH | Same duplication issue |
| **Room as string in ScheduleSlot** | `ScheduleSlot.room: CharField` | MEDIUM | Room model exists but ScheduleSlot uses string instead of FK |
| **Dual professor reference** | `SectionSubject.professor` + `SectionSubjectProfessor` | HIGH | Two mechanisms for professor assignment creates confusion |

### 2.2 Missing Constraints

| Constraint | Impact | Fix |
|------------|--------|-----|
| No `unique_together` on `CurriculumSubject(curriculum, subject, year_level, semester_number)` | Same subject can appear multiple times in same slot | Add constraint |
| No check constraint for `start_time < end_time` | Invalid schedules possible | Add CheckConstraint |
| No validation for schedule conflicts at DB level | Relies on app-level validation | Add trigger or constraint |
| `Section.parent_section` no protection against cycles | Infinite loop possible | Add validation |

### 2.3 Bad Relationships

| Relationship | Problem | Fix |
|--------------|---------|-----|
| `Subject.program` (FK) + `Subject.programs` (M2M) | Confusing dual ownership | Use only M2M `programs` with primary flag |
| `StudentProfile.home_section` nullable | Regular students should require section | Make required for REGULAR status |
| `SubjectEnrollment.section` nullable | ENROLLED status should require section | Add constraint |

### 2.4 Naming Inconsistencies

| Current | Expected | Fix |
|---------|----------|-----|
| `semester_number` | `semester_type` (1,2,3) | Rename for clarity |
| `SectionSubject` | `SectionOffering` | More descriptive |
| `SubjectEnrollment` | `CourseEnrollment` | Industry standard |
| `is_deleted` | `deleted_at: DateTime` | Track when deleted |

### 2.5 Scalability Limitations

| Limitation | Impact | Fix |
|------------|--------|-----|
| No `campus_id` on Section/Room | Single-campus only | Add FK to Campus model |
| No `department_id` on Subject | Can't filter by department | Add FK to Department |
| JSONField for `allocated_buckets` | Can't query allocations | Normalize to table |
| No indexing on filter fields | Slow queries at scale | Add strategic indexes |

---

## 3. Proposed ERD (Refactored)

### 3.1 New Models to Add

```python
# Multi-campus support
class Campus(BaseModel):
    code = CharField(unique=True)  # e.g., 'MAIN', 'NORTH'
    name = CharField()
    address = TextField()
    is_active = BooleanField(default=True)

# Department for organization
class Department(BaseModel):
    code = CharField(unique=True)  # e.g., 'CCS', 'CBAA'
    name = CharField()
    campus = ForeignKey(Campus)
    head = ForeignKey(User, null=True)  # Department head
    
# Refactored Subject ownership
class ProgramSubject(BaseModel):
    """Junction: Subject belongs to Program with metadata"""
    program = ForeignKey(Program)
    subject = ForeignKey(Subject)
    is_primary = BooleanField()  # Primary owning program
    
    class Meta:
        unique_together = ['program', 'subject']

# Payment allocation normalization
class PaymentAllocation(BaseModel):
    """Normalized from JSONField allocated_buckets"""
    transaction = ForeignKey(PaymentTransaction)
    bucket = ForeignKey(MonthlyPaymentBucket)
    amount = DecimalField()
```

### 3.2 Refactored Section Model

```python
class Section(BaseModelWithActiveManager):
    name = CharField()  # e.g., 'BSIT-1A'
    program = ForeignKey(Program)
    semester = ForeignKey(Semester, on_delete=PROTECT)
    curriculum = ForeignKey(Curriculum, on_delete=PROTECT)
    campus = ForeignKey(Campus, on_delete=PROTECT)  # NEW
    department = ForeignKey(Department, null=True)  # NEW
    year_level = PositiveIntegerField()
    capacity = PositiveIntegerField(default=40)
    is_dissolved = BooleanField(default=False)
    parent_section = ForeignKey('self', null=True)
    
    class Meta:
        unique_together = ['name', 'semester', 'campus']  # Per campus
```

### 3.3 Refactored SectionSubject (SectionOffering)

```python
class SectionOffering(BaseModelWithActiveManager):
    """Renamed from SectionSubject for clarity"""
    section = ForeignKey(Section)
    subject = ForeignKey(Subject)
    capacity = PositiveIntegerField(null=True)  # Override section capacity
    is_tba = BooleanField(default=True)
    
    class Meta:
        unique_together = ['section', 'subject']

class SectionOfferingProfessor(BaseModel):
    """Single source of truth for professor assignments"""
    offering = ForeignKey(SectionOffering, related_name='professors')
    professor = ForeignKey(User, limit_choices_to={'role': 'PROFESSOR'})
    is_primary = BooleanField(default=False)
    teaching_hours = PositiveIntegerField(default=3)
    
    class Meta:
        unique_together = ['offering', 'professor']
```

### 3.4 Refactored ScheduleSlot

```python
class ScheduleSlot(BaseModelWithActiveManager):
    offering = ForeignKey(SectionOffering, related_name='schedules')
    professor = ForeignKey(User, null=True)  # Specific professor for this slot
    room = ForeignKey(Room, on_delete=PROTECT)  # FK instead of string
    day = CharField(choices=DAY_CHOICES)
    start_time = TimeField()
    end_time = TimeField()
    
    class Meta:
        constraints = [
            CheckConstraint(
                check=Q(start_time__lt=F('end_time')),
                name='valid_time_range'
            )
        ]
        indexes = [
            Index(fields=['room', 'day', 'start_time']),
            Index(fields=['professor', 'day', 'start_time']),
        ]
```

---

## 4. Entity Definitions (Final)

### 4.1 Core Entities

| Entity | Purpose | Key Fields | Soft Delete |
|--------|---------|------------|-------------|
| **Campus** | Multi-campus support | code, name, address | ✓ |
| **Department** | Organize programs/subjects | code, name, campus_id, head_id | ✓ |
| **Program** | Academic program (BSIT, BSCS) | code, name, department_id, duration | ✓ |
| **Curriculum** | Version of program requirements | program_id, code, effective_year | ✓ |
| **Subject** | Course offering | code, title, units, is_major | ✓ |
| **CurriculumSubject** | Subject placement in curriculum | curriculum_id, subject_id, year, sem | ✓ |
| **Room** | Physical classroom | name, campus_id, capacity, type | ✓ |

### 4.2 Section & Schedule Entities

| Entity | Purpose | Key Fields | Soft Delete |
|--------|---------|------------|-------------|
| **Section** | Student grouping per semester | name, program, semester, curriculum | ✓ |
| **SectionOffering** | Subject offered in section | section_id, subject_id, capacity | ✓ |
| **SectionOfferingProfessor** | Professor assignment | offering_id, professor_id, is_primary | ✓ |
| **ScheduleSlot** | Time/room for offering | offering_id, room_id, day, times | ✓ |

### 4.3 User Entities

| Entity | Purpose | Key Fields | Soft Delete |
|--------|---------|------------|-------------|
| **User** | System user | email, role, student_number | No (auth) |
| **StudentProfile** | Student details | user_id, program, curriculum, section | ✓ |
| **ProfessorProfile** | Professor details | user_id, department, specialization | ✓ |

### 4.4 Enrollment Entities

| Entity | Purpose | Key Fields | Soft Delete |
|--------|---------|------------|-------------|
| **Semester** | Academic period | name, academic_year, dates, is_current | ✓ |
| **Enrollment** | Student's semester enrollment | student_id, semester_id, status | ✓ |
| **SubjectEnrollment** | Individual subject enrollment | enrollment_id, subject_id, section_id, type | ✓ |
| **EnrollmentApproval** | Approval audit trail | subject_enrollment_id, approver, action | No |

---

## 5. Relationship Matrix

```
                          Program  Curriculum  Subject  Section  User  Enrollment
Program                      -        1:N        1:N      1:N      -        -
Curriculum                  N:1        -         M:N      1:N      -        -
Subject                     N:1       M:N         -       M:N      -        1:N
Section                     N:1       N:1        M:N       -       -        M:N
User                         -         -          -        -       -        1:N
Enrollment                   -         -         M:N      M:N     N:1        -
Semester                     -        1:N         -       1:N      -        1:N
Room                         -         -          -        -       -         -
Campus                      1:N        -          -       1:N      -         -
Department                  1:N        -         1:N       -      1:N        -
```

### 5.1 Critical Relationships

| From | To | Type | On Delete | Business Rule |
|------|-----|------|-----------|---------------|
| StudentProfile | Section | M:1 | SET_NULL | Home section nullable for irregular |
| SubjectEnrollment | Section | M:1 | SET_NULL | Required for ENROLLED status |
| SubjectEnrollment | SectionOffering | M:1 | SET_NULL | Track specific offering (optional) |
| SectionOffering | Subject | M:1 | PROTECT | Cannot delete subject with offerings |
| Section | Curriculum | M:1 | PROTECT | Sections follow curriculum |
| Enrollment | Semester | M:1 | PROTECT | Cannot delete active semester |

---

## 6. Constraints & Business Rules

### 6.1 Database Constraints

```python
# Section uniqueness per campus/semester
class Section:
    class Meta:
        constraints = [
            UniqueConstraint(
                fields=['name', 'semester', 'campus'],
                condition=Q(is_deleted=False),
                name='unique_active_section_per_campus'
            )
        ]

# Schedule non-overlap (room)
class ScheduleSlot:
    class Meta:
        constraints = [
            # Prevent exact duplicate slots
            UniqueConstraint(
                fields=['room', 'day', 'start_time', 'end_time'],
                name='unique_room_slot'
            )
        ]

# Enrollment uniqueness
class Enrollment:
    class Meta:
        constraints = [
            UniqueConstraint(
                fields=['student', 'semester'],
                name='one_enrollment_per_semester'
            )
        ]
```

### 6.2 Application-Level Rules

| Rule | Enforcement | Model |
|------|-------------|-------|
| Student max 24 units (or override) | `clean()` method | SubjectEnrollment |
| Prerequisites must be passed | Pre-save signal | SubjectEnrollment |
| Cannot enroll in dissolved section | `save()` override | SubjectEnrollment |
| INC expires (6mo major, 12mo minor) | Celery task | SubjectEnrollment |
| First month must be paid for subjects | Workflow check | SubjectEnrollment |

---

## 7. Enrollment / Retake / Overload Logic

### 7.1 Enrollment Types

```python
class SubjectEnrollment:
    class EnrollmentType(TextChoices):
        HOME = 'HOME', 'Home Section [H]'      # Regular per section schedule
        RETAKE = 'RETAKE', 'Retake [R]'        # Failed subject from past
        OVERLOAD = 'OVERLOAD', 'Overload [O]'  # Exceeds normal unit limit
```

### 7.2 Enrollment Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ENROLLMENT FLOW                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Student selects subjects                                            │
│     ▼                                                                   │
│  2. System validates:                                                   │
│     ├── Prerequisites passed? ─────────► NO: Block enrollment           │
│     ├── Schedule conflicts? ───────────► YES: Choose different section  │
│     ├── Section has capacity? ─────────► NO: Waitlist or alternative    │
│     └── Unit limit exceeded? ──────────► YES: Requires overload request │
│     ▼                                                                   │
│  3. Create SubjectEnrollment records                                    │
│     ├── status = PENDING_PAYMENT                                        │
│     ├── payment_approved = False                                        │
│     └── head_approved = False                                           │
│     ▼                                                                   │
│  4. Payment Processing                                                  │
│     └── First month paid ────────────────► payment_approved = True      │
│     ▼                                                                   │
│  5. Department Head Approval                                            │
│     └── Head approves enrollment ────────► head_approved = True         │
│     ▼                                                                   │
│  6. If OVERLOAD type:                                                   │
│     └── Registrar approves ──────────────► registrar_approved = True    │
│     ▼                                                                   │
│  7. All approvals complete                                              │
│     └── status = ENROLLED                                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.3 Retake Logic

```python
def validate_retake(student, subject, semester):
    """
    Retake Rules:
    1. Student must have FAILED the subject in a previous semester
    2. Student can choose ANY section offering that subject
    3. Creates link to original failed enrollment via original_enrollment FK
    """
    # Find failed enrollment
    failed = SubjectEnrollment.objects.filter(
        enrollment__student=student,
        subject=subject,
        status='FAILED',
        enrollment__semester__end_date__lt=semester.start_date
    ).first()
    
    if not failed:
        raise ValidationError("Cannot retake: no failed record found")
    
    return {
        'enrollment_type': 'RETAKE',
        'is_retake': True,
        'original_enrollment': failed
    }
```

### 7.4 Overload Logic

```python
def check_overload(student, semester, requested_units):
    """
    Overload Rules:
    1. Default limit: 24 units
    2. Student can request override (OverloadRequest model)
    3. Requires registrar approval
    4. StudentProfile.max_units_override stores approved limit
    """
    profile = student.student_profile
    max_units = profile.max_units_override or 24
    
    current_units = SubjectEnrollment.objects.filter(
        enrollment__student=student,
        enrollment__semester=semester,
        status__in=['ENROLLED', 'PENDING']
    ).aggregate(total=Sum('subject__units'))['total'] or 0
    
    if current_units + requested_units > max_units:
        if not profile.overload_approved:
            raise ValidationError("Overload requires registrar approval")
        return 'OVERLOAD'
    
    return 'HOME'
```

---

## 8. Migration Impact Notes

### 8.1 Breaking Changes

| Change | Migration Steps |
|--------|-----------------|
| Add `Campus` model | 1. Create model 2. Add default campus 3. Add FK to Section, Room |
| Add `Department` model | 1. Create model 2. Migrate existing data 3. Add FKs |
| Rename `SectionSubject` → `SectionOffering` | 1. Create new model 2. Migrate data 3. Update all references 4. Drop old |
| Remove `SectionSubject.professor` | 1. Ensure all data in `SectionSubjectProfessor` 2. Remove field |
| `ScheduleSlot.room` string → FK | 1. Create Room records for existing strings 2. Add FK 3. Migrate 4. Drop string |
| Normalize `allocated_buckets` JSONField | 1. Create `PaymentAllocation` 2. Migrate JSON data 3. Keep JSON as backup |

### 8.2 Data Migration Script Outline

```python
# migrations/00XX_campus_and_department.py
def migrate_to_campus(apps, schema_editor):
    Campus = apps.get_model('academics', 'Campus')
    Section = apps.get_model('academics', 'Section')
    Room = apps.get_model('academics', 'Room')
    
    # Create default campus
    main = Campus.objects.create(
        code='MAIN',
        name='Main Campus',
        address='Richwell Colleges Main'
    )
    
    # Update all sections and rooms
    Section.objects.update(campus=main)
    Room.objects.update(campus=main)
```

### 8.3 Rollback Strategy

1. Keep `is_deleted` soft delete for all changes
2. Maintain old column during transition with triggers
3. Full database backup before migration
4. Test on staging with production data copy

---

## 9. Seeder Architecture

### 9.1 Seeder Order (Dependency Graph)

```
Level 0 (No Dependencies):
├── Campus
├── Semester
├── PermissionCategory
└── Permission

Level 1 (Depends on L0):
├── Department (→ Campus)
├── Room (→ Campus)
└── User [Staff] (→ none)

Level 2 (Depends on L1):
├── Program (→ Department)
├── ProfessorProfile (→ User, Department)
└── UserPermission (→ User, Permission)

Level 3 (Depends on L2):
├── Curriculum (→ Program)
├── Subject (→ Program)
└── ProgramSubject (→ Program, Subject)

Level 4 (Depends on L3):
├── CurriculumSubject (→ Curriculum, Subject)
├── Section (→ Program, Semester, Curriculum, Campus)
└── User [Students] (→ none)

Level 5 (Depends on L4):
├── StudentProfile (→ User, Program, Curriculum, Section)
├── SectionOffering (→ Section, Subject)
└── CurriculumVersion (→ Program, Semester)

Level 6 (Depends on L5):
├── SectionOfferingProfessor (→ SectionOffering, User)
├── ScheduleSlot (→ SectionOffering, Room, User)
└── Enrollment (→ User, Semester)

Level 7 (Depends on L6):
├── MonthlyPaymentBucket (→ Enrollment)
├── SubjectEnrollment (→ Enrollment, Subject, Section)
└── EnrollmentApproval (→ SubjectEnrollment, User)

Level 8 (Depends on L7):
├── PaymentTransaction (→ Enrollment, User)
├── PaymentAllocation (→ PaymentTransaction, MonthlyPaymentBucket)
├── ExamPermit (→ Enrollment)
├── GradeHistory (→ SubjectEnrollment, User)
└── AuditLog (→ User, various)
```

### 9.2 Seeder Dependencies Matrix

```
Model                      Requires First
─────────────────────────────────────────────────────────
Campus                     (none)
Department                 Campus
Program                    Department (optional)
Curriculum                 Program
Subject                    Program
CurriculumSubject          Curriculum, Subject
Room                       Campus
Semester                   (none)
User                       (none)
ProfessorProfile           User
StudentProfile             User, Program, Curriculum, Section
Section                    Program, Semester, Curriculum, Campus
SectionOffering            Section, Subject
SectionOfferingProfessor   SectionOffering, User[Professor]
ScheduleSlot               SectionOffering, Room, User[Professor]
Enrollment                 User[Student], Semester
MonthlyPaymentBucket       Enrollment
SubjectEnrollment          Enrollment, Subject, Section
PaymentTransaction         Enrollment, User[Cashier]
ExamPermit                 Enrollment
GradeHistory               SubjectEnrollment
AuditLog                   User (optional)
```

### 9.3 Sample Seeder Structures

```python
# apps/core/management/commands/seed_full_v2.py

class Command(BaseCommand):
    help = 'Seeds database with complete test data (v2 architecture)'
    
    def handle(self, *args, **options):
        with transaction.atomic():
            self.seed_level_0()  # Campus, Semester, Permissions
            self.seed_level_1()  # Department, Room, Staff Users
            self.seed_level_2()  # Program, ProfessorProfile
            self.seed_level_3()  # Curriculum, Subject
            self.seed_level_4()  # CurriculumSubject, Section, Student Users
            self.seed_level_5()  # StudentProfile, SectionOffering
            self.seed_level_6()  # Professors, Schedules, Enrollment
            self.seed_level_7()  # Payments, SubjectEnrollment
            self.seed_level_8()  # Transactions, History, Audit
    
    def seed_level_0(self):
        self.stdout.write('Seeding Level 0: Foundation...')
        
        # Campus
        self.campus_main = Campus.objects.create(
            code='MAIN',
            name='Richwell Colleges - Main Campus',
            address='123 College Ave, City'
        )
        
        # Semester
        self.semester_current = Semester.objects.create(
            name='1st Semester',
            academic_year='2025-2026',
            is_current=True,
            start_date=date(2025, 8, 1),
            end_date=date(2025, 12, 15),
            enrollment_start_date=date(2025, 7, 1),
            enrollment_end_date=date(2025, 8, 15)
        )
        
        # Past semester for history
        self.semester_past = Semester.objects.create(
            name='2nd Semester',
            academic_year='2024-2025',
            is_current=False,
            start_date=date(2025, 1, 1),
            end_date=date(2025, 5, 31)
        )
```

### 9.4 Seeder Logic Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SEEDER EXECUTION FLOW                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. WIPE (Optional - controlled by --wipe flag)                         │
│     └── Delete in reverse dependency order                               │
│                                                                          │
│  2. FOUNDATION                                                           │
│     ├── Create Campus records                                            │
│     ├── Create Semester records (current + past)                         │
│     └── Create Permission system                                         │
│                                                                          │
│  3. ORGANIZATION                                                         │
│     ├── Create Department records                                        │
│     ├── Create Room records (linked to Campus)                           │
│     └── Create Staff Users (Admin, Registrar, Head, Cashier)            │
│                                                                          │
│  4. ACADEMICS                                                            │
│     ├── Create Program records                                           │
│     ├── Create Professor Users + Profiles                                │
│     ├── Create Curriculum records                                        │
│     ├── Create Subject records                                           │
│     └── Link CurriculumSubject (year/semester placement)                 │
│                                                                          │
│  5. SECTIONS                                                             │
│     ├── Create Section records (per year level)                          │
│     ├── Create SectionOffering (subjects per section)                    │
│     ├── Assign Professors to offerings                                   │
│     └── Create ScheduleSlot (conflict-free algorithm)                    │
│                                                                          │
│  6. STUDENTS                                                             │
│     ├── Create Student Users                                             │
│     ├── Create StudentProfile (linked to section)                        │
│     └── Create past enrollments for history                              │
│                                                                          │
│  7. ENROLLMENTS                                                          │
│     ├── Create Enrollment header records                                 │
│     ├── Create MonthlyPaymentBucket (6 per enrollment)                   │
│     ├── Create SubjectEnrollment records                                 │
│     │   ├── HOME type for regular students                               │
│     │   ├── RETAKE type with original_enrollment link                    │
│     │   └── OVERLOAD type with registrar approval                        │
│     └── Create EnrollmentApproval audit records                          │
│                                                                          │
│  8. PAYMENTS & GRADES                                                    │
│     ├── Create PaymentTransaction records                                │
│     ├── Create PaymentAllocation records                                 │
│     ├── Create ExamPermit records                                        │
│     ├── Create GradeHistory for completed enrollments                    │
│     └── Create AuditLog records                                          │
│                                                                          │
│  9. VERIFICATION                                                         │
│     ├── Print summary counts                                             │
│     └── Validate referential integrity                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 9.5 Conflict-Free Schedule Algorithm

```python
def create_conflict_free_schedule(self, section, offerings):
    """
    Assigns schedule slots avoiding:
    1. Professor teaching multiple classes at same time
    2. Room double-booked
    3. Section having two classes at same time
    """
    occupied = {
        'professor': defaultdict(set),  # {(day, hour): [prof_ids]}
        'room': defaultdict(set),       # {(day, hour): [room_ids]}
        'section': defaultdict(set),    # {(day, hour): [section_ids]}
    }
    
    DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI']
    HOURS = range(7, 19)  # 7 AM to 7 PM
    
    for offering in offerings:
        # Get eligible professors
        professors = list(offering.professors.all())
        if not professors:
            professors = [self.default_professor]
        
        # Find free slot
        slot_found = False
        for _ in range(100):  # Max attempts
            day = random.choice(DAYS)
            hour = random.choice(HOURS)
            prof = random.choice(professors)
            room = random.choice(self.rooms)
            
            slot_key = (day, hour)
            
            # Check conflicts
            if prof.id in occupied['professor'][slot_key]:
                continue
            if room.id in occupied['room'][slot_key]:
                continue
            if section.id in occupied['section'][slot_key]:
                continue
            
            # Slot is free - book it
            ScheduleSlot.objects.create(
                offering=offering,
                professor=prof,
                room=room,
                day=day,
                start_time=time(hour, 0),
                end_time=time(hour + 1, 30)  # 1.5 hour blocks
            )
            
            occupied['professor'][slot_key].add(prof.id)
            occupied['room'][slot_key].add(room.id)
            occupied['section'][slot_key].add(section.id)
            slot_found = True
            break
        
        if not slot_found:
            self.stdout.write(self.style.WARNING(
                f"Could not schedule {offering.subject.code} for {section.name}"
            ))
```

---

## 10. Scalability & Future-Proofing

### 10.1 Multi-Campus Support

```python
# Already designed in proposed ERD
# Key additions:
# - Campus model (code, name, address)
# - Campus FK on: Section, Room, Department
# - Campus filter on all admin views
# - Campus-aware schedule conflict detection
```

### 10.2 Multi-Term Academic History

```python
# Enrollment model already supports:
# - One Enrollment per (student, semester)
# - SubjectEnrollment tracks status per subject
# - GradeHistory provides full audit trail

# Query for student's complete history:
history = SubjectEnrollment.objects.filter(
    enrollment__student=student
).select_related(
    'subject', 'enrollment__semester'
).order_by(
    'enrollment__semester__academic_year',
    'enrollment__semester__start_date'
)
```

### 10.3 Performance Indexes

```python
# Add to models for query optimization
class SubjectEnrollment:
    class Meta:
        indexes = [
            Index(fields=['enrollment', 'status']),
            Index(fields=['subject', 'status']),
            Index(fields=['section', 'status']),
            Index(fields=['enrollment_type', 'status']),
        ]

class ScheduleSlot:
    class Meta:
        indexes = [
            Index(fields=['room', 'day', 'start_time']),
            Index(fields=['professor', 'day']),
            Index(fields=['offering', 'day']),
        ]

class Enrollment:
    class Meta:
        indexes = [
            Index(fields=['student', 'semester']),
            Index(fields=['semester', 'status']),
        ]
```

### 10.4 Caching Strategy

```python
# Cache expensive computations
from django.core.cache import cache

def get_student_transcript(student_id):
    cache_key = f'transcript:{student_id}'
    result = cache.get(cache_key)
    
    if result is None:
        result = calculate_transcript(student_id)
        cache.set(cache_key, result, timeout=3600)
    
    return result

# Invalidate on grade change
@receiver(post_save, sender=SubjectEnrollment)
def invalidate_transcript_cache(sender, instance, **kwargs):
    if instance.grade is not None:
        cache.delete(f'transcript:{instance.enrollment.student_id}')
```

### 10.5 Archive Strategy

```python
class ArchivedEnrollment(BaseModel):
    """
    Move old enrollments here after 5 years.
    Maintains history without affecting active queries.
    """
    original_id = UUIDField()
    student_data = JSONField()  # Snapshot of student info
    enrollment_data = JSONField()  # Full enrollment with subjects
    archived_at = DateTimeField(auto_now_add=True)
    archived_by = ForeignKey(User, null=True)
    
# Celery task to archive old data
@shared_task
def archive_old_enrollments():
    cutoff = timezone.now() - timedelta(days=5*365)
    old_enrollments = Enrollment.objects.filter(
        semester__end_date__lt=cutoff,
        is_deleted=False
    )
    # ... archive and soft-delete
```

---

## Appendix A: Command Reference

```bash
# Full seed (wipes existing)
python manage.py seed_full_v2 --wipe

# Seed without wipe (additive)
python manage.py seed_full_v2

# Seed specific components
python manage.py seed_academics  # Programs, Curricula, Subjects
python manage.py seed_sections   # Sections, Schedules
python manage.py seed_students   # Students, Enrollments

# Verify data integrity
python manage.py check_integrity
```

## Appendix B: Model Import Map

```python
# apps/academics/models.py
from apps.academics.models import (
    Campus,          # Multi-campus support
    Department,      # Department organization
    Program,         # Academic programs
    Curriculum,      # Curriculum versions
    Subject,         # Course definitions
    CurriculumSubject,  # Subject placement
    Section,         # Student sections
    SectionOffering, # Subject offerings (was SectionSubject)
    SectionOfferingProfessor,  # Professor assignments
    ScheduleSlot,    # Time/room schedules
    Room,            # Physical rooms
    CurriculumVersion,  # Snapshot for audit
)

# apps/accounts/models.py
from apps.accounts.models import (
    User,
    StudentProfile,
    ProfessorProfile,
    Permission,
    PermissionCategory,
    UserPermission,
)

# apps/enrollment/models.py
from apps.enrollment.models import (
    Semester,
    Enrollment,
    SubjectEnrollment,
    EnrollmentApproval,
    OverloadRequest,
    MonthlyPaymentBucket,
    PaymentTransaction,
    PaymentAllocation,  # NEW: normalized from JSON
    ExamMonthMapping,
    ExamPermit,
    GradeHistory,
    SemesterGPA,
    CreditSource,
    DocumentRelease,
)
```

---

**END OF DOCUMENT**
