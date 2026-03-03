# Todo — Richwell Portal

## Enrollment → Sectioning → Scheduling Automation

### Semester Lifecycle (Date-Driven Auto-Transitions)

```
SETUP → ENROLLMENT_OPEN → ENROLLMENT_CLOSED → SECTIONING_OPEN → CLASSES_ACTIVE → GRADING_OPEN → ARCHIVED
              ↓                    ↓                   ↓                ↓
        Students enroll     Auto-generate        Students pick    Professors
        (freshmen auto-     sections from        AM/PM → Finalize get schedules
         enrolled on        enrollment count     → Even distribute assigned
         admission)                              → Backfill sections by Dean
```

**Transitions are automatic based on dates.** Registrar sets all dates once during SETUP:

| Date Range | Auto-Triggers |
|---|---|
| `enrollment_start_date` reached | → `ENROLLMENT_OPEN` |
| `enrollment_end_date` passed | → `ENROLLMENT_CLOSED` + auto-generate sections |
| `sectioning_start_date` reached | → `SECTIONING_OPEN` (students pick AM/PM) |
| `sectioning_end_date` passed | → auto-finalize + `CLASSES_ACTIVE` |
| `grading_start_date` reached | → `GRADING_OPEN` |
| `grading_end_date` passed | → `GRADING_CLOSED` |

Manual override buttons available as fallback for each transition.

### Rules

- **Section naming**: `{PROGRAM_CODE} {YEAR}-{NUMBER}` → e.g., `BSIS 1-1`, `BSIS 1-2`, `BSIS 1-3`
- **Max capacity**: 40 students per section (matches room max)
- **Overflow tolerance**: 1–5 extra → squeeze into existing sections. 6+ extra → spawn new section.
- **Scheduling window**: Dean can schedule professors from `ENROLLMENT_CLOSED` onward (sections exist).
- **Summer semesters**: Sectioning only runs for year/semester combos that have subjects in the curriculum. If a program has no summer subjects, no sections are generated for it.

---

## Phase 0: Date-Driven Semester Status Engine

> **What**: System auto-transitions semester status based on today's date. No manual clicks needed.

- [ ] **[MODIFY]** `backend/apps/enrollment/models.py`
  - Add `semester_number` (1=First, 2=Second, 3=Summer) to `Semester` model — maps to `CurriculumSubject.semester_number`
  - Add `sectioning_start_date` and `sectioning_end_date` to `Semester` model
  - Add `sections_generated` (BooleanField, default=False) — prevents re-running generation
  - Add `sectioning_finalized` (BooleanField, default=False) — prevents re-running finalization
  - Add `CLASSES_ACTIVE` and `SECTIONING_OPEN` to `TermStatus`
  - Add property `computed_status` that returns the correct status based on today's date:
    ```
    if today < enrollment_start → SETUP
    if enrollment_start <= today <= enrollment_end → ENROLLMENT_OPEN
    if enrollment_end < today < sectioning_start → ENROLLMENT_CLOSED
    if sectioning_start <= today <= sectioning_end → SECTIONING_OPEN
    if sectioning_end < today < grading_start → CLASSES_ACTIVE
    if grading_start <= today <= grading_end → GRADING_OPEN
    if today > grading_end → ARCHIVED
    ```
  - **Null-safety**: if a date field is null, skip that status transition and stay in the previous state. Registrar must fill all dates for the pipeline to work.
  - Add `sync_status()` method — compares `computed_status` vs stored `status`, triggers side-effects on transitions:
    - On `ENROLLMENT_CLOSED`: if `sections_generated == False` → run generation, set flag `True`
    - On `SECTIONING_OPEN` end: if `sectioning_finalized == False` → run finalization, set flag `True`
  - **Remove** old `auto_assign_current_students()` call (line 142-150)
- [ ] **[MODIFY]** `backend/apps/enrollment/serializers.py`
  - Add `sectioning_start_date`, `sectioning_end_date`, `sections_generated`, `sectioning_finalized` to `SemesterSerializer`
- [ ] **[NEW]** Management command `manage.py sync_semester_status`
  - **Hybrid approach**: runs daily via cron + called on key API endpoints (student dashboard, admin term management, enrollment views)
  - Calls `semester.sync_status()` for the current semester
  - Idempotent — checks `sections_generated` / `sectioning_finalized` flags before triggering
  - Safe to call on every relevant page load (~1-2 queries only)
- [ ] **[MODIFY]** `frontend/src/pages/admin/modals/TermModal.jsx`
  - Add `sectioning_start_date` and `sectioning_end_date` fields to the form
  - Show all 3 date pairs: Enrollment, Sectioning, Grading
  - Add manual override buttons for each status transition as fallback

---

## Phase 1: Auto-Enroll Freshman Subjects on Admission

> **Trigger**: Admission staff clicks "Accept" on a freshman applicant.

- [ ] **[NEW]** `backend/apps/enrollment/services/auto_enrollment_service.py`
  - `auto_enroll_freshman_subjects(enrollment)` — fetch Y1/S1 curriculum subjects
  - Bulk-create `SubjectEnrollment` with `section=NULL`, `payment_approved=True`, `head_approved=True`
  - Skip already-existing subjects (credited transferees)
  - Only for freshmen (year_level == 1)
- [ ] **[MODIFY]** `backend/apps/enrollment/views_applicants.py`
  - In `accept` action: call `auto_enroll_freshman_subjects()` instead of `auto_assign_new_student()`
  - Section assignment deferred to Phase 3

---

## Phase 2: Auto-Generate Sections on Enrollment Close

> **Trigger**: Auto — `enrollment_end_date` passed (or manual override button).
> Side-effect of `sync_status()` detecting `ENROLLMENT_CLOSED`.

- [ ] **[NEW]** `backend/apps/academics/services_section_generation.py`
  - `generate_sections_for_semester(semester)`:
    1. For each active Program × year_level: count enrolled students
    2. Calculate: `sections_needed = ceil(count / 40)`
    3. Generate names: `BSIS 1-1`, `BSIS 1-2`, etc. — **skip existing names** (handles collision with manually created sections)
    4. Create sections as `shift=FULL_DAY` (shift assigned later)
    5. **Curriculum selection**: use the program's active curriculum (`Curriculum.objects.filter(program=program, is_active=True).first()`). Each section's `curriculum` FK is set to this. Subjects are pulled from `CurriculumSubject` for the matching year/semester.
    6. Auto-link `CurriculumSubject` → `SectionSubject` records (subjects TBA)
    7. **Wrap entire operation in `@transaction.atomic`**

---

## Phase 2.5: Student Notification on Sectioning Open

> **Trigger**: Semester transitions to `SECTIONING_OPEN`.

- [ ] Send in-app notification to all enrolled students: "Pick your AM/PM session before [sectioning_end_date]"
- [ ] Show a banner/countdown on the student dashboard with days remaining
- [ ] (Future) Optional email notification via Django `send_mail`

---

## Phase 3: Student AM/PM Selection + Even Distribution

> **Trigger**: Semester is in `SECTIONING_OPEN` status.

### 3A — Student Self-Selection

- [ ] **[MODIFY]** `backend/apps/enrollment/views_enrollment.py`
  - Repurpose `AutoAssignEnrollmentView`: save `preferred_shift` only, no immediate section assignment
  - Skip section capacity checks during `ENROLLMENT_OPEN` in `SubjectEnrollmentService`
  - **30-min grace period**: if enrollment closed within last 30 min, still allow submission
- [ ] **[MODIFY]** `frontend/src/pages/enrollment/SubjectEnrollment.jsx`
  - Show AM/PM picker when semester is `SECTIONING_OPEN` and student hasn't picked

### 3A.1 — Irregular Student AM/PM Selection

- [ ] Irregular students pick from 3 options: **AM**, **PM**, or **BOTH** (mixed schedule)
- [ ] They get placed in a section matching their `year_level` + chosen shift (for homeroom)
- [ ] **Validation (HARD BLOCK)**:
  - Check if ALL their enrolled subjects have offerings in sections matching their chosen shift
  - If they pick AM but a subject only exists in PM → **block**: "Cannot select AM only. Subject CS201 is only available in PM. Select PM or BOTH."
  - If they pick BOTH → allow (mixed AM/PM schedule), homeroom assigned to AM section by default
  - Must pass validation before preference is saved

### 3B — Finalize Distribution

- [ ] **[NEW]** `finalize_sectioning(semester)` in `services_section_generation.py`
  1. Group students by `program × year × preferred_shift`
  2. Count per shift → calculate sections needed per shift
  3. Assign shifts to generated sections (BSIS 1-1 → AM, BSIS 1-2 → PM, etc.)
  4. Spawn new sections if needed, dissolve excess empty sections
  5. Round-robin distribute students evenly, apply overflow tolerance
  6. Use `StudentProfile.home_section` count (not `SubjectEnrollment.section`) for capacity tracking during distribution
  7. Set `StudentProfile.home_section` for each student
  8. **Backfill** all `SubjectEnrollment` (section=NULL) → set section to match home_section
  9. Auto-transition semester to `CLASSES_ACTIVE`
  10. **Wrap entire operation in `@transaction.atomic`**
- [ ] **[MODIFY]** `backend/apps/academics/views_sections.py`
  - Add `@action finalize_sectioning` endpoint
- [ ] **[MODIFY]** `backend/apps/academics/urls.py`
  - Register `finalize_sectioning` action route

### 3C — Backfill SubjectEnrollments to Sections

- [ ] `_backfill_subject_sections(semester)` — last step inside `finalize_sectioning()`
  - For each student with a `home_section`:
    - Find their `SubjectEnrollment` records where `section=NULL`
    - Set `section = home_section` (only if matching `SectionSubject` exists)
  - This connects returning students' subject picks to their assigned section

### Edge Cases

| Scenario | Solution |
|---|---|
| Student doesn't pick AM/PM | Auto-assign to shift with more available slots after deadline |
| Late enrollee after finalization | Slot into section with most remaining capacity; new section only if 6+ overflow |
| Only 1 extra student | Squeeze into existing section (41/40), do NOT spawn new section |
| Irregular student | Excluded from auto-distribution; placed in any section with space |
| Excess empty sections | Dissolved during finalization |
| Returning students enroll without sections | `SubjectEnrollment.section=NULL` during enrollment, backfilled after finalization |
| Null dates in semester | Skip that status transition, stay in previous state |
| Multiple curricula per program | Use the active curriculum (`is_active=True`) for section generation |

---

## Phase 4: Head & Registrar Bulk Approval

> **Trigger**: After sectioning is finalized (semester = `CLASSES_ACTIVE`).

- [ ] **[NEW]** `backend/apps/enrollment/views_bulk_approval.py`
  - **Head bulk approval only**: `POST /api/v1/enrollment/bulk-approve/head/`
    - Sets `head_approved=True` for all regular students' `SubjectEnrollment` records
    - Auto-excludes `is_irregular=True` → flagged for manual review
  - **Payment is ALWAYS manual, per-student** (cashier verifies one by one, both regular and irregular)
  - Accepts: `{ semester_id, program_id?, year_level? }`
  - Returns: approved count + skipped irregulars list
- [ ] **[MODIFY]** `backend/apps/enrollment/urls.py`
  - Register `bulk-approve/` endpoint

---

## Phase 4.5: Year Level Auto-Advancement

> **Trigger**: New academic year starts (new "1st Semester" with different `academic_year`).

- [ ] Detect academic year change during `sync_status()` or semester creation
- [ ] Auto-increment `StudentProfile.year_level` for all active students (cap at program's `duration_years`)
- [ ] Students who should graduate (year_level exceeds program duration) get flagged, NOT auto-incremented
- [ ] Skip students on LOA or WITHDRAWN status

---

## Phase 5: Professor Scheduling Guard

> **Trigger**: From `ENROLLMENT_CLOSED` onward (sections + subjects exist).

- [ ] **[MODIFY]** `backend/apps/academics/views_scheduling.py`
  - Guard: block `ScheduleSlot` creation if semester is `SETUP` or `ENROLLMENT_OPEN`
  - Existing conflict detection (professor, room, section) unchanged

---

## Phase 6: Frontend Semester-Status Routing

> **What**: Student dashboard shows different UI based on semester status.

- [ ] **[MODIFY]** Student dashboard API to include `semester.status` in response
- [ ] **[MODIFY]** Frontend student pages:
  - `ENROLLMENT_OPEN` → show subject enrollment page
  - `SECTIONING_OPEN` → show AM/PM picker
  - `CLASSES_ACTIVE` → show schedule and section info

---

## Phase 7: Admin Safety Nets

> **What**: Registrar tools for fixing mistakes and handling post-finalization edge cases.

### 7A — Post-Finalization Late Admits
- [ ] When a student is admitted after `CLASSES_ACTIVE`, immediately:
  - Find the section with most remaining capacity for their program/year/shift
  - Set `StudentProfile.home_section`
  - Backfill their `SubjectEnrollment.section` records right away
  - No need to wait for finalization (it already ran)

### 7B — Rollback / Reset Sections
- [ ] Add "Reset & Re-generate" button for Registrar:
  - Sets `sections_generated = False` and `sectioning_finalized = False`
  - Deletes all auto-generated sections for the semester
  - Clears `StudentProfile.home_section` for affected students
  - Resets `SubjectEnrollment.section = NULL` for affected records
  - Allows re-running the entire Phase 2 → Phase 3 pipeline

### 7C — Manual Section Transfer
- [ ] Registrar can move a student from one section to another post-finalization:
  - Update `StudentProfile.home_section`
  - Re-backfill their `SubjectEnrollment.section` records
  - Validate capacity of target section before transfer

---

## Files Summary

### New Files (4)

| File | Purpose |
|---|---|
| `backend/.../enrollment/services/auto_enrollment_service.py` | Auto-enroll Y1S1 subjects for freshmen |
| `backend/.../academics/services_section_generation.py` | Generate + finalize sections + backfill |
| `backend/.../enrollment/views_bulk_approval.py` | Bulk head/payment approval endpoint |
| `backend/.../enrollment/management/commands/sync_semester_status.py` | Cron job for date-driven status transitions |

### Modified Files (9)

| File | Change |
|---|---|
| `backend/.../enrollment/models.py` | Add sectioning dates, prevention flags, new statuses, `sync_status()`, remove old auto-assign |
| `backend/.../enrollment/serializers.py` | Add sectioning date fields to `SemesterSerializer` |
| `backend/.../enrollment/views_applicants.py` | Freshman auto-enroll on admission |
| `backend/.../enrollment/views_enrollment.py` | AM/PM saves preference only, skip section checks |
| `backend/.../enrollment/urls.py` | Register `bulk-approve/` endpoint |
| `backend/.../academics/views_sections.py` | Add `finalize_sectioning` action |
| `backend/.../academics/urls.py` | Register `finalize_sectioning` route |
| `backend/.../academics/views_scheduling.py` | Semester status guard |
| `frontend/.../SubjectEnrollment.jsx` | AM/PM picker + semester-status routing |
| `frontend/.../admin/modals/TermModal.jsx` | Add sectioning date fields + manual override buttons |

---

## Verification Checklist

1. [ ] Approve freshman → verify Y1S1 subjects auto-enrolled with `section=NULL`
2. [ ] Close enrollment → verify sections generated (`BSIS 1-1`, `BSIS 1-2`, etc.)
3. [ ] Verify sections use correct active curriculum
4. [ ] Verify section names skip existing manually-created sections
5. [ ] Student picks AM → verify preference saved (no section yet)
6. [ ] Irregular student picks AM but has PM-only subject → verify **hard block**
7. [ ] Irregular student picks BOTH → verify allowed, homeroom = AM section
7. [ ] Finalize → verify even distribution + shift assignment + section backfill
8. [ ] Verify finalization uses `StudentProfile.home_section` count, not `SubjectEnrollment.section`
9. [ ] Test 41 students / 40 cap → verify squeeze, no new section
10. [ ] Test 46 students / 40 cap → verify new section spawned
11. [ ] Verify `SubjectEnrollment.section` backfilled for all students
12. [ ] Head bulk approve → regulars approved, irregulars skipped
13. [ ] Verify payment_approved stays separate (cashier only)
14. [ ] Professor scheduling → conflict checks work
15. [ ] Frontend routes correctly per semester status
16. [ ] Late admit after CLASSES_ACTIVE → verify immediate section + backfill
17. [ ] Reset & Re-generate → verify clean slate
18. [ ] Manual section transfer → verify capacity check + re-backfill
19. [ ] Test with null sectioning dates → verify system stays in previous status
20. [ ] Test 30-min grace period after enrollment close
21. [ ] Year level auto-advancement on new academic year
22. [ ] Verify `sync_status()` works via daily cron + on key API endpoints
