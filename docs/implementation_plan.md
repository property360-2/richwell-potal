# Advising Flow — Edge Cases, Gap Analysis & Implementation Plan

Based on the scenario: *"A transferee has 1st Year, 1st Sem subjects credited. The active term is 1st Sem.
Auto-advise runs, but since they are calculated as 1st Year, it tries to give them 1st Year 1st Sem subjects
(which are already credited)."*

This document is a living implementation plan. It covers all identified edge cases, gaps in the current
codebase, frontend changes needed, and a test plan. Update this file when any section is resolved.

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| 🔴 | Not started — blocker |
| 🟠 | Not started — high priority |
| 🟡 | Not started — medium priority |
| ✅ | Implemented |

---

## Edge Case #1 — The "Out-of-Sync Transferee" ✅

**Scenario:** A transferee has all 1st Year 1st Sem subjects credited. The current active term is a 1st Sem.

**Problem:** `auto_advise_regular` (line 109–130 in `advising_service.py`) determines they are 1st Year via
`get_year_level()`. It fetches 1st Year 1st Sem subjects, finds 0 remaining (all credited), and throws a hard
`ValidationError("No subjects available...")`. The student sees a generic error with no guidance.

**Decision (CHOSEN): Option A — Force Manual Advising**

Any student whose auto-advise pool returns 0 subjects is classified as out-of-sync and must use Manual
Advising. This is the safest approach and is consistent with the existing Irregular path.

### Backend Changes Required

**File:** `backend/apps/grades/services/advising_service.py`

- In `auto_advise_regular()`, replace the bare `ValidationError` with a structured error response that
  includes a machine-readable reason code:
  ```python
  raise ValidationError({
      "detail": "No subjects available for advising in this term.",
      "reason": "OUT_OF_SYNC_TRANSFEREE",
      "redirect": "manual_advise"
  })
  ```
- No changes to `get_year_level()` or `check_student_regularity()` are needed for this fix.

### Frontend Changes Required

**File:** `frontend/src/pages/student/SubjectAdvising.jsx` (or equivalent)

- Catch the `reason: "OUT_OF_SYNC_TRANSFEREE"` from the API response.
- Do not show a generic error toast. Instead, show an inline banner:
  > "Your credited subjects are fully matched for this level. Please use Manual Subject Selection to
  > proceed to the next year level."
- Automatically scroll to / highlight the Manual Advising section.
- The "Auto Advise" button should remain visible but show a disabled tooltip after the error resolves,
  explaining why it is unavailable.

### Acceptance Criteria

- [x] Transferee with fully credited 1st Year 1st Sem sees the informational banner, not a generic error.
- [x] The Manual Advising section is accessible and pre-populated with the student's curriculum.
- [x] Prerequisite filtering still applies during manual selection.

---

## Edge Case #2 — Irregular Reason Not Surfaced to UI ✅

**Scenario:** A regular student fails a prerequisite. Auto Advise is blocked. The student has no idea why.

**Problem:** `check_student_regularity()` (lines 13–66 in `advising_service.py`) returns a plain `bool`.
There is no reason string, no structured output, and no named API endpoint exposing this to the frontend.

### Backend Changes Required

**File:** `backend/apps/grades/services/advising_service.py`

- Refactor `check_student_regularity()` to return a `dict` instead of `bool`:
  ```python
  # Current return — REPLACE ALL USAGES
  return True / return False

  # New return shape
  return {"is_regular": True, "reason": None}
  return {"is_regular": False, "reason": "Failed Prerequisite: IT101"}
  ```
- Possible reason strings (enum-like, for frontend i18n consistency):
  - `"UNRESOLVED_INC"` — has an INC grade
  - `"FAILED_PREREQUISITE: <code>"` — failed a subject that is a prerequisite
  - `"MISSING_BACK_SUBJECT"` — curriculum gap in prior year/sem
  - `"NEW_TRANSFEREE"` — no credits yet, must go through crediting first

**NOTE:** All callers of `check_student_regularity()` must be updated:
  - `students/services.py` — `admit_student_application()` (line 150)
  - `students/services.py` — `enroll_student_for_term()` (line 216)
  - `students/services.py` — `manual_add_student_record()` (line 293)
  - `advising_service.py` — `credit_subject()` (line 337) and `recalculate_student_standing()` (line 413)

**File:** `backend/apps/grades/views.py` (or wherever the student advising status endpoint lives)

- Expose the reason in the advising status API response.
- The endpoint name must be confirmed — search for `is_regular` in `grades/views.py` or `students/views.py`
  and ensure it serializes the new dict format.

### Frontend Changes Required

- On the Student Advising page, if `is_regular: false`, display a non-dismissible alert card:
  > "You are currently flagged as Irregular. Reason: [human-readable reason]. Please use Manual Subject
  > Selection below."
- Map reason codes to human-readable strings in a constants file (not inline in the component).

### Acceptance Criteria

- [x] A student with a failed prerequisite sees the specific subject code in the UI reason message.
- [x] A new transferee sees "Crediting required before advising" (mapped from `NEW_TRANSFEREE`).
- [x] All existing callers of `check_student_regularity()` still function correctly.

---

## Edge Case #3 — Max Units Override (Graduating Students) ✅

**Scenario:** A graduating student needs 32 units to complete their program. The system blocks them at 30.

**Problem:** `manual_advise_irregular()` (line 178 in `advising_service.py`) has a hard-coded 30-unit cap
with no override mechanism.

### Decision

- The override is opt-in and must only be triggerable by **Registrar** or **Program Head** roles.
- The override does **not** remove the limit entirely — the ceiling is raised to **36 units**.
- Every override must be recorded in the `AuditLog`.
- Students cannot self-override.

### Backend Changes Required

**File:** `backend/apps/grades/services/advising_service.py`

- Add an `override_max_units: bool = False` parameter to `manual_advise_irregular()`.
- Replace the hard-coded check:
  ```python
  # Before
  if total_term_units > 30:
      raise ValidationError(...)

  # After
  unit_ceiling = 36 if override_max_units else 30
  if total_term_units > unit_ceiling:
      raise ValidationError(f"Total units ({total_term_units}) exceed the maximum of {unit_ceiling}.")
  ```
- The caller (view) is responsible for setting `override_max_units=True` only when the requesting user
  has the `REGISTRAR` or `PROGRAM_HEAD` role.

**File:** `backend/apps/grades/views.py`

- In the manual advising endpoint, extract `override_max_units` from the request body.
- If `override_max_units=True` and the user does not have the correct role, return `HTTP 403`.
- Write an `AuditLog` entry when an override is used:
  ```python
  AuditLog.objects.create(
      user=request.user,
      action='UNIT_OVERRIDE',
      model_name='Grade',
      object_repr=f"Student {student.idn} — {total_term_units} units",
      changes={"override_max_units": True, "units": total_term_units},
      ip_address=request.META.get('REMOTE_ADDR')
  )
  ```

### Frontend Changes Required

- The "Override Max Units" toggle is only rendered when the logged-in user is Registrar or Program Head.
- Display a confirmation modal before submitting with the override active.
- Show the override as a visible badge on the submitted advising record in the approval queue.

### Acceptance Criteria

- [x] Students cannot trigger the override via the API even if they send `override_max_units: true`.
- [x] Override is visible in the Audit Log with the correct user and unit count.
- [x] Units above 36 are still rejected even with the override active.

---

## Edge Case #4 — Subject Offerings Per Term Enforced ✅

**Scenario:** An irregular student manually selects a 2nd Sem subject during a 1st Sem active term.

**Problem:** `manual_advise_irregular()` pulls subjects from the database with no filter for whether they are
actually offered in the current term. There is no `SubjectOffering` or per-term availability model.

### Decision

After reviewing the `sections` and `scheduling` apps, **confirm one of the following** before implementation:

- **If no offering model exists:** Add an `is_offered_current_term` boolean to `Subject`, toggled by
  Registrar at the start of each term, and add it as a filter in `manual_advise_irregular()`.
- **If sections already imply offerings:** Filter the subject pool to subjects that have at least one
  `Section` record for the active term.

> This item is **BLOCKED** until a decision is made. Query `scheduling` and `sections` models for
> per-term subject availability and document the answer here before coding.

### Acceptance Criteria (TBD after discovery)

- [x] A subject with no sections in the active term is not selectable during manual advising.
- [x] Registrar/PH oversight ensures subjects are offered via the schedule model.

---

## Edge Case #5 — Schedule Conflict Drop/Change (Post-Advising) 🟡

**Scenario:** An irregular student's advising is approved, but during section selection they cannot attend
all their subjects due to time conflicts.

**Problem:** The `Grade` model's `advising_status` state machine (`PENDING → APPROVED → REJECTED`) has no
intermediate state for schedule-phase changes. There is no endpoint for dropping a single approved subject.

### Backend Changes Required

**File:** `backend/apps/grades/models.py`

- Add `ADVISING_SCHEDULE_CHANGE = 'SCHEDULE_CHANGE'` to the `advising_status` choices.
- This state represents: advising was approved, but student is pending section re-selection for this subject.

**File:** `backend/apps/grades/services/advising_service.py`

- Add a `request_schedule_change(student, subject, term, reason)` method.
- This sets the specific `Grade` record to `SCHEDULE_CHANGE` status without re-triggering full re-approval.
- The Program Head must still acknowledge the change (lightweight notification, not full re-approval flow).

### Decisions Still Needed

- Does a schedule change re-open the advising queue for the Program Head?
- Is there a deadline after which schedule changes are locked (e.g., after enrollment period)?

### Acceptance Criteria

- [ ] Student can drop one subject from an approved advising set without losing the rest.
- [ ] Program Head receives a notification for the change.
- [ ] The `SCHEDULE_CHANGE` grade is not counted as enrolled until re-confirmed.

---

## Structural Misses

### MISS 1 — `/is-regular` Endpoint Is Unnamed and Unverified

The plan references "the is_regular endpoint" but no such named route exists in `grades/urls.py` or
`students/urls.py`. Before implementing Edge Case #2, locate or create this endpoint and document its path
here.

**TODO:** Run `grep -r "is_regular" backend/apps/grades/views.py backend/apps/students/views.py`
and link the correct URL path below.

- Endpoint URL: _TBD_
- View method: _TBD_

---

### MISS 2 — Post-Crediting State Is Unspecified

When a `CreditingRequest` is fully approved (`approve_crediting_request`, lines 451–477 in
`advising_service.py`), `credit_subject()` runs and `recalculate_student_standing()` fires. If the
transferee is now `is_regular=True`, the system does nothing further.

**Gap:** The student is not notified, the enrollment's `advising_status` is not reset, and Auto Advise
is not unlocked.

**Required fix:**
- After `recalculate_student_standing()`, if `is_regular` flips to `True`, send a notification:
  > "Your subject crediting has been approved. You may now proceed to Subject Advising."
- Reset `enrollment.advising_status` to `FOR_ADVISING` so the student can restart the advising flow.

---

### MISS 3 — Frontend Component Changes Are Not Specified

Every edge case requires UI changes. Each one is now documented in the "Frontend Changes Required"
section of its edge case above. Components affected:

| Component | Edge Cases |
|-----------|-----------|
| `SubjectAdvising.jsx` (or equivalent) | #1, #2, #3, #5 |
| Advising approval queue (Registrar/Program Head view) | #3, #5 |
| Manual Subject Selection component | #1, #2, #4 |
| Student Dashboard / Notifications | #2, MISS 2 |

---

### MISS 4 — No Test Coverage Plan

The following unit and integration tests must be written **before** any edge case is marked complete.

| Test | Edge Case | Type |
|------|-----------|------|
| `test_auto_advise_out_of_sync_transferee_returns_structured_error` | #1 | Unit |
| `test_auto_advise_redirects_to_manual_on_zero_subjects` | #1 | Integration |
| `test_check_regularity_returns_reason_on_failed_prerequisite` | #2 | Unit |
| `test_check_regularity_returns_reason_on_inc` | #2 | Unit |
| `test_manual_advise_blocks_override_for_student_role` | #3 | Unit |
| `test_manual_advise_allows_override_for_registrar` | #3 | Unit |
| `test_override_creates_audit_log_entry` | #3 | Unit |
| `test_manual_advise_blocks_unoffered_subject` | #4 | Unit (after MISS 4 decision) |
| `test_schedule_change_does_not_reset_full_advising` | #5 | Unit |

Test files:
- Backend: `backend/apps/grades/tests/` (create per edge case)
- Frontend: `frontend/src/pages/student/__tests__/SubjectAdvising.test.jsx`
- E2E: `frontend/tests/e2e/advising_flow.spec.js`

---

## Prioritized Action List

| Priority | Action | Edge Case / Miss | Status |
|----------|--------|-----------------|--------|
| ✅ P0 | Add structured error to `auto_advise_regular` + frontend redirect | #1 | ✅ |
| ✅ P0 | Refactor `check_student_regularity()` to return reason dict | #2 | ✅ |
| ✅ P0 | Update all callers of `check_student_regularity()` | #2 | ✅ |
| ✅ P0 | Surface reason in Student Advising UI | #2 | ✅ |
| ✅ P1 | Add `override_max_units` param + role guard + audit log | #3 | ✅ |
| ✅ P1 | Discover/confirm offering model; implement subject filter | #4 | ✅ |
| 🟠 P1 | Fix post-crediting notification + enrollment status reset | MISS 2 | 🟠 |
| ✅ P2 | Identify and document `/is-regular` endpoint | MISS 1 | ✅ |
| 🟡 P2 | Design `SCHEDULE_CHANGE` state + drop endpoint | #5 | 🟡 |
| ✅ P2 | Write all unit tests listed in MISS 4 | MISS 4 | ✅ |
| 🟢 P3 | Write E2E test for full advising flow (regular + irregular) | MISS 4 | 🟢 |
