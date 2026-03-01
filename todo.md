# Todo — Richwell Portal

## ✅ Completed: Split subject_enrollment_service.py (2,932L → 955L)

- [x] Created `payment_service.py` (PaymentService + ExamPermitService)
- [x] Created `grade_service.py` (GradeService + INCAutomationService)
- [x] Created `document_release_service.py` (DocumentReleaseService)
- [x] Trimmed `subject_enrollment_service.py` to SubjectEnrollmentService only
- [x] Updated `__init__.py` re-exports
- [x] Verified `python manage.py check` — zero import errors

---

## Current Structure Map

### Frontend (Vite + React)

```
src/pages/
├── admission/        → index.jsx (applicant dashboard)
├── cashier/          → index.jsx (payment), PaymentHistory.jsx
├── enrollment/       → index.jsx, SubjectEnrollment.jsx, steps/
├── head/             → index.jsx, Resolutions.jsx, Students.jsx, Reports.jsx
├── professor/        → Grades.jsx, Resolutions.jsx, Sections.jsx, Schedule.jsx
├── registrar/        → grades/, sections/, students/, documents/, enrollment/
├── student/          → index.jsx, Grades.jsx, ExamPermits.jsx, Schedule.jsx, StudentSOA.jsx
├── admin/            → AuditLogs.jsx, UserManagement.jsx, TermManagement.jsx

src/api/
├── endpoints.js      → 200+ endpoint definitions (centralized)
├── client.js         → Axios client with interceptors
```

### Backend (Django REST)

```
apps/enrollment/
├── models.py              → Semester, Enrollment, SubjectEnrollment, MonthlyPaymentBucket
├── models_grading.py      → GradeHistory, SemesterGPA, GradeResolution
├── models_payments.py     → PaymentTransaction, ExamMonthMapping, ExamPermit
├── services/              → enrollment_service, subject_enrollment_service, payment_service, etc.
├── views_*.py             → 12 view files (split by domain)
├── serializers_*.py       → 5 serializer files
└── urls.py                → 171 lines, all routes
```

---

# 🔧 STAGE 1: ALL BACKEND (Models → Services → Serializers → Views → URLs)

---

## P3 — Grade Resolution Workflow Fix (Backend)

**Priority**: 1st | **Effort**: Medium | **Risk**: Medium

### Model Changes (`models_grading.py`)
- [ ] Update `GradeResolution.Status` to 7 choices:
  - `PENDING_REGISTRAR_INITIAL` → Registrar first review
  - `GRADE_INPUT_PENDING` → Professor/Dean inputs grade
  - `PENDING_HEAD` → Head approval
  - `PENDING_REGISTRAR_FINAL` → Registrar final sign-off
  - `APPROVED` / `REJECTED` / `CANCELLED`
- [ ] Add `grade_input_by` (FK to User)
- [ ] Add `grade_input_at` (DateTimeField)
- [ ] Add `grade_input_comment` (TextField)
- [ ] Add `submitted_by_dean` (BooleanField)
- [ ] Create migration + data migration for existing resolutions

### Service Changes (`services_grading.py`)
- [ ] `submit_resolution()` — create request (prof or dean)
- [ ] `registrar_initial_approve()` — registrar reviews, triggers grade input
- [ ] `input_grade()` — professor/dean inputs grade + comment
- [ ] `head_approve()` — head reviews and approves
- [ ] `registrar_final_approve()` — registrar final sign-off, applies grade

### Serializer Changes (`serializers_grading.py`)
- [ ] Update `GradeResolutionSerializer` with new fields
- [ ] Add `GradeInputSerializer` for grade input step
- [ ] Add status transition validation

### View Changes (`views_grading.py`)
- [ ] `RegistrarInitialApproveView`
- [ ] `GradeInputView`
- [ ] `RegistrarFinalApproveView`

### URL Changes (`urls.py`)
- [ ] `grade-resolutions/<id>/registrar-approve/`
- [ ] `grade-resolutions/<id>/input-grade/`
- [ ] `grade-resolutions/<id>/registrar-final/`

---

## P1 — Admission Flow Completion (Backend)

**Priority**: 2nd | **Effort**: Medium | **Risk**: Low

### Model Changes (`models.py`)
- [ ] Add `Enrollment.Status.PENDING_ADMISSION`
- [ ] Add `assigned_visit_date` (DateField, null)
- [ ] Add `admission_notes` (TextField, blank)
- [ ] Create migration

### Service Changes (`services/enrollment_service.py`)
- [ ] `assign_visit_date(enrollment, date)` 
- [ ] `approve_admission(enrollment, actor)` — verify docs, gen student ID, transition status
- [ ] `generate_student_id()` — auto-gen in school format

### Serializer Changes (`serializers.py`)
- [ ] Update `EnrollmentSerializer` with new fields
- [ ] Add `AdmissionApprovalSerializer`

### View Changes (`views_applicants.py`)
- [ ] `ApplicantVisitDateView` — assign visit date
- [ ] `ApproveAdmissionView` — approve with doc check

### URL Changes (`urls.py`)
- [ ] `applicants/<id>/assign-visit-date/`
- [ ] `applicants/<id>/approve-admission/`

---

## P4 — Grade Submission Date Range (Backend)

**Priority**: 3rd | **Effort**: Low | **Risk**: Low

### Service Changes (`services/grade_service.py`)
- [ ] Add date validation in `submit_grade()` — reject if outside `grading_start_date`/`grading_end_date`
- [ ] Return deadline info in grade submission response

### Management Command
- [ ] [NEW] `management/commands/process_grading_deadline.py` — daily cron
  - Find all ENROLLED subjects with no grade after `grading_end_date`
  - Auto-mark INC
  - Trigger retake countdown

### View Changes (`views_grading.py`)
- [ ] `GradingDeadlineStatusView` — returns remaining time for professors

### URL Changes (`urls.py`)
- [ ] `grading/deadline-status/`

---

## P5 — Promissory Notes (Backend)

**Priority**: 4th | **Effort**: Medium | **Risk**: Low

### Model
- [ ] [NEW] `models_promissory.py` → `PromissoryNote` model:
  - `enrollment` (FK Enrollment)
  - `month_number` (1-6)
  - `amount` (DecimalField)
  - `due_date` (DateField)
  - `status` (PENDING / APPROVED / PAID / EXPIRED)
  - `processed_by` (FK User — cashier)
  - `student_signature` (BooleanField)
- [ ] Create migration

### Service
- [ ] [NEW] `services/promissory_service.py`:
  - `apply_promissory()` — student applies
  - `approve_promissory()` — cashier approves
  - `reject_promissory()` — cashier rejects
  - `validate_past_month_rule()` — no new promissory if past month unpaid
  - `check_conditional_payment()` — promissory counts as paid for permits

### Serializer
- [ ] [NEW] `serializers_promissory.py`:
  - `PromissoryNoteSerializer`
  - `PromissoryApplySerializer`

### Views
- [ ] [NEW] `views_promissory.py`:
  - `StudentApplyPromissoryView`
  - `StudentMyPromissoryView`
  - `CashierPromissoryListView`
  - `CashierApprovePromissoryView`
  - `CashierRejectPromissoryView`

### URL Changes (`urls.py`)
- [ ] `promissory/apply/`
- [ ] `my-promissory/`
- [ ] `promissory/pending/`
- [ ] `promissory/<id>/approve/`
- [ ] `promissory/<id>/reject/`

---

## P2 — AM/PM Auto-Assign Block Subjects (Backend)

**Priority**: 5th | **Effort**: High | **Risk**: High

### Model Changes
- [ ] Add `session` field (`AM`/`PM`) to `Section` model (`apps/academics/models.py`)
- [ ] Add `session_preference` to `StudentProfile` (`apps/accounts/models.py`)
- [ ] Create migration

### Service Changes
- [ ] `services/subject_enrollment_service.py` → `auto_assign_block_subjects(student, semester, session)`
  - Get curriculum subjects for year + sem
  - Find section with available capacity for session
  - Bulk-create SubjectEnrollments
- [ ] `services/section_service.py` → `get_available_sessions(year_level, semester)`, `check_session_capacity()`

### Serializer Changes
- [ ] `SessionSelectionSerializer`
- [ ] `SessionAvailabilitySerializer`

### View Changes (`views_enrollment.py`)
- [ ] `SessionAvailabilityView`
- [ ] `AutoEnrollRegularView`

### URL Changes (`urls.py`)
- [ ] `sessions/availability/`
- [ ] `enrollment/auto-enroll/`

---

## P6 — Role-Based Reports (Backend)

**Priority**: 6th | **Effort**: Medium | **Risk**: Low

### Views (`views_reports.py`)
- [ ] `AdmissionStatsView` — online vs completed enrollees, per year level
- [ ] `PaymentSummaryView` — paid/unpaid/promissory breakdown
- [ ] `EnrollmentConversionView` — conversion rate

### Serializer
- [ ] [NEW] `serializers_reports.py` — report response serializers

### URL Changes (`urls.py`)
- [ ] `reports/admission-stats/`
- [ ] `reports/payment-summary/`
- [ ] `reports/enrollment-conversion/`

---

# 🎨 STAGE 2: ALL FRONTEND (Pages → Components → API endpoints)

> To be started after all backend APIs are complete and tested.

---

## P3 Frontend — Grade Resolution UI

- [ ] Update `pages/professor/Resolutions.jsx` — show GRADE_INPUT_PENDING step + dean takeover
- [ ] Update `pages/head/Resolutions.jsx` — show PENDING_HEAD step only
- [ ] Update `pages/registrar/grades/` — split into initial + final review tabs
- [ ] [NEW] `components/ResolutionTimeline.jsx` — 5-step progress indicator
- [ ] Add endpoints to `api/endpoints.js`

## P1 Frontend — Admission Flow UI

- [ ] Update `pages/admission/index.jsx` — "Assign Visit Date" modal, "Approve Admission" button
- [ ] Update `pages/enrollment/index.jsx` — show pending admission status + docs + visit date
- [ ] [NEW] `components/DocumentChecklist.jsx` — reusable doc verification checklist
- [ ] Add endpoints to `api/endpoints.js`

## P4 Frontend — Grade Deadline UI

- [ ] Update `pages/professor/Grades.jsx` — deadline countdown banner
- [ ] Update `pages/registrar/grades/` — "Process Deadline" manual trigger button
- [ ] [NEW] `components/DeadlineCountdown.jsx` — countdown timer component
- [ ] Add endpoints to `api/endpoints.js`

## P5 Frontend — Promissory Notes UI

- [ ] [NEW] `pages/student/Promissory.jsx` — apply + status view
- [ ] [NEW] `pages/cashier/Promissory.jsx` — pending list + approve/reject
- [ ] Update `pages/student/StudentSOA.jsx` — promissory status badge per month
- [ ] [NEW] `components/PromissoryBadge.jsx` — status badge component
- [ ] Add endpoints to `api/endpoints.js`

## P2 Frontend — AM/PM Session UI

- [ ] [NEW] `pages/enrollment/SessionSelector.jsx` — AM/PM selector for regular students
- [ ] Update `pages/enrollment/index.jsx` — route regular → SessionSelector, irregular → SubjectEnrollment
- [ ] [NEW] `components/SessionCard.jsx` — AM/PM card with capacity indicator
- [ ] Add endpoints to `api/endpoints.js`

## P6 Frontend — Reports UI

- [ ] [NEW] `pages/admission/Reports.jsx` — enrollment stats charts
- [ ] [NEW] `pages/cashier/Reports.jsx` — payment summary charts
- [ ] [NEW] `pages/admin/Reports.jsx` — payment overview (generic)
- [ ] Update `pages/head/Reports.jsx` — connect to real data
- [ ] [NEW] `components/charts/BarChart.jsx`
- [ ] [NEW] `components/charts/PieChart.jsx`
- [ ] [NEW] `components/StatCard.jsx`
- [ ] Add endpoints to `api/endpoints.js`

---

## Summary

| Stage | Phases | New Files | Modified Files |
|---|---|---|---|
| **Stage 1: Backend** | P3 → P1 → P4 → P5 → P2 → P6 | 11 | 14 |
| **Stage 2: Frontend** | P3 → P1 → P4 → P5 → P2 → P6 | 14 | 9 |
| **Total** | | **25 new files** | **23 modified files** |
