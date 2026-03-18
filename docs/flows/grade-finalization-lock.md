# Grade Finalization and Term Lock Flow

## Summary
Professor submits grades for assigned loads, Registrar finalizes them, and Admin controls term activation or closure.

## Workflow

### 1. Grade Entry
- Professors submit midterm and final grades during the configured grading windows.
- Ownership is checked against the actual section-subject-term schedule assignment before the grade is mutated.

### 2. Section Finalization
- Registrar or Admin calls `POST /api/grades/submission/finalize-section/`.
- Finalized grades are locked against further professor edits.

### 3. INC Resolution
- Professor requests resolution for the owned load.
- Registrar approves or rejects the request.
- Program Head approves or rejects only for grades within owned programs.
- Registrar finalizes the completed resolution.

### 4. Term Lock
- Registrar can finalize grades and close grading periods.
- Term activation and closure are Admin-only actions at the term API boundary.

## Failure Rules
- `403` if the caller is outside the assignment or program boundary
- `409` if the transition conflicts with the grade's current workflow state
