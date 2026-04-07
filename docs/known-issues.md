# Known Issues & Planned Work

> This document tracks confirmed bugs and incomplete features identified through
> codebase auditing. Each entry includes its location, severity, and the fix required.

---

## ✅ RESOLVED — April 7, 2026

All items below were resolved in a single implementation session.

---

### ✅ BUG-01: Graduation Audit — API Response Key Mismatch *(FIXED)*

**Severity:** High — Stats panel rendered `undefined` for all users  
**Resolved in:**
- `backend/apps/reports/services/report_service.py` → `graduation_check()` now returns `total_units_earned`, `total_units_required`, `missing_subjects` (with `year_level`, `semester` per item)
- `frontend/src/pages/registrar/reports/GraduationAudit.jsx` → All key reads updated to match

---

### ✅ GAP-01: "Confirm Graduation" Button — Not Wired *(FIXED)*

**Severity:** High — Button existed in UI but did nothing  
**Resolved in:**
- `backend/apps/students/views.py` → `confirm_graduation` action added (POST `/students/{id}/confirm-graduation/`). Runs live eligibility guard before setting `status = GRADUATED`. Creates audit log (RELEASE action) and notifies student.
- `frontend/src/api/students.js` → `confirmGraduation(studentId)` API helper added
- `frontend/src/pages/registrar/reports/GraduationAudit.jsx` → `handleConfirmGraduation()` wired to button with loading/disabled state and inline success/error feedback

---

### ✅ NOTIF-01: INC/NO_GRADE Expiry — No Student Alert *(FIXED)*

**Severity:** Medium  
**Resolved in:**
- `backend/apps/grades/management/commands/check_inc_expiry.py` → `NotificationService.notify()` called after each `grade.save()` in both loops. Failures are caught individually so the batch is never blocked.

---

### ✅ NOTIF-02: Section Redirect — No Student Alert *(FIXED)*

**Severity:** Medium  
**Resolved in:**
- `backend/apps/notifications/services/notification_service.py` → `notify_session_redirection()` static method added
- `backend/apps/scheduling/services/picking_service.py` → Import added; commented TODO replaced with live call when `redirected=True`

---

### ✅ NOTIF-03: Crediting Request Result — No Student Alert *(FIXED)*

**Severity:** Medium  
**Resolved in:**
- `backend/apps/grades/services/advising_service.py` → `approve_crediting_request()` and `reject_crediting_request()` both now call `NotificationService.notify()` after `request.save()`. Rejection messages include the reviewer's reason.

---

### ✅ DESIGN-02: `CreditingRequestViewSet` Base Permission Conflict *(FIXED)*

**Severity:** Medium — Registrars were silently blocked from list/retrieve  
**Resolved in:**
- `backend/apps/grades/views.py` → Removed `IsProgramHeadOfStudent` from class-level `permission_classes`. It remains on `approve`/`reject` action-level overrides only.

---

### ✅ DESIGN-03: `enrollment` App — Orphaned Directory *(REMOVED)*

**Resolved:** Directory `backend/apps/enrollment/` deleted.  
**Verification:** `showmigrations enrollment` returned `No installed app with label 'enrollment'` confirming it was never in `INSTALLED_APPS` or any migration graph.

---

## 🟡 Design Decisions (Documented, No Code Change Needed)

### DESIGN-01: Document Auto-Unlock for Transferees

**File:** `apps/students/models.py` → `Student.save()` lines 102–105

The logic auto-unlocks advising for **any student** whose submitted documents
are all verified, including Transferees. **This is intentional:**

- For **Freshmen** — unlocked by default at creation.
- For **Transferees** — unlocked automatically when all submitted documents are verified by the Registrar.

The document checklist (F138, PSA, F137, etc.) is the effective lock mechanism for Transferees.

---

### DESIGN-04: Finance — 6-Month Payment Structure

**Source:** `apps/finance/services/payment_service.py` → `get_permit_status()`

There are **6 monthly commitment slots**. Each month's cumulative settlement unlocks a specific permit:

| Month | Cumulative Target | Unlocks |
|---|---|---|
| 1 | `commitment × 1` | Subject Enrollment |
| 2 | `commitment × 2` | Chapter Test Permit |
| 3 | `commitment × 3` | Prelim Permit |
| 4 | `commitment × 4` | Midterm Permit |
| 5 | `commitment × 5` | Pre-Final Permit |
| 6 | `commitment × 6` | Final Exam Permit |

A `PROMISSORY` note for a month counts as cleared for permit purposes even if
the actual payment hasn't been recorded yet. Promissory notes require that the
previous month has been cleared.

---

---

### ✅ BUG-02: Grade Resolution Workflow — Missing Endpoints & Filters *(FIXED)*

**Severity:** High — Resolutions were stuck because Program Head could not approve, and Registrar could not see approved items.  
**Resolved in:**
- `backend/apps/grades/views.py`:
    - `GradeFilter` → Added `resolution_status` and `resolution_status__in` to `fields`. This allows filtering grades by their resolution state (e.g., `HEAD_APPROVED`).
    - `ResolutionViewSet` → Refactored to `GenericViewSet` to support `get_object()` for secure `IsProgramHeadOfStudent` permission checks.
    - `ResolutionViewSet` → Exposed missing actions: `registrar-reject`, `head-approve`, and `head-reject`.
- `backend/apps/grades/services/resolution_service.py`: (Verified) Service already had the logic; viewset was the bottleneck.

---

*Last updated: 2026-04-07 — All critical issues and complex workflow bugs resolved.*
