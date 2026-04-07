# Grades and Advising API

## Advising Records

Base path: `/api/grades/advising/`

Read scope:
- `STUDENT`: own grades only
- `PROGRAM_HEAD`: grades for owned programs only
- `PROFESSOR`: grades for assigned schedules only
- `REGISTRAR`, `HEAD_REGISTRAR`, `ADMIN`: full read access

### `GET /api/grades/advising/`
Lists advising and grade records in scope for the caller.

### `POST /api/grades/advising/auto-advise/`
Creates the approved subject set for a regular student in the active term.

Auth required: `STUDENT`

### `POST /api/grades/advising/manual-advise/`
Creates the selected subject set for an irregular student in the active term.

Auth required: `STUDENT`

## Advising Approval

Base path: `/api/grades/approvals/`

Allowed roles:
- `PROGRAM_HEAD`
- `REGISTRAR`
- `ADMIN`

Rules:
- Program Heads are restricted to students in their own programs.
- Registrar and Admin retain institution-wide scope.

### `POST /api/grades/approvals/batch-approve-regular/`
Bulk-approves pending regular enrollments within the caller's scope.

### `POST /api/grades/approvals/{id}/approve/`
Approves one enrollment.

### `POST /api/grades/approvals/{id}/reject/`
Rejects one enrollment.

## Subject Crediting (Transferees)

Base path: `/api/grades/crediting/`
Manual historical encoding for single subjects.

### `POST /api/grades/crediting/bulk_historical_encoding/`
Encodes multiple subjects as PASSED for a student based on their TOR.
- **Auth required**: `REGISTRAR` or `ADMIN`

Base path: `/api/grades/crediting-requests/`
Bulk crediting workflow requiring Program Head approval.

### `POST /api/grades/crediting-requests/`
Submits a new `CreditingRequest` with multiple subjects.
- **Auth required**: `REGISTRAR`

### `POST /api/grades/crediting-requests/{id}/approve/`
Approves the request and marks subjects as `PASSED`.
- **Auth required**: `PROGRAM_HEAD` (of the student's program) or `ADMIN`

### `POST /api/grades/crediting-requests/{id}/reject/`
Rejects the request with a reason.

## Grade Submission

Base path: `/api/grades/submission/`

Allowed roles:
- `PROFESSOR`
- `REGISTRAR`
- `ADMIN`

Mutation boundary rule:
- Professors may submit grades only for section-subject-term loads actually assigned to them.
- Supplying a valid `grade_id` alone is not enough.

### `POST /api/grades/submission/{id}/submit-midterm/`
Submits or updates a midterm grade.

### `POST /api/grades/submission/{id}/submit-final/`
Submits or updates a final grade.

### `GET /api/grades/submission/roster/?section_id={id}&subject_id={id}`
Returns the roster for an assigned professor load.

### `POST /api/grades/submission/finalize-section/`
Finalizes all grades for one section-subject-term combination.

Auth required: `REGISTRAR` or `ADMIN`

### `POST /api/grades/submission/finalize-term/`
Applies the registrar-level term lock.

### `POST /api/grades/submission/close-grading-period/`
Marks unsubmitted grades as `INC` for the selected grading period.

## INC Resolution

Base path: `/api/grades/resolution/`

Workflow roles:
- `PROFESSOR`: request resolution and submit resolved grade for owned loads only
- `PROGRAM_HEAD`: approve or reject only within owned programs
- `REGISTRAR`: approve or reject the request, then finalize
- `ADMIN`: can perform all stages

Common failure cases:
- `403` when the caller is outside the object's ownership scope
- `409` when the requested transition conflicts with the current workflow state
