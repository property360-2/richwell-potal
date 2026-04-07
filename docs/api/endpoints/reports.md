# Reports & Documents API

## Overview
The Reports API provides endpoints for generating academic documents (PDF/Excel), retrieving student performance summaries, and checking graduation eligibility.

## Endpoints

### Masterlist (`/api/reports/masterlist/`)
Generates an Excel master list of students for a specific term, program, and year level.
- **Auth required**: Yes (Registrar only)
- **Method**: `GET`
- **Query Params**:
  - `term_id` (required): The ID of the academic term.
  - `program_id` (optional): Filter students by program.
  - `year_level` (optional): Filter students by year level (1-5).
- **Audit Log**: Generates a `RELEASE` audit log entry.
- **Output**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (Excel).

### Certificate of Registration (`/api/reports/cor/`)
Generates a PDF Certificate of Registration (COR) for a student.
- **Auth required**: Yes (Student, Admission, or Registrar)
- **Method**: `GET`
- **Query Params**:
  - `term_id` (required): The ID of the academic term.
  - `student_id` (optional): The student ID. If omitted and the user is a student, their own ID is used.
- **Rules**: Students can only access their own COR.
- **Audit Log**: Generates a `RELEASE` audit log entry.
- **Output**: `application/pdf`.

### Academic Summary (`/api/reports/academic-summary/`)
Retrieves a JSON summary of a student's academic performance, including total units earned, current GPA, and subject progress.
- **Auth required**: Yes (Student, Admission, or Registrar)
- **Method**: `GET`
- **Query Params**:
  - `student_id` (optional): The student ID. If omitted and the user is a student, their own ID is used.
- **Output**: JSON object with student metrics and grade history.

### Graduation Check (`/api/reports/graduation-check/`)
Checks if a student has completed all subjects required by their curriculum version.
- **Auth required**: Yes (Authenticated)
- **Method**: `GET`
- **Query Params**:
  - `student_id` (required): The student ID to check.
- **Output**: JSON object detailing missing subjects, total units completion, and eligibility status.

### Dashboard Stats (`/api/reports/stats/`)
Returns high-level dashboard statistics tailored to the authenticated user's role.
- **Auth required**: Yes (Authenticated)
- **Method**: `GET`
- **Output**: JSON object with role-specific metrics (e.g., total students for Admin, pending approvals for Program Head).
