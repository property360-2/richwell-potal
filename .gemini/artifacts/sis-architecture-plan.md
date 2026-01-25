# 🎓 Student Information System (SIS) - Complete Architecture Plan
> Version 2.0 | January 2026 | Richwell Portal

---

## 📋 Table of Contents
1. [Executive Summary](#executive-summary)
2. [Entity Relationship Diagram (ERD)](#entity-relationship-diagram)
3. [Data Models & Fields](#data-models--fields)
4. [Student Type Definitions](#student-type-definitions)
5. [Enrollment Workflows](#enrollment-workflows)
6. [Approval Workflows](#approval-workflows)
7. [Conflict Detection System](#conflict-detection-system)
8. [UI/UX Wireframes](#uiux-wireframes)
9. [Implementation Notes (Django + Tailwind)](#implementation-notes)
10. [Rules Summary Matrix](#rules-summary-matrix)

---

## 📌 Executive Summary

This SIS supports three student enrollment types:
- **Regular Students** → Auto-enroll in home section subjects
- **Irregular Students** → Pick subjects from any section (retakes, shifts, LOA returns)
- **Overload Students** → Exceed unit cap with registrar approval

Key principles:
1. **Human-in-the-loop**: All enrollments require Head/Program approval
2. **Home Section First**: Administrative identity drives regular enrollment
3. **Conflict Prevention**: Time, capacity, and prerequisite checks at every step
4. **Audit Trail**: Every action is logged with actor + timestamp

---

## 🔗 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ENTITY RELATIONSHIP DIAGRAM                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   PROGRAM    │◀───────▶│  CURRICULUM  │◀───────▶│   SUBJECT    │
│──────────────│ 1     N │──────────────│ N     M │──────────────│
│ id           │         │ id           │         │ id           │
│ code         │         │ code         │         │ code         │
│ name         │         │ program_id   │         │ title        │
│ department   │         │ effective_yr │         │ units        │
│ duration_yrs │         │ is_active    │         │ prerequisites│
└──────────────┘         └──────────────┘         └──────────────┘
       │                                                  │
       │ 1                                                │ 1
       ▼ N                                                ▼ N
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   SECTION    │◀───────▶│SECTION_SUBJ  │◀───────▶│SCHEDULE_SLOT │
│──────────────│ 1     N │──────────────│ 1     N │──────────────│
│ id           │         │ id           │         │ id           │
│ name         │         │ section_id   │         │ section_subj │
│ program_id   │         │ subject_id   │         │ day          │
│ year_level   │         │ professor_id │         │ start_time   │
│ semester_id  │         │ capacity     │         │ end_time     │
│ capacity     │         │ enrolled_cnt │         │ room         │
│ is_dissolved │         └──────────────┘         └──────────────┘
└──────────────┘
       │
       │ 1 (home_section)
       ▼ N
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   STUDENT    │────────▶│  ENROLLMENT  │◀───────▶│  APPROVAL    │
│──────────────│ 1     N │──────────────│ 1     N │──────────────│
│ id           │         │ id           │         │ id           │
│ user_id      │         │ student_id   │         │ enrollment_id│
│ student_no   │         │ semester_id  │         │ approver_id  │
│ program_id   │         │ status       │         │ role         │
│ year_level   │         │ total_units  │         │ action       │
│ home_section │         │ created_at   │         │ comment      │
│ is_irregular │         └──────────────┘         │ created_at   │
│ overload_ok  │                │                 └──────────────┘
│ max_units    │                │ 1
│ status       │                ▼ N
└──────────────┘         ┌──────────────┐
                         │ SUBJ_ENROLL  │
                         │──────────────│
                         │ id           │
                         │ enrollment_id│
                         │ section_subj │
                         │ enroll_type  │ ◀─── [H]ome, [R]etake, [O]verload
                         │ status       │
                         │ head_approved│
                         │ reg_approved │
                         │ grade        │
                         └──────────────┘
```

---

## 📊 Data Models & Fields

### 1. Core Entities

#### **Student (extends User)**
| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | UUID | Primary key | Auto |
| `user_id` | FK → User | Auth link | Required |
| `student_number` | String | Official ID | Unique, Format: YYYY-NNNNN |
| `program_id` | FK → Program | Current program | Required |
| `curriculum_id` | FK → Curriculum | Assigned curriculum | Required |
| `year_level` | Integer | 1-5 | Required |
| `home_section_id` | FK → Section | Administrative section | Nullable (null = irregular/unassigned) |
| `is_irregular` | Boolean | Irregular status flag | Default: False |
| `overload_approved` | Boolean | Registrar approved overload | Default: False |
| `max_units_override` | Integer | Custom max units | Nullable (null = use default 24) |
| `academic_status` | Enum | REGULAR, PROBATION, DISMISSED | Default: REGULAR |
| `enrollment_status` | Enum | ACTIVE, LOA, GRADUATED, DROPPED | Required |

#### **Section**
| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | UUID | Primary key | Auto |
| `name` | String | e.g., "BSCS-1A" | Required |
| `program_id` | FK → Program | Parent program | Required |
| `year_level` | Integer | 1-5 | Required |
| `semester_id` | FK → Semester | Active semester | Required |
| `capacity` | Integer | Max students | Default: 40 |
| `enrolled_count` | Integer | Current enrolled | Computed |
| `is_dissolved` | Boolean | Section merged/closed | Default: False |
| `parent_section_id` | FK → Section | If merged from another | Nullable |

#### **SectionSubject (Subject Offering)**
| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | UUID | Primary key | Auto |
| `section_id` | FK → Section | Parent section | Required |
| `subject_id` | FK → Subject | Subject offered | Required |
| `professor_id` | FK → Professor | Instructor | Nullable (TBA) |
| `capacity` | Integer | Slot limit | Default: section.capacity |
| `enrolled_count` | Integer | Current enrolled | Computed |
| `is_active` | Boolean | Accepting enrollments | Default: True |

#### **ScheduleSlot**
| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | UUID | Primary key | Auto |
| `section_subject_id` | FK → SectionSubject | Parent offering | Required |
| `day` | Enum | MON, TUE, WED, THU, FRI, SAT | Required |
| `start_time` | Time | Start time | Required |
| `end_time` | Time | End time | Required, > start_time |
| `room` | String | Room/venue | Required |

#### **Enrollment (Semester Enrollment Record)**
| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | UUID | Primary key | Auto |
| `student_id` | FK → Student | Student | Required |
| `semester_id` | FK → Semester | Semester | Required |
| `status` | Enum | PENDING, ACTIVE, COMPLETED, CANCELLED | Default: PENDING |
| `total_units` | Integer | Sum of enrolled units | Computed |
| `is_overload` | Boolean | Exceeds normal max | Computed |
| `created_at` | DateTime | Record created | Auto |
| `updated_at` | DateTime | Last modified | Auto |

#### **SubjectEnrollment (Per-Subject Enrollment)**
| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | UUID | Primary key | Auto |
| `enrollment_id` | FK → Enrollment | Parent enrollment | Required |
| `section_subject_id` | FK → SectionSubject | Subject offering | Required |
| `enrollment_type` | Enum | HOME, RETAKE, OVERLOAD | Required |
| `status` | Enum | PENDING, ENROLLED, DROPPED, COMPLETED | Default: PENDING |
| `head_approved` | Boolean | Head/Program approved | Default: False |
| `registrar_approved` | Boolean | Registrar approved (overload only) | Default: False |
| `grade` | Decimal | Final grade | Nullable |
| `remarks` | String | INC, DRP, etc. | Nullable |

#### **EnrollmentApproval (Audit Trail)**
| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | UUID | Primary key | Auto |
| `subject_enrollment_id` | FK → SubjectEnrollment | Target enrollment | Required |
| `approver_id` | FK → User | Who acted | Required |
| `approver_role` | Enum | HEAD, REGISTRAR, ADMIN | Required |
| `action` | Enum | APPROVE, REJECT, OVERRIDE | Required |
| `comment` | Text | Rejection reason/notes | Nullable |
| `created_at` | DateTime | Action timestamp | Auto |

---

## 👨‍🎓 Student Type Definitions

### Type A: Regular Student
```
┌─────────────────────────────────────────────────────────────────┐
│                      REGULAR STUDENT                            │
├─────────────────────────────────────────────────────────────────┤
│ Criteria:                                                       │
│   • Has home_section_id assigned                                │
│   • is_irregular = False                                        │
│   • No failed subjects in curriculum                            │
│   • Not on LOA or program shift                                 │
│                                                                 │
│ Enrollment Rules:                                               │
│   ✓ Auto-enroll in all home section subjects                   │
│   ✓ Cannot pick subjects from other sections                   │
│   ✓ Cannot exceed default max units (24)                       │
│   ✓ Requires Head approval only                                │
│                                                                 │
│ UI Label: [H] = Home Section                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Type B: Irregular Student
```
┌─────────────────────────────────────────────────────────────────┐
│                     IRREGULAR STUDENT                           │
├─────────────────────────────────────────────────────────────────┤
│ Criteria (ANY of the following):                                │
│   • Has failed/INC subjects requiring retake                    │
│   • Recently shifted programs                                   │
│   • Returned from LOA                                           │
│   • Cross-enrolled from another institution                     │
│   • Manual flag by registrar                                    │
│                                                                 │
│ Enrollment Rules:                                               │
│   ✓ May or may not have home section (advisory only)           │
│   ✓ Must manually select each subject offering                 │
│   ✓ Capacity + Time conflict checks enforced                   │
│   ✓ Prerequisites strictly enforced                            │
│   ✓ Default max units (24) applies                             │
│   ✓ Requires Head approval only                                │
│                                                                 │
│ UI Labels:                                                      │
│   [R] = Retake/Irregular                                        │
│   [H] = Home section subject (if applicable)                    │
└─────────────────────────────────────────────────────────────────┘
```

### Type C: Overload Student
```
┌─────────────────────────────────────────────────────────────────┐
│                      OVERLOAD STUDENT                           │
├─────────────────────────────────────────────────────────────────┤
│ Criteria:                                                       │
│   • Requests to exceed max units (24 default)                   │
│   • Must have good academic standing                            │
│   • Typically graduating or catching up                         │
│                                                                 │
│ Enrollment Rules:                                               │
│   ✓ First: Request overload approval from Registrar            │
│   ✓ Registrar sets max_units_override (e.g., 30)               │
│   ✓ Then: Enroll subjects up to new limit                      │
│   ✓ Each subject requires Head approval                        │
│   ✓ Overload subjects require BOTH approvals                   │
│                                                                 │
│ UI Labels:                                                      │
│   [O] = Overload subject                                        │
│   [H] = Home section subject                                    │
│   [R] = Retake (if also irregular)                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Enrollment Workflows

### Flow 1: Regular Student Enrollment
```
┌─────────────────────────────────────────────────────────────────┐
│              REGULAR STUDENT ENROLLMENT FLOW                     │
└─────────────────────────────────────────────────────────────────┘

 ┌─────────┐      ┌─────────────┐      ┌─────────────┐
 │ Student │      │   System    │      │    Head     │
 └────┬────┘      └──────┬──────┘      └──────┬──────┘
      │                  │                    │
      │  1. Open Enrollment Page             │
      │─────────────────▶│                    │
      │                  │                    │
      │  2. [AUTO] Detect Regular Status     │
      │                  │◀────────────┐      │
      │                  │             │      │
      │  3. [AUTO] Load Home Section Subjects│
      │◀─────────────────│             │      │
      │                  │             │      │
      │  4. Review & Confirm Enrollment      │
      │─────────────────▶│             │      │
      │                  │             │      │
      │  5. [AUTO] Create SubjectEnrollments │
      │                  │─────────────┘      │
      │                  │                    │
      │  6. [AUTO] Notify Head for Approval  │
      │                  │───────────────────▶│
      │                  │                    │
      │  7. Head Reviews & Approves          │
      │                  │◀───────────────────│
      │                  │                    │
      │  8. [AUTO] Update Status → ENROLLED  │
      │◀─────────────────│                    │
      │                  │                    │
      ▼                  ▼                    ▼

 ✅ LEGEND:
    [AUTO] = System-generated action
    ───────▶ = Manual user action
```

### Flow 2: Irregular Student Enrollment
```
┌─────────────────────────────────────────────────────────────────┐
│             IRREGULAR STUDENT ENROLLMENT FLOW                    │
└─────────────────────────────────────────────────────────────────┘

 ┌─────────┐      ┌─────────────┐      ┌─────────────┐
 │ Student │      │   System    │      │    Head     │
 └────┬────┘      └──────┬──────┘      └──────┬──────┘
      │                  │                    │
      │  1. Open Enrollment Page             │
      │─────────────────▶│                    │
      │                  │                    │
      │  2. [AUTO] Detect Irregular Status   │
      │                  │◀────────────┐      │
      │                  │             │      │
      │  3. [AUTO] Show Subject Picker UI    │
      │◀─────────────────│             │      │
      │                  │             │      │
      │  4. Search & Browse Available Subjects
      │─────────────────▶│             │      │
      │                  │             │      │
      │  5. [AUTO] Check: Prerequisites      │
      │                  │             │      │
      │  6. [AUTO] Check: Time Conflicts     │
      │                  │             │      │
      │  7. [AUTO] Check: Capacity           │
      │◀─────────────────│             │      │
      │                  │             │      │
      │  8. Add Subject to Cart              │
      │─────────────────▶│             │      │
      │                  │             │      │
      │  9. [AUTO] Unit Counter Update       │
      │◀─────────────────│             │      │
      │                  │             │      │
      │ 10. Submit Enrollment (all subjects) │
      │─────────────────▶│             │      │
      │                  │             │      │
      │ 11. [AUTO] Create SubjectEnrollments │
      │                  │                    │
      │ 12. [AUTO] Notify Head               │
      │                  │───────────────────▶│
      │                  │                    │
      │ 13. Head Reviews Each Subject        │
      │                  │◀───────────────────│
      │                  │                    │
      │ 14. [AUTO] Update Approved → ENROLLED│
      │◀─────────────────│                    │
      ▼                  ▼                    ▼
```

### Flow 3: Overload Student Enrollment
```
┌─────────────────────────────────────────────────────────────────┐
│              OVERLOAD STUDENT ENROLLMENT FLOW                    │
└─────────────────────────────────────────────────────────────────┘

 ┌─────────┐      ┌─────────────┐      ┌──────────┐      ┌──────┐
 │ Student │      │   System    │      │ Registrar│      │ Head │
 └────┬────┘      └──────┬──────┘      └────┬─────┘      └──┬───┘
      │                  │                  │               │
      │ PHASE 1: REQUEST OVERLOAD APPROVAL  │               │
      │══════════════════════════════════════               │
      │                  │                  │               │
      │  1. Request Overload (reason, units)│               │
      │─────────────────▶│                  │               │
      │                  │                  │               │
      │  2. [AUTO] Create Overload Request  │               │
      │                  │─────────────────▶│               │
      │                  │                  │               │
      │  3. Registrar Reviews Request       │               │
      │                  │◀─────────────────│               │
      │                  │                  │               │
      │  4. [MANUAL] Set max_units_override │               │
      │                  │◀─────────────────│               │
      │                  │                  │               │
      │  5. [AUTO] Update overload_approved │               │
      │◀─────────────────│                  │               │
      │                  │                  │               │
      │ PHASE 2: ENROLL SUBJECTS            │               │
      │══════════════════════════════════════               │
      │                  │                  │               │
      │  6. Browse & Select Overload Subjects               │
      │─────────────────▶│                  │               │
      │                  │                  │               │
      │  7. [AUTO] Validate Against New Limit               │
      │◀─────────────────│                  │               │
      │                  │                  │               │
      │  8. Submit Enrollment               │               │
      │─────────────────▶│                  │               │
      │                  │                  │               │
      │  9. [AUTO] Create SubjectEnrollments│               │
      │                  │──────────────────────────────────▶
      │                  │                  │               │
      │ 10. Head Approves Overload Subjects │               │
      │                  │◀─────────────────────────────────│
      │                  │                  │               │
      │ 11. [AUTO] Finalize → ENROLLED      │               │
      │◀─────────────────│                  │               │
      ▼                  ▼                  ▼               ▼
```

---

## ✅ Approval Workflows

### Approval States & Transitions
```
                    ┌─────────────────────────────────────────┐
                    │        SUBJECT ENROLLMENT STATUS         │
                    └─────────────────────────────────────────┘

                              ┌──────────┐
                              │ PENDING  │ ◀─── Initial state
                              └────┬─────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
       ┌──────────┐         ┌──────────┐         ┌──────────┐
       │ REJECTED │         │ APPROVED │         │ WAITLIST │
       │ (by Head)│         │ (by Head)│         │(capacity)│
       └──────────┘         └────┬─────┘         └────┬─────┘
                                 │                    │
                    ┌────────────┤                    │
                    │            │                    │
              (if overload)      │              (slot opens)
                    │            │                    │
                    ▼            ▼                    │
             ┌──────────┐  ┌──────────┐               │
             │REG REVIEW│  │ ENROLLED │◀──────────────┘
             └────┬─────┘  └────┬─────┘
                  │             │
         ┌────────┴────────┐    │
         │                 │    │
         ▼                 ▼    ▼
   ┌──────────┐      ┌──────────┐
   │ REJECTED │      │ COMPLETED│ ◀─── Grade submitted
   │(Registrar)│     └──────────┘
   └──────────┘
```

### Approval Matrix by Student Type
| Student Type | Subject Type | Head Approval | Registrar Approval |
|--------------|--------------|---------------|-------------------|
| Regular | Home Section | ✅ Required | ❌ Not needed |
| Irregular | Any Section | ✅ Required | ❌ Not needed |
| Overload | Home Section | ✅ Required | ❌ Not needed (unit check only) |
| Overload | Extra Subject | ✅ Required | ✅ Required (pre-approved via request) |

### Rejection Workflow
```
┌─────────────────────────────────────────────────────────────────┐
│                    REJECTION FLOW                                │
└─────────────────────────────────────────────────────────────────┘

Approver Action:
  1. Select enrollment(s) to reject
  2. Enter rejection comment (REQUIRED)
  3. Submit rejection

System Actions:
  [AUTO] Update status → REJECTED
  [AUTO] Log approval record with comment
  [AUTO] Notify student via dashboard
  [AUTO] Release capacity slot if reserved

Student Options:
  • View rejection reason
  • Modify and resubmit
  • Choose different section
```

---

## ⚠️ Conflict Detection System

### Conflict Types & Checks

#### 1. Time Conflict Detection
```python
def check_time_conflict(student_id, new_schedule_slot):
    """
    Check if new slot overlaps with existing enrolled subjects.
    
    Algorithm:
    1. Get all enrolled subjects for student in semester
    2. Get schedule slots for each enrolled subject
    3. For each existing slot on same day:
       - Check if: new_start < existing_end AND new_end > existing_start
    4. Return conflict details if found
    """
    existing_slots = ScheduleSlot.objects.filter(
        section_subject__subjectenrollment__enrollment__student_id=student_id,
        section_subject__subjectenrollment__status__in=['PENDING', 'ENROLLED'],
        day=new_schedule_slot.day
    )
    
    for slot in existing_slots:
        if (new_schedule_slot.start_time < slot.end_time and 
            new_schedule_slot.end_time > slot.start_time):
            return {
                'conflict': True,
                'type': 'TIME_CONFLICT',
                'existing_subject': slot.section_subject.subject.code,
                'conflicting_time': f"{slot.start_time}-{slot.end_time}"
            }
    return {'conflict': False}
```

#### 2. Capacity Check
```python
def check_capacity(section_subject_id):
    """
    Check if section subject has available slots.
    """
    ss = SectionSubject.objects.get(id=section_subject_id)
    available = ss.capacity - ss.enrolled_count
    
    return {
        'available': available > 0,
        'remaining_slots': available,
        'capacity': ss.capacity,
        'enrolled': ss.enrolled_count
    }
```

#### 3. Prerequisite Check
```python
def check_prerequisites(student_id, subject_id):
    """
    Verify student has passed all prerequisite subjects.
    """
    subject = Subject.objects.get(id=subject_id)
    prereqs = subject.prerequisites.all()
    
    if not prereqs.exists():
        return {'met': True, 'missing': []}
    
    passed = SubjectEnrollment.objects.filter(
        enrollment__student_id=student_id,
        status='COMPLETED',
        grade__lte=3.0  # Passing grade
    ).values_list('section_subject__subject_id', flat=True)
    
    missing = []
    for prereq in prereqs:
        if prereq.id not in passed:
            missing.append(prereq.code)
    
    return {
        'met': len(missing) == 0,
        'missing': missing
    }
```

#### 4. Unit Limit Check
```python
def check_unit_limit(student_id, additional_units):
    """
    Check if adding units would exceed limit.
    """
    student = Student.objects.get(id=student_id)
    enrollment = Enrollment.objects.get(
        student=student,
        semester__is_current=True
    )
    
    max_units = student.max_units_override or 24
    current_units = enrollment.total_units
    new_total = current_units + additional_units
    
    return {
        'allowed': new_total <= max_units,
        'current': current_units,
        'adding': additional_units,
        'new_total': new_total,
        'max': max_units,
        'requires_overload': new_total > 24 and not student.overload_approved
    }
```

### Conflict Response UI
```html
<!-- Conflict Warning Component -->
<div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
    <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-amber-500 mt-0.5">...</svg>
        <div>
            <h4 class="font-bold text-amber-800">Schedule Conflict Detected</h4>
            <p class="text-sm text-amber-700 mt-1">
                This subject conflicts with <strong>CS101</strong> on 
                <strong>Monday 9:00 AM - 10:30 AM</strong>.
            </p>
            <div class="mt-3 flex gap-2">
                <button class="btn btn-sm btn-secondary">Choose Different Section</button>
                <button class="btn btn-sm btn-outline">View All Sections</button>
            </div>
        </div>
    </div>
</div>
```

---

## 🎨 UI/UX Wireframes

### 1. Student Enrollment Dashboard
```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📚 Subject Enrollment                                    [Units: 18/24] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 🏠 Your Status: REGULAR STUDENT | Section: BSCS-2A             │   │
│  │    Home Section subjects have been auto-loaded below.           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─ Enrolled Subjects ──────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  [H] CS201 - Data Structures          3 units    ⏳ Pending      │  │
│  │      Mon/Wed 9:00-10:30 | Room 301                               │  │
│  │                                                                   │  │
│  │  [H] CS202 - Algorithms               3 units    ⏳ Pending      │  │
│  │      Tue/Thu 10:30-12:00 | Room 302                              │  │
│  │                                                                   │  │
│  │  [H] MATH201 - Discrete Math          3 units    ⏳ Pending      │  │
│  │      Mon/Wed/Fri 1:00-2:00 | Room 201                            │  │
│  │                                                                   │  │
│  │  [H] ENG201 - Technical Writing       3 units    ⏳ Pending      │  │
│  │      Tue/Thu 2:00-3:30 | Room 105                                │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─ Unit Progress ──────────────────────────────────────────────────┐  │
│  │  ████████████████████░░░░░░░░░░░░  18/24 units                   │  │
│  │  ✓ Within normal load                                            │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│                                    [Submit for Approval]                │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2. Irregular Student Subject Picker
```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📚 Subject Enrollment                                    [Units: 12/24] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ⚠️ Your Status: IRREGULAR STUDENT                               │   │
│  │    Select subjects individually. Prerequisites enforced.         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─ Your Cart (3 subjects) ─────────────────────────────────────────┐  │
│  │  [R] CS101 - Intro to Computing (Retake)    3 units   ✓ Ready   │  │
│  │  [R] MATH101 - College Algebra (Retake)     3 units   ✓ Ready   │  │
│  │  [H] CS201 - Data Structures                3 units   ✓ Ready   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─ Available Subjects ─────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  🔍 Search subjects...           [Filter: Year 2] [Sem: 1st]     │  │
│  │                                                                   │  │
│  │  ┌───────────────────────────────────────────────────────────┐   │  │
│  │  │ CS202 - Algorithms                              3 units   │   │  │
│  │  │ Sections: BSCS-2A (12/40) | BSCS-2B (38/40)              │   │  │
│  │  │ Prerequisites: CS201 ✓                          [+ Add]   │   │  │
│  │  └───────────────────────────────────────────────────────────┘   │  │
│  │                                                                   │  │
│  │  ┌───────────────────────────────────────────────────────────┐   │  │
│  │  │ CS203 - Database Systems                        3 units   │   │  │
│  │  │ Sections: BSCS-2A (8/40) | BSCS-2B (40/40 FULL)          │   │  │
│  │  │ Prerequisites: CS201 ✓                          [+ Add]   │   │  │
│  │  └───────────────────────────────────────────────────────────┘   │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│                              [Submit Enrollment Request]                │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3. Registrar Section Management
```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🏫 Section Management                              [Semester: 2025-2026]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [+ Create Section]  [Merge Sections]  [Dissolve Section]               │
│                                                                         │
│  ┌─ Sections ───────────────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  Program: [All Programs ▼]  Year: [All ▼]  Status: [Active ▼]    │  │
│  │                                                                   │  │
│  │  ┌───────────────────────────────────────────────────────────┐   │  │
│  │  │ BSCS-1A                              32/40 students       │   │  │
│  │  │ Year 1 | 1st Semester                                      │   │  │
│  │  │ [View Students] [Edit Schedule] [Assign Students]          │   │  │
│  │  └───────────────────────────────────────────────────────────┘   │  │
│  │                                                                   │  │
│  │  ┌───────────────────────────────────────────────────────────┐   │  │
│  │  │ BSCS-1B                              40/40 students FULL  │   │  │
│  │  │ Year 1 | 1st Semester                                      │   │  │
│  │  │ [View Students] [Edit Schedule] [Assign Students]          │   │  │
│  │  └───────────────────────────────────────────────────────────┘   │  │
│  │                                                                   │  │
│  │  ┌───────────────────────────────────────────────────────────┐   │  │
│  │  │ BSCS-2A                              28/40 students       │   │  │
│  │  │ Year 2 | 1st Semester                                      │   │  │
│  │  │ [View Students] [Edit Schedule] [Assign Students]          │   │  │
│  │  └───────────────────────────────────────────────────────────┘   │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─ Overload Requests (3 pending) ──────────────────────────────────┐  │
│  │                                                                   │  │
│  │  Juan Dela Cruz (2024-00123)    Request: 27 units    [Review]   │  │
│  │  Maria Santos (2024-00456)      Request: 30 units    [Review]   │  │
│  │  Pedro Garcia (2024-00789)      Request: 28 units    [Review]   │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4. Head Approval Queue
```
┌─────────────────────────────────────────────────────────────────────────┐
│ ✅ Enrollment Approvals                       [Department: CCS]         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─ Quick Stats ────────────────────────────────────────────────────┐  │
│  │  📋 Pending: 45    ✓ Approved Today: 120    ✗ Rejected: 8        │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  [All Pending] [By Section] [Overload Only] [Irregulars]                │
│                                                                         │
│  ┌─ Pending Approvals ──────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  ☐ Juan Dela Cruz (2024-00123) - BSCS-2A                         │  │
│  │     [H] CS201 Data Structures        3 units                      │  │
│  │     [H] CS202 Algorithms             3 units                      │  │
│  │     [H] MATH201 Discrete Math        3 units                      │  │
│  │     Total: 9 units                   [Approve All] [Review]       │  │
│  │                                                                   │  │
│  │  ☐ Maria Santos (2024-00456) - IRREGULAR                         │  │
│  │     [R] CS101 Intro to Computing     3 units ⚠️ Retake           │  │
│  │     [R] MATH101 College Algebra      3 units ⚠️ Retake           │  │
│  │     Total: 6 units                   [Approve All] [Review]       │  │
│  │                                                                   │  │
│  │  ☐ Pedro Garcia (2024-00789) - BSCS-3A [OVERLOAD]                │  │
│  │     [O] CS301 Software Engineering   3 units ⭐ Overload         │  │
│  │     [O] CS302 Operating Systems      3 units ⭐ Overload         │  │
│  │     Total: 6 units (24 + 6 = 30)     [Approve All] [Review]       │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  [Bulk Approve Selected]  [Bulk Reject Selected]                        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Implementation Notes (Django + Tailwind)

### Django Model Snippets

```python
# apps/enrollment/models.py

class Student(models.Model):
    """Extended student profile with section assignment."""
    
    class Status(models.TextChoices):
        REGULAR = 'REGULAR', 'Regular'
        PROBATION = 'PROBATION', 'Probation'
        DISMISSED = 'DISMISSED', 'Dismissed'
    
    class EnrollmentStatus(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        LOA = 'LOA', 'Leave of Absence'
        GRADUATED = 'GRADUATED', 'Graduated'
        DROPPED = 'DROPPED', 'Dropped Out'
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student_profile')
    program = models.ForeignKey('academics.Program', on_delete=models.PROTECT)
    curriculum = models.ForeignKey('academics.Curriculum', on_delete=models.PROTECT)
    year_level = models.PositiveIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    
    # Section Assignment
    home_section = models.ForeignKey(
        'academics.Section', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='home_students'
    )
    
    # Status Flags
    is_irregular = models.BooleanField(default=False)
    overload_approved = models.BooleanField(default=False)
    max_units_override = models.PositiveIntegerField(null=True, blank=True)
    academic_status = models.CharField(max_length=20, choices=Status.choices, default=Status.REGULAR)
    enrollment_status = models.CharField(max_length=20, choices=EnrollmentStatus.choices, default=EnrollmentStatus.ACTIVE)
    
    @property
    def max_units(self):
        """Get effective max units for student."""
        return self.max_units_override or 24
    
    @property
    def student_type(self):
        """Determine student type for UI labeling."""
        if self.overload_approved:
            return 'OVERLOAD'
        elif self.is_irregular or not self.home_section:
            return 'IRREGULAR'
        return 'REGULAR'


class SubjectEnrollment(models.Model):
    """Individual subject enrollment with type tracking."""
    
    class EnrollmentType(models.TextChoices):
        HOME = 'HOME', 'Home Section [H]'
        RETAKE = 'RETAKE', 'Retake/Irregular [R]'
        OVERLOAD = 'OVERLOAD', 'Overload [O]'
    
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending Approval'
        ENROLLED = 'ENROLLED', 'Enrolled'
        DROPPED = 'DROPPED', 'Dropped'
        COMPLETED = 'COMPLETED', 'Completed'
        WAITLIST = 'WAITLIST', 'Waitlisted'
    
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name='subject_enrollments')
    section_subject = models.ForeignKey('academics.SectionSubject', on_delete=models.PROTECT)
    enrollment_type = models.CharField(max_length=10, choices=EnrollmentType.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    
    # Approval tracking
    head_approved = models.BooleanField(default=False)
    registrar_approved = models.BooleanField(default=False)  # For overload only
    
    # Academic record
    grade = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    remarks = models.CharField(max_length=10, null=True, blank=True)  # INC, DRP, etc.
    
    class Meta:
        unique_together = ['enrollment', 'section_subject']
    
    @property
    def type_label(self):
        """Return UI label for enrollment type."""
        labels = {
            'HOME': '[H]',
            'RETAKE': '[R]',
            'OVERLOAD': '[O]'
        }
        return labels.get(self.enrollment_type, '')
    
    @property
    def requires_registrar_approval(self):
        """Check if this enrollment needs registrar approval."""
        return self.enrollment_type == self.EnrollmentType.OVERLOAD
```

### API Endpoints Structure

```python
# apps/enrollment/urls.py

urlpatterns = [
    # Student Enrollment
    path('recommended-subjects/', RecommendedSubjectsView.as_view()),
    path('available-subjects/', AvailableSubjectsView.as_view()),
    path('my-enrollments/', MyEnrollmentsView.as_view()),
    path('enroll/', EnrollSubjectView.as_view()),
    path('drop/<uuid:pk>/', DropSubjectView.as_view()),
    
    # Conflict Checks
    path('check-conflicts/', ConflictCheckView.as_view()),
    path('check-prerequisites/', PrerequisiteCheckView.as_view()),
    path('check-capacity/<uuid:section_subject_id>/', CapacityCheckView.as_view()),
    
    # Overload
    path('request-overload/', RequestOverloadView.as_view()),
    path('overload-requests/', OverloadRequestListView.as_view()),
    path('approve-overload/<uuid:pk>/', ApproveOverloadView.as_view()),
    
    # Head Approvals
    path('pending-approvals/', PendingApprovalsView.as_view()),
    path('approve/<uuid:pk>/', ApproveEnrollmentView.as_view()),
    path('reject/<uuid:pk>/', RejectEnrollmentView.as_view()),
    path('bulk-approve/', BulkApproveView.as_view()),
    
    # Section Management (Registrar)
    path('sections/', SectionListView.as_view()),
    path('sections/<uuid:pk>/students/', SectionStudentsView.as_view()),
    path('sections/<uuid:pk>/assign-student/', AssignStudentToSectionView.as_view()),
    path('sections/merge/', MergeSectionsView.as_view()),
    path('sections/<uuid:pk>/dissolve/', DissolveSectionView.as_view()),
]
```

### Frontend Component Structure

```
src/
├── pages/
│   ├── student-enrollment.js      # Main enrollment UI
│   ├── student-schedule.js        # View final schedule
│   ├── head-approvals.js          # Head approval queue
│   └── registrar-sections.js      # Section management
├── components/
│   ├── SubjectCard.js             # Subject display with type label
│   ├── EnrollmentCart.js          # Shopping cart for subjects
│   ├── ConflictWarning.js         # Conflict alert component
│   ├── UnitCounter.js             # Progress bar for units
│   ├── ApprovalBadge.js           # Status badge component
│   └── ScheduleGrid.js            # Weekly schedule display
└── utils/
    ├── conflictChecker.js         # Client-side conflict detection
    └── enrollmentHelpers.js       # Type detection helpers
```

---

## 📋 Rules Summary Matrix

| Rule | Regular | Irregular | Overload |
|------|---------|-----------|----------|
| Has Home Section | ✅ Required | ⚪ Optional | ✅ Required |
| Auto-enroll Home Subjects | ✅ Yes | ❌ No | ✅ Yes (home only) |
| Pick Any Section | ❌ No | ✅ Yes | ✅ Yes (extra only) |
| Max Units | 24 | 24 | Custom (up to 30) |
| Prerequisite Check | ✅ Yes | ✅ Yes | ✅ Yes |
| Time Conflict Check | ✅ Yes | ✅ Yes | ✅ Yes |
| Capacity Check | ✅ Yes | ✅ Yes | ✅ Yes |
| Head Approval | ✅ Required | ✅ Required | ✅ Required |
| Registrar Approval | ❌ No | ❌ No | ✅ Pre-required |
| UI Label | [H] | [R] | [O] |

---

## 🔄 System vs Manual Actions Summary

### System-Generated (Automatic)
1. ✅ Regular student home section subject loading
2. ✅ Unit counter calculation
3. ✅ Conflict detection (time, capacity, prerequisites)
4. ✅ Enrollment status transitions
5. ✅ Notification triggers
6. ✅ Audit log creation
7. ✅ Capacity counter updates
8. ✅ Waitlist promotion when slots open

### Manual Actions (Human Required)
1. 👤 Student: Submit enrollment request
2. 👤 Student: Select sections (irregular)
3. 👤 Student: Request overload
4. 👤 Head: Approve/Reject enrollments
5. 👤 Head: Add rejection comments
6. 👤 Registrar: Approve overload requests
7. 👤 Registrar: Set max_units_override
8. 👤 Registrar: Assign students to sections
9. 👤 Registrar: Merge/dissolve sections
10. 👤 Registrar: Override enrollment (emergency)

---

## 📈 Recommended Improvements

### 1. Reduce Schedule Conflicts
- **Smart Section Suggestions**: When irregular student picks a subject, highlight sections with fewest conflicts with their current schedule
- **Time Slot Heatmap**: Show registrar which time slots are overbooked
- **AI Scheduling**: Auto-generate section schedules to minimize overlaps

### 2. Improve UI/UX
- **One-Click Enrollment**: For regular students, provide "Confirm All" button
- **Drag-and-Drop Schedule**: Visual schedule builder for irregular students
- **Real-time Capacity**: Live updating slot counters via WebSocket
- **Mobile-First Design**: Ensure enrollment works on phones

### 3. Human-in-the-Loop Guarantees
- **No Bypass Mode**: Never allow enrollment without approval (except emergency override with audit)
- **Escalation Timer**: If Head doesn't act in 48 hours, escalate to Department
- **Comment Required for Rejection**: Force explanation for student clarity
- **Approval Receipts**: Email/SMS confirmation for all approvals

---

## 🎯 Next Steps for Implementation

1. **Phase 1**: Update Django models with new fields
2. **Phase 2**: Implement conflict detection APIs
3. **Phase 3**: Build frontend Subject Picker component
4. **Phase 4**: Create Head Approval dashboard
5. **Phase 5**: Implement Registrar Section Management
6. **Phase 6**: Add overload request workflow
7. **Phase 7**: Testing & UAT

---

*Document generated for Richwell Portal SIS Enhancement Project*
