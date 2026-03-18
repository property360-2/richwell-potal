# Grade Finalization & Global Lock Flow

## Summary
Term deadline reaches -> Global lock enabled -> All grades must be final -> Locked by Registrar.

## Step-by-step

### 1. Grading Window (Active Term)
- Professors input grades during the defined term period.
- Grades can be updated freely while in `SUBMITTED` status.

### 2. Finalization (Section-by-Section)
- Once a professor is done, they submit the grades.
- Registrar triggers `POST /api/grades/grading/finalize-section/`.
- **Effect**: `finalized_at` is set, and the `grade_status` is locked.
- **Lock**: Once finalized, professors can no longer edit the grade.

### 3. Global Lock (Term End)
- At the end of the term, the Registrar can "Lock the Term".
- This prevents ANY further edits across ALL sections for that term.
- All student results are then considered permanent and can be exported for reports.

## Files involved
| File | Role |
|------|------|
| `test_bugs.py` | Contains reproduction for section-level locking |
| `GradingService` | Logic for verifying lock status before any edit |
| `Grade` | `finalized_at` field used for per-record locking |
