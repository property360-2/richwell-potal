# INC Resolution Flow

## Summary
Professor requests resolution for an INC grade → Registrar approves request → Professor submits new grade → Program Head approves/finalizes (transitions to COMPLETED).

## Step-by-step

### 1. Request (Professor)
- Professor clicks "Resolve INC" on a student's grade.
- Calls `POST /api/grades/resolution/{id}/request-resolution/`.
- Status: `INC` → `RESOLUTION_STATUS: REQUESTED`.

### 2. Validation (Registrar)
- Registrar reviews request in Resolution Dashboard.
- Calls `POST /api/grades/resolution/{id}/registrar-approve/`.
- Status: `REQUESTED` → `APPROVED`.

### 3. Submission (Professor)
- Professor submits the actual numeric grade.
- Calls `POST /api/grades/resolution/{id}/submit-grade/`.
- Status: `APPROVED` → `SUBMITTED`.

### 4. Finalization (Program Head)
- Program Head gives final approval.
- Calls `POST /api/grades/resolution/{id}/head-approve/`.
- Status: `SUBMITTED` → `COMPLETED`.
- Final grade is committed; `grade_status` updated to `PASSED` or `FAILED`.

## Files involved
| File | Role |
|------|------|
| `ResolutionViewSet` | API View handling all resolution steps |
| `ResolutionService` | Business logic for state transitions |
| `Grade` | Model storing the grade and resolution state |
