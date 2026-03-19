# Payment & Permit Issuance Master Flow

## Summary
The application uses a **6-month cumulative balance model** to determine student eligibility for exam permits. Payments are automatically detected, reference numbers are system-generated, and permits are unlocked as the total career balance for the term meets specific thresholds.

## Process Map

### 1. Payment Recording (Cashier)
- **Search**: Cashier searches for a student via IDN or Name.
- **Entry**: Only the `Amount` and `Notes` (e.g., OR#) are required. 
- **Auto-Month**: System detects the earliest uncleared month (1-6) and assigns the payment.
- **Auto-Reference**: A unique `PAY-YYYYMMDD-XXXX` reference is generated.
- **Append-Only**: Once saved, transactions cannot be edited or deleted.

### 2. Permit Eligibility (Cumulative Model)
Eligibility is calculated by comparing the **Total Paid All-Time** (for the active term) against the **Expected Cumulative Balance**.

Calculated as: `Total Payments >= (Monthly Commitment * Month Index)`

| Month | Permit Type | Cumulative Requirement |
|-------|-------------|------------------------|
| 1 | Enrollment | `Commitment * 1` |
| 2 | Chapter Test | `Commitment * 2` |
| 3 | Prelims | `Commitment * 3` |
| 4 | Midterms | `Commitment * 4` |
| 5 | Pre-Finals | `Commitment * 5` |
| 6 | Finals | `Commitment * 6` |

### 3. Student Dashboard (Self-Service)
- **Tabbed View**: Students have two dedicated tabs: **Permit Status** and **Transaction History**.
- **Cumulative Status**: The Permit Status tab displays a table of all exam permits, their required cumulative balance, and their current clearance status (`PAID`, `PROMISSORY`, or `UNSETTLED`).
- **E-Permit Download**: Once a permit is `PAID` or `PROMISSORY`, students can download an official e-permit document directly from the dashboard.
- **Audit Trail**: Full historical transactions are visible in the History tab, mirroring the cashier's ledger for transparency.

### 4. Promissory Note Flow
- **Override**: If a student cannot pay the full threshold, a manual `is_promissory` record can be created for a specific month by a cashier.
- **Grant**: The `PROMISSORY` status locks that month as "Cleared" for the associated permit.
- **Restriction**: Promissory notes for Month 2+ require that **Month 1** has at least one payment record (partial or full) or a prior promissory note.

## Technical Reference
- **Frontend (Cashier)**: `frontend/src/pages/cashier/PaymentProcessing.jsx`
- **Frontend (Student)**: `frontend/src/pages/student/FinancialSummary.jsx`
- **Backend Service**: `backend/apps/finance/services/payment_service.py`
- **Model**: `Payment` (fields: `month`, `amount`, `is_promissory`, `notes`, `reference_number`, `processed_by`)

---
> [!IMPORTANT]
> This system replaces the legacy per-transaction clearance model. Partial payments now directly contribute to the next permit threshold, allowing students to pay in any increment.
