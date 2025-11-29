# FULL COMPREHENSIVE BUSINESS FUNCTIONS — RICHWELL COLLEGES PORTAL
## Version 2.0

---

## General Notes

| Item | Value |
|------|-------|
| **Actors** | Student, Professor, Cashier, Registrar, Head-Registrar, Admission Staff, Admin |
| **Semester Model** | Semester + Academic Year (with configurable dates & deadlines) |
| **Payment Model** | Semester divided into 6 month-buckets; **sequential allocation enforced** |
| **Unit Cap** | 30 units per semester per student |
| **Program Rule** | One program per student (change via registrar transfer workflow only) |
| **Audit Policy** | All critical operations logged to immutable AuditLog |

---

## 1) Admissions / Online Enrollment

**Purpose:** Capture applicant data for freshers & transferees and create student accounts automatically.

**Primary Actors:** Applicant (Student), Admission Staff, Admin

### Inputs
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Personal data | object | Yes | Name, email, contact, address, birthdate |
| Program applied | FK(Program) | Yes | Selected from active programs |
| Previous school | string | Transferee only | School name, course taken |
| Uploaded documents | files | Yes | IDs, Form 138/TOR, good moral |
| Monthly commitment | decimal | Yes | System may auto-calculate from tuition |

### Outputs
| Output | Description |
|--------|-------------|
| User account | Created automatically (role=STUDENT, student_number generated) |
| Enrollment record | Status=ACTIVE, first_month_paid=False, created_via=ONLINE |
| 6 MonthlyPaymentBuckets | Auto-created, each with required_amount = monthly_commitment |
| Notification | Welcome message sent to student |
| AuditLog entry | Records enrollment creation |

### Business Rules & Validations

| Rule | Description |
|------|-------------|
| Enrollment link toggle | Admin controls ON/OFF via SystemConfig |
| Form access | Only accessible when enrollment_link_enabled = true |
| Unified form | Freshmen & transferees use same form; transferee fields conditionally required |
| Auto-acceptance | No manual approval needed; enrollment is instant |
| Duplicate prevention | Email must be unique; system blocks duplicate student numbers |
| Document requirement | All required documents must be uploaded before submission |

### UI Touchpoints
- **Public enrollment form** — responsive, multi-step wizard
- **File uploader** — drag-drop with progress indicator
- **Confirmation screen** — shows generated student number
- **Admission dashboard** — list of recent applicants, document verification queue

### Exceptions & Edge Cases

| Exception | Handling |
|-----------|----------|
| Duplicate email | Block submission; prompt user to login or use different email |
| Missing documents | Block submission; show checklist of required docs |
| Incomplete form | Validate on each step; prevent progression until complete |
| System error during creation | Transaction rollback; show retry option |

### KPIs
- Number of applications submitted per enrollment period
- Conversion rate: applicant → active account
- Average time from enrollment → first payment
- Document verification turnaround time

---

## 2) Student Profile & Lifecycle Management

**Purpose:** Maintain student identity, program assignment, and academic status across semesters.

**Primary Actors:** Student, Registrar, Admin

### Data Maintained
| Field | Editable By | Audit Required |
|-------|-------------|----------------|
| Name | Registrar (with proof) | Yes |
| Email | Student (verified) | Yes |
| Contact info | Student | No |
| Program | Registrar only | Yes |
| Student number | System only | N/A |
| Profile photo | Student | No |

### Student Lifecycle States

```
┌─────────────┐     enrollment     ┌─────────────┐
│   (none)    │ ─────────────────► │   ACTIVE    │
└─────────────┘                    └──────┬──────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
                    ▼                     ▼                     ▼
             ┌──────────┐          ┌──────────┐          ┌──────────┐
             │   LOA    │          │ WITHDRAWN │          │GRADUATED │
             └────┬─────┘          └──────────┘          └──────────┘
                  │
                  │ return
                  ▼
             ┌──────────┐
             │  ACTIVE  │
             └──────────┘
```

### Business Rules & Validations

| Rule | Description |
|------|-------------|
| One program | Student can only be enrolled in one program at a time |
| Program change | Requires registrar action; creates new enrollment record |
| Profile persistence | Student profile persists across semesters |
| Name change | Requires supporting documents; registrar approval; audited |
| LOA impact | Pauses INC expiry clock; blocks subject enrollment |

### UI Touchpoints
- **Student profile page** — view/edit personal info
- **Registrar student editor** — full access to all fields
- **Admin impersonation** — view as student (logged)

### KPIs
- Profile completeness percentage
- Number of profile edits by registrar
- LOA duration statistics

---

## 3) Curriculum & Course Management

**Purpose:** Define programs, subjects, prerequisites, major/minor flags, and unit requirements.

**Primary Actors:** Admin (programs), Registrar (subjects/curriculum), Head-Registrar (approval)

### Data Structure

```
Program
  └── Subject (many)
        ├── code: "CS101"
        ├── title: "Programming Fundamentals"
        ├── units: 3
        ├── is_major: true
        ├── year_level: 1
        ├── semester_number: 1
        ├── allow_multiple_sections: false
        └── prerequisites: [Subject, Subject, ...]
```

### Business Rules & Validations

| Rule | Description |
|------|-------------|
| Subject ownership | Each subject belongs to exactly one program (FK) |
| Prerequisite enforcement | Cannot enroll if prereq status is INC/FAILED/RETAKE |
| Circular prevention | System blocks creation of circular prerequisite chains |
| Unit validation | Subject units must be positive integer (1-6 typical) |
| Major/minor flag | Determines INC expiry duration (6 months vs 1 year) |
| Multiple sections | Only subjects with `allow_multiple_sections=True` can have student in multiple sections |

### Prerequisite Validation Logic
```python
def can_enroll(student, subject):
    for prereq in subject.prerequisites.all():
        student_record = SubjectEnrollment.objects.filter(
            enrollment__student=student,
            subject=prereq
        ).order_by('-enrollment__semester').first()
        
        if not student_record:
            return False, f"Missing prerequisite: {prereq.code}"
        
        if student_record.status in ['INC', 'FAILED', 'RETAKE']:
            return False, f"Prerequisite {prereq.code} not satisfied (status: {student_record.status})"
    
    return True, None
```

### UI Touchpoints
- **Curriculum editor** — subject CRUD, prerequisite linking, drag-drop ordering
- **Prerequisite visualizer** — tree/graph view of prereq chains
- **Student grade advising** — recommended subjects based on completed courses

### KPIs
- Curriculum completion rate per program
- Number of prerequisite violations attempted
- Average subjects per semester per program

---

## 4) Sections & Scheduling Management

**Purpose:** Create sections for each subject offering, assign professors, define schedule slots.

**Primary Actors:** Registrar, Professor (view only), Admin

### Data Structure

```
Section (e.g., "BSIT-1A")
  └── SectionSubject (many)
        ├── subject: FK(Subject)
        ├── professor: FK(User)
        ├── is_tba: boolean
        └── ScheduleSlot (many)
              ├── day: MON/TUE/WED/THU/FRI/SAT
              ├── start_time: 08:00
              ├── end_time: 09:30
              └── room: "Room 301"
```

### Business Rules & Validations

| Rule | Description |
|------|-------------|
| One professor per SectionSubject | Each subject in a section has exactly one assigned professor |
| TBA allowed | Schedule can be marked TBA initially; must be filled before enrollment opens |
| Professor conflict check | Professor cannot have overlapping schedules across sections |
| Student conflict check | Student cannot enroll in subjects with overlapping schedules |
| Room conflict check | Same room cannot be double-booked (warning, not hard block) |
| Capacity enforcement | Section has max capacity; enforced at enrollment time |
| Override with audit | Registrar can override conflicts with explicit reason (logged) |

### Conflict Detection Algorithm
```python
def check_professor_conflict(professor, new_slot):
    existing_slots = ScheduleSlot.objects.filter(
        section_subject__professor=professor,
        section_subject__section__semester=current_semester,
        day=new_slot.day
    )
    
    for slot in existing_slots:
        if times_overlap(slot.start_time, slot.end_time, 
                        new_slot.start_time, new_slot.end_time):
            return True, slot  # Conflict found
    
    return False, None
```

### UI Touchpoints
- **Section creation UI** — program, semester, capacity settings
- **Schedule grid editor** — week view, drag-drop time slots
- **Conflict modal** — shows conflicting slots, allows override with reason
- **Professor schedule view** — read-only view of assigned classes

### KPIs
- Percentage of sections with TBA schedules (should approach 0% before enrollment)
- Number of schedule conflicts resolved
- Room utilization rate

---

## 5) Subject Enrollment (Student & Registrar Flows)

**Purpose:** Allow students to enroll in subjects while enforcing unit cap, prerequisites, and payment holds.

**Primary Actors:** Student, Registrar, Admin

### Enrollment Preconditions

| Check | Requirement | Blocking |
|-------|-------------|----------|
| First month paid | `Enrollment.first_month_paid == True` | Hard block |
| Unit cap | Current units + subject units ≤ 30 | Hard block |
| Prerequisites | All prereqs must be PASSED or CREDITED | Hard block |
| Schedule conflict | No overlapping schedules | Hard block (student), soft block (registrar) |
| Section capacity | Current enrollment < section capacity | Hard block (student), soft block (registrar) |

### SubjectEnrollment Status Values

| Status | Description | Can Transition To |
|--------|-------------|-------------------|
| ENROLLED | Currently taking the subject | PASSED, FAILED, INC, DROPPED |
| PASSED | Completed with passing grade (1.0-3.0) | — (terminal) |
| FAILED | Failed (5.0) or INC expired | RETAKE |
| INC | Incomplete, awaiting resolution | PASSED, FAILED (expiry) |
| DROPPED | Dropped before deadline | RETAKE (next semester) |
| CREDITED | Transferee credit accepted | — (terminal) |
| RETAKE | Re-enrolled after previous FAILED/DROPPED | PASSED, FAILED, INC, DROPPED |

### Business Rules & Validations

| Rule | Description |
|------|-------------|
| Payment gate | Enrollment UI disabled until `first_month_paid = True` |
| Unit cap enforcement | Real-time unit counter; blocks save if exceeds 30 |
| Prerequisite check | Runs on each subject add; shows specific missing/failed prereqs |
| Section selection | Regular subjects: one section only; irregular with `allow_multiple_sections`: multiple allowed |
| Irregular flag | Subjects outside recommended year/semester marked `is_irregular=True` |
| Concurrent enrollment race | Use `select_for_update()` to prevent unit cap bypass |
| Registrar override | Can bypass capacity/schedule conflicts; must provide reason |

### Enrollment Flow (Student)
```
1. Student opens Subject Enrollment page
2. System checks: first_month_paid?
   ├── No  → Show "Pay Month 1 to unlock" message; disable UI
   └── Yes → Load enrollment interface

3. Display:
   - Recommended subjects (based on curriculum, year, semester)
   - Unit counter: "X / 30 units"
   - For each subject: code, title, units, sections, schedules

4. Student clicks "Add Subject"
   a. Check prerequisites → block if unsatisfied
   b. Check unit cap → block if exceeded
   c. Show section picker

5. Student selects section
   a. Check schedule conflicts → block if conflict
   b. Check capacity → block if full

6. On "Confirm Enrollment":
   - Wrap in DB transaction with select_for_update on student's enrollments
   - Revalidate all checks
   - Create SubjectEnrollment records
   - Log to AuditLog
```

### UI Touchpoints
- **Subject picker** — search, filter by year/semester, show prereq status
- **Unit counter** — real-time update, warning at 27+ units
- **Section selector** — shows schedule, professor, available slots
- **Schedule preview** — week view of selected subjects
- **Registrar enrollment UI** — same as student but with override options

### KPIs
- Average time from enrollment creation → subject enrollment
- Percentage of students hitting unit cap
- Number of prerequisite violations attempted
- Registrar override frequency

---

## 6) Payments, Payment Plans & Exam Permits

**Purpose:** Manage semester payment plans, record transactions, generate receipts, and control exam access.

**Primary Actors:** Student, Cashier, Registrar, Admin

### Payment Structure

```
Enrollment
  └── MonthlyPaymentBucket (6 per enrollment)
        ├── month_number: 1-6
        ├── required_amount: ₱5,000 (= monthly_commitment)
        ├── paid_amount: ₱3,500 (running total)
        └── is_fully_paid: false

  └── PaymentTransaction (many)
        ├── amount: ₱2,000
        ├── allocated_to_month: 1 (system-assigned)
        ├── receipt_number: "RCP-2024-000123"
        └── cashier: FK(User)
```

### Critical Rule: Sequential Payment Allocation

```
┌─────────────────────────────────────────────────────────────────────┐
│  SEQUENTIAL ALLOCATION RULE                                         │
│                                                                     │
│  Payments MUST be allocated to months in order.                     │
│  Month N cannot receive payments until Month N-1 is FULLY PAID.     │
│                                                                     │
│  Example:                                                           │
│  - Month 1: ₱5,000 required                                         │
│  - Student pays ₱8,000                                              │
│  - Allocation: ₱5,000 → Month 1 (full), ₱3,000 → Month 2 (partial)  │
│                                                                     │
│  Cashier CANNOT manually allocate to Month 3 if Month 2 is unpaid.  │
└─────────────────────────────────────────────────────────────────────┘
```

### Payment Allocation Algorithm
```python
def allocate_payment(enrollment, amount):
    remaining = amount
    allocations = []
    
    buckets = MonthlyPaymentBucket.objects.filter(
        enrollment=enrollment,
        is_fully_paid=False
    ).order_by('month_number')
    
    for bucket in buckets:
        if remaining <= 0:
            break
        
        needed = bucket.required_amount - bucket.paid_amount
        to_allocate = min(remaining, needed)
        
        bucket.paid_amount += to_allocate
        bucket.is_fully_paid = (bucket.paid_amount >= bucket.required_amount)
        bucket.save()
        
        allocations.append({
            'month': bucket.month_number,
            'amount': to_allocate
        })
        
        remaining -= to_allocate
        
        # Check if exam permit should be unlocked
        if bucket.is_fully_paid:
            unlock_exam_permit(enrollment, bucket.month_number)
    
    # Handle overpayment (rare)
    if remaining > 0:
        # Allocate to next month as advance
        # Or keep as credit balance (policy decision)
        pass
    
    return allocations
```

### Exam Permit Logic

| Month Paid | Exams Unlocked (configurable via ExamMonthMapping) |
|------------|---------------------------------------------------|
| Month 1 | Prelims (default mapping) |
| Month 2 | Midterms |
| Month 3 | Prefinals |
| Month 4-6 | Finals |

### Business Rules & Validations

| Rule | Description |
|------|-------------|
| Month 1 gate | Must be fully paid before subject enrollment |
| "Fully paid" definition | `paid_amount >= required_amount` for that month |
| Sequential enforcement | System auto-allocates to earliest unpaid; manual skip blocked |
| Permit auto-unlock | When month becomes fully paid, create ExamPermit for mapped exam |
| Receipt generation | Async task generates PDF; URL stored on PaymentTransaction |
| Adjustments | Requires `is_adjustment=True` and `adjustment_reason`; audited |
| Overpayment | Allocated to next month automatically |

### UI Touchpoints

**Student Payments Page:**
- Payment summary (total paid / total due)
- Month-by-month breakdown with progress bars
- Payment history with receipt download links
- Exam permit status (locked/unlocked with print button)

**Cashier Payment Entry:**
- Student search (by student number or name)
- Current payment status display
- Amount entry (system shows where it will be allocated)
- Payment mode selection
- Receipt preview and print

**Admin Configuration:**
- Exam → Month mapping editor
- Default monthly commitment settings

### KPIs
- Percentage of students with Month 1 paid before enrollment deadline
- Average days from enrollment → first payment
- Number of payment adjustments (quality metric)
- Students blocked from exams due to unpaid months

---

## 7) Exam Permits & Exam Access

**Purpose:** Issue exam permits when corresponding month is paid; system acts as gatekeeper for physical exams.

**Primary Actors:** Student, Cashier, Professor (verification), Admin

### Permit Structure

```
ExamPermit
  ├── enrollment: FK(Enrollment)
  ├── exam_type: PRELIM / MIDTERM / PREFINAL / FINAL
  ├── month_number: 1 (which month unlocked this)
  ├── permit_code: "PRM-2024-ABCD1234" (for verification)
  ├── unlocked_at: datetime
  └── printed_at: datetime (nullable)
```

### Business Rules & Validations

| Rule | Description |
|------|-------------|
| Auto-unlock | Permit created automatically when mapped month is fully paid |
| No manual creation | Permits cannot be manually created; only via payment completion |
| Printable token | Each permit has unique code for professor verification |
| Physical exam only | Permit is authorization for physical exam; not online delivery |
| Mapping persistence | If mapping changes mid-semester, existing permits remain valid |

### Permit Verification Flow
```
1. Student prints permit from dashboard
2. On exam day, student presents permit to professor
3. Professor can verify permit code via:
   a. Visual inspection (permit shows student photo, name, exam type)
   b. System lookup (optional: scan QR code or enter permit code)
4. If valid, student takes exam
5. If invalid/missing, student is blocked from exam
```

### UI Touchpoints
- **Student dashboard** — permit cards showing locked (red) / unlocked (green)
- **Permit print view** — formatted for printing with student info, QR code
- **Cashier permit verification** — lookup by student or permit code

### KPIs
- Number of permits generated per exam period
- Number of students blocked from exams (no permit)
- Permit print rate (% of unlocked permits actually printed)

---

## 8) Grades, GPA, INC & Retake Logic

**Purpose:** Manage grade entry, finalization, INC handling, GPA computation, and retake tracking.

**Primary Actors:** Professor, Registrar, Student, Admin

### Allowed Grade Values

```python
ALLOWED_GRADES = {
    # Numeric grades
    1.0: "Excellent",
    1.25: "Very Good",
    1.5: "Very Good",
    1.75: "Good",
    2.0: "Good",
    2.25: "Satisfactory",
    2.5: "Satisfactory",
    2.75: "Passing",
    3.0: "Passing",
    5.0: "Failed",
    
    # Special grades
    "INC": "Incomplete",
    "DRP": "Dropped"
}
```

### Grade Lifecycle

```
┌─────────────┐     submit      ┌─────────────┐    finalize    ┌─────────────┐
│   (none)    │ ───────────────►│   DRAFT     │ ──────────────►│  FINALIZED  │
│             │                 │             │                │             │
└─────────────┘                 └──────┬──────┘                └─────────────┘
                                       │
                                       │ edit (before finalization)
                                       ▼
                                ┌─────────────┐
                                │   DRAFT     │
                                │  (updated)  │
                                └─────────────┘
```

### INC Expiry Rules

| Subject Type | Expiry Period | Clock Behavior |
|--------------|---------------|----------------|
| Major (`is_major=True`) | 6 months (180 days) | Pauses during LOA |
| Minor (`is_major=False`) | 1 year (365 days) | Pauses during LOA |

### INC Expiry Algorithm
```python
def check_inc_expiry(subject_enrollment):
    if subject_enrollment.status != 'INC':
        return False
    
    if not subject_enrollment.inc_marked_at:
        return False
    
    # Calculate days elapsed (excluding LOA periods)
    total_days = 0
    current_date = subject_enrollment.inc_marked_at.date()
    
    while current_date <= date.today():
        enrollment = get_enrollment_for_date(subject_enrollment.enrollment.student, current_date)
        if enrollment and enrollment.status != 'LOA':
            total_days += 1
        current_date += timedelta(days=1)
    
    # Check threshold
    is_major = subject_enrollment.subject.is_major
    threshold = 180 if is_major else 365
    
    return total_days >= threshold
```

### GPA Calculation Formula

```python
def calculate_gpa(student, semester=None):
    """
    GPA = SUM(grade × units) / SUM(units)
    
    Include:
    - SubjectEnrollments with status IN ('PASSED', 'FAILED')
    - Where count_in_gpa = True
    - Where grade is numeric (1.0 to 5.0)
    
    Exclude:
    - INC (until resolved)
    - DRP (dropped)
    - CREDITED (unless count_in_gpa = True)
    """
    
    filters = {
        'enrollment__student': student,
        'status__in': ['PASSED', 'FAILED'],
        'count_in_gpa': True,
        'grade__value__isnull': False
    }
    
    if semester:
        filters['enrollment__semester'] = semester
    
    enrollments = SubjectEnrollment.objects.filter(**filters)
    
    total_grade_points = sum(e.grade.value * e.units for e in enrollments)
    total_units = sum(e.units for e in enrollments)
    
    if total_units == 0:
        return None
    
    return round(total_grade_points / total_units, 4)
```

### Business Rules & Validations

| Rule | Description |
|------|-------------|
| Grade value restriction | Only values in ALLOWED_GRADES accepted |
| Professor edit window | Can edit until registrar finalizes |
| Finalization scope | Per subject-section (not per student or per semester) |
| Post-finalization edit | Requires registrar approval + reason; logged to GradeHistory |
| INC marking | Sets `inc_marked_at = now()`; starts expiry clock |
| INC resolution | Professor changes grade before expiry; clock stops |
| Auto-expiry | Celery job converts expired INC → FAILED (grade=5.0) |
| Retake enrollment | Student re-enrolls with `status=RETAKE`; counts toward unit cap |

### UI Touchpoints

**Professor Grade Entry:**
- Section/subject selector
- Class list with grade dropdowns (restricted to allowed values)
- Save draft / Submit for finalization buttons
- Edit history viewer

**Registrar Finalization:**
- Pending finalization queue
- Bulk finalize by section
- Individual grade override (with reason)

**Student Grade View:**
- Current semester grades
- Cumulative GPA
- INC warnings with countdown
- Retake recommendations

### KPIs
- Percentage of grades finalized on time
- Number of INCs resolved before expiry
- Average GPA by program
- INC → FAILED conversion rate

---

## 9) Transferee Onboarding & Credit Management

**Purpose:** Allow registrar to create transferee accounts and credit prior learning.

**Primary Actors:** Registrar, Head-Registrar (disputes), Student, Admin

### Credit Structure

```
SubjectEnrollment (for credited subject)
  ├── enrollment: FK(Enrollment)
  ├── subject: FK(Subject)  // Must match or map to school's subject
  ├── section: null  // No section for credits
  ├── status: CREDITED
  ├── units: 3  // Original units from previous school
  ├── count_in_gpa: false  // Default; can be overridden
  ├── is_irregular: false
  └── grade: (optional) original grade if carrying over

CreditSource (additional tracking)
  ├── subject_enrollment: FK(SubjectEnrollment)
  ├── original_school: "Previous University"
  ├── original_subject_code: "CS101"
  ├── original_grade: 1.5
  └── tor_document: FK(Document)
```

### Business Rules & Validations

| Rule | Description |
|------|-------------|
| Manual creation | Registrar creates transferee account (no online enrollment) |
| Credit entry | Registrar adds credits one by one with documentation |
| Subject mapping | Credit must map to existing subject in curriculum |
| Prerequisite satisfaction | CREDITED status satisfies prerequisites for dependent subjects |
| GPA inclusion | `count_in_gpa` default false; can be enabled per school policy |
| Payment requirement | Transferee still pays Month 1 before enrolling new subjects |
| Dispute escalation | Disputed credits go to Head-Registrar for review |

### Transferee Onboarding Flow
```
1. Student visits registrar office with documents (TOR, etc.)
2. Registrar creates User account:
   - Personal info from documents
   - role = STUDENT
   - student_number (generated or manual)
3. Registrar creates Enrollment:
   - created_via = TRANSFEREE
   - program selected
   - monthly_commitment set
4. Registrar evaluates each subject for credit:
   a. Find matching subject in curriculum
   b. Verify grade is passing
   c. Create SubjectEnrollment (status=CREDITED)
   d. Attach source documentation
5. System updates prerequisite map:
   - Credited subjects now satisfy prereqs
6. Student logs in, sees credited subjects in history
7. Student pays Month 1, then enrolls in new subjects
```

### UI Touchpoints
- **Transferee creation form** — personal info, program selection
- **Credit entry UI** — subject search, original school/grade entry, document upload
- **Credit evaluation view** — side-by-side curriculum vs submitted TOR
- **Student history** — credited subjects with source indicator

### KPIs
- Number of transferees onboarded per semester
- Average time from application → credit completion
- Average credits accepted per transferee
- Credit dispute rate

---

## 10) Document Release (TOR, Certificates, etc.)

**Purpose:** Registrar issues official documents; head-registrar monitors for compliance.

**Primary Actors:** Registrar, Head-Registrar, Student (view only), Admin

### Document Types

| Type | Code | Description |
|------|------|-------------|
| Transcript of Records | TOR | Official grade history |
| Certificate of Enrollment | COE | Proof of current enrollment |
| Certificate of Good Moral | CGM | Character certification |
| Diploma | DIP | Graduation certificate |
| Honorable Dismissal | HD | Transfer clearance |
| Other | OTH | Custom documents |

### Business Rules & Validations

| Rule | Description |
|------|-------------|
| Registrar-initiated | Students cannot request via portal; physical request only |
| Digital record | System tracks what was released, when, by whom |
| Protected URL | Document URLs signed/expiring; not publicly accessible |
| View permissions | Student can view/print their released documents |
| Head-Registrar audit | Can view all release logs across all registrars |
| Revocation | Registrar can revoke (with reason); student loses access |

### Document Release Flow
```
1. Student requests document at registrar office (physical)
2. Registrar verifies identity, checks clearances
3. Registrar opens Document Release UI
4. Registrar selects:
   - Student
   - Document type
   - Notes (optional)
5. System generates document (or registrar uploads pre-made)
6. Registrar clicks "Release"
   - DocumentRelease record created
   - Protected URL generated
   - AuditLog entry created
7. Student can view/download from dashboard
8. Physical copy given to student (offline)
```

### UI Touchpoints
- **Registrar release form** — student search, document type, upload/generate
- **Document preview** — view before release
- **Release history** — registrar's own releases
- **Head-Registrar logs** — all releases, filterable by registrar/date/type
- **Student documents** — list of released documents with download

### KPIs
- Number of documents released per type
- Average release turnaround time
- Documents per registrar (workload distribution)
- Revocation rate

---

## 11) Notifications (System-Only)

**Purpose:** In-app notifications for students about payments, permits, and grade changes.

**Primary Actors:** System (Celery), Student

### Notification Types

| Type | Trigger | Message Template |
|------|---------|------------------|
| PAYMENT | Payment recorded | "Payment of ₱{amount} received. Receipt #{receipt_no} available." |
| PERMIT_UNLOCKED | Month fully paid | "Your {exam_type} exam permit is now available. Print from dashboard." |
| INC_WARNING | 30 days before expiry | "Your INC in {subject} will expire in 30 days. Contact your professor." |
| INC_EXPIRY | INC converted to FAILED | "Your INC in {subject} has expired and is now marked FAILED." |
| GRADE_POSTED | Grade finalized | "Your grade for {subject} has been posted." |
| ENROLLMENT | Account created | "Welcome to Richwell Colleges! Your student number is {student_no}." |
| SYSTEM | Admin announcements | Custom message |

### Business Rules & Validations

| Rule | Description |
|------|-------------|
| In-app only | No email/SMS in MVP (future enhancement) |
| Student-focused | Primarily for students; staff see relevant system alerts |
| Persistent | Notifications stored in database; viewable in notification center |
| Read tracking | `is_read` flag; `read_at` timestamp |
| No flooding | High-volume events batched (e.g., bulk grade posting) |

### UI Touchpoints
- **Notification bell** — header icon with unread count badge
- **Notification dropdown** — recent notifications, "mark all read"
- **Notification center** — full history with filters

### KPIs
- Notification open rate
- Average time to read
- Pending/unread notification count

---

## 12) Audit & Security

**Purpose:** Record all critical operations for accountability, compliance, and dispute resolution.

**Primary Actors:** System (automatic), Admin (view), Head-Registrar (view)

### Audited Operations

| Category | Operations |
|----------|------------|
| Payments | Record, adjustment, refund |
| Grades | Submit, edit, finalize, override |
| Enrollment | Create, subject add/drop, status change |
| Schedule | Create, edit, conflict override |
| Documents | Release, revoke, download |
| Users | Create, edit, role change, impersonate |
| System | Config change, enrollment link toggle |

### AuditLog Structure

```
AuditLog (immutable)
  ├── id: UUID
  ├── actor: FK(User) or null (for system)
  ├── action: "PAYMENT_RECORDED"
  ├── target_model: "PaymentTransaction"
  ├── target_id: UUID
  ├── payload: {
  │     "before": { ... },
  │     "after": { ... },
  │     "reason": "...",
  │     "metadata": { ... }
  │   }
  ├── ip_address: "192.168.1.100"
  └── timestamp: datetime (auto)
```

### Business Rules & Validations

| Rule | Description |
|------|-------------|
| Write-once | AuditLog records cannot be updated or deleted |
| Auto-capture | Critical operations automatically create audit entries |
| Actor tracking | Every action tied to a user (or SYSTEM for automated) |
| Payload detail | Before/after states stored for change tracking |
| IP logging | Client IP recorded for security analysis |
| Retention | Configurable retention period (default: 7 years) |

### Access Control

| Role | Audit Access |
|------|--------------|
| Admin | Full access to all logs |
| Head-Registrar | Registrar actions, document releases, grade changes |
| Registrar | Own actions only |
| Others | No audit access |

### UI Touchpoints
- **Admin audit viewer** — full search/filter, export
- **Head-Registrar logs** — filtered view
- **Per-entity audit trail** — "View History" button on records

### KPIs
- Audit coverage percentage (critical ops logged)
- Number of overrides requiring justification
- Anomaly detection (unusual patterns)

---

## 13) Reports & Analytics (Minimal MVP)

**Purpose:** Provide role-based analytics and exportable reports.

**Primary Actors:** Admin, Head-Registrar, Registrar, Professor

### Report Catalog

| Role | Available Reports |
|------|-------------------|
| **Admin** | Audit log export, user statistics, system usage |
| **Head-Registrar** | Enrollment by program, grade distribution, registrar activity |
| **Registrar** | Section rosters, pending payments, document release log |
| **Professor** | Class roster, grade distribution per section |

### Report Specifications

**Enrollment Report (Head-Registrar)**
```
Filters: Semester, Program, Status
Columns: Student No, Name, Program, Year, Status, Enrolled Units, Payment Status
Export: CSV, PDF
```

**Payment Report (Registrar/Admin)**
```
Filters: Semester, Date Range, Status
Columns: Student No, Name, Total Due, Total Paid, Balance, Last Payment Date
Export: CSV, PDF
```

**Grade Report (Head-Registrar)**
```
Filters: Semester, Program, Subject
Columns: Subject, Section, Enrolled, Passed, Failed, INC, Average Grade
Export: CSV, PDF
```

### Business Rules

| Rule | Description |
|------|-------------|
| Role-based access | Reports filtered by role permissions |
| Data visibility | Users only see data they're authorized for |
| Async generation | Large reports generated asynchronously |
| Export formats | CSV for data, PDF for formatted reports |

### UI Touchpoints
- **Reports page** — per-role report catalog
- **Filter panel** — semester, program, date range selectors
- **Preview** — paginated table preview before export
- **Export buttons** — CSV, PDF download

### KPIs
- Report usage frequency
- Most popular reports
- Average generation time

---

## 14) Admin & System Configuration

**Purpose:** Control site-level settings, behavior mapping, and system toggles.

**Primary Actors:** Admin

### Configuration Items

| Setting | Key | Type | Default |
|---------|-----|------|---------|
| Enrollment link | `enrollment_link_enabled` | boolean | false |
| Max units | `max_units_per_semester` | integer | 30 |
| INC expiry (major) | `inc_expiry_major_months` | integer | 6 |
| INC expiry (minor) | `inc_expiry_minor_months` | integer | 12 |
| Allowed grades | `allowed_grade_values` | list | [1.0, 1.25, ..., 5.0] |
| Impersonation | `impersonation_enabled` | boolean | true |

### Exam-Month Mapping Configuration

```
ExamMonthMapping (per semester)
  ├── PRELIM → Month 1
  ├── MIDTERM → Month 2
  ├── PREFINAL → Month 3
  └── FINAL → Month 4
```

### Business Rules

| Rule | Description |
|------|-------------|
| Change audit | All config changes logged with before/after values |
| Mid-semester changes | Warning shown; changes apply to future enrollments only |
| Retroactive option | Admin can choose to apply retroactively (explicit confirmation) |
| Validation | System validates config values before save |

### UI Touchpoints
- **System settings page** — tabbed interface for different config areas
- **Exam mapping editor** — visual month-to-exam assignment
- **Change preview** — shows impact before save
- **Config history** — audit trail of changes

### KPIs
- Number of config changes per semester
- Retroactive changes (should be rare)

---

## 15) Background Jobs & Automation

**Purpose:** Handle async operations and scheduled tasks.

### Job Catalog

| Job | Trigger | Description |
|-----|---------|-------------|
| `allocate_payment_and_unlock_permits` | PaymentTransaction created | Allocate to buckets, unlock permits |
| `generate_receipt_pdf` | PaymentTransaction created | Generate PDF, store URL |
| `recalculate_gpa` | Grade finalized | Recalculate student's semester/cumulative GPA |
| `inc_expiry_checker` | Daily (midnight) | Check all INCs, convert expired to FAILED |
| `send_notification` | Various | Create notification record |
| `bulk_schedule_conflict_checker` | Nightly | Integrity check for schedule conflicts |
| `create_semester_enrollments` | Admin-triggered | Batch create enrollments for new semester |
| `generate_report` | User-triggered | Async report generation for large datasets |

### Job Requirements

| Requirement | Description |
|-------------|-------------|
| Idempotent | Running job twice produces same result |
| Retry-safe | Failed jobs can be retried without side effects |
| Logged | Job execution logged for debugging |
| Monitored | Failed jobs trigger alerts |

### Infrastructure

```
┌─────────────┐     tasks      ┌─────────────┐
│   Django    │ ──────────────►│    Redis    │
│   (Web)     │                │   (Broker)  │
└─────────────┘                └──────┬──────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
                    ▼                                   ▼
             ┌─────────────┐                    ┌─────────────┐
             │   Celery    │                    │   Celery    │
             │   Worker    │                    │    Beat     │
             └─────────────┘                    │ (Scheduler) │
                                               └─────────────┘
```

---

## 16) Exceptions, Overrides & Escalation

### Override Matrix

| Action | Who Can Override | Requirements |
|--------|------------------|--------------|
| Schedule conflict | Registrar | Reason required; audit logged |
| Section capacity | Registrar | Reason required; audit logged |
| Payment allocation | Admin only | Adjustment record; justification required |
| Grade post-finalization | Registrar + Admin | Written request; audit logged |
| INC extension | Head-Registrar | Documented reason |
| Unit cap | Not allowed | Hard limit; no override |

### Escalation Paths

```
Payment Dispute
  └── Cashier → Admin → External audit (if needed)

Grade Dispute
  └── Student → Professor → Registrar → Head-Registrar → Dean

Credit Dispute (Transferee)
  └── Registrar → Head-Registrar → Academic Council

Schedule Conflict
  └── Registrar (resolves) → Head-Registrar (if unresolved)
```

---

## 17) Acceptance Criteria (Dev/QA Checklist)

### Enrollment & Admissions
- [ ] New applicant completes form → User + Enrollment created
- [ ] Student number auto-generated and unique
- [ ] Duplicate email blocked with clear message
- [ ] Enrollment link respects ON/OFF toggle

### Payments
- [ ] Payment auto-allocates to earliest unpaid month
- [ ] Cannot allocate to Month 2 if Month 1 unpaid (sequential)
- [ ] Receipt PDF generated and accessible
- [ ] Month fully paid → Exam permit auto-created
- [ ] Student cannot enroll subjects until Month 1 paid

### Subject Enrollment
- [ ] Unit cap (30) enforced; concurrent requests don't bypass
- [ ] Prerequisites checked; INC/FAILED/RETAKE blocks enrollment
- [ ] Schedule conflict detected and blocked
- [ ] Section capacity enforced
- [ ] Registrar override requires reason and creates audit

### Grades
- [ ] Only allowed grade values accepted
- [ ] Professor can edit until finalization
- [ ] Post-finalization edit requires approval + audit
- [ ] INC expiry: major 6 months, minor 1 year (excluding LOA)
- [ ] Expired INC auto-converts to FAILED with notification

### Transferees
- [ ] Registrar can create account and credit subjects
- [ ] Credits satisfy prerequisites
- [ ] Transferee must pay Month 1 before enrolling new subjects

### Documents
- [ ] Release creates record and protected URL
- [ ] Student can view/download released documents
- [ ] Head-Registrar sees all release logs

### Audit
- [ ] All critical operations create AuditLog
- [ ] Admin can view all logs
- [ ] Registrar sees only own actions

---

## 18) Operational KPIs (Dashboard Metrics)

### Enrollment Health
| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Enrollment conversion (applicant → paid) | >80% | <60% |
| Days to first payment | <7 days | >14 days |
| Subject enrollment completion | >95% | <85% |

### Payment Health
| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Month 1 paid by enrollment deadline | >90% | <75% |
| Students blocked from exams | <5% | >15% |
| Payment adjustment rate | <1% | >3% |

### Academic Health
| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Grades finalized on time | >95% | <85% |
| INC resolved before expiry | >80% | <60% |
| Average GPA | 2.0-2.5 | <1.75 or >3.5 |

### Operational Health
| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Registrar overrides per semester | <50 | >100 |
| Audit log coverage | 100% | <95% |
| System uptime | >99% | <98% |

---

**Document Version:** 2.0  
**Last Updated:** [Current Date]  
**Status:** Ready for Development