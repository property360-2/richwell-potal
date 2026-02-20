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
3.  **Admission Approval & ID Assignment**:
    *   **Trigger**: Once the student pays the initial fee (Month 1), the **Cashier** records the `PaymentTransaction`.
    *   **Admission Staff/Registrar Action**: Reviews the applicant's requirements and payment.
    *   **ID Assignment (ID Giving)**: The Registrar assigns a permanent **Student Number** (e.g., `2025-00123`).
    *   **System Action**: Updates `User.student_number`, sets `Enrollment.first_month_paid = True`.
    *   **Transition**: Enrollment Status `PENDING` → `ACTIVE` (Officially Admitted).

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
    3.  **Unit Load**: Total units must not exceed `max_units` (default 30).

### 2.2 Sectioning (Enrollment in Subjects)
1.  **Selection**: Student selects a subject and an available `Section`.
2.  **Conflict Detection**: `SchedulingService` checks for overlaps in `ScheduleSlot` (Time/Day).
3.  **Seat Reservation**:
    *   System checks `Section.enrolled_count < Section.capacity`.
    *   **Queueing**: If full, student cannot proceed.
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

### 3.4 Comprehensive Approval Workflows
The system implements several approval chains for critical academic and administrative actions.

| Workflow | Trigger | Approver 1 | Approver 2 | Effect |
| :--- | :--- | :--- | :--- | :--- |
| **Online Enrollment** | Student Form | System (Internal Check) | — | Creates pending student account. |
| **Subject Enrollment** | Student Selection | Cashier (Payment) | Dept Head (Academic) | Enrolls subject; sets `payment_approved` & `head_approved`. |
| **Overload Request** | Student Request | Registrar | Dept Head | Increases unit limit (`max_units_override`). |
| **Grade Finalization** | End of Term | Registrar | — | Locks grades for a section (`is_finalized = True`). |
| **INC Resolution** | Prof Request | Registrar (Validates Eligibility) | Dept Head (Academic Merit) | Updates grade from `INC` to final grade. |
| **Grade Override** | Registrar Action | *Self-Logged* | — | Compulsory grade change (even if finalized). Logs to `GradeHistory` as `OVERRIDE`. |
| **Transferee Credit** | Registrar Entry | *Auto-Approved* | — | Credits subjects from previous school. |
| **Admitted Status** | Payment w/o Subjects| Admin/Staff | — | Sets status to `ADMITTED` (Paid but no load). |

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
*   **Section Rebalancing**:
    *   **Logic**: `SectioningEngine.rebalance_sections()`.
    *   **Action**: Merges sections for the same program/year that fall below a minimum student threshold to optimize faculty resources.

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

### 6.2 Utility Management (System Config)
*   **Dynamic Settings**: `SystemConfig` model allows Admins to toggle features at runtime.
*   **Keys**:
    *   `ENROLLMENT_ENABLED`: Global switch for the public online form.
    *   `GRADING_PERIOD_OPEN`: Controls professor access to grading views.
    *   `MAINTENANCE_MODE`: Restricts access during updates.

### 6.3 Audit Trail
*   **Immutable Logs**: `AuditLog` records every critical action (Enrollment, Grade Change, Document Release).
*   **Security**: `AuditLog` overrides `save()` and `delete()` to prevent tampering.

---

## 7. Payment & Cashier Flow

The **Cashier** module handles all financial transactions related to student enrollment.

### 7.1 Payment Recording
1.  **Student Search**: Cashier searches by Student Number or Name (`CashierStudentSearchView`).
2.  **SOA Review**: System displays the student's 6-month payment buckets (`MonthlyPaymentBucket`).
3.  **Payment Entry**: Cashier records the payment (`PaymentRecordView`).
    *   **Receipt**: Auto-generates a unique receipt number (`RCV-YYYYMMDD-XXXXX`).
    *   **Allocation**: Payment is distributed across unpaid months in order (Month 1 → 6).
    *   **Modes**: Cash, Online Banking, GCash, Maya, Check.
4.  **Audit**: `PaymentTransaction` record is created, linked to the `Enrollment`.

### 7.2 Payment Adjustments
*   **Scenario**: Overpayment, underpayment correction, or refund.
*   **Flow**: Cashier creates an adjustment via `PaymentAdjustmentView`.
    *   Requires a `reason` and links to the `original_transaction`.

### 7.3 Cashier Dashboard
*   `CashierTodayTransactionsView`: Summary of all payments processed today.
*   `CashierPendingPaymentsView`: Students with overdue or unpaid buckets.

### 7.4 Student Self-Service
*   `MyPaymentsView`: Student can view their own Statement of Account (SOA) and payment history.

---

## 8. Exam Permit System

Exam permits are the **gate** between payment and exam eligibility.

### 8.1 Configuration
*   **Admin/Registrar** sets `ExamMonthMapping` per semester:
    *   **Month 1**: Subject Enrollment
    *   **Month 2**: Chapter Test
    *   **Month 3**: PRELIM
    *   **Month 4**: MIDTERM
    *   **Month 5**: PREFINAL
    *   **Month 6**: FINAL
### 8.2 Auto-Generation
1.  **Trigger**: When a `MonthlyPaymentBucket` for the required month reaches `is_fully_paid = True`.
2.  **System Action**: `GenerateExamPermitView` creates an `ExamPermit` with unique code (`EXP-YYYYMMDD-XXXXX`).
3.  **Student View**: `MyExamPermitsView` shows available permits.

### 8.3 Printing & Tracking
*   **Registrar/Admin**: `PrintExamPermitView` marks `is_printed = True` with timestamp and user.
*   **Validity Check**: `ExamPermit.is_valid` re-checks that the payment month is still paid (guards against reversed payments).

---

## 9. Grading Lifecycle

### 9.1 Professor Grade Submission
1.  **View Assigned Sections**: `ProfessorAssignedSectionsView` lists sections/subjects the professor teaches.
2.  **View Students**: `ProfessorGradeableStudentsView` lists enrolled students for a specific section/subject.
3.  **Submit Grades**:
    *   **Single**: `ProfessorSubmitGradeView` — submits one grade at a time.
    *   **Bulk**: `BulkGradeSubmissionView` — submits multiple grades in one request.
4.  **Validation**: System checks grading period is open.
5.  **Audit**: Every grade change is logged in `GradeHistory`.

### 9.2 Grade Finalization (Registrar)
1.  **Review**: `SectionFinalizationListView` shows sections ready for grade locking.
2.  **Finalize**: `FinalizeSectionGradesView` locks all grades in a section (prevents further edits).
3.  **Override**: `OverrideGradeView` allows Registrar to change grades post-finalization (logged in `AuditLog`).

### 9.3 INC (Incomplete) Management & Resolution
*   **Definition**: A temporary grade given when a student fails to complete requirements.
*   **Resolution Process**:
    1.  **Trigger**: Student submits missing requirements.
    2.  **Request**: Professor creates a `GradeResolution` request with `proposed_grade`.
    3.  **Validation (Registrar)**: Checks if within completion period (1 year max).
    4.  **Approval (Head)**: Reviews academic merit.
    5.  **Effect**: On approval, `SubjectEnrollment.grade` is updated.
*   **Auto-Expiry**: `ProcessExpiredINCsView` converts expired INCs to `5.00` (Failed).
    *   Major subjects: 6-month expiry.
    *   Minor subjects: 12-month expiry.

### 9.4 Student Grade Views
*   `MyGradesView`: Student views grades for the current semester.
*   `MyTranscriptView`: Full academic transcript across all semesters.

### 9.5 Academic Standing
*   `UpdateAcademicStandingView`: Registrar updates a student's academic standing (Regular, Probation, Dismissed).

---

## 10. COR (Certificate of Registration)

*   **Trigger**: `GenerateCORView` generates a printable Certificate of Registration for an enrollment.
*   **Contents**: Student info, enrolled subjects, schedule, total units, and payment summary.
*   **Prerequisite**: Student must have `ACTIVE` enrollment with at least one enrolled subject.

---

## 11. Data Export System

The system supports exporting data to **Excel** and **PDF** formats for reporting.

| Export Endpoint | Data | Filters | Access |
|---|---|---|---|
| `ExportStudentsView` | Student list (ID, name, program, year, status) | — | Registrar, Admin |
| `ExportEnrollmentsView` | Enrollment records per semester | `semester_id` | Registrar, Admin |
| `ExportPaymentsView` | Payment transactions | `start_date`, `end_date` | Cashier, Registrar, Admin |

*   **Engine**: `ExportService` in `apps.core.services` handles Excel (openpyxl) and PDF generation.

---

## 12. Notification System

Real-time user notifications for system events.

### 12.1 Notification Types
| Type | Example Trigger |
|---|---|
| `PAYMENT` | Payment recorded, bucket fully paid |
| `ENROLLMENT` | Enrollment approved/rejected |
| `DOCUMENT` | Document released, revoked |
| `GRADE` | Grade submitted, finalized |
| `ANNOUNCEMENT` | System-wide announcements |
| `SYSTEM` | Maintenance mode, semester change |

### 12.2 API
*   `list_notifications`: Paginated list (20/page) with `unread_only` filter.
*   `get_unread_count`: Badge count for the UI bell icon.
*   `mark_notification_read` / `mark_all_read`: Read state management.
*   `delete_notification`: Remove individual notifications.

---

## 13. Authentication & Security

### 13.1 Login & Session
1.  **Login**: `LoginView` issues JWT access + refresh tokens.
2.  **Token Refresh**: `TokenRefreshView` extends session without re-login (1-hour access, 1-day refresh).
3.  **Logout**: `LogoutView` invalidates the session.

### 13.2 Password Reset Flow
1.  **Request**: `RequestPasswordResetView` — user submits email.
    *   System generates a `PasswordResetToken` (1-hour expiry).
    *   Email is sent with a reset link (does **not** reveal if email exists for security).
2.  **Validate**: `ValidateResetTokenView` — frontend checks if token is valid before showing the form.
3.  **Reset**: `ResetPasswordView` — user sets new password (min 8 chars). Token is marked as used.

### 13.3 Document Verification
*   `DocumentVerifyView`: Admission staff verifies uploaded enrollment documents (ID, TOR, etc.).

---

## 14. Archives Module

The Archives module provides a read-only view of soft-deleted records.

### 14.1 Browsable Types
| Type | Source | "Deleted" Definition |
|---|---|---|
| Programs | `Program.is_deleted = True` | Soft-deleted |
| Subjects | `Subject.is_deleted = True` | Soft-deleted |
| Sections | `Section.is_deleted = True` | Soft-deleted |
| Curricula | `Curriculum.is_deleted = True` | Soft-deleted |
| Professors | `User.is_active = False` | Deactivated account |

### 14.2 Features
*   **Search**: Filter by name/code within each type.
*   **Metadata**: Shows deletion date, description, and type-specific info.
*   **Access**: Registrar and Admin only (`IsRegistrarOrAdmin`).

