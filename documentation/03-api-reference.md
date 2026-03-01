# Richwell Colleges Portal — API Reference

**Base URL:** `/api/v1/`
**Authentication:** JWT Bearer token (unless marked **Public**)
**Content-Type:** `application/json`

---

## Table of Contents

1. [Accounts (`/accounts/`)](#1-accounts)
2. [Academics (`/academics/`)](#2-academics)
3. [Admissions & Enrollment (`/admissions/`)](#3-admissions--enrollment)
4. [Audit (`/audit/`)](#4-audit)
5. [Core (`/core/`)](#5-core)

---

## 1. Accounts

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/accounts/login/` | Public | Login with email + password → returns JWT access & refresh tokens |
| `POST` | `/accounts/token/refresh/` | Public | Refresh JWT access token |
| `POST` | `/accounts/logout/` | Auth | Blacklist refresh token |

### Password Reset

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/accounts/password/request-reset/` | Public | Request password reset email |
| `POST` | `/accounts/password/validate-token/` | Public | Validate reset token |
| `POST` | `/accounts/password/reset/` | Public | Reset password with valid token |

### Profile

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET/PATCH` | `/accounts/me/` | Auth | Get or update current user profile |
| `POST` | `/accounts/change-password/` | Auth | Change password (requires old password) |

### User Management (Admin)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/accounts/users/` | Admin | List all users with filtering |
| `GET` | `/accounts/users/count/` | Admin | Total user counts by role |
| `POST` | `/accounts/generate-student-id/` | Admin/Registrar | Generate next student number |

### Student & Staff ViewSets

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/accounts/students/` | Staff | List students with search & filter |
| `GET` | `/accounts/students/{id}/` | Staff | Student detail |
| `PATCH` | `/accounts/students/{id}/` | Registrar+ | Update student profile |
| `GET` | `/accounts/staff/` | Admin | List staff users |
| `POST` | `/accounts/staff/` | Admin | Create new staff user |
| `PATCH` | `/accounts/staff/{id}/` | Admin | Update staff user |
| `DELETE` | `/accounts/staff/{id}/` | Admin | Deactivate staff user |

---

## 2. Academics

### Programs (Public)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/academics/programs/` | Public | List all active programs |
| `GET` | `/academics/programs/{id}/` | Public | Program detail |

### Programs (Management)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/academics/manage/programs/` | Admin | List programs (admin) |
| `POST` | `/academics/manage/programs/` | Admin | Create program |
| `PATCH` | `/academics/manage/programs/{id}/` | Admin | Update program |
| `DELETE` | `/academics/manage/programs/{id}/` | Admin | Deactivate program |

### Subjects

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/academics/subjects/` | Public | List all subjects |
| `GET` | `/academics/subjects/{id}/` | Public | Subject detail with prerequisites |
| `GET` | `/academics/manage/subjects/` | Admin | List subjects (management) |
| `POST` | `/academics/manage/subjects/` | Admin | Create subject |
| `PATCH` | `/academics/manage/subjects/{id}/` | Admin | Update subject |

### Sections

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/academics/sections/` | Auth | List sections (filtered by semester) |
| `POST` | `/academics/sections/` | Admin/Registrar | Create section |
| `GET` | `/academics/sections/{id}/` | Auth | Section detail |
| `PATCH` | `/academics/sections/{id}/` | Admin/Registrar | Update section |
| `DELETE` | `/academics/sections/{id}/` | Admin | Dissolve section |

### Section Subjects

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/academics/section-subjects/` | Auth | List section-subject mappings |
| `POST` | `/academics/section-subjects/` | Admin/Registrar | Assign subject to section |
| `PATCH` | `/academics/section-subjects/{id}/` | Admin/Registrar | Update assignment (e.g. change professor) |
| `DELETE` | `/academics/section-subjects/{id}/` | Admin/Registrar | Remove subject from section |

### Schedule Slots

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/academics/schedule-slots/` | Auth | List schedule slots |
| `POST` | `/academics/schedule-slots/` | Admin/Registrar | Create slot |
| `PATCH` | `/academics/schedule-slots/{id}/` | Admin/Registrar | Update slot |
| `DELETE` | `/academics/schedule-slots/{id}/` | Admin/Registrar | Delete slot |

### Conflict Checking

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/academics/check-professor-conflict/` | Auth | Check professor schedule conflicts |
| `POST` | `/academics/check-room-conflict/` | Auth | Check room availability conflicts |
| `POST` | `/academics/check-section-conflict/` | Auth | Check section schedule conflicts |
| `GET` | `/academics/availability/` | Auth | Get availability summary |

### Professor Schedule

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/academics/professor/{id}/schedule/{semester_id}/` | Auth | Full professor schedule for a semester |

### Curricula

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/academics/curricula/` | Auth | List curricula |
| `POST` | `/academics/curricula/` | Admin | Create curriculum |
| `GET` | `/academics/curricula/{id}/` | Auth | Curriculum detail |
| `GET` | `/academics/curricula/{id}/structure/` | Auth | Full curriculum structure (year/semester/subjects) |
| `POST` | `/academics/curricula/{id}/assign_subjects/` | Admin | Assign subjects to curriculum |
| `DELETE` | `/academics/curricula/{id}/subjects/{subject_id}/` | Admin | Remove subject from curriculum |
| `GET` | `/academics/curriculum-versions/{id}/` | Auth | Curriculum version detail |

### Semesters

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/academics/semesters/` | Auth | List semesters |
| `POST` | `/academics/semesters/` | Admin | Create semester |
| `PATCH` | `/academics/semesters/{id}/` | Admin | Update semester |
| `POST` | `/academics/semesters/{id}/set_current/` | Admin | Set as current semester |

### Professors & Rooms

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/academics/professors/` | Auth | List professors |
| `GET` | `/academics/rooms/` | Auth | List rooms |
| `POST` | `/academics/rooms/` | Admin | Create room |

### Archives

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/academics/archives/` | Admin | List archived records |
| `POST` | `/academics/archives/{id}/archive/` | Admin | Archive a record |
| `POST` | `/academics/archives/{id}/unarchive/` | Admin | Restore archived record |

---

## 3. Admissions & Enrollment

### Public Admission

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/admissions/system/enrollment-status/` | Public | Current enrollment open/closed status |
| `GET` | `/admissions/check-email/` | Public | Check email availability |
| `GET` | `/admissions/check-student-id/` | Public | Check student ID availability |
| `GET` | `/admissions/check-name/` | Public | Check name for duplicates |
| `GET` | `/admissions/programs/` | Public | Programs available for enrollment |
| `POST` | `/admissions/enroll/` | Public | Submit online enrollment application |

### Documents

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/admissions/enrollment/{id}/documents/` | Auth | Upload enrollment documents |

### Student Enrollment

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/admissions/my-enrollment/` | Student | Get current enrollment details |
| `GET/PATCH` | `/admissions/my-enrollment/shift-preference/` | Student | Get or set AM/PM shift preference |

### Applicant Management (Admission Staff)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/admissions/applicants/` | Admission Staff | List all applicants |
| `PATCH` | `/admissions/applicants/{id}/` | Admission Staff | Update applicant (approve, assign visit date) |
| `GET` | `/admissions/next-student-number/` | Staff | Get next available student number |
| `PATCH` | `/admissions/documents/{id}/verify/` | Admission Staff | Verify uploaded document |

### Transferee Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/admissions/transferee/` | Registrar | Create transferee enrollment |
| `POST` | `/admissions/transferee/{id}/credits/` | Registrar | Credit transferred subjects |

### Data Export

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/admissions/export/students/` | Admin/Registrar | Export students CSV |
| `GET` | `/admissions/export/enrollments/` | Admin/Registrar | Export enrollments CSV |
| `GET` | `/admissions/export/payments/` | Admin/Registrar | Export payments CSV |

### Subject Enrollment

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/admissions/subjects/recommended/` | Student | Recommended subjects based on curriculum |
| `GET` | `/admissions/subjects/available/` | Student | All available subjects for enrollment |
| `GET` | `/admissions/subjects/my-enrollments/` | Student | Current subject enrollment list |
| `GET` | `/admissions/my-schedule/` | Student | Weekly class schedule |
| `GET` | `/admissions/my-curriculum/` | Student | Student's curriculum progress |
| `POST` | `/admissions/subjects/auto-assign/` | Student | Auto-assign AM/PM block for regular students |
| `POST` | `/admissions/subjects/enroll/` | Student | Enroll in a single subject |
| `POST` | `/admissions/subjects/bulk-enroll/` | Student | Enroll in multiple subjects |
| `DELETE` | `/admissions/subjects/{id}/drop/` | Student | Drop an enrolled subject |
| `PATCH` | `/admissions/subjects/{id}/edit/` | Student | Edit subject enrollment (change section) |
| `POST` | `/admissions/enrollment/{id}/override-enroll/` | Registrar | Override enrollment (bypass validations) |

### Payments & Exam Permits

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/admissions/payments/record/` | Cashier | Record a payment |
| `POST` | `/admissions/payments/adjust/` | Cashier | Record payment adjustment |
| `GET` | `/admissions/payments/transactions/` | Staff | List all transactions |
| `GET` | `/admissions/payments/student/{enrollment_id}/` | Staff | Payment history for a student |
| `GET` | `/admissions/cashier/students/search/` | Cashier | Search students by name/ID |
| `GET` | `/admissions/cashier/students/pending-payments/` | Cashier | Students with pending payments |
| `GET` | `/admissions/cashier/today-transactions/` | Cashier | Today's transaction summary |
| `GET` | `/admissions/my-enrollment/payments/` | Student | Student's own payment history |
| `GET/POST` | `/admissions/exam-mappings/` | Admin | CRUD exam-month mappings |
| `PATCH/DELETE` | `/admissions/exam-mappings/{id}/` | Admin | Update/delete mapping |
| `GET` | `/admissions/my-enrollment/exam-permits/` | Student | Student's exam permits |
| `POST` | `/admissions/exam-permits/{exam_period}/generate/` | Cashier | Generate exam permit |
| `GET` | `/admissions/exam-permits/{permit_id}/print/` | Staff | Print permit |
| `GET` | `/admissions/exam-permits/` | Staff | List all exam permits |

### Grades & GPA

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/admissions/grading/sections/` | Professor | Professor's assigned sections for grading |
| `GET` | `/admissions/grading/students/` | Professor | Gradeable students in a section |
| `POST` | `/admissions/grading/submit/` | Professor | Submit a single grade |
| `POST` | `/admissions/grading/bulk/` | Professor | Bulk submit grades |
| `GET` | `/admissions/grading/history/{id}/` | Auth | Grade change history |
| `GET` | `/admissions/grading/deadline-status/` | Professor | Current grading deadline info |
| `GET` | `/admissions/grades/sections/` | Registrar | Sections available for finalization |
| `POST` | `/admissions/grades/section/{id}/finalize/` | Registrar | Finalize all grades in section |
| `POST` | `/admissions/grades/override/` | Registrar | Override a grade |
| `GET` | `/admissions/grades/inc-report/` | Registrar | INC grade report |
| `POST` | `/admissions/grades/process-expired-incs/` | Admin | Process expired INC grades |
| `GET` | `/admissions/my-enrollment/grades/` | Student | Student's grades |
| `GET` | `/admissions/my-enrollment/transcript/` | Student | Unofficial transcript |
| `PATCH` | `/admissions/students/{id}/standing/` | Registrar | Update academic standing |

### Grade Resolutions (ViewSet)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/admissions/grade-resolutions/` | Auth | List grade resolutions (role-filtered) |
| `POST` | `/admissions/grade-resolutions/` | Professor/Head | Create resolution request |
| `GET` | `/admissions/grade-resolutions/{id}/` | Auth | Resolution detail |
| `POST` | `/admissions/grade-resolutions/{id}/registrar_initial_approve/` | Registrar | Step 2: Registrar initial review |
| `POST` | `/admissions/grade-resolutions/{id}/input_grade/` | Professor/Head | Step 3: Input the grade |
| `POST` | `/admissions/grade-resolutions/{id}/head_approve/` | Head | Step 4: Head approval |
| `POST` | `/admissions/grade-resolutions/{id}/registrar_final_approve/` | Registrar | Step 5: Final sign-off |
| `POST` | `/admissions/grade-resolutions/{id}/reject/` | Staff | Reject at any step |
| `POST` | `/admissions/grade-resolutions/{id}/cancel/` | Staff | Cancel resolution |

### Promissory Notes (ViewSet)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/admissions/promissory-notes/` | Auth | List promissory notes |
| `POST` | `/admissions/promissory-notes/` | Cashier | Create promissory note |
| `GET` | `/admissions/promissory-notes/{id}/` | Auth | Note detail |
| `POST` | `/admissions/promissory-notes/{id}/record_payment/` | Cashier | Record payment on note |
| `POST` | `/admissions/promissory-notes/{id}/mark_defaulted/` | Cashier | Mark as defaulted |
| `POST` | `/admissions/promissory-notes/{id}/cancel/` | Staff | Cancel note |

### Document Release

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/admissions/documents/release/` | Registrar | Create document release |
| `GET` | `/admissions/documents/my-releases/` | Registrar | My issued releases |
| `GET` | `/admissions/students/{id}/enrollment-status/` | Staff | Student enrollment status for doc release |
| `GET` | `/admissions/documents/student/{id}/` | Staff | All documents for a student |
| `GET` | `/admissions/documents/{code}/` | Auth | Document detail by code |
| `GET` | `/admissions/documents/{code}/pdf/` | Auth | Download document PDF |
| `POST` | `/admissions/documents/{code}/revoke/` | Registrar | Revoke document |
| `POST` | `/admissions/documents/{code}/reissue/` | Registrar | Reissue document |
| `GET` | `/admissions/documents/all/` | Staff | All releases (audit view) |
| `GET` | `/admissions/documents/stats/` | Staff | Release statistics |

### Department Head

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/admissions/head/pending-enrollments/` | Head | Pending subject enrollments for approval |
| `POST` | `/admissions/head/approve/{id}/` | Head | Approve subject enrollment |
| `POST` | `/admissions/head/reject/{id}/` | Head | Reject subject enrollment |
| `POST` | `/admissions/head/bulk-approve/` | Head | Bulk approve enrollments |

### Reports

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/admissions/reports/` | Staff | General head report data |
| `GET` | `/admissions/reports/admission-stats/` | Staff | Admission statistics (applicants, enrolled, conversion rate, by program) |
| `GET` | `/admissions/reports/payment-report/` | Staff | Payment summary (total required, paid, outstanding, promissory notes) |
| `GET` | `/admissions/reports/enrollment-stats/` | Staff | Department enrollment statistics |

### COR Generation

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/admissions/enrollment/{id}/cor/` | Staff | Generate Certificate of Registration PDF |

---

## 4. Audit

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/audit/logs/` | Admin | List audit logs with filtering |
| `GET` | `/audit/logs/filters/` | Admin | Available filter options |
| `GET` | `/audit/logs/{id}/` | Admin | Audit log detail |
| `GET` | `/audit/dashboard/alerts/` | Admin | Dashboard security alerts |

---

## 5. Core

### System Configuration

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/core/config/` | Admin | List all config entries |
| `POST` | `/core/config/` | Admin | Create config entry |
| `GET` | `/core/config/{id}/` | Admin | Config detail |
| `PATCH` | `/core/config/{id}/` | Admin | Update config value |

### Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/core/notifications/` | Auth | List user notifications |
| `GET` | `/core/notifications/unread-count/` | Auth | Unread notification count |
| `POST` | `/core/notifications/{id}/mark-read/` | Auth | Mark notification as read |
| `POST` | `/core/notifications/mark-all-read/` | Auth | Mark all as read |
| `DELETE` | `/core/notifications/{id}/` | Auth | Delete notification |

---

## Legacy Endpoints (Backward Compatibility)

These older endpoints are kept for backward compatibility with existing frontend components:

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/admissions/grades/my-sections/` | Professor | Legacy professor sections |
| `GET` | `/admissions/grades/section/{section_id}/subject/{subject_id}/students/` | Professor | Legacy section students |
| `POST` | `/admissions/grades/submit/` | Professor | Legacy grade submit |
| `GET` | `/admissions/grades/history/{subject_enrollment_id}/` | Auth | Legacy grade history |
