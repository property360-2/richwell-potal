# Richwell Portal — QA Report
## Phase 9 Deep Review: Critical Issues, Gaps & Scheduling UI Guide

---

## 🔴 CRITICAL BUGS (Will Break in Production)

### 1. `PickingService.pick_schedule_regular` — Broken `update_or_create`

**File:** `apps/scheduling/services/picking_service.py` — lines ~55–60

```python
# BROKEN: You cannot filter with a related field lookup in update_or_create's
# "lookup" kwargs like this. Django will raise a FieldError.
SectionStudent.objects.update_or_create(
    student=student,
    section__term=term,       # ← INVALID LOOKUP in update_or_create
    defaults={'section': target_section, 'is_home_section': True}
)
```

**Fix:**
```python
existing = SectionStudent.objects.filter(
    student=student,
    section__term=term
).first()
if existing:
    existing.section = target_section
    existing.save()
else:
    SectionStudent.objects.create(
        student=student,
        section=target_section,
        is_home_section=True
    )
```

Same bug exists in `pick_schedule_irregular` (line ~90). Fix the same way.

---

### 2. `PickingService.pick_schedule_regular` — Passes `term_id` (int) to service, but service expects `Term` object

**File:** `apps/scheduling/views.py` — line ~80

```python
# views.py calls:
section, redirected = self.picking_service.pick_schedule_regular(student, term_id, session)
# But service does:
enrollment = StudentEnrollment.objects.filter(student=student, term=term)
# term here is an int ID, not a Term instance — this query returns nothing, raises ValueError
```

**Fix in views.py:**
```python
term = Term.objects.get(id=term_id)
section, redirected = self.picking_service.pick_schedule_regular(student, term, session)
```

Same issue in `pick_irregular` — `term_id` is passed raw, never fetched.

---

### 3. `SectioningService.generate_sections` — Section name uniqueness conflict

**File:** `apps/sections/models.py` — `Section.name` has no `unique=True` now (fixed in migration 0002), but `unique_together` is `(term, program, year_level, section_number)`. However the `get_or_create` uses `section_number=i` but the name `{program.code} {year_level}-{i}` can collide if you regenerate sections after partial deletion.

**Bigger issue:** If you call `generate_sections` twice (e.g. Registrar clicks button again), it will silently return existing sections via `get_or_create` but WON'T update `session` if it changed. The `session` is only in `defaults={}` so it won't update existing ones.

**Fix:** Add a guard or use `update_or_create`:
```python
section, created = Section.objects.update_or_create(
    term=term,
    program=program,
    year_level=year_level,
    section_number=i,
    defaults={
        'name': section_name,
        'session': session,
        'target_students': 35,
        'max_students': 40
    }
)
```

---

### 4. `Grade.STATUS_NO_GRADE` — Missing status in model

**File:** `apps/grades/models.py`

The implementation plan references `NO_GRADE` status (professors who don't submit get NO_GRADE), but it is **missing from `GRADE_STATUS_CHOICES`**. The `GradingService` also references it in comments but it's never defined.

**Fix — add to `Grade` model:**
```python
STATUS_NO_GRADE = 'NO_GRADE'

GRADE_STATUS_CHOICES = [
    ...
    (STATUS_NO_GRADE, 'No Grade'),   # ← ADD THIS
    ...
]
```

---

### 5. `StudentEnrollment.get_queryset` in views — Broken annotation

**File:** `apps/students/views.py` — `StudentEnrollmentViewSet.get_queryset`

```python
# This annotation references 'IS213-DM' style field names but the real bug is:
.annotate(
    subject_count=Count('student__grades', filter=Q(student__grades__term=F('term')))
)
# F('term') here refers to StudentEnrollment.term — this works BUT
# Count('student__grades') traverses Student → Grade, not StudentEnrollment → Grade
# It counts ALL grades for the student, not just this enrollment's term grades
```

**Fix:**
```python
.annotate(
    subject_count=Count(
        'student__grades',
        filter=Q(student__grades__term=F('term')),
        distinct=True
    )
)
```

---

### 6. `AdvisingService.auto_advise_regular` — Year level logic is wrong for new freshmen

**File:** `apps/grades/services/advising_service.py`

```python
year_level = AdvisingService.get_year_level(student)
# get_year_level returns 1 if no passed subjects
# Then semester = term.semester_type (e.g. '1')
# This is CORRECT for freshmen

# BUT: The method excludes semester='S' subjects correctly.
# HOWEVER it does NOT exclude already-ADVISING subjects from this term.
# If student calls auto_advise twice, it will try to Grade.objects.get_or_create
# again — this is handled by get_or_create, so no duplicate, but the
# enrollment advising_status gets reset to 'PENDING' every call.
```

No hard crash, but idempotency issue. Consider adding a guard:
```python
if StudentEnrollment.objects.filter(
    student=student, term=term, advising_status='PENDING'
).exists():
    raise ValidationError("Advising already submitted. Awaiting approval.")
```

---

### 7. `Section.name` uniqueness removed but no replacement guard

**Migration 0002** removed the `unique=True` from `Section.name` and replaced with `unique_together = ('term', 'program', 'year_level', 'section_number')`. This is correct. BUT `SectioningService` still builds the name as `{program.code} {year_level}-{i}` which means across different terms, two sections can have the same name string. This is fine for DB but confusing in the UI — consider including term info in the name or just showing it as a label.

---

### 8. `SchedulingService.check_professor_conflict` — Time overlap logic is correct BUT `days` check is wrong

**File:** `apps/scheduling/services/scheduling_service.py`

```python
for conflict in conflicts:
    if any(day in conflict.days for day in days):
        raise ValueError(...)
```

`conflict.days` is a JSONField storing a list like `["M", "W"]`. The check `day in conflict.days` works correctly for lists in Python. **This is actually fine.** ✅

---

### 9. `Term.schedule_published` not passed to `pick_schedule_regular`

**File:** `apps/scheduling/services/picking_service.py`

`validate_picking_period` checks `term.schedule_published` — but the `term` object passed from the view is only fetched in `pick_regular` view (after the fix in #2 above). This dependency chain works once #2 is fixed.

---

## 🟡 MEDIUM ISSUES (Gaps / Missing Logic)

### 10. No `GradingService` endpoints/views/URLs

`apps/grades/services/grading_service.py` exists with `drop_subject()` but there are **no views, serializers, or URLs** for:
- Professor grade submission (midterm/final)
- Registrar grade finalization
- Subject drop endpoint

**Missing entirely** — Phase 10 backend is not started.

---

### 11. No `Payment` views/serializers/URLs

`apps/finance/urls.py` is empty:
```python
urlpatterns = []  # Placeholder
```
Phase 11 has zero backend implementation.

---

### 12. `Notification` has no views/URLs

`apps/notifications/models.py` exists, admin is registered, but there are **no views, serializers, or URLs**. The bell UI in Phase 12 has nothing to call.

---

### 13. `AuditLog` model doesn't exist

`apps/auditing/models.py` is literally:
```python
from django.db import models
# Create your models here.
```
No `AuditLog` model, no `AuditMixin`, no migrations. Phase 13 not started.

---

### 14. `StudentEnrollment` missing `advising_approved_at` in `approve_advising`

**File:** `apps/grades/services/advising_service.py`

```python
student_enrollment.advising_approved_at = timezone.now()
```

This sets `advising_approved_at` correctly. ✅ But `must_change_password` logic for the student user is never set to `True` on approval — it's set in `approve()` in students/views.py. Just make sure that path is always hit.

---

### 15. `conftest.py` fixtures missing for scheduling/sections tests

`conftest.py` only has `api_client`, `active_term`, `bscs_program`, `bscs_curriculum`. The sectioning and scheduling tests define their own `setup_data` fixtures inline — this works but creates duplication. Not a bug, but a maintainability gap.

---

### 16. `seed_test_sectioning.py` — Password format inconsistency

```python
pw = f'{emp_id}{dob.strftime("%m%d")}'
```
Uses `EMP001` format but `ProfessorViewSet.perform_create` generates `EMP-2600001` format. The seed will break if you rely on it for login tests — passwords won't match the documented format.

---

### 17. `Subject.is_major` is never set from CSV upload

In `SubjectViewSet.bulk_upload` and `SectioningService._load_bsis_curriculum`, the `is_major` field is never set (always defaults to `False`). The system uses `is_major` in advising badge display. You need to add a `Is_Major` column to the CSV or derive it from the subject code.

---

## 🟡 LOGIC GAPS: SECTIONING vs SCHEDULING Confusion

Here's a clear breakdown of what you're probably confused about:

```
SECTIONING (Phase 8 — Registrar)
    → Creates Section records (BSIS 1-1 AM, BSIS 1-2 PM, etc.)
    → Creates empty Schedule SLOTS (section + subject, no professor/room/time yet)
    → Does NOT assign students yet

SCHEDULING (Phase 9 — Dean)
    → Dean fills in Schedule slots: adds professor, room, days, start/end time
    → Dean publishes schedule (term.schedule_published = True)

SCHEDULE PICKING (Phase 9 — Student)
    → Regular student picks AM or PM → system assigns them to that session's Section
    → SectionStudent record created (their "home section")
    → All their Grade records get section = that Section
```

**The confusion points:**
1. `SectioningService.generate_sections` already creates Schedule slots (empty ones) — this is intentional so Dean can see them
2. Students are NOT assigned to sections during sectioning — only during PICKING
3. The Dean assigns schedules to sections, not to students
4. Irregular students pick per-subject, so they may end up in multiple sections

---

## 📋 DEAN SCHEDULING UI — Recommended Structure

### Core Concept
The Dean needs to answer: **"For each section + subject combination, who teaches it, in what room, on what days/time?"**

---

### Recommended UI Flow (3-Panel Layout)

```
┌─────────────────────────────────────────────────────────────────────┐
│  TERM: 2026-1  [Publish Schedule ✓]        Unassigned Slots: 24    │
├──────────────┬──────────────────────────────┬───────────────────────┤
│  PROFESSORS  │     SECTION MATRIX           │   SLOT DETAIL EDITOR  │
│  (Left Panel)│     (Center Panel)           │   (Right Panel)       │
│              │                              │                       │
│  Prof. One   │  BSIS 1-1 (AM)               │  [When slot selected] │
│  ● 3/9 units │  ┌─────────┬──────────────┐ │                       │
│              │  │ CC113A  │ ✓ Smith/101  │ │  Subject: CC113A      │
│  Prof. Two   │  │ CC113B  │ ✓ Jones/Lab1 │ │  Section: BSIS 1-1   │
│  ● 0/9 units │  │ Math113 │ ⚠ Unassigned │ │  Component: LEC      │
│              │  └─────────┴──────────────┘ │                       │
│  Prof. Three │                              │  Professor: [▼ Smith] │
│  ● 6/9 units │  BSIS 1-2 (PM)              │                       │
│              │  ┌─────────┬──────────────┐ │  Room:   [▼ Room 101] │
│  [+ Add Prof]│  │ CC113A  │ ⚠ Unassigned │ │                       │
│              │  │ CC113B  │ ✓ Smith/Lab1 │ │  Days: [M][T][W][TH]  │
│              │  │ Math113 │ ✓ Cruz/102  │ │        [F][S]         │
│              │  └─────────┴──────────────┘ │                       │
│              │                              │  Time: 08:00 → 10:30 │
│              │                              │                       │
│              │                              │  ⚠ Conflict Check    │
│              │                              │  [Save Slot]          │
└──────────────┴──────────────────────────────┴───────────────────────┘
```

### Panel Details

**Left: Professor List**
- Shows each professor's name + load bar (current assigned units / recommended max)
- Click a professor → highlights all slots assigned to them in the center
- Status dot: 🟢 loaded, 🟡 partially loaded, ⚪ unassigned
- Shows their availability days inline (M W F or T TH S)

**Center: Section Matrix (main work area)**
- Groups by year level (Year 1, Year 2, etc.)
- Each section is a card showing its subjects as rows
- Each row = one Schedule slot (LEC or LAB)
- Status per slot:
  - ✅ Green = professor + room + days assigned
  - ⚠️ Yellow = partially assigned (missing room or days)
  - ❌ Red = conflict detected
  - ○ Gray = completely unassigned
- Clicking a slot opens the Right Panel editor
- "Copy to parallel section" button: if BSIS 1-1 and 1-2 have same subject, copy schedule from 1-1 to 1-2 with different professor (saves huge time)

**Right: Slot Editor**
- Shows only relevant fields for the selected slot
- Professor dropdown filtered to professors assigned to this subject
- Room dropdown filtered by component type (LEC = Lecture Room, LAB = Computer Lab)
- Day checkboxes (Mon–Sat)
- Time picker — preset time blocks (7:00–8:30, 8:30–10:00, etc.) for convenience
- Real-time conflict display below: "⚠ Prof. Smith has Math113 in BSIS 1-2 on Monday 8:00"
- [Save] button

---

### Quick Wins for Usability

1. **"Auto-fill Professor"** button — if a professor is assigned to a subject (ProfessorSubject), and only ONE professor teaches that subject, auto-assign them to the slot
2. **"Copy Schedule to Parallel Section"** — BSIS 1-1 and 1-2 have same subjects. Clone assignments, let Dean just change professor
3. **Publish Guard** — Before publish, show a summary: "24/36 slots assigned. 12 unassigned. Continue?" with a list of unassigned ones
4. **Professor Load Summary** bar per professor — prevents overloading
5. **AM/PM color coding** — AM sections = blue tint, PM sections = orange tint throughout the matrix
6. **Filter by Year Level** — tabs: Year 1 | Year 2 | Year 3 | Year 4

---

### Key API Calls the UI Needs

```
GET  /api/scheduling/?term_id=1                  → all schedule slots for term
GET  /api/scheduling/available_slots/?term_id=1&professor_id=1  → slots for professor
GET  /api/sections/?term_id=1                    → all sections with student counts
GET  /api/faculty/professors/?is_active=true     → professor list with subjects
GET  /api/facilities/?is_active=true             → room list

POST /api/scheduling/assign/  {id, professor_id, room_id, days, start_time, end_time}
POST /api/scheduling/publish/ {term_id}
```

All these endpoints already exist in your backend. The Dean UI only needs to wire them up.

---

## 📋 SECTIONING UI — What the Registrar Sees

```
Sectioning Dashboard
====================

[Term: 2026-1]  [Generate All Sections]

ENROLLMENT MATRIX
┌──────────────┬──────────┬──────────┬──────────┬──────────┐
│ Program      │ Year 1   │ Year 2   │ Year 3   │ Year 4   │
├──────────────┼──────────┼──────────┼──────────┼──────────┤
│ BS Info Sys  │ 150 👥   │ 80 👥    │ 45 👥    │ 20 👥    │
│              │ 0 sections│ 0 sections│ 0 sections│ 0 sections│
│              │ [Generate]│ [Generate]│ [Generate]│ [Generate]│
└──────────────┴──────────┴──────────┴──────────┴──────────┘

After generating for BSIS Year 1 (150 students → ceil(150/35) = 5 sections):

GENERATED SECTIONS — BSIS Year 1
┌───────────────┬──────────┬──────────────┬───────────┐
│ Section       │ Session  │ Students     │ Actions   │
├───────────────┼──────────┼──────────────┼───────────┤
│ BSIS 1-1      │ 🌅 AM    │ 0 / 35 (max 40)│ [Roster] │
│ BSIS 1-2      │ 🌅 AM    │ 0 / 35       │ [Roster]  │
│ BSIS 1-3      │ 🌅 AM    │ 0 / 35       │ [Roster]  │
│ BSIS 1-4      │ 🌇 PM    │ 0 / 35       │ [Roster]  │
│ BSIS 1-5      │ 🌇 PM    │ 0 / 35       │ [Roster]  │
└───────────────┴──────────┴──────────────┴───────────┘
NOTE: Students will fill these sections when they pick AM/PM in Phase 9.
```

**Important:** The Registrar generates sections. The Dean then schedules them. Students then pick.

---

## 📋 STUDENT SCHEDULE PICKING UI

```
Pick Your Class Schedule
========================
Regular Students see this:

┌─────────────────────────┐  ┌─────────────────────────┐
│  🌅 MORNING SESSION (AM)│  │  🌇 AFTERNOON SESSION (PM)│
│  Section: BSIS 1-1      │  │  Section: BSIS 1-4       │
│  Slots: 12/35 available │  │  Slots: 28/35 available  │
│                         │  │                          │
│  Schedule Preview:      │  │  Schedule Preview:        │
│  CC113A - MWF 7-8:30    │  │  CC113A - MWF 1-2:30     │
│  Prof. Smith / Rm 101   │  │  Prof. Cruz / Rm 102     │
│  CC113B - TTH 7-8:30    │  │  CC113B - TTH 1-2:30     │
│  Prof. Jones / Lab 201  │  │  Prof. Rivera / Lab 202  │
│                         │  │                          │
│  [Select AM ▶]          │  │  [Select PM ▶]            │
└─────────────────────────┘  └─────────────────────────┘

Confirmation → Show full weekly timetable
```

---

## 📋 SUMMARY: What to Fix Before Moving to Phase 10

### Must Fix Now (Blockers):
1. `PickingService.update_or_create` bug (critical crash)
2. `term_id` vs `Term` object in picking views
3. Add `NO_GRADE` to `Grade.GRADE_STATUS_CHOICES`
4. Wire up `Grade.objects.update` section assignment in `pick_schedule_regular`

### Should Fix Soon (Gaps):
5. `is_major` flag never set from CSV
6. No guard against double-advising submission
7. `Section.get_or_create` → use `update_or_create` for session updates
8. Add Finance/Payment views & URLs
9. Add Notification views & URLs
10. Implement AuditLog model and AuditMixin

### Won't Break Now But Address Later:
11. Seed password format inconsistency
12. Duplicate fixture definitions across test files
13. `StudentEnrollment` annotation filter correctness

---

*Generated for Richwell Portal Phase 9 QA Review*