# Enrollment Workflow & Auto-Sectioning Roadmap

This document outlines the phased development plan for implementing automated section assignment and handling student statuses (Active vs Inactive).

---

## Phase 1: Analyze
- [x] **Understand Statuses**: Differentiate `StudentProfile.status` (School-wide) vs `Enrollment.status` (Semester-specific).
- [x] **Identify Inactive/Ghost Rule**: Clarify that auto-assigned students who do not pay/enroll remain `PENDING` and do not count towards active numbers. They will not appear on CORs, class lists, or transcripts.
- [x] **Locate Triggers**:
    - *New Students*: Action happens in `ApplicantUpdateView`.
    - *Current Students*: Action happens in `Semester.save()` when a new semester is marked `is_current=True`.

## Phase 2: Plan
- [x] **Frontend UI**: Fix the missing `white` variant in `Button.jsx` to make the "VIEW STATEMENT" button readable.
- [x] **Backend Service**: Design `section_service.py` to handle logic for finding a student's matching section based on program and year level.
- [x] **Admission Hook**: Plan hook in `ApplicantUpdateView.patch` to call auto-sectioning upon acceptance.
- [x] **Semester Hook**: Plan hook in `Semester.save()` to loop through active students and auto-enroll them in the new semester as `PENDING`.

## Phase 3: Execute
- [x] **Frontend Fix**: Update `frontend/src/components/ui/Button.jsx` with the `white` variant.
- [x] **Backend Service Creation**:
    - [x] Create `apps/enrollment/services/section_service.py`.
    - [x] Write `auto_assign_new_student(enrollment)`.
    - [x] Write `auto_assign_current_students(new_semester)`.
- [x] **Backend Hook Implementation**:
    - [x] Update `views.py` (`ApplicantUpdateView`) to call the new service.
    - [x] Update `models.py` (`Semester.save()`) to call the new service.
- [x] **Cleanup Script**: Created `management/commands/cleanup_ghost_students.py`.

## Phase 4: Test
- [ ] **UI Test**: Log in as a pending student and verify "VIEW STATEMENT" button visibility.
- [ ] **New Student Test**: Approve a new applicant via Admissions Dashboard. Verify they are automatically placed in a Section and enrolled in subjects as `PENDING_PAYMENT` or `PENDING_HEAD`.
- [ ] **Current Student Test**: Create and activate a new "2nd Semester". Verify that returning students from the 1st Semester are automatically enrolled in the 2nd Semester with a new section and subject load as `PENDING`.
- [ ] **Ghost Student Test**: Verify a `PENDING` student does not appear on grading sheets or official counts.
