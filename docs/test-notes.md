# Grade Management & System Testing Procedures

Bro, here's how to verify the system across the stack. I've updated this list to include all core system tests.

## 1. Backend Automated Tests

We use Django's testing framework. You can run all tests with `python manage.py test`.

### Core Functional Tests
Focuses on individual constraints like windows and locking.
- **Grades (Windows/Locking)**: `apps.grades.tests.test_grading_refinements`
- **Grades (Year Level)**: `apps.grades.tests.test_year_level_logic`
- **User Service**: `apps.accounts.tests.test_user_service`
- **Scheduling**: `apps.scheduling.tests.test_scheduling_service`
- **Sectioning**: `apps.sections.tests.test_sectioning_service`

### API & Permission Tests
Located in the root `tests/` directory.
- **Authentication**: `tests.test_authentication`
- **Permissions**: `tests.test_permissions`
- **Security**: `tests.test_security`
- **Grades API**: `tests.test_grades_api`
- **Sections API**: `tests.test_sections_api`
- **Terms API**: `tests.test_terms_api`

### E2E Integration Workflow (Backend)
Simulates a full student academic lifecycle via services.
- **File**: `apps/grades/tests/test_integration_workflow.py`
- **Command**:
  ```bash
  python manage.py test apps.grades.tests.test_integration_workflow
  ```

---

## 2. Frontend Automated Tests (E2E)

We use Playwright for browser-based testing.
- **Location**: `frontend/tests/`
- **Command**:
  ```bash
  cd frontend
  npm run test:e2e
  ```

### Available Specs:
- **`auth.spec.js`**: Login/Logout and session persistence.
- **`admin.spec.js`**: User management and dashboard controls.
- **`grade_management.spec.js`**: Historical Encoding and Global Lock safety.
- **`flows/academic_flow.spec.js`**: Full Academic Cycle (Professor -> Registrar -> Student).

---

## 3. Frontend Manual Verification

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
