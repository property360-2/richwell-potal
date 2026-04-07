# Subject Crediting Workflow — Richwell Portal

## 1. Overview
Subject Crediting is a specialized process for **Transferee Students**. It allows the Registrar to map subjects previously taken at another institution to the student's current curriculum at Richwell. 

This process is a prerequisite for advising; transferees are locked from selecting subjects until their previous credits are encoded and approved.

---

## 2. The Crediting Lifecycle

### Phase 1: Request Submission (Registrar)
1.  **TOR Review**: The Registrar reviews the student's Official Transcript of Records (TOR).
2.  **Mapping**: The Registrar identifies subjects in the student's Richwell curriculum that correspond to passed subjects from the previous school.
3.  **Bulk Submission**: The Registrar uses the **Bulk Crediting** interface to select multiple subjects, enter the grades from the TOR, and submit a `CreditingRequest`.
    -   The request status is initially `PENDING`.
    -   Advising for the student remains **LOCKED**.

### Phase 2: Academic Review (Program Head)
1.  **Verification**: The Program Head (PH) reviews the submitted `CreditingRequest`.
2.  **Decision**: 
    -   **APPROVE**: All subjects in the request are marked as `PASSED` and `is_credited: True` in the `Grade` model.
    -   **REJECT**: The PH provides a `rejection_reason` (e.g., "Syllabus mismatch"), and the Registrar must adjust the request.

### Phase 3: Advising Activation
1.  **Standing Recalculation**: Once subjects are approved, the system recalculates the student's academic standing and year level.
2.  **Unlocking**: 
    -   If the student is now "Regular" (has all prerequisites for their current level), they may use **Auto-Advise**.
    -   If they are still "Irregular," the Registrar manually **Unlocks Advising**, and the student proceeds via the **Manual Subject Selection** path.

---

## 3. Data Integrity & Auditing
-   **Security**: Only users with the `REGISTRAR` role can create requests. Only the `PROGRAM_HEAD` (or Admin) can approve them.
-   **Traceability**: Every crediting action is logged in the **Audit System**.
-   **Source Attribution**: Each credited grade includes the `is_credited` and `is_historical` flags for reporting and transcript generation.

---

## 4. Key Models
| Model | Description |
| :--- | :--- |
| `CreditingRequest` | The header record for a bulk crediting submission, tracking current status and review timestamps. |
| `CreditingRequestItem` | Individual subjects and their corresponding grades within a request. |
| `Grade` | The final record created after approval, used for GPA and graduation eligibility. |

---

## 5. Troubleshooting
### "Student cannot proceed to advising"
-   **Check Crediting Status**: Ensure there is no `PENDING` crediting request. Status must be `APPROVED`.
-   **Check Manual Unlock**: Transferees are locked by default (`is_advising_unlocked=False`). A registrar must manually toggle this in the Student Profile if the student is ready to pick subjects.

---
*Last Updated: April 2026*
