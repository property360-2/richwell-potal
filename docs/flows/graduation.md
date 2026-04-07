# Graduation Eligibility Logic — Richwell Portal

## 1. Overview
The Graduation Eligibility logic is used to determine if a student has met all academic requirements of their specific curriculum version. It is primarily accessed via the **Registrar's Dashboard** for final clearance and the **Student Portal** for progress tracking.

---

## 2. Eligibility Calculation
The source of truth for graduation eligibility is the `ReportService.graduation_check` method.

### The Algorithm:
1.  **Requirement Gathering**: The system identifies all subjects linked to the student's assigned `CurriculumVersion`.
2.  **Achievement Audit**: It queries the `Grade` model for all records matching the student with a status of `PASSED`.
    -   This includes:
        -   Subjects passed during regular terms at Richwell.
        -   **Credited Subjects**: External subjects from other schools that were approved and marked as `PASSED`.
        -   **Historical Encoding**: Legacy grades manually entered by the Registrar.
3.  **Gap Analysis**: Any subject in the curriculum requirement that does **not** have a corresponding `PASSED` grade record is flagged as `MISSING`.
4.  **Final Verdict**:
    -   **Eligible**: `is_eligible: true` if the `MISSING` list is empty.
    -   **Ineligible**: `is_eligible: false` if one or more subjects are missing.

---

## 3. Data Integration
| Component | Role in Graduation |
| :--- | :--- |
| **CurriculumVersion** | Defines the list of required subjects and total units. |
| **Subject Crediting** | Allows transferees to satisfy requirements using external credits. |
| **Grade Finalization** | The point where a subject transitions to `PASSED`, updating eligibility in real-time. |
| **Max Units Override** | Helper for graduating students to take up to 36 units to finish their missing subjects. |

---

## 4. Automation & Workflows
Currently, the graduation check is a **Reporting/Verification** tool. It does **not** automatically transition a student's status to `GRADUATED`. 

### Manual Status Transition:
1.  Registrar runs the **Graduation Check**.
2.  If `is_eligible` is true, the Registrar manually updates the Student's `status` to `GRADUATED` in the Student Management module.
3.  This manual step ensures that non-academic requirements (e.g., clearance, financial obligations) are also met before the status is flipped.

---

## 5. Troubleshooting Gaps
If a student appears ineligible but believes they have finished the subject:
1.  **Check Grade Status**: Ensure the grade is marked as `PASSED` and not just `FOR_FINALIZATION` or `APPROVED` (advising status).
2.  **Check Subject Code**: Verify the subject code in the `Grade` record exactly matches the one in the `CurriculumVersion`.
3.  **Check Crediting**: If the student is a transferee, ensure their external subjects have been correctly mapped and approved via the **Subject Crediting Workflow**.

---
*Last Updated: April 2026*
