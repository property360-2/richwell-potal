# Proposal: Subject Overriding Policy

## Context
Currently, the system blocks enrollment if prerequisites are not met (e.g., failed prerequisite, incorrect year level) or if a section is full. However, there are valid administrative scenarios requiring bypasses:
1.  **Irregular Students / Transferees**: Equivalent subjects taken elsewhere.
2.  **Graduating Students**: Taking prerequisites as co-requisites to graduate on time.
3.  **Capacity Constraints**: Squeezing one extra student into a full section.
4.  **Curriculum Updates**: Handling legacy curriculum mismatches.

## Proposed Policy
Instead of a free-for-all override or removing the ability entirely, we implement a **Strict Control Policy**.

### 1. Permission Gating
*   **Students**: ZERO override capability.
*   **Professors**: Cannot override enrollment rules.
*   **Registrar / Department Head**: Only these roles can perform an override.

### 2. Override Audit Trail
Every override action must be logged in `EnrollmentApproval` with `Action.OVERRIDE`.
*   **Who**: The user performing the override.
*   **When**: Timestamp.
*   **Reason**: A mandatory text field explaining why the policy was bypassed (e.g., "Graduating Student - approved by Dean").

### 3. Implementation Logic
*   **Current State**: System hard blocks if `check_prerequisites` fails or `check_capacity` fails.
*   **Proposed State**:
    *   API accepts an `override=True` flag.
    *   Backend checks `request.user.role` is `REGISTRAR` or `ADMIN`.
    *   If valid, bypass checks and create `SubjectEnrollment` with a flag/log indicating it was forced.

### 4. UI Implication
*   Standard enrollment view hides override options.
*   Registrar/Admin view shows a "Force Enroll" button when a block is encountered, requiring a confirmation dialog with a "Reason" text input.
