# Subject Advising Guide — Richwell Portal

This document provides a comprehensive overview of the **Subject Advising** workflow within the Richwell Portal. It outlines the processes for different student classifications and the rules governing subject selection.

---

## 1. Overview

Subject Advising is the process where a student selects (or is assigned) their academic load for an upcoming term. No student can proceed to **Section Picking** or **Enrollment** without an **APPROVED** advising record.

---

## 2. Student Classifications

The system dynamically determines the advising path based on the student's academic standing:

| Student Type | Path | Criteria |
| :--- | :--- | :--- |
| **Regular** | **Auto-Advise** | No failed prerequisites, no active INCs, and no missing "back subjects." |
| **Irregular** | **Manual Selection** | Failed a prerequisite, has an INC, or has missing subjects from prior levels. |
| **Transferee** | **Crediting → Manual** | Needs subjects from a previous school credited before advising begins. |
| **Out-of-Sync** | **Manual Selection** | A regular student who has already passed all subjects in their current calculated level. |

---

## 3. The Advising Workflows

### A. Regular Student (Auto-Advise)
Regular students follow a "Single-Click" advising flow:
1.  **Year Level Calculation**: The system uses a **Majority Rule** (the year level where the student has the most passed/credited subjects).
2.  **Auto-Generation**: Upon clicking "Generate Enrollment Slip," the system identifies all subjects in the curriculum for that `Year Level` and `Current Semester` that haven't been passed yet.
3.  **Submission**: Records are created with a `PENDING` status and sent to the **Program Head** for approval.

### B. Irregular & Out-of-Sync (Manual Selection)
If a student is flagged as irregular or is "out-of-sync" (e.g., a transferee who accelerated through lower-level subjects), they use the **Subject Catalog**:
1.  **Catalog Filtering**: The student sees all subjects in their curriculum that they haven't passed yet.
2.  **Prerequisite Check**: The system strictly enforces:
    -   **Specific Prereqs**: Must have a `PASSED` grade in the required subject.
    -   **Year Standing**: Must have reached the required Year Level.
3.  **Offerings Enforcement**: Only subjects from the **Curriculum** that match the **Active Term Semester** (e.g., 1st Sem subjects in a 1st Sem term) can be selected. *Note: Actual Schedule/Section picking happens in a later phase.*
4.  **Unit Limits**: Standard cap is **30 units** per term (excluding Summer).

### C. Transferee Workflow
Transferees have a specialized entry point:
1.  **Lock State**: Advising is locked until the Registrar completes **Subject Crediting**.
2.  **Crediting Request**: Registrar submits external subjects for Program Head approval.
3.  **Unlocked**: Once enough subjects are credited, the Registrar "Unlocks" advising, and the student proceeds via the **Manual Selection** path.

---

## 4. Administrative Overrides

### Max Units Override (Graduating Students)
For students in their final year who need more than 30 units to graduate:
-   The **Registrar** or **Program Head** can toggle an override.
-   The ceiling is raised from **30 to 36 units**.
-   Every override is logged in the **Audit System** with the staff member's ID.

### Regularity Override
In rare synchronization cases, the Registrar can manually flag an enrollment as "Regular" to force-trigger the Auto-Advise logic, though **Manual Advising** is preferred for edge cases.

---

## 5. Advising Status Lifecycle

| Status | Meaning | Next Step |
| :--- | :--- | :--- |
| `DRAFT` | Student is still picking subjects. | Submit for Approval |
| `PENDING` | Submitted; waiting for Program Head. | PH Review (Approve/Reject) |
| `APPROVED` | Subjects confirmed. | Proceed to Section Picking |
| `REJECTED` | Issues found (e.g., conflicts). | Student must re-advise |

---

## 6. Troubleshooting Common Issues

### "No subjects available for advising"
-   **Reason**: You are likely an "Out-of-Sync" student. You've finished all subjects for your current year level/semester.
-   **Fix**: The system will prompt you to use **Manual Subject Selection** to pick subjects from the next year level.

### "Prerequisite not met"
-   **Reason**: You may have a grade of `INC` or `FAILED` for the required subject.
-   **Fix**: Resolve the INC first via the **INC Resolution Workflow** or select a different subject.

### "Units exceed maximum"
-   **Reason**: Total units exceed 30.
-   **Fix**: Remove a subject or visit the Registrar to request a **Max Units Override** (for graduating students only).

---
*Last Updated: April 2026*
