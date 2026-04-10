# Flow: Section Picking & Schedule Assignment

## Overview

After advising is approved, students must **pick their section** during the published
schedule picking window. The process differs for Regular and Irregular students.

The Dean publishes the schedule, opening the picking window. Students can then select
their preferred session or subject-specific section. After the deadline, unpicked students
are auto-assigned by an admin-triggered command.

---

## Prerequisites for a Student to Pick

All of the following must be true before a student can pick a section:

1. Sections **have been generated** for the active term (Dean has run section generation).
2. The term's `schedule_published` flag is `True` (Dean has published the schedule).
3. The publication time (`picking_published_at`) is within the last 72 hours.
4. The student's `StudentEnrollment.advising_status` is `APPROVED`.
5. The student has **not yet been assigned** to a section for this term.

If any condition fails, the API returns a `403 Forbidden` or `400 Bad Request` with a
descriptive `detail` message.

---

## Flow 1: Regular Student — Block Section Picking

Regular students pick a **session preference** (AM or PM). The system assigns them to
the best-fitting block section automatically.

```
Student                   Frontend                  Backend (PickingService)
  |                          |                              |
  |--[Prefers AM session]--> |                              |
  |                          |--POST /schedule/pick-regular |
  |                          |   body: {preferred: "AM"}   |
  |                          |                              |
  |                          |                   [validate picking period]
  |                          |                   [confirm advising = APPROVED]
  |                          |                   [find AM section with open slots]
  |                          |                        |
  |                          |               [if AM is full → try PM]
  |                          |               redirected = True
  |                          |                        |
  |                          |              [assign all APPROVED Grade records
  |                          |               for this term to target section]
  |                          |              [create SectionStudent (home section)]
  |                          |                        |
  |                          |<-- {section, redirected} --|
  |<-- "You are in Section A (AM)" --|
```

> ⚠️ **TODO**: If `redirected = True`, the system should notify the student via
> `NotificationService.notify()` that they were placed in the alternate session.
> This is not yet implemented (`picking_service.py` line 125).

**Endpoint:** `POST /api/schedule/pick-regular/`

**Payload:**
```json
{ "preferred_session": "AM" }
```

**Success Response `200 OK`:**
```json
{
  "section": { "id": 12, "name": "BSIT-1A", "session": "AM" },
  "redirected": false
}
```

---

## Flow 2: Irregular Student — Per-Subject Section Picking

Irregular students pick a specific section **for each of their approved subjects**
from their advising list. The system validates for time conflicts before saving.

```
Student                   Frontend                  Backend (PickingService)
  |                          |                              |
  |--[Select Section per]--> |                              |
  |   [Subject]              |                              |
  |                          |--POST /schedule/pick-irregular
  |                          |   body: [{subject_id, section_id}, ...]
  |                          |                              |
  |                          |                   [validate picking period]
  |                          |                   [confirm advising = APPROVED]
  |                          |                   [confirm each section offers subject]
  |                          |                   [check time conflicts between selections]
  |                          |                   [check section capacity]
  |                          |                              |
  |                          |              [update Grade.section for each subject]
  |                          |              [create SectionStudent using first selection
  |                          |               as "home section" for grouping]
  |                          |                              |
  |                          |<------ 200 OK {success} ----|
  |<--- "Schedule submitted" ----|
```

**Endpoint:** `POST /api/schedule/pick-irregular/`

**Payload:**
```json
{
  "selections": [
    { "subject_id": 5, "section_id": 12 },
    { "subject_id": 6, "section_id": 14 }
  ]
}
```

**Conflict Response `409 Conflict`:**
```json
{ "detail": "Section BSIT-1B conflicts with another selected subject." }
```

---

## Flow 3: Auto-Assignment (After Deadline)

Once the 72-hour window expires, the system handles the remaining students via a management command.

**Command:** `python manage.py auto_assign_schedules --term_id <ID>`

**Logic:**
- Finds all `APPROVED` enrollments without a `SectionStudent` record for the term.
- For each student, it attempts to find and assign sections based on their advising list.
- Regular students are assigned to their previous session (AM/PM) if possible, otherwise fallback.
- Irregular students are assigned to available sections with the fewest conflicts.
- Skips students where all sections are full (logs the failure for manual admin intervention).

---

## Section Capacity & Conflict Rules

| Rule | Detail |
|---|---|
| **Section Full** | `SectionStudent.count >= Section.max_students` — raises `409 Conflict` |
| **Already Picked** | If `SectionStudent` exists for the term, raises `409 Conflict` |
| **Time Conflict** | Computed per-day in minute ranges. Overlapping `start_time`/`end_time` on the same day blocks selection |
| **Invalid Subject** | If a section does not offer the requested subject in the active term, raises `400` |
| **Not APPROVED** | Students without `APPROVED` advising status get `403 Forbidden` |

---

## Term Fields That Control This Flow

All fields live on the `Term` model (`apps/terms/models.py`):

| Field | Type | Purpose |
|---|---|---|
| `schedule_published` | boolean | Dean flips this to `True` to open picking |
| `picking_published_at` | datetime | Timestamp when the schedule was published. Sets the T-0 for the 3-day window. |

Picking is allowed only when `schedule_published` is true and `now < picking_published_at + 3 days`.
