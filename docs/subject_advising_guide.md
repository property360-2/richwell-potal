# Richwell Portal — Subject Advising Guide

This document explains the technical logic and user workflows for the Subject Advising module in the Richwell Portal.

## 1. Advising Logic Overview

The advising process is divided into two main tracks: **Regular (Automated)** and **Irregular (Manual)**.

### Regular (Automated) Flow
*   **Target**: Students following a standard curriculum path.
*   **Logic**: The system calculates the student's current **Year Level** using the "Majority Rule". It then identifies all subjects in the curriculum for that Year Level and the current active Semester that the student has not yet passed.
*   **Conditions**:
    *   Must have no pending (submitted but not approved) advising.
    *   Must have subjects available in the curriculum for the current term.

### Irregular (Manual) Flow
*   **Target**: Transferees, students with backlogs (failed subjects), or those whose credits do not align with a standard year level load.
*   **Logic**: The student manually selects subjects from the **Subject Catalog**.
*   **Validation**: The system enforces prerequisites and credit unit limits during submission.

---

## 2. Year Level Calculation (The Majority Rule)

The system determines a student's Year Level by counting their completed (passed) and currently enrolled subjects across all year levels defined in their curriculum.

*   **Rule**: The year level with the highest count of tracked subjects is considered the student's current year level.
*   **Tie-breaking**: If there is a tie, the highest year level among the tied counts is chosen.

> [!NOTE]
> For **Transferee Students**, this calculation can sometimes place them in a year level where they have already credited all subjects (e.g., they credited all Year 1 subjects but the system still sees them as Year 1). This is handled by the "Out-of-Sync" flow.

---

## 3. Error Handling and User Feedback

The advising module uses structured error reporting to guide students when automated processes cannot be completed.

### Common Error Codes

| Reason Code | Meaning | User Feedback (UI Banner) |
| :--- | :--- | :--- |
| `OUT_OF_SYNC_TRANSFEREE` | The student is in a year level where all required subjects for the current term are already passed/credited. | **Curriculum Out-of-Sync**: Prompted to switch to Manual Selection. |
| `ALREADY_SUBMITTED` | The student has an existing advising request with `PENDING` or `APPROVED` status. | **Already Submitted**: Informational banner showing current status. |
| `IRREGULAR_STATUS` | The student is explicitly marked as Irregular by the Registrar. | **Irregularity Status Detected**: Guided to manual selection. |
| `NO_ACTIVE_TERM` | No enrollment period is currently active. | Generic error alert. |

---

## 4. Troubleshooting: "400 Bad Request" in Logs

If you see a `400 Bad Request` on the `/api/grades/advising/auto-advise/` endpoint (specifically with a small response size like 64-100 bytes), this is **expected behavior** for validation failures.

The backend correctly identifies that the student cannot be "Auto-Advised" (e.g., because they are a transferee with credited grades) and returns a structured JSON reason. The frontend captures this and renders the appropriate informational banner instead of a generic error popup.

---

## 5. Registrar Overrides

Registrars can bypass standard rules (such as unit limits or prerequisites) by manually creating or approving advising records for students through the Admin/Registrar dashboard.
