# Grade Management Testing Procedures

Bro, here's how to verify the new Grade Management features (Windows, Locking, and Historical Encoding) across the stack.

## 1. Backend Automated Tests

We have implemented two main test levels to ensure data integrity and window enforcement.

### Unit Tests (Grading Refinements)
Focuses on individual constraints like windows and locking.
- **File**: `apps/grades/tests/test_grading_refinements.py`
- **Command**:
  ```bash
  python manage.py test apps.grades.tests.test_grading_refinements
  ```
- **What it verifies**:
  - Professors are blocked outside the `Term` grading windows.
  - Registrar can bypass window checks with the `override` flag.
  - Finalized grades are immutable (Locked).
  - Auto-INC logic safely filters unsubmitted students only.

### E2E Integration Workflow
Simulates a full student academic lifecycle.
- **File**: `apps/grades/tests/test_integration_workflow.py`
- **Command**:
  ```bash
  python manage.py test apps.grades.tests.test_integration_workflow
  ```
- **What it verifies**:
  - Full flow: Enrollment -> Grade Submission -> Global Term Locking.
  - Historical Backfill triggers automatic Year Level and Regularity updates.
  - Audit logs are preserved across complex state changes.

---

## 2. Frontend Manual Verification

### Historical TOR Encoding
- **Route**: `/registrar/historical-encode`
- **Steps**:
  1. Search for a student (e.g., a transferee).
  2. Input a "Source" (e.g., Physical TOR ID).
  3. Add multiple subjects and grades (0.25 steps).
  4. Click **Review & Save**.
  5. Verify the "Summary" modal matches your input.
  6. Confirm and check the Student Profile to see if they are now regular or in the correct Year Level.

### Grading Console Controls
- **Route**: `/registrar/grades`
- **Steps**:
  1. **Global Lock**:
     - Click "Global Lock".
     - Wait for the 5-second safety timer.
     - Type `CONFIRM` into the challenge box.
     - Try to submit a grade as a professor for that term (should show a 400 error).
  2. **Auto-INC**:
     - Click "Close Finals / Auto-INC".
     - Confirm the browser dialog.
     - Verify that only unsubmitted students in the finalization queue are converted to INC.

---

## 3. Auditing & Compliance
- **Check**: Database table `grades_grade` or Audit Logs.
- **Verify**:
  - `is_historical` is `True` for encoded records.
  - `historical_source` contains your input source.
  - `finalized_by` and `finalized_at` are populated for locked terms.
