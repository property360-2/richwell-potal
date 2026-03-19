# Payment Lifecycle Flow

## Summary
- **Logic**: If `total_payments_for_term >= (monthly_commitment * month_index)`, the status is `PAID`.
- **Promissory**: If `is_promissory` exists for that month, status is `PROMISSORY` and permit is `ELIGIBLE`.
Enrollment fee -> Monthly commitments (1-6) -> Automated Permit generation.

## Step-by-step

### 1. Payment Recording (Months 1-6)
- Cashier records a payment via `POST /api/finance/payments/`.
- **Automated Month Detection**: The system identifies the earliest "un-cleared" month (1 to 6) for the student.
- **Reference Numbers**: The system generates a unique `PAY-YYYYMMDD-XXXX` ID for each transaction.
- **Notes**: Financial staff can record specific details (e.g., OR number, payment method) in the `notes` field.

### 2. Permit Generation Logic
- Permits are dynamically granted based on the settlement of each month's commitment.
- **Month 1**: Subject Enrollment
- **Month 2**: Chapter Test Permit
- **Month 3**: Prelims Permit
- **Month 4**: Midterm Permit
- **Month 5**: Pre-Finals Permit
- **Month 6**: Final Exam Permit

### 3. Promissory Notes
- Financial staff can override a payment requirement by flagging a month as **is_promissory**.
- **Rule**: A promissory note for Month 2 or later requires that Month 1 has at least one recorded payment.

### 4. Student Retrieval (Self-Service)
- Students can access their permits via the **Financial Summary** dashboard.
- **E-Permit Retrieval**: If a permit status is `PAID` or `PROMISSORY`, a download button is enabled.
- **Verification**: The system generates a text-based e-permit containing student credentials and a verification ID.

### 5. Append-Only Auditing
- Payments cannot be edited or deleted once saved. This ensures a permanent audit trail.

## Files involved
| File | Role |
|------|------|
| `PaymentService` | Core logic for automated months, references, and permit calculation |
| `Payment` | Model tracking transactions, notes, and system-generated IDs |
| `finance/views.py` | API endpoints including `/next-payment/` for calculating due dates |
| `PaymentProcessing.jsx` | Cashier interface for searching students and recording payments |
