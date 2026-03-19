# Permit & Payment System (6-Month Cycle)

This document describes the automated permit issuance and payment recording system implemented for the 6-month academic payment cycle.

## 1. Permit Schedule
Permits are dynamically granted based on the settlement (clearpnce) of specific monthly installments.

| Month | Permit Type | Requirement |
|-------|-------------|-------------|
| 1 | Subject Enrollment | Initial payment or Promissory Note |
| 2 | Chapter Test | Month 2 settlement |
| 3 | Prelims | Month 3 settlement |
| 4 | Midterms | Month 4 settlement |
| 5 | Pre-Finals | Month 5 settlement |
| 6 | Finals | Month 6 settlement |

## 2. Automated Payment Features

### Cumulative Balance Model
The system uses a **Cumulative Balance** requirement to determine eligibility. Permits are not cleared per-payment, but rather when the **Total All-Time Payments** for the term reach the threshold for that month index.

**Logic:**
1. System calculates `total_paid` for the student for the active term.
2. Permit for Month `m` is granted if `total_paid >= (monthly_commitment * m)`.
3. Overpayments for Month 1 automatically clear Month 2, Month 3, etc., as their respective cumulative thresholds are met.
4. Partial payments are held in the ledger until the next threshold is crossed.

### Automated Month Detection
The system automatically assigns payments to the **earliest unpaid month** (1 through 6). This simplifies the cashier's workflow by removing manual dropdown selection.

**Logic:**
1. System checks the student's ledger for the active term.
2. Identifies the smallest month index `m` where `total_paid < monthly_commitment` and `is_promissory` is False.
3. Assigns the new payment to month `m`.

### System-Generated Reference Numbers
Each payment generates a unique reference number following the format: `PAY-YYYYMMDD-[4-CHAR-HEX]`.
*Example: `PAY-20260319-A7B2`*

### Notes Field
The `notes` field (previously `remarks`) is used for recording administrative details such as Official Receipt (OR) numbers or payment methods.

## 3. Promissory Note Rules
Promissory notes allow students to receive a permit without a full cash payment for a specific month.
- **Overriding**: Tagging a month as `is_promissory=True` clears that month for permit eligibility.
- **Dependency**: A promissory note for Month 2 onwards requires that **Month 1** has at least one recorded payment (partial or full).

## 4. Technical Implementation

### Backend
- **Model**: `apps.finance.models.Payment`
- **Service**: `apps.finance.services.payment_service.PaymentService`
- **API**: `/api/finance/payments/next-payment/` (Calculates due dates and commitments)

### Frontend
- **Page**: `/cashier/processing` (`PaymentProcessing.jsx`)
- **Student View**: `/student/finance` (`FinancialSummary.jsx`)

---
> [!NOTE]
> This system follows an **append-only** audit policy. Payments cannot be edited or deleted once saved. To correct an entry, a new balancing record must be added (contact system administrator for back-end adjustments).
