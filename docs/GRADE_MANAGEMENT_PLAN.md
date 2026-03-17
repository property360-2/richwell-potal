# Refined Grade Management Plan

The refined Grade Management system introduces strict submission windows, a global “Finalize Grades” lock controlled by the Registrar, a safe override for late entries, and a specialized historical encoding workflow for legacy students. Historical grades are saved directly as PASSED/FAILED with an is_historical=True flag and bypass PH approval. Automated INC marking only targets unsubmitted ENROLLED grades after the grading period is closed, preserving all other records. This design ensures integrity, flexibility, and auditability while allowing bulk operations for both current and legacy students.

## User Review Required

> [!IMPORTANT]
> **Grade Locking**: Once the Registrar clicks "Finalize Grades", professors will be strictly blocked from editing. Only a Registrar can "Unlock" or "Override" after this point.
> 
> **Historical Encoding**: This workflow will bypass PH approval and transitions. Since these are verified records from a physical TOR, they will be saved directly with `PASSED`/`FAILED` status and an `is_historical=True` flag.
>
> **Safety & Auditing**: All bulk operations (Finalization, Auto-INC, Bulk Encoding) include safety confirmations and are tracked in the audit trail.

---

## Proposed Changes

### [Backend] Data Model & Service Enhancements

#### [MODIFY] [Grade Model](file:///c:/Users/Administrator/Desktop/richwell-potal/backend/apps/grades/models.py)
- Add `is_historical = models.BooleanField(default=False)` to distinguish manual backfills.
- Add `historical_source = models.CharField(max_length=255, null=True, blank=True)` to track source documents (e.g., "Physical TOR - 2024").
- Use the existing `finalized_at` field as the locking indicator.

#### [MODIFY] [GradingService](file:///c:/Users/Administrator/Desktop/richwell-potal/backend/apps/grades/services/grading_service.py)
- **Logging**: Ensure `AuditMixin` captures `finalized_by` and `override_window` usage in the change history.
- **`mark_unsubmitted_as_inc`**: 
    - Adds filter: `Grade.objects.filter(term=term, midterm_grade__isnull=True, grade_status=Grade.STATUS_ENROLLED)`.
- **`submit_midterm/final`**: 
    - Adds `override_window=False` parameter. 
    - If `False`, checks against `Term` windows. If `True` (called by Registrar), bypasses time checks.
    - Strict check: Returns error if `finalized_at` is set (locked).
- **`finalize_grades(term)`**:
    - Sets `finalized_at = now()` and `finalized_by = registrar` for ALL grades in the term.
    - This acts as the global lock.

#### [MODIFY] [AdvisingService](file:///c:/Users/Administrator/Desktop/richwell-potal/backend/apps/grades/services/advising_service.py)
- **`bulk_historical_encoding(student, active_term, data_list, source)`**:
    - Saves records directly as `PASSED`/`FAILED`.
    - Sets `is_historical=True`, `historical_source=source`, and `advising_status='APPROVED'`.
    - No PH approval required for these "verified" records.

---

### [Frontend] UI & API Refinements

#### [MODIFY] [backend/api/grades.js](file:///c:/Users/Administrator/Desktop/richwell-potal/frontend/src/api/grades.js)
- Add `finalizeTerm(termId)`: `POST /grades/submission/finalize-term/`
- Add `closeGradingPeriod(termId, type)`: `POST /grades/submission/close-grading-period/`
- Add `bulkHistoricalEncode(studentId, data)`: `POST /grades/crediting/bulk-historical-encode/`

#### [NEW] [HistoricalEncoding.jsx](file:///c:/Users/Administrator/Desktop/richwell-potal/frontend/src/pages/registrar/HistoricalEncoding.jsx)
- Search for student profile.
- Dynamic spreadsheet-style grid for multiple subject entries.
- **Source Field**: Input for TOR reference/link.
- **Summary Step**: Shows a breakdown of subjects/grades before final save.
- Grade input with 0.25 step validation (1.0 - 5.0).
- "Save All Historical Records" button.

#### [MODIFY] [GradeFinalization.jsx](file:///c:/Users/Administrator/Desktop/richwell-potal/frontend/src/pages/registrar/GradeFinalization.jsx)
- Add "Term Management" header card.
- "Close Midterm/Final Window" buttons with confirmation prompts.
- **Safety**: "Global Term Finalize" (Lock) button includes a "type 'CONFIRM' to lock" modal with a 5-second countdown.

#### [MODIFY] [routes/index.jsx](file:///c:/Users/Administrator/Desktop/richwell-potal/frontend/src/routes/index.jsx)
- Register `/registrar/historical-encode` route.
- Add "Override Mode" toggle for manual grade entry by Registrar outside windows.

---

## Verification Plan

### Automated Tests
- **Locking Test**: Verify that a professor's `submit_final` call fails if `finalized_at` is set.
- **Override Test**: Verify that `submit_final` works outside the window if `override_window=True`.
- **Filtering Test**: Ensure `mark_unsubmitted_as_inc` does NOT touch `PASSED` or `FAILED` grades.
- **Historical Logic**: Verify that historical records are created as `APPROVED` and `PASSED` with source tracking.
- **Integration Workflow**: Simulate full workflow: Enrollment -> Prof Submit -> Registrar Finalize -> Historical Encoding -> Year Level Update.

### Manual Verification
1.  **Registrar**: Use the new "Global Finalize" and attempt to edit a grade as a Professor (it should fail).
2.  **Registrar**: Toggle "Override Mode" and successfully update a grade after the deadline.
3.  **Registrar**: Encode a 3rd-year student's summary and verify their Year Level jumps to 3rd Year immediately.
4.  **Admin**: Check Audit Logs to verify that the person who finalized the term is recorded.
