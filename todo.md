# Database Migration & Implementation Plan: Subject Overriding

This document outlines the phased approach to implementing the Subject Overriding Policy, based on the `documentation/database_schema.md` and `documentation/proposed_changes/subject_overriding.md`.

Each phase rigorously follows the systematic approach: **Analyze -> Plan -> Execute -> Test**.

## [x] Phase 1: Database Schema Expansion (Subject Override Tracking) - **COMPLETE**

### Analyze
*   **Current State**: `apps.enrollment.models` handles enrollments, but lacks explicit tracking for forced overrides at the subject level (beyond the generic `EnrollmentApproval.Action.OVERRIDE`).
*   **Requirement**: Need a way to track *why* a subject was overridden, *who* did it, and *when*, directly linked to the `SubjectEnrollment` or via a dedicated audit model.
*   **Schema Impact**: `SubjectEnrollment` needs flags for `is_overridden`. `EnrollmentApproval` or `AuditLog` needs to explicitly capture the "Reason".

### Plan
1.  **Model Updates**:
    *   Add `is_overridden = models.BooleanField(default=False)` to `SubjectEnrollment`.
    *   Add `override_reason = models.TextField(blank=True)` to `SubjectEnrollment` (or ensure `AuditLog` captures it robustly).
    *   Add `overridden_by = models.ForeignKey(User, null=True, blank=True)` to `SubjectEnrollment`.
2.  **Migration Script**: Generate Django `makemigrations` and `migrate`.

### Execute [x]
*   Modify `backend/apps/enrollment/models.py`.
*   Run Python `manage.py makemigrations enrollment`.
*   Run Python `manage.py migrate enrollment`.

### Test [x]
*   **Unit Test**: Create a test verifying the new fields can be saved and default to `False`/`null`.
*   **Integration Test**: Verify existing DB records are not corrupted by the migration (default values applied correctly).

---

## [x] Phase 2: Backend Service Refactoring (`services.py`) - **COMPLETE**

### Analyze
*   **Current State**: `EnrollmentService.enroll_in_subject` and `check_prerequisites`, `check_capacity` throw hard exceptions (`PrerequisiteNotSatisfiedError`, `UnitCapExceededError`).
*   **Requirement**: The service must accept an `override=True` flag and bypass these strict checks if the user has the correct role.

### Plan
1.  **Service Update**: Modify `enroll_in_subject` in `apps/enrollment/services.py` to accept `override=False`, `override_reason=None`, and `actor`.
2.  **Role Validation**: Ensure only `REGISTRAR`, `HEAD_REGISTRAR`, `DEPARTMENT_HEAD`, or `ADMIN` can pass `override=True`.
3.  **Bypass Logic**: Wrap prerequisite and capacity exception raises in `if not override:`.
4.  **Logging**: If `override=True`, automatically generate an `AuditLog` entry and set the `SubjectEnrollment` override flags.

### Execute
*   Refactor `services.py` core methods.
*   Update any internal callers of `enroll_in_subject` to handle the new signature.

### Test
*   **Unit Test**: Attempt an enrollment that *should* fail (e.g., missing prereq) with `override=False` -> assert exception.
*   **Unit Test**: Attempt the *same* enrollment with `override=True` and a Registrar user -> assert success.
*   **Unit Test**: Attempt the *same* enrollment with `override=True` and a Student user -> assert PermissionDenied/ValidationError.

---

## [x] Phase 3: API Endpoint Integration (`views.py`) - **COMPLETE**

### Analyze
*   **Current State**: API endpoints for enrollment do not accept override parameters.
*   **Requirement**: The endpoints must accept the `override` and `override_reason` payload data and pass it to the service layer.

### Plan
1.  **Serializer Update**: Update `SubjectEnrollmentSerializer` or create a specific `ForceEnrollmentSerializer` to accept the new fields.
2.  **View Update**: Modify the relevant views (e.g., `EnrollmentCreateView`, `SubjectAddView`) to parse `override_flag` and pass it to the service.

### Execute
*   Modify `backend/apps/enrollment/serializers.py`.
*   Modify `backend/apps/enrollment/views.py`.

### Test
*   **API Test (Postman/Pytest)**: Send POST request as Student with `override=True` -> expect 403 Forbidden or 400 Bad Request.
*   **API Test (Postman/Pytest)**: Send POST request as Registrar with `override=True` and missing reason -> expect 400 Validation Error.
*   **API Test (Postman/Pytest)**: Send POST request as Registrar with `override=True` and reason -> expect 201 Created.

---

## [x] Phase 4: Frontend UI/UX Implementation - **COMPLETE**

### Analyze
*   **Current State**: The frontend likely shows a hard error toast when enrollment fails, with no recourse.
*   **Requirement**: Admin/Registrar dashboards need a UI flow to trigger the override upon failure.

### Plan
1.  **Error Handling**: If backend returns a specific "Prerequisite Failed" error, check user role.
2.  **Override Modal**: If user is Registrar, display a "Force Enroll / Override" button instead of just "Close".
3.  **Reason Input**: Clicking the button opens a modal requiring textual input for the `override_reason`.
4.  **Submission**: Submit the second API call with the override flags attached.

### Execute
*   Update React components (e.g., `SubjectSelection.jsx`, `EnrollmentApprovalModal.jsx`).
*   Implement the override confirmation dialog component.

### Test
*   **Manual QA Flow**: Log in as Registrar -> attempt to enroll student in full class -> get blocked -> click "Override" -> enter reason -> submit -> verify success in UI and Database.
*   **Security QA Flow**: Log in as Student -> manipulate browser network payload to include `override: true` -> verify backend blocks it.

---

## Completion Criteria Checklist
- [x] Database migrations applied successfully.
- [x] `services.py` handles bypass logic correctly based on roles.
- [x] Audit logs accurately capture `overridden_by` and `reason`.
- [x] API rejects unauthorized override attempts.
- [x] Frontend displays the override modal only for authorized roles.
- [x] Full E2E manual test passes for the strict control policy.
