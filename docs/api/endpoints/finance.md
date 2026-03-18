# Finance API

## Overview
The finance system tracks student payments and computes exam permit eligibility (Chapter/Midterm/Final). It follows an **append-only** record-keeping policy for integrity.

## Endpoints

### Payments (`/api/finance/payments/`)
Record and list student payments.

#### `POST /api/finance/payments/`
Record a new payment.
- **Auth required**: Yes (Cashier)
- **Fields**: student, term, month (1-6), amount, is_promissory, remarks.

#### `POST /api/finance/payments/adjust/`
Record a negative adjustment for corrections.
- **Auth required**: Yes (Cashier)

---

### Permits (`/api/finance/permits/`)
Check if a student is cleared for exams.

#### `GET /api/finance/permits/status/?student_id={id}&term_id={id}`
Returns the clearance status for Midterm and Final exams.
- **Logic**: Clearance is based on the student's `monthly_commitment` and total payments for specific target months.

#### `GET /api/finance/permits/my-permits/?term_id={id}`
Student-facing endpoint to check their own permit status.

## Exam Permit Rules
| Permit | Target Month | Required Amount |
|--------|--------------|-----------------|
| Chapter 1 | Month 1 | Commitment x 1 |
| Midterm | Month 3 | Commitment x 3 |
| Final | Month 5 | Commitment x 5 |
