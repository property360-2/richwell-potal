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

### 3. Promissory Note Flow
- **Override**: If a student cannot pay the full threshold, a manual `is_promissory` record can be created for a specific month.
- **Grant**: The `PROMISSORY` status locks that month as "Cleared" for the associated permit.
- **Restriction**: Promissory notes for Month 2+ require that **Month 1** has at least one payment record (partial or full).

## Technical Reference
- **Frontend**: `frontend/src/pages/cashier/PaymentProcessing.jsx`
- **Backend Service**: `backend/apps/finance/services/payment_service.py`
- **Model**: `Payment` (fields: `month`, `amount`, `is_promissory`, `notes`, `reference_number`)

---
> [!IMPORTANT]
> This system replaces the legacy per-transaction clearance model. Partial payments now directly contribute to the next permit threshold, allowing students to pay in any increment.
