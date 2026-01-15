# Implementation Status Report
**Date:** January 15, 2026

This document compares the current codebase against the `functional_specifications.md`.

## ✅ Implemented Features

### 1. Program & Curriculum Management
*   **CRUD Program/Curriculum:** Fully implemented in `apps.academics`.
*   **Subject Allocation:** `CurriculumSubject` model handles year/semester assignment.
*   **Effective Year:** Implemented.
*   **Student Assignment:** `StudentProfile` links students to curricula.

### 2. Subject Management
*   **CRUD Subjects:** Implemented.
*   **Global/Program Assignment:** Implemented.
*   **Prerequisites:** Implemented (`Subject.prerequisites` ManyToMany).

### 3. Enrollment System
*   **Document Upload:** Implemented (`EnrollmentDocument`).
*   **Logic:** Unit cap (30) and Prerequisite blocking are fully implemented in `SubjectEnrollmentService`.
*   **Approval Gate:**
    *   Payment Check: `check_payment_status` implemented.
    *   Head Approval: `PENDING_HEAD` status and `HeadApproveEnrollmentView` implemented.

### 4. Approval Chain
*   **Admission:** `ApplicantUpdateView` handles approval and ID generation.
*   **Payment:** `PaymentRecordView` unlocks `first_month_paid`.
*   **Permits:** `ExamPermitService` generates permits based on `MonthlyPaymentBucket` status (Months 1-6).

### 5. Professor & Section Management
*   **Faculty:** `User` role 'PROFESSOR' implemented.
*   **Assignments:** `SectionSubject` links Section + Subject + Professor.
*   **Grading:** `SubmitGradeView` allows professors to submit grades.

### 6. Scheduling
*   **Slot Assignment:** `ScheduleSlot` model implemented.
*   **Conflict Detection:** `SchedulingService` checks for overlaps.

### 7. Document Release
*   **Releases:** `DocumentRelease` model and views implemented.

### 8. Admin Controls
*   **Audit Log:** `AuditMiddleware` and `AuditLog` model implemented.
*   **Semester Control:** `Semester` model implemented.

---

## ⚠️ Pending / To-Do Features

### 1. Syllabus Management (High Priority)
*   **Requirement:** "Assign syllabus tapos ilagay sa specific folder".
*   **Status:** **Implemented (Backend & Frontend)**.
    *   `Subject` model updated with `syllabus` field.
    *   Serializers updated to handle file upload.
    *   Frontend `registrar-subjects.js` updated to allow upload/viewing.
    *   *Note:* Database migration is pending execution.

### 2. INC Expiry Automation (Medium Priority)
*   **Requirement:** Auto-convert INC to FAILED after 6 months (Major) or 1 year (Minor).
*   **Status:** **Implemented**. `INCAutomationService` and Celery tasks are verified.

### 3. Dynamic System Configuration (Medium Priority)
*   **Requirement:** "System control" (e.g., toggle enrollment).
*   **Status:** **Implemented (Backend)**.
    *   `SystemConfig` model, serializer, view, and URL created.
    *   API endpoint: `/api/v1/core/config/`
    *   *Note:* Database migration is pending execution. Admin UI is still pending.

### 4. Data Reporting Views (Low Priority)
*   **Requirement:** "View data based on necessary query".
*   **Status:** **Basic**. Basic list views exist, but advanced filtering/reporting (e.g., "Students by Curriculum") might need more dedicated endpoints/frontend pages.

### 5. Head Approval UI (Verification Needed)
*   **Requirement:** "Head approval for the subject".
*   **Status:** **Backend Ready**. Need to verify if `head-dashboard.html` fully supports the bulk approval workflow.

---

## Next Steps Plan

1.  **Implement Syllabus Management:** Add `syllabus` field to `Subject` model and create upload API.
2.  **Verify/Implement INC Automation:** Check `INCAutomationService` and ensure Celery beat is configured.
3.  **Implement Dynamic System Config:** Create a `SystemConfiguration` model to replace the static settings dict, allowing Admin UI control.
4.  **Polish Head Dashboard:** Ensure Department Heads can easily approve pending enrollments.
