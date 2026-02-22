# Richwell Portal: Full Enrollment Flow

This document outlines the end-to-end process of student enrollment, verified against the current backend implementation and system constraints.

---

## Phase 1: Admission & Identity
**Goal:** Become a recognized student of Richwell Colleges.

1.  **Online Application:**
    *   Applicant registers and fills out the admission form.
    *   System creates a **User**, **StudentProfile**, and **Enrollment** record.
    *   **Enrollment Status:** `PENDING`.
2.  **Admissions Evaluation:**
    *   Admissions Office reviews the documents.
    *   Action: **Accept** (Sets status to `ACTIVE`) or **Admit** (Sets status to `ADMITTED`).
3.  **Student ID Issuance:**
    *   System assigns a **Student Number** (e.g., `2026-00001`).

---

## Phase 2: Automated Sectioning & Grouping
**Goal:** Efficiently assign students to blocks while optimizing for specific needs (e.g., working students).

> [!IMPORTANT]
> This phase is now **Automated**. Admitted students are placed in a **Sectioning Queue** where the backend engine auto-assigns them to available slots.

4.  **Automated Sectioning Queue:**
    *   **Admission to Queue:** Once a student is admitted and assigned an ID, they are automatically queued.
    *   **Engine Processing:** The `SectioningEngine` processes the queue on a first-come, first-served basis, assigning regular students to sections with available capacity.
    *   **Auto-Subject Enrollment:** Upon section assignment, the student is automatically enrolled in all subjects associated with that section's curriculum.
5.  **Registrar Oversight & Manual Grouping:**
    *   **Manual Re-sectioning:** Despite automation, the Registrar retains full control. They can move students between sections at any time via the **Section Manager** (as long as capacity allow).
    *   **Custom Grouping:** The Registrar can manually group students with specific needs or preferences into dedicated sections to align schedules.
    *   **Load Balancing:** Registrar handles re-balancing if a section becomes over-congested or under-filled.

---

## Phase 3: Subject Selection & Academic Approval
**Goal:** Select subjects and get academic clearance.

6.  **Subject Selection:**
    *   Student selects subjects via Portal.
    *   **Subject Enrollment Status:** `PENDING_HEAD`.
7.  **Department Head Approval:**
    *   Head reviews and approves the subjects in the **Head Dashboard**.
    *   Flag: `head_approved = True`.

---

## Phase 4: Financial Settlement
**Goal:** Finalize enrollment through the Cashier.

8.  **Payment Recording:**
    *   Student pays the downpayment or subject enrollment fee.
    *   Cashier records payment in the system.
9.  **Payment Approval:**
    *   Once **Month 1** is fully paid, the system automatically sets `payment_approved = True` for all subjects.

---

## Phase 5: Finalization
**Goal:** Become fully enrolled and see the class schedule.

10. **Automatic Finalization:**
    *   When **BOTH** `head_approved` and `payment_approved` are `True`:
    *   **Subject Enrollment Status:** -> `ENROLLED`.
11. **Portal Activation:**
    *   The student's section and a detailed **Class Schedule** (with Rooms and Professors) appear on the Dashboard.

---

## Summary of Status Transitions
| Phase | Action | Who | Backend Status / Flag |
| :--- | :--- | :--- | :--- |
| **Admission** | Application Submitted | Student | `PENDING` |
| **Admission** | Accepted | Admissions | `ACTIVE` |
| **Sectioning** | Assigned to Block | Registrar | `home_section` assigned |
| **Academic** | Subject Selected | Student | `PENDING_HEAD` |
| **Academic** | Head Approved | Dept. Head | `head_approved = True` |
| **Financial** | Downpayment Met | Cashier | `payment_approved = True` |
| **Final** | All Approvals Met | System | `ENROLLED` |
