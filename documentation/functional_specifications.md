# Functional Specifications
**Richwell Colleges Portal**

This document outlines the detailed functional decomposition for the Richwell Colleges Portal, categorized by module.

## 1. Program Management
**Module:** `academics`
*   **CRUD Program:** Create, Read, Update, and Delete academic programs (e.g., BSIT, BSCS).
*   **Manage Subjects:** Add, remove, and update subjects associated with a program.
*   **Data Views:**
    *   Query and filter program data (by curriculum, student count, professor assignment).
    *   View curriculum associations (which students/professors are linked to a program).

## 2. Curriculum Management
**Module:** `academics`
*   **Program Association:** Create curricula linked to specific programs (e.g., "BSIT 2024-2025").
*   **Subject Allocation:** Assign subjects to specific years and semesters within the curriculum.
*   **Effective Year:** Define the effective academic year for the curriculum.
*   **Student Assignment:** Enroll students into specific curricula (typically upon admission).

## 3. Subject Management
**Module:** `academics`
*   **CRUD Subjects:** Create and manage the central repository of subjects.
*   **Subject Scope:** Assign subjects to specific programs or mark them as "Global" (General Education).
*   **Syllabus Management:** Upload and assign syllabus files to subjects. *(Store in a specific admin-accessible folder/location)*.
*   **Prerequisite Management:** Assign one or more prerequisites to a subject.

## 4. Enrollment System
**Module:** `enrollment`
*   **Document Management:**
    *   Upload and store required entrance documents (Form 138, Good Moral, etc.) in a specific folder.
*   **Subject Enrollment Logic:**
    *   **Unit Cap:** Enforce a maximum of 30 units per semester.
    *   **Prerequisite Check:** strict blocking if prerequisites are not passed.
    *   **Credentials:** Multi-step input process for student credentials.
*   **Approval Gate:** Subject enrollment remains `PENDING` until:
    1.  **Payment:** 1st Month payment is received.
    2.  **Approval:** Department Head approves the enrollment.

## 5. Subject Advising
**Module:** `enrollment`
*   **Automated Advising:** System recommends subjects based on the student's curriculum and passed subjects.
*   **Validation:**
    *   Block enrollment if prerequisites are not met.
    *   Prevent exceeding the 30-unit cap.
*   **Override:** Allow Department Head to approve/override specific cases.

## 6. Approval Chain & Workflow
**Module:** `enrollment` / `admissions`
1.  **Admission:**
    *   Staff approves student account.
    *   System generates/assigns Student ID Number (IDN).
2.  **Student Enrollment:**
    *   Student selects subjects.
3.  **Payment:**
    *   Cashier processes 1st Month payment.
    *   System activates subject enrollment (moves to `PENDING_HEAD`).
4.  **Head Approval:**
    *   Department Head reviews and gives final approval (Status -> `ENROLLED`).
5.  **Exam Permits:**
    *   Permits are unlocked sequentially as monthly payments are made:
        *   Month 1 Paid -> Subject Enrollment Active
        *   Month 2 Paid -> Chapter Test Permit
        *   Month 3 Paid -> Prelims Permit
        *   Month 4 Paid -> Midterm Permit
        *   Month 5 Paid -> Pre-Finals Permit
        *   Month 6 Paid -> Finals Permit

## 7. Professor Management
**Module:** `academics` / `accounts`
*   **CRUD Professors:** Manage faculty accounts and profiles.
*   **Assignments:**
    *   Assign to one or multiple sections.
    *   Assign to one or multiple subjects.
*   **Grading:**
    *   Submit final grades for students.
    *   Resolve "Incomplete" (INC) grades.

## 8. Section Management
**Module:** `academics`
*   **CRUD Sections:** Create class sections (e.g., "BSIT-1A").
*   **Assignments:** Assign schedules and professors to sections.
*   **Roster:** View enrolled students and their final grades per section.

## 9. Schedule Management
**Module:** `academics`
*   **Slot Assignment:** Assign specific days/times and rooms to a Section-Subject-Professor combination.
*   **Conflict Detection:** Prevent double-booking of rooms or professors for the same time block.

## 10. Document Release
**Module:** `enrollment`
*   **Academic Records:** Generate and release official documents (Transcript of Records, Certificate of Grades).

## 11. Admin & System Controls
**Module:** `core`
*   **Access Control:** Role-based access control (RBAC) for specific users/roles.
*   **Developer Tools:** System configuration and debugging tools.
*   **Audit Log:** Global logging of all critical system actions.
*   **Semester Control:** Set start and end dates for the academic semester.
*   **System Configuration:** Global toggles (e.g., Enable/Disable Enrollment).

## 12. Student Grade Processing
**Module:** `enrollment`
*   **INC Resolution:**
    *   Professors update INC grades.
    *   Registrar approves the resolution.
*   **Automated Expiry:**
    *   **Major Subjects:** INC expires after 6 months -> Retake.
    *   **Minor Subjects:** INC expires after 1 year -> Retake.
*   **Finalization:** Grades must be finalized by the Registrar to be considered permanent.
