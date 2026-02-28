# Todo — Richwell Portal

## ✅ Completed: Split subject_enrollment_service.py (2,932L → 955L)

- [x] Created `payment_service.py` (PaymentService + ExamPermitService)
- [x] Created `grade_service.py` (GradeService + INCAutomationService)
- [x] Created `document_release_service.py` (DocumentReleaseService)
- [x] Trimmed `subject_enrollment_service.py` to SubjectEnrollmentService only
- [x] Updated `__init__.py` re-exports
- [x] Verified `python manage.py check` — zero import errors

---

## New Enrollment Flow (Sir Gil's Document)

### Gap Analysis

| Area | Status | Gap |
|---|---|---|
| Online Enrollment | ✅ Exists | 🟢 Low |
| Admission Approval | ⚠️ Partial | 🟡 Visit date, doc encoding, student ID gen |
| Subject Enrollment (Regular) | ❌ Manual | 🔴 Auto-assign block + AM/PM session |
| Subject Enrollment (Irregular) | ✅ Exists | 🟢 Prereqs, conflict, cap 30 |
| Approval Chain (Head + Cashier) | ✅ Exists | 🟢 Aligned |
| Scheduling & Sectioning | ⚠️ Manual | 🟡 Dynamic sections, AM/PM capacity |
| Grade Resolution | ❌ Wrong flow | 🔴 Need 5-step workflow |
| Grade Submission | ⚠️ Partial | 🟡 Date range enforcement, auto-INC |
| INC / Retake | ✅ Exists | 🟢 6mo major, 12mo minor |
| Promissory Notes | ❌ Missing | 🔴 New model + cashier flow |
| Role-Based Audit | ✅ Exists | 🟢 Aligned |
| Role-Based Reports | ❌ Missing | 🔴 Admission stats, payment reports |

---

## 🔴 Critical Items & Proposed Solutions

### 1. AM/PM Auto-Assign (Phase 2) — 🔴 High Effort, High Risk

**Problem**: Regular students manually pick subjects — Sir Gil wants auto-assign.

**Solution**:
- Add `session` field (`AM`/`PM`) sa `Section` model
- New service method: `auto_assign_block_subjects(student, semester)`
  - Kukunin lahat ng curriculum subjects for student's year + sem
  - Hahanapin matching section na may slot sa preferred session
  - Bulk-create lahat ng `SubjectEnrollment` in one go
- Frontend: Regular student landing = AM/PM selector lang, hindi subject picker
- If AM full → disable AM button, auto-suggest PM
- Feature flag para pwedeng i-rollback

**Files affected**: `Section` model, `StudentProfile`, `subject_enrollment_service.py`, `section_service.py`, frontend enrollment page

**Checklist**:
- [ ] Add `session` field to Section model
- [ ] Add `session_preference` to StudentProfile
- [ ] Capacity tracking per session per year level
- [ ] `auto_assign_block_subjects()` service method
- [ ] Frontend: AM/PM selector for regular students
- [ ] Feature flag toggle

---

### 2. Grade Resolution Workflow Fix (Phase 3) — � Medium Effort, Medium Risk

**Problem**: Current flow = 3 steps (wrong). Sir Gil's = 5 steps.

**Current (wrong)**: Professor → Head → Registrar
**Sir Gil's flow**: Request → Registrar Approval → Grade Input → Head Approval → Registrar Final

**Solution**:
- Update `GradeResolution.Status` choices:
  - `PENDING_REGISTRAR_INITIAL` → Registrar reviews request
  - `GRADE_INPUT_PENDING` → Professor/Dean inputs grade
  - `PENDING_HEAD` → Head approves
  - `PENDING_REGISTRAR_FINAL` → Registrar final sign-off
  - `APPROVED` / `REJECTED` / `CANCELLED`
- Add fields: `grade_input_by`, `grade_input_at`, `grade_input_comment`
- Add `submitted_by_dean` flag for resigned professors
- Each role sees only their step in the chain
- Existing resolutions mapped to nearest new status

**Files affected**: `GradeResolution` model, `services_grading.py`, `views_grading.py`, `serializers_grading.py`

**Checklist**:
- [ ] Update `GradeResolution.Status` to 7 choices
- [ ] Add `grade_input_by`, `grade_input_at`, `grade_input_comment` fields
- [ ] Add `submitted_by_dean` flag
- [ ] Migration for existing data
- [ ] Update service workflow logic
- [ ] Update views per role
- [ ] Update serializers

---

### 3. Promissory Notes (Phase 5) — 🟡 Medium Effort, 🟢 Low Risk

**Problem**: No model, no flow — students can't request deferred payment.

**Solution**:
- New `PromissoryNote` model:
  - `enrollment` → FK to Enrollment
  - `month_number` → 1-6 (which month)
  - `amount` → how much
  - `due_date` → when to pay
  - `status` → PENDING / APPROVED / PAID / EXPIRED
  - `processed_by` → FK to cashier
- New `promissory_service.py` with rules:
  - ❌ Can't create new promissory if past month still unpaid
  - ✅ Approved promissory = "conditionally paid" for exam permits
  - Cashier dashboard shows pending requests
- Student UI: "Apply for Promissory" button on payment page

**Files affected**: NEW `PromissoryNote` model, NEW `promissory_service.py`, `views_payments.py`, frontend payment page

**Checklist**:
- [ ] Create `PromissoryNote` model
- [ ] Create `promissory_service.py`
- [ ] Student apply endpoint
- [ ] Cashier approve/reject endpoint
- [ ] Past-month unpaid validation rule
- [ ] Exam permit integration (conditionally paid)
- [ ] Frontend: Student promissory UI
- [ ] Frontend: Cashier promissory dashboard

---

### 4. Role-Based Reports (Phase 6) — 🟡 Medium Effort, � Low Risk

**Problem**: No data visibility for management.

**Solution**:
- **Admission Report**: Online enrollees vs completed (conversion rate), count per year level
- **Payment Report**: Paid vs unpaid vs promissory breakdown, summary table + charts
- **Generic Payment Page** (link-based, role TBD): Overview for admin visibility
- Add aggregate query endpoints in `views_reports.py`
- Frontend renders charts (bar/pie)
- Defer: Head Registrar performance reports (needs Maam Angel's input)

**Files affected**: `views_reports.py`, frontend report pages

**Checklist**:
- [ ] Admission stats endpoint (online vs completed, per year level)
- [ ] Payment summary endpoint (paid/unpaid/promissory)
- [ ] Generic payment overview page
- [ ] Frontend: Charts and tables
- [ ] Defer: Performance per section

---

## Non-Critical Phases

### Phase 1 — Admission Flow Completion (🟡 Medium)

- [ ] Add `assigned_visit_date` to Enrollment
- [ ] Add `Enrollment.Status.PENDING_ADMISSION`
- [ ] Admission approval endpoint (doc check → student ID gen)
- [ ] Student ID auto-generation format

### Phase 4 — Grade Submission Date Range (🟡 Medium)

- [ ] Enforce `grading_start_date`/`grading_end_date` in `GradeService.submit_grade()`
- [ ] Management command `process_grading_deadline` (daily cron, auto-INC)
- [ ] Professor deadline countdown in UI

---

## Recommended Priority Order

| Order | Phase | Why |
|---|---|---|
| 1st | Phase 3 — Grade Resolution | Existing bug, medium effort |
| 2nd | Phase 1 — Admission Flow | Foundational, low risk |
| 3rd | Phase 4 — Grade Submission Dates | Low risk, builds on existing |
| 4th | Phase 5 — Promissory Notes | New feature, isolated |
| 5th | Phase 2 — AM/PM Auto-Assign | Highest risk, needs feature flag |
| 6th | Phase 6 — Reports | Incremental, no rush |
