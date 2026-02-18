# System Flow Documentation

This document outlines the core business processes and workflows within the Richwell Portal system. It details how different modules interact to fulfill key academic and administrative functions.

---

## 1. Enrollment & Admission Flow

The enrollment process transforms an applicant into an officially enrolled student through a series of validation and approval steps.

### 1.1 Online Enrollment (New Students)
1.  **Applicant Submission**:
    *   Applicant fills out the Online Enrollment Form (public endpoint).
    *   System checks for email and name duplicates.
    *   **Data Created**: `User` (Role=Student), `StudentProfile`, `Enrollment` (Status=PENDING).
    *   **Financials**: 6 `MonthlyPaymentBucket` records are auto-generated based on the program's fee structure.
2.  **Assessment**:
    *   Applicant receives temporary credentials (`PENDING-XXXX`).
    *   System calculates `monthly_commitment` and initial required fees.
3.  **Payment & Activation**:
    *   Student pays the initial fee (Month 1).
    *   **Cashier Action**: Records `PaymentTransaction`.
    *   **System Action**: Updates `Enrollment.first_month_paid = True`.
    *   **Registrar Action**: Approves the enrollment (assigns permanent Student Number).
    *   **Transition**: Enrollment Status `PENDING` → `ACTIVE`.

### 1.2 Transferee Admission
1.  **Registrar Entry**:
    *   Registrar manually creates the student account via `TransfereeCreateView`.
    *   **Credit Evaluation**: Registrar inputs "Credited Subjects" from the student's Transcript of Records (TOR).
    *   **System Action**: Creates `SubjectEnrollment` records with status `CREDITED`.
2.  **Enrollment**:
    *   Student proceeds to standard subject selection (see Section 2).

---

## 2. Subject Advising & Sectioning Flow

The "Advising" system ensures students only enroll in valid subjects based on their curriculum and academic history.

### 2.1 Curriculum-Based Advising
*   **Logic Source**: `SubjectEnrollmentService.get_recommended_subjects()`.
*   **Validation Steps**:
    1.  **Curriculum Check**: Student must have an assigned `Curriculum`. Only subjects defined in `CurriculumSubject` are allowed.
    2.  **Prerequisite Validation**:
        *   System checks `Subject.prerequisites` (recursive).
        *   **Hard Block**: If a prerequisite has an unresolved **INC** grade (`check_inc_prerequisites`), enrollment is blocked.
        *   **Pass Check**: Prerequisite must be in `PASSED` or `CREDITED` status.
    3.  **Unit Load**: Total units must not exceed `max_units` (default 30, or `StudentProfile.max_units_override`).

### 2.2 Sectioning (Enrollment in Subjects)
1.  **Selection**: Student selects a subject and an available `Section`.
2.  **Conflict Detection**: `SchedulingService` checks for overlaps in `ScheduleSlot` (Time/Day).
3.  **Seat Reservation**:
    *   System checks `Section.enrolled_count < Section.capacity`.
    *   **Queueing**: If full, student cannot proceed (unless overridden by Admin).
4.  **Creation**: `SubjectEnrollment` created with status `ENROLLED` but requires **Dual Approval**.

---

## 3. Approval Chains

The system employs a "Gatekeeper" model for critical actions, requiring explicit approvals from different departments.

### 3.1 Subject Enrollment Approval (Dual Gate)
For a subject to be officially enrolled, it must pass two gates:
1.  **Finance Gate**:
    *   **Trigger**: Month 1 Payment completed.
    *   **Status**: `SubjectEnrollment.payment_approved` → True.
2.  **Academic Gate (Department Head)**:
    *   **Trigger**: Review of student's load (e.g., proper year level, no conflicts).
    *   **Status**: `SubjectEnrollment.head_approved` → True.
*   **Result**: When BOTH are True, `SubjectEnrollment.is_fully_enrolled` becomes True.

### 3.2 Overload Requests
*   **Scenario**: Student wants to exceed max unit cap.
*   **Flow**:
    1.  Student submits `OverloadRequest`.
    2.  **Status**: `PENDING`.
    3.  **Approval**: Department Head or Registrar approves.
    4.  **Effect**: `StudentProfile.max_units_override` is temporarily increased for the semester.

### 3.3 Grade Resolution (Changing Finalized Grades)
*   **Scenario**: Professor needs to change a grade after the grading period is closed or finalized.
*   **Flow**:
    1.  **Professor**: Submits `GradeResolution` request with "Reason" and "Proposed Grade".
    2.  **Registrar**: Reviews the request (Status: `PENDING_REGISTRAR` → `PENDING_HEAD`).
    3.  **Department Head**: Final Approval (Status: `APPROVED`).
    4.  **System**: Updates `SubjectEnrollment.grade` and logs change in `GradeHistory`.

---

## 4. Academic Management

### 4.1 Faculty Management
*   **Profiles**: `ProfessorProfile` stores department and specialization.
*   **Workload**:
    *   `ProfessorService.get_workload()` calculates total teaching hours.
    *   Used to prevent assigning schedule slots that cause conflicts or excessive overtime.

### 4.2 Curriculum Management
*   **Versioning**: `CurriculumVersion` allows snapshots of a curriculum.
*   **Structure**: `Curriculum` → `CurriculumSubject` (Year/Sem/Subject).
*   **Prerequisite Tree**: `Subject` models support recursive prerequisites, validated by `CurriculumService` to prevent circular dependencies.

### 4.3 Section & Schedule Management
*   **Bulk Creation**: `SectionViewSet.bulk_create` allows generating sections (e.g., "BSIT-1A") and auto-populating them with subjects from the curriculum.
*   **Scheduling**:
    *   `SectionSubject` links a Subject to a Section and a Professor.
    *   `ScheduleSlot` defines the actual time/room.
    *   **Conflict Engine**: Checks `(Day + StartTime + EndTime)` intersection for:
        *   Room (Double booking)
        *   Professor (Double teaching)
        *   Student (Double enrollment - checked during enrollment)

---

## 5. Document Management & Releasal

The **Registrar** module handles the issuance of official academic documents.

### 5.1 Document Release Flow
*   **Model**: `DocumentRelease` (EPIC 6).
*   **Types**: TOR, Certificate of Grades, Good Moral, Diploma.
*   **Process**:
    1.  **Validation**: Registrar checks `StudentEnrollmentStatusView` (e.g., must have ACTIVE enrollment for Enrollment Cert).
    2.  **Issuance**: Registrar creates `DocumentRelease` record.
    3.  **Code Generation**: Unique `document_code` (e.g., `DOC-20250101-XXXX`) is generated.
    4.  **Tracking**: System logs `released_by` and `released_at`.

### 5.2 Document Security
*   **Revocation**: Documents can be marked `REVOKED` with a reason.
*   **Reissuance**: A new document can supersede an old one (`replaces` field), marking the old one as `REISSUED`.
*   **Signed Tokens**: `generate_signed_token()` allows secure, time-limited download links for digital copies.

---

## 6. Archives & Utilities

### 6.1 Semester Lifecycle
1.  **Setup**: Define inputs (dates, exam months).
2.  **Enrollment Open**: Students can enroll.
3.  **Grading Open**: Professors can submit grades.
4.  **Closed**: No more changes.
5.  **Archived**: `Semester.status = ARCHIVED`.
    *   **Hard Switch**: Activating a new semester (`Semester.activate()`) strictly requires the previous valid semester to be Closed/Archived.

### 6.2 Audit Trail
*   **Immutable Logs**: `AuditLog` records every critical action (Enrollment, Grade Change, Document Release).
*   **Security**: `AuditLog` overrides `save()` and `delete()` to prevent tampering.
