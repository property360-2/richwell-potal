# Payment Lifecycle Flow

## Summary
Enrollment fee -> Monthly commitments -> Permit generation.

## Step-by-step

### 1. Initial Deposit (Month 1)
- User pays the first installment.
- Calls `POST /api/finance/payments/`.
- **Effect**: If the amount matches or exceeds the `monthly_commitment`, the student is cleared for **Chapter 1**.

### 2. Monthly Installments
- Payments are recorded for months 1 through 6.
- The system keeps a running total of payments for the term.

### 3. Permit Generation
- When a student (or staff) checks `/api/finance/permits/status/`:
- **Midterm Permit**: Checked when 3 months' worth of commitment has been paid.
- **Final Permit**: Checked when 5 months' worth of commitment has been paid.
- **Logic**: If `total_payments >= (monthly_commitment * target_month)`, permit is `ACTIVE`.

### 4. Adjustments
- If a mistake is made, the Cashier records an **Adjustment**.
- **Rule**: Payments are never edited or deleted—only adjusted with a new record.

## Files involved
| File | Role |
|------|------|
| `PaymentService` | Logic for computing totals and permit status |
| `Payment` | Model tracking each transaction |
| `finance/views.py` | API endpoints for Cashiers and Students |
