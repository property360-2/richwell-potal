# Richwell Portal — Comprehensive System Documentation

> **Generated from Mind Maps** — This document is a faithful transcription of all mind map data created by the development team. No information has been fabricated; all content is derived directly from the mind map nodes and their associated comments.

---

## Table of Contents

1. [System Overview (Master Plan)](#1-system-overview-master-plan)
2. [New Term Activation & Enrollment](#2-new-term-activation--enrollment)
3. [A: Subject Crediting](#3-a-subject-crediting)
4. [B: Subject Advising](#4-b-subject-advising)
5. [C: Sectioning](#5-c-sectioning)
6. [D: Scheduling](#6-d-scheduling)
7. [E: Student Document Verification](#7-e-student-document-verification)
8. [Grade Submission](#8-grade-submission)
9. [Grade Resolution](#9-grade-resolution)
10. [Payments & Permits](#10-payments--permits)
11. [Reports](#11-reports)
12. [Audit Trailing](#12-audit-trailing)
13. [Data Upload & Export](#13-data-upload--export)
14. [Faculty Management](#14-faculty-management)
15. [Program Management](#15-program-management)
16. [Cross-Reference Map](#16-cross-reference-map)

---

## 1. System Overview (Master Plan)

The system is described as a **Facility Management** portal. Its purpose is to **centralize data** across all user roles in the institution. The master plan mind map outlines the following core modules:

| # | Module | Notes |
|---|--------|-------|
| 1 | Enrollment for New Term | Includes current students, freshmen, and transferees. |
| 2 | Subject Advising | — |
| 3 | Sectioning | — |
| 4 | Scheduling | — |
| 5 | Grade Submission | — |
| 6 | Grade Resolution | — |
| 7 | Reports | — |
| 8 | Audit Trailing | — |
| 9 | Data Upload or Input | Google Sheets API integration is possible if users are accustomed to manual spreadsheets. The goal is to centralize data. |
| 10 | Subject Crediting | — |
| 11 | Payments & Permits | — |
| 12 | Faculty Management | — |

---

## 2. New Term Activation & Enrollment

### 2.1 Term Activation

A new term is **planned and configured before the start of the semester**. The following date ranges and settings must be defined when activating a new term:

- **Term Start / End Date**
- **Enrollment Start / End Date**
- **Midterm Grade Submission Start / End Date**
- **Final Grade Submission Start / End Date**
- **Subject Advising Period** — This is mandatory because the system needs to calculate the number of students who enrolled in subjects (i.e., students considered "active") for the subsequent sectioning process.
- **Schedule Picking Period**

### 2.2 Online Initial Enrollment (New Applicants)

This is the entry point for **new applicants** (freshmen and transferees).

**Step-by-step flow:**

1. **Applicant submits basic information online** — Includes name, address, program, etc. This data can be used to predict the number of students who will become fully enrolled.
2. **System displays required documents** — After submission, the system tells the applicant to bring a list of required documents to the school for physical verification.
3. **Admission verifies documents and approves the application** — The Admission office physically verifies documents and approves the applicant's application. At this stage:
    - The student receives their **Student ID Number (IDN)**. The format is based on the year: if the year is `2027`, the first student gets `270001`, the second gets `270002`, and so on (year prefix + incrementing number).
    - The student **receives a system account** (login credentials).
    - Admission records the **monthly payment commitment** agreed upon with the student.
    - The **documents checklist** in the UI should use checkboxes.
4. **Routing based on student type:**

| Student Type | Next Step |
|---|---|
| **Freshman** | Proceed to → **B: Subject Advising** |
| **Transferee** | Proceed to → **A: Subject Crediting** (Admission tells the transferee to go to the Registrar for subject crediting) |
| **All New Applicants** | Also proceed to → **E: Student Document Verification** |

### 2.3 Current Student Enrollment (Returning Students)

For students who are already in the system:

1. **Term Enrollment** — The student goes to Admission physically to pass required papers (e.g., Office of Student Affairs paperwork — these papers do not need to be tracked in the system). Admission then **tags the student as enrolled** for the semester.
2. After enrollment, the student proceeds to:
    - → **B: Subject Advising**
    - → **E: Student Document Verification**

---

## 3. A: Subject Crediting

This process is for **transferee students** whose subjects from previous institutions need to be credited.

**Step-by-step flow:**

1. **Registrar searches for the student** — The Registrar finds the approved application by IDN or student name (search functionality is available).
2. **Subject Crediting** — The Registrar performs subject crediting. The UI displays all subjects from the student's program with a search feature.
3. **Program Head Approval** — The credited subjects are sent to the Program Head for approval.
4. **After approval** → Proceed to **B: Subject Advising**.

---

## 4. B: Subject Advising

This is the process where students select their subjects for the term. The flow differs based on whether the student is **regular** or **irregular**.

### 4.1 Regular Students

1. **Student logs in to the portal.**
2. **Subjects are auto-picked** — The system automatically selects the subjects for the student based on their curriculum and year level. They are ready for submission.
3. **Student submits** the pre-selected subjects.
4. **Program Head batch-approves** — The Head can toggle individual students as "checked" or use a "select all" option to approve all regular students' subjects at once.

### 4.2 Irregular Students

1. **Student logs in to the portal.**
2. **Student manually selects subjects** — The student enrolls subjects themselves, subject to the following rules:
    - **Maximum of 30 units** can be enrolled.
    - **Prerequisite checking is enforced** by the system.
    - A subject **cannot be enrolled if it is not offered** in the current semester.
3. **Program Head manually reviews** and approves each irregular student's subject advising individually.

### 4.3 Post-Approval Effects

- Once approved by the Head, the **Registrar can now see** the list of students enrolled in subjects.
- The Registrar can then **release the Certificate of Registration (COR)** document.
- After Subject Advising → Proceed to **C: Sectioning**.

---

## 5. C: Sectioning

This process happens **after the Subject Advising period ends**.

**Step-by-step flow:**

1. **System calculates student count per year level** — The system counts the number of students per year level based on subject advising data.
2. **System auto-generates sections** using the following rules:

| Parameter | Value |
|---|---|
| **Target per section** | 35 students |
| **Maximum per section** | 40 students (hard limit) |
| **Distribution strategy** | Balance evenly when there are extra or fewer students |

3. **AM / PM Session Split** — Sections are divided into AM and PM sessions. For example: 3 sections for AM and 3 for PM, or 4 and 4. The system balances the distribution automatically.
4. **Subjects are attached to sections** — Each generated section already has subjects assigned to it based on the year level and semester.
5. After Sectioning → Proceed to **D: Scheduling**.

---

## 6. D: Scheduling

Scheduling has two perspectives: **Student Scheduling** and **Dean Scheduling**.

### 6.1 Student Scheduling

1. **First-come, first-served** — Students pick schedule slots on a first-come, first-served basis.
2. **Session capacity enforcement** — If the AM session is full, students cannot select it. The system automatically assigns them to an available session/section, but **notifies the student** that no slots were available in their preferred session.
3. **Auto-assignment on deadline** — If a student has not picked a schedule by the end of the scheduling period, the system automatically assigns them.
4. **Visibility** — After scheduling, the student can see their schedule in their UI.

### 6.2 Dean Scheduling (Professor Assignment)

1. **Dean assigns schedules to professors** — The UI should be user-friendly for this task.
2. **UI Design (Sir Gil's idea):**
    - A table of professors is displayed with columns indicating `Scheduled` or `Unscheduled` status.
    - An action button called **"Make Schedule"** opens a modal form.
    - The modal has checkboxes for **Monday to Saturday**.
    - Options for **AM or PM** (both can be selected).
    - A specific day/time slot **cannot be chosen if it is already unavailable** (conflict detection).
3. **Additional considerations:**
    - The system has **facilities/rooms** data.
    - Subjects can be of type **Lab** or **Lecture**.
4. **Visibility** — After assignment, the professor can see their schedule on their UI.

### 6.3 Post-Scheduling

When all students have chosen their preferred schedules, records are created for sections. These records are visible to:
- **Registrar** — Can see all section records.
- **Dean** — Can later assign schedules to professors based on these records.

---

## 7. E: Student Document Verification

This is a **second layer of verification** performed by the Registrar.

**Step-by-step flow:**

1. **Registrar logs in.**
2. **Enrollment Verification** — Even though documents were initially verified by Admission, a second verification by the Registrar is required. This step confirms that the student is an **officially enrolled student** for the term.

---

## 8. Grade Submission

**Step-by-step flow:**

1. **Professor logs in** to their page.
2. **Professor finds the section** where they need to input grades.
3. **Professor manually inputs grades** for each student.
4. **INC (Incomplete) handling** — If the grade submission date span has ended and a professor has not entered a grade for a student, the grade defaults to **INC (Incomplete)**.
5. **Student visibility** — After grades are submitted, students can see their grades in their UI.
6. **INC Countdown triggers:**

| Subject Type | Countdown to Retake |
|---|---|
| **Major Subject** | 6 months |
| **Minor Subject** | 1 year |

7. **Registrar finalization** — The Registrar reviews and **locks/finalizes** the grade records.

---

## 9. Grade Resolution

This is the process for resolving **INC (Incomplete) grades**.

### 9.1 Standard Flow (Active Professor)

1. **Professor logs in.**
2. **Professor searches for the student** with the INC grade — Search is by IDN or full name. Clicking the student shows the subjects/grades that the professor taught (including past terms).
3. **Professor requests Grade Resolution** to the Registrar.
    - **Rule:** If the subject grade has already changed to **Retake** (countdown expired), the student **cannot** resolve it.
4. **Registrar approves** the resolution request.
5. **Professor submits the resolved grade**, triggering an **approval chain**.
6. **Approval Chain:**
    - **Step 1: Program Head approves** — The student and professor can see in their UI that Head has approved.
    - **Step 2: Registrar approves** — The student's grade is now **fully resolved**.
7. **Student visibility** — Throughout the process, the student can see that their subject grade is "waiting for approval" from the relevant approvers.

### 9.2 Inactive Professor Case

- If the professor is **inactive**, the **Dean can act on behalf** of the inactive professor without needing to log in to another account.

---

## 10. Payments & Permits

The payment system is managed by the **Cashier** and follows a **6-month permit cycle** tied to the academic semester.

### 10.1 Payment or Promissory Note Rules

- A student **can use a promissory note** only if they have **paid the previous month**. If a student did not pay in January, they **cannot** get a promissory note for February.
- The student's UI shows whether they are on a **Promissory Note** or **Paid** status for each month.

### 10.2 Monthly Permit Schedule

| Month | Permit Type |
|---|---|
| Month 1 | Subject Enrollment Permit |
| Month 2 | Chapter Test Permit |
| Month 3 | Prelims Test Permit |
| Month 4 | Midterm Test Permit |
| Month 5 | Pre-Finals Permit |
| Month 6 | Finals Test Permit |

---

## 11. Reports

Reports are generated per role. Each role has access to specific report types.

### 11.1 Dean Reports

| Report | Details |
|---|---|
| **Total Students per Program** | Broken down per year level. |
| **Faculty Teaching Load Report** | Shows how many subjects each professor handles. Columns: Professor Name, Subjects Handled, Number of Sections, Total Units. |
| **Grade Submission Report** | Shows if professors have already submitted grades. Columns: Professor, Subject, Section, Status (Submitted / Pending). |

### 11.2 Admission Reports

| Report | Details |
|---|---|
| **Application Summary Report** | Total applicants, per program, per semester, daily/monthly count. |
| **Status Report** | How many pending, how many approved, how many rejected. |
| **Enrollment Conversion Report** | How many applicants became officially enrolled. |

### 11.3 Registrar Reports

| Report | Details |
|---|---|
| **Official Enrollment Report** | Total enrolled students per semester, per program, per year level. |
| **Masterlist Report** | Complete list of students with status, program, and student ID. |

### 11.4 Program Head Reports

| Report | Details |
|---|---|
| **Grade Submission Monitoring** | Which professors submitted grades, which are pending. |

---

## 12. Audit Trailing

All significant system actions are audited. The actions tracked include: **data upload, export, download, create, delete, and edit**.

### 12.1 Audit Log Visibility per Role

| Role | Scope of Audit Log Visibility |
|---|---|
| **Admin** | Can see audit logs of **every role** in the system. |
| **Head Registrar** | Can see audit logs of **all Registrar staff**. |
| **Registrar** | Can see only **their own** audit logs. |
| **Cashier** | Can see only **their own** transactions. |
| **Student** | Can see only **their own** payment history. |

---

## 13. Data Upload & Export

### 13.1 Upload

- The system supports uploading data in **CSV** and **XLSX** formats.
- The uploaded file **must follow the correct structure** to be compatible with the system. The required format is specific and must be documented per data type.

### 13.2 Google Sheets Integration (Optional)

- Google Sheets API integration is possible if users prefer it, especially those accustomed to manual spreadsheet workflows.
- The core purpose of this feature aligns with the system's goal: **centralize all data**.

---

## 14. Faculty Management

Faculty management is a **CRUD (Create, Read, Update, Delete)** operation for professors.

**Capabilities:**

- Create, read, update, and delete professor records.
- **Assign subjects** to professors.
- **Create professor accounts** (system login credentials).

---

## 15. Program Management

Program management is handled by the **Admin** role.

**Capabilities:**

- **CRUD Programs** — Create, read, update, and delete academic programs.
- **Assign Curriculum to Program** — Link a curriculum to a specific program.
- **CRUD Subjects in Curriculum** — Create, read, update, and delete subjects within a curriculum.

---

## 16. Cross-Reference Map

The following diagram shows how the modules connect to each other based on the mind map flow references.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NEW TERM ACTIVATED                          │
│         (Term dates, enrollment dates, advising dates, etc.)       │
└───────────────────┬───────────────────────────┬─────────────────────┘
                    │                           │
                    ▼                           ▼
    ┌───────────────────────┐       ┌───────────────────────┐
    │  Online Initial       │       │  Current Student      │
    │  Enrollment           │       │  Term Enrollment      │
    │  (New Applicants)     │       │  (Returning Students) │
    └───────────┬───────────┘       └───────────┬───────────┘
                │                               │
                ▼                               │
    ┌───────────────────────┐                   │
    │  Admission Verifies   │                   │
    │  Documents + Approves │                   │
    │  (IDN + Account)      │                   │
    └──┬──────┬─────────┬───┘                   │
       │      │         │                       │
       ▼      ▼         ▼                       │
  Freshman  Transferee  ─── E: Doc Verification │
       │      │                                 │
       │      ▼                                 │
       │  ┌────────────────────┐                │
       │  │ A: Subject         │                │
       │  │    Crediting       │                │
       │  │ (Registrar +       │                │
       │  │  Head Approval)    │                │
       │  └────────┬───────────┘                │
       │           │                            │
       ▼           ▼                            ▼
    ┌──────────────────────────────────────────────┐
    │          B: Subject Advising                 │
    │   Regular: Auto-picked → Head Batch Approve  │
    │   Irregular: Manual → Head Manual Review     │
    └──────────────────┬───────────────────────────┘
                       │
                       ▼
    ┌──────────────────────────────────────────────┐
    │          C: Sectioning                       │
    │   System auto-generates sections             │
    │   (35 target / 40 max, AM/PM split)          │
    └──────────────────┬───────────────────────────┘
                       │
                       ▼
    ┌──────────────────────────────────────────────┐
    │          D: Scheduling                       │
    │   Student: 1st-come-1st-served slots         │
    │   Dean: Assign professors to sections        │
    └──────────────────┬───────────────────────────┘
                       │
            ┌──────────┴──────────┐
            ▼                     ▼
    ┌───────────────┐    ┌────────────────┐
    │ Grade         │    │ Payments &     │
    │ Submission    │    │ Permits        │
    │ (Professor)   │    │ (Cashier)      │
    └───────┬───────┘    └────────────────┘
            │
            ▼
    ┌───────────────┐
    │ Grade         │
    │ Resolution    │
    │ (if INC)      │
    │ Approval      │
    │ Chain: Head   │
    │ → Registrar   │
    └───────────────┘
```

---

## System Roles Summary

| Role | Key Responsibilities |
|---|---|
| **Admin** | System configuration, program/curriculum management, full audit log access. |
| **Admission** | Applicant verification, student account creation (IDN), enrollment tagging, monthly commitment recording. |
| **Registrar** | Subject crediting, document verification (2nd layer), COR release, grade finalization, enrollment reports, masterlist. |
| **Head Registrar** | Oversight of all Registrar operations, full Registrar audit log access. |
| **Program Head** | Subject advising approval (regular batch / irregular manual), subject crediting approval, grade resolution approval chain. |
| **Dean** | Professor scheduling, faculty teaching load oversight, can act on behalf of inactive professors for grade resolution. |
| **Professor** | Grade submission, grade resolution requests. |
| **Cashier** | Payment processing, promissory note management, monthly permit issuance. |
| **Student** | Online enrollment, subject advising, schedule picking, grade viewing, payment history. |

---

> **Note:** This document was auto-generated from the mind map JSON files located in the `/maps` directory. All information, logic, and comments are sourced directly from the mind map nodes without any fabrication or assumptions.
