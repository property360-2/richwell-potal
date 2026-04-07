# INC Resolution Flow

## Overview

The INC (Incomplete) Resolution workflow is a **five-step approval chain** that allows
a student's unresolved INC grade to be officially corrected. It starts with the Professor
requesting the resolution and ends with the Registrar finalizing the new grade to the
official academic record.

---

## State Machine

```
grade_status = INC
resolution_status = null
      │
      ▼ [Professor: request-resolution]
resolution_status = REQUESTED
      │
      ├─► [Registrar: registrar-reject] → resolution_status = null (INC stays)
      │
      ▼ [Registrar: registrar-approve]
resolution_status = APPROVED
      │
      ▼ [Professor: submit-grade]
resolution_status = SUBMITTED
      │
      ├─► [Program Head: head-reject] → resolution_status = APPROVED (back for re-entry)
      │
      ▼ [Program Head: head-approve]
resolution_status = HEAD_APPROVED
      │
      ▼ [Registrar: finalize]
resolution_status = COMPLETED
grade_status = PASSED or FAILED  ← committed to record
```

---

## Status Transition Table

| From `resolution_status` | Action | To `resolution_status` | Role | Notifications Sent |
|---|---|---|---|---|
| `null` (INC) | `request-resolution` | `REQUESTED` | Professor | All Registrars → "Resolution Requested" |
| `REQUESTED` | `registrar-approve` | `APPROVED` | Registrar | Professor → "Request Approved" |
| `REQUESTED` | `registrar-reject` | `null` (INC reverted) | Registrar | Professor → "Request Rejected" |
| `APPROVED` | `submit-grade` | `SUBMITTED` | Professor | *(no notification)* |
| `SUBMITTED` | `head-approve` | `HEAD_APPROVED` | Program Head | All Registrars → "Approved by Head" |
| `SUBMITTED` | `head-reject` | `APPROVED` (back to entry) | Program Head | *(no notification)* |
| `HEAD_APPROVED` | `finalize` | `COMPLETED` | Registrar | Professor → "Finalized"; Student → "Grade Resolved" |

---

## API Endpoints

All endpoints are under `/api/grades/resolution/{grade_id}/`:

| Method | URL Path | Role | Description |
|---|---|---|---|
| `POST` | `request-resolution/` | Professor | Request to resolve INC. Body: `{ "reason": "..." }` |
| `POST` | `registrar-approve/` | Registrar | Approve the resolution request |
| `POST` | `registrar-reject/` | Registrar | Reject with `{ "reason": "..." }` |
| `POST` | `submit-grade/` | Professor | Submit new numeric grade. Body: `{ "new_grade": 2.5 }` |
| `POST` | `head-approve/` | Program Head | Approve the submitted grade |
| `POST` | `head-reject/` | Program Head | Send back for re-entry. Body: `{ "reason": "..." }` |
| `POST` | `finalize/` | Registrar | Commit grade to official record |
| `GET` | `/api/grades/resolution/` | All staff | List resolution records (scope filtered by role) |

---

## Grade Commit Logic (Finalization)

When the Registrar runs `finalize`, the following happens atomically:

```python
grade.final_grade = grade.resolution_new_grade
grade.grade_status = PASSED if final_grade <= 3.0 else FAILED
grade.resolution_status = 'COMPLETED'
grade.finalized_by = registrar
grade.finalized_at = now()
grade.save()
```

The grading scale is:
- `<= 3.0` → `PASSED`
- `> 3.0` → `FAILED`

---

## Permission Scope

| Role | Scope |
|---|---|
| **Professor** | Can only manage grades for subjects they are currently assigned to (enforced via `Schedule` lookup) |
| **Program Head** | Can only approve grades for students whose program they manage |
| **Registrar** | No scope restriction — full access to all INC resolution records |

---

## Background Job: INC Expiry

If a student's INC deadline passes without resolution being initiated, the
`check_inc_expiry` management command will transition the grade status from `INC` to `RETAKE`.

- **When to run:** Daily. See [Background Jobs](../setup/background-jobs.md).
- **Effect:** `grade_status = RETAKE`. No resolution is possible after this — student must retake the subject.
- **⚠️ Missing:** Student and professor notifications are not yet sent on expiry. See background-jobs.md for the TODO.

---

## Files Involved

| File | Role |
|---|---|
| `apps/grades/services/resolution_service.py` | All business logic and state transitions |
| `apps/grades/views.py` → `ResolutionViewSet` | API routing and permission checks |
| `apps/grades/models.py` → `Grade` | Stores `resolution_status`, `resolution_new_grade`, `final_grade` |
| `apps/grades/management/commands/check_inc_expiry.py` | Background job for deadline enforcement |
