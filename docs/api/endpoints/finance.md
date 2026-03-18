# Finance API

## Payments

Base path: `/api/finance/payments/`

Read scope:
- `STUDENT`: own payments only
- `CASHIER`, `ADMIN`: all payments
- other authenticated roles: forbidden

Write scope:
- `CASHIER` only for payment creation and adjustment

### `GET /api/finance/payments/`
Lists payments visible to the caller.

### `GET /api/finance/payments/{id}/`
Returns one payment in scope for the caller.

### `POST /api/finance/payments/`
Records a payment.

Request body:
```json
{
  "student": 1,
  "term": 2,
  "month": 1,
  "amount": "3500.00",
  "is_promissory": false,
  "remarks": "Initial payment"
}
```

### `POST /api/finance/payments/adjust/`
Records a negative adjustment. Payment records remain append-only.

## Permit Status

Base path: `/api/finance/permits/`

### `GET /api/finance/permits/status/?student_id={id}&term_id={id}`
Returns permit and clearance status for the specified student and term.

Allowed roles:
- `CASHIER`
- `ADMIN`

### `GET /api/finance/permits/my-permits/?term_id={id}`
Returns the current student's own permit status.

Allowed role:
- `STUDENT`

## Permit Rules
| Permit | Target Month | Required Amount |
|--------|--------------|-----------------|
| Chapter 1 | 1 | Monthly commitment x 1 |
| Midterm | 3 | Monthly commitment x 3 |
| Final | 5 | Monthly commitment x 5 |
