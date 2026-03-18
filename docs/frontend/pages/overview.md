# Frontend Pages Overview

## Structure
Pages are organized by role in `frontend/src/pages/`. Each role has its own dashboard and specialized functional pages.

## Main Portals

### 1. Student Portal (`/student/*`)
- **Dashboard**: Overview of enrollment status and announcements.
- **Enrollment/Advising**: Interface for selecting subjects (Regular/Irregular).
- **Schedules**: Weekly class schedule view.
- **Grades**: Term-by-term grade reports.
- **Finance**: Payment history and exam permit status.

### 2. Registrar Portal (`/registrar/*`)
- **Student Management**: Full CRUD on student profiles.
- **Academic Management**: Programs, Curriculums, and Subjects (Bulk Upload).
- **Grades Review**: Reviewing and Finalizing subject grades after professor submission.
- **User Management**: (Head Registrar) Managing staff accounts and Audit Logs.

### 3. Dean Portal (`/dean/*`)
- **Scheduling Matrix**: The primary tool for assigning rooms, times, and professors to sections.
- **Faculty Loading**: Monitoring and balancing the teaching hours of professors.

### 4. Professor Portal (`/professor/*`)
- **Class Lists**: Viewing students in assigned sections.
- **Grading**: Entering Midterm and Final grades.
- **INC Resolution**: Managing completion requirements for students with incomplete grades.

### 5. Admission & Cashier
- **Admission**: Reviewing applicants and triggering the activation/enrollment flow.
- **Cashier**: Recording payments and checking permit eligibility.

## Common Features
- **Public Application**: Public-facing form at `/apply` for new students.
- **Error Boundaries**: Standardized handling for 404, 403, and 500 errors.
- **Idle Timer**: Automatic logout after 30 minutes of inactivity.
