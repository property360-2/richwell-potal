# Richwell Colleges Portal — Business Flows

Detailed step-by-step workflows for every major process in the system.

---

## 1. Online Enrollment Flow

The end-to-end journey of a new student from applicant to fully enrolled.

```mermaid
flowchart TD
    A["Applicant visits enrollment page"] --> B{"Enrollment open?"}
    B -- No --> B1["Show 'enrollment closed' message"]
    B -- Yes --> C["Fill out online enrollment form"]
    C --> D["Upload required documents<br/>(ID, Form 138, Birth Certificate, Photo)"]
    D --> E["Submit application"]
    E --> F["Status: PENDING_ADMISSION"]

    F --> G["Admission Staff reviews application"]
    G --> H{"Approve?"}
    H -- Reject --> I["Status: REJECTED<br/>Student notified"]
    H -- Approve --> J["Assign visit date + student number"]
    J --> K["Status: PENDING"]

    K --> L["Student completes campus visit"]
    L --> M["Initial payment recorded by Cashier"]
    M --> N["Status: ACTIVE"]
    N --> O["Student proceeds to Subject Enrollment"]
```

### Actors & Responsibilities

| Step | Actor | API Endpoint |
|------|-------|-------------|
| Submit form | Applicant | `POST /admissions/enroll/` |
| Upload docs | Applicant | `POST /admissions/enrollment/{id}/documents/` |
| Review & approve | Admission Staff | `PATCH /admissions/applicants/{id}/` |
| Verify docs | Admission Staff | `PATCH /admissions/documents/{id}/verify/` |
| Record payment | Cashier | `POST /admissions/payments/record/` |

---

## 2. Subject Enrollment — Regular Student (AM/PM Auto-Assign)

```mermaid
flowchart TD
    A["Student opens Subject Enrollment page"] --> B{"is_irregular?"}
    B -- Yes --> C["Manual subject picker<br/>(See Flow 3)"]
    B -- No --> D["Show AM/PM Shift Selection UI"]
    D --> E["Student selects AM or PM"]
    E --> F["POST /subjects/auto-assign/"]
    F --> G["Backend finds section matching:<br/>• Program<br/>• Year level<br/>• Shift (AM/PM)<br/>• Available capacity"]
    G --> H{"Section found?"}
    H -- No --> I["Error: No available section for selected shift"]
    H -- Yes --> J["Enroll in all section subjects"]
    J --> K["Update student home_section"]
    K --> L["Status: ENROLLED for all subjects"]
```

---

## 3. Subject Enrollment — Irregular Student (Manual)

```mermaid
flowchart TD
    A["Student opens Subject Enrollment"] --> B["Fetch recommended subjects<br/>GET /subjects/recommended/"]
    B --> C["Display subject grid with sections"]
    C --> D["Student toggles subjects ON/OFF"]
    D --> E["Student selects section for each subject"]
    E --> F{"Conflicts?"}
    F -- Yes --> G["Show schedule conflict warning"]
    F -- No --> H["POST /subjects/bulk-enroll/"]
    H --> I{"Requires Head approval?"}
    I -- Overload/Retake --> J["Status: PENDING_HEAD"]
    J --> K["Head approves/rejects"]
    I -- Normal --> L["Status: ENROLLED"]
    K -- Approved --> L
    K -- Rejected --> M["Subject dropped"]
```

---

## 4. Payment Flow

```mermaid
flowchart TD
    A["Cashier searches student<br/>GET /cashier/students/search/"] --> B["View student's SOA<br/>GET /payments/student/{id}/"]
    B --> C["Record payment<br/>POST /payments/record/"]
    C --> D["Payment allocated to<br/>MonthlyPaymentBucket"]
    D --> E{"Month fully paid?"}
    E -- Yes --> F["Bucket marked is_paid=true"]
    E -- No --> G["Partial payment recorded"]
    F --> H{"Exam mapping exists<br/>for this month?"}
    H -- Yes --> I["Exam permit eligible<br/>POST /exam-permits/{period}/generate/"]
    H -- No --> J["No exam permit action"]
    I --> K["Student can print permit<br/>GET /exam-permits/{id}/print/"]
```

### Payment Adjustment Flow

```mermaid
flowchart LR
    A["Cashier needs adjustment"] --> B["POST /payments/adjust/"]
    B --> C["Create adjustment transaction<br/>(CREDIT or DEBIT)"]
    C --> D["Recalculate bucket balances"]
```

---

## 5. Promissory Note Flow

```mermaid
flowchart TD
    A["Student cannot pay full amount"] --> B["Cashier creates promissory note<br/>POST /promissory-notes/"]
    B --> C["Status: ACTIVE<br/>Due date set"]
    C --> D["Student attends exam<br/>(temporarily permitted)"]
    D --> E{"Student pays?"}
    E -- Full payment --> F["POST /promissory-notes/{id}/record_payment/<br/>Status: FULFILLED"]
    E -- Partial --> G["Status: PARTIALLY_PAID"]
    G --> H{"Before due date?"}
    H -- Yes --> E
    H -- No --> I["POST /promissory-notes/{id}/mark_defaulted/<br/>Status: DEFAULTED"]
    E -- No payment by due date --> I
    I --> J["Student blocked from future exams"]
```

---

## 6. Grade Submission Flow

```mermaid
flowchart TD
    A["Grading window opens<br/>(Semester term_status = GRADING_OPEN)"] --> B["Professor views assigned sections<br/>GET /grading/sections/"]
    B --> C["Select section + subject"]
    C --> D["View gradeable students<br/>GET /grading/students/"]
    D --> E["Enter grades (1.0 – 5.0 or INC)"]
    E --> F{"Within deadline?"}
    F -- No --> G["Grading blocked<br/>(date range enforcement)"]
    F -- Yes --> H["POST /grading/submit/ or /grading/bulk/"]
    H --> I["GradeHistory entry created"]
    I --> J["Registrar reviews<br/>GET /grades/sections/"]
    J --> K["POST /grades/section/{id}/finalize/"]
    K --> L["All grades locked<br/>SemesterGPA calculated"]
```

### INC Grade Lifecycle

```mermaid
flowchart TD
    A["Professor submits INC grade"] --> B["inc_date = today<br/>inc_expiry_date = today + 6 or 12 months"]
    B --> C{"Student completes<br/>requirement?"}
    C -- Yes --> D["Grade Resolution workflow<br/>(See Flow 7)"]
    C -- No --> E{"Expiry date reached?"}
    E -- No --> C
    E -- Yes --> F["Management command:<br/>process_grading_deadline"]
    F --> G["Grade auto-changed to 5.0 (Failed)<br/>Status: FAILED"]
    G --> H["GradeHistory: is_system_action=true"]
```

---

## 7. Grade Resolution (5-Step Workflow)

```mermaid
flowchart TD
    A["Professor or Dean opens request<br/>POST /grade-resolutions/"] --> B["Step 1: PENDING_REGISTRAR_INITIAL"]
    B --> C["Registrar reviews<br/>POST .../{id}/registrar_initial_approve/"]
    C --> D["Step 2: GRADE_INPUT_PENDING"]
    D --> E["Professor/Dean inputs new grade<br/>POST .../{id}/input_grade/"]
    E --> F["Step 3: PENDING_HEAD"]
    F --> G["Department Head reviews<br/>POST .../{id}/head_approve/"]
    G --> H["Step 4: PENDING_REGISTRAR_FINAL"]
    H --> I["Registrar final sign-off<br/>POST .../{id}/registrar_final_approve/"]
    I --> J["Step 5: APPROVED<br/>Grade applied to SubjectEnrollment"]

    C -- Reject --> R["REJECTED at any step"]
    G -- Reject --> R
    I -- Reject --> R
```

### Step Details

| Step | Actor | Action | Status After |
|------|-------|--------|-------------|
| 1 | Professor/Dean | Opens request with reason | `PENDING_REGISTRAR_INITIAL` |
| 2 | Registrar | Reviews and approves to proceed | `GRADE_INPUT_PENDING` |
| 3 | Professor/Dean | Inputs new grade + comment | `PENDING_HEAD` |
| 4 | Department Head | Reviews and approves | `PENDING_REGISTRAR_FINAL` |
| 5 | Registrar | Final sign-off, grade applied | `APPROVED` |

---

## 8. Document Release Flow

```mermaid
flowchart TD
    A["Registrar searches student<br/>GET /students/{id}/enrollment-status/"] --> B["Verify enrollment status<br/>(must be ACTIVE or COMPLETED)"]
    B --> C["Create document release<br/>POST /documents/release/"]
    C --> D["Document generated with<br/>unique code (e.g., TOR-2026-001)"]
    D --> E["Student downloads PDF<br/>GET /documents/{code}/pdf/"]

    E --> F{"Need to revoke?"}
    F -- Yes --> G["POST /documents/{code}/revoke/"]
    G --> H["Document invalidated"]
    F -- No --> I["Document remains valid"]

    H --> J{"Reissue needed?"}
    J -- Yes --> K["POST /documents/{code}/reissue/"]
    K --> D
```

---

## 9. Exam Permit Generation

```mermaid
flowchart TD
    A["Admin configures exam-month mappings<br/>POST /exam-mappings/"] --> B["PRELIM → Month 1<br/>MIDTERM → Month 2<br/>PREFINAL → Month 4<br/>FINAL → Month 6"]
    B --> C["Exam period arrives"]
    C --> D["Student requests permit"]
    D --> E{"Required month fully paid?"}
    E -- No --> F["Permit denied<br/>(or Promissory Note path)"]
    E -- Yes --> G["POST /exam-permits/{period}/generate/"]
    G --> H["ExamPermit created"]
    H --> I["Student/Staff prints permit<br/>GET /exam-permits/{id}/print/"]
```

---

## 10. Semester Lifecycle

```mermaid
flowchart LR
    A["SETUP"] --> B["ENROLLMENT_OPEN"]
    B --> C["ENROLLMENT_CLOSED"]
    C --> D["GRADING_OPEN"]
    D --> E["GRADING_CLOSED"]
    E --> F["ARCHIVED"]
```

| Phase | What happens |
|-------|-------------|
| `SETUP` | Admin creates semester, sections, schedules |
| `ENROLLMENT_OPEN` | Students can enroll, pick subjects |
| `ENROLLMENT_CLOSED` | No more enrollment changes |
| `GRADING_OPEN` | Professors submit grades |
| `GRADING_CLOSED` | No more grade changes, registrar finalizes |
| `ARCHIVED` | Read-only historical record |
