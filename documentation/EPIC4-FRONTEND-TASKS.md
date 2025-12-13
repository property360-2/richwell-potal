# EPIC 4 — Frontend Tasks
## Payments, Ledgers & Exam Permit Automation

> **Backend Status**: ✅ Fully Implemented  
> **Last Updated**: December 13, 2025

---

## Summary

EPIC 4 covers the complete payment lifecycle:
- Cashier payment entry and allocation
- Student payment dashboard with balance view
- Auto-allocation of payments to monthly buckets
- Exam permit generation when month is paid
- Receipt generation (PDF - future enhancement)

---

## API Endpoints

All endpoints are prefixed with `/api/v1/admissions/`

### Payment Endpoints (Cashier/Registrar)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/payments/record/` | Record a new payment | Cashier/Registrar |
| POST | `/payments/adjust/` | Create payment adjustment | Cashier/Registrar |
| GET | `/payments/transactions/` | List all transactions | Registrar |
| GET | `/payments/student/{enrollment_id}/` | Get student payment summary | Cashier/Registrar |

### Student Payment Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/my-enrollment/payments/` | Get my payment summary | Student |

### Exam-Month Mapping Endpoints (Admin/Registrar)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/exam-mappings/` | List exam-month mappings | Registrar |
| POST | `/exam-mappings/` | Create new mapping | Registrar |
| PATCH | `/exam-mappings/{id}/` | Update mapping | Registrar |
| DELETE | `/exam-mappings/{id}/` | Delete mapping | Registrar |

### Exam Permit Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/my-enrollment/exam-permits/` | Get my exam permit status | Student |
| POST | `/exam-permits/{exam_period}/generate/` | Generate exam permit | Student |
| POST | `/exam-permits/{permit_id}/print/` | Mark permit as printed | Student/Staff |
| GET | `/exam-permits/` | List all permits (admin) | Registrar |

---

## Example Requests & Responses

### Record Payment

**Request:**
```http
POST /api/v1/admissions/payments/record/
Authorization: Bearer <cashier_token>
Content-Type: application/json

{
  "enrollment_id": "uuid-of-enrollment",
  "amount": 5000.00,
  "payment_mode": "CASH",
  "reference_number": "",
  "notes": "Monthly payment"
}
```

**Payment Modes:**
- `CASH` - Cash payment
- `ONLINE` - Online banking
- `GCASH` - GCash
- `MAYA` - Maya
- `CHECK` - Check
- `OTHER` - Other payment method

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Payment of ₱5000.00 recorded successfully",
  "data": {
    "id": "uuid",
    "receipt_number": "RCV-20251213-00001",
    "amount": "5000.00",
    "payment_mode": "CASH",
    "payment_mode_display": "Cash",
    "allocated_buckets": [
      {"bucket_id": "uuid", "month": 1, "amount": 5000.00}
    ],
    "processed_by_name": "John Cashier",
    "processed_at": "2025-12-13T21:00:00Z"
  }
}
```

### Manual Allocation (Pay Specific Month)

```json
{
  "enrollment_id": "uuid",
  "amount": 3000.00,
  "payment_mode": "GCASH",
  "reference_number": "GC-123456",
  "allocations": [
    {"month": 2, "amount": 3000.00}
  ]
}
```

---

### Get My Payment Summary (Student)

**Request:**
```http
GET /api/v1/admissions/my-enrollment/payments/
Authorization: Bearer <student_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_required": 30000.00,
    "total_paid": 10000.00,
    "balance": 20000.00,
    "is_fully_paid": false,
    "buckets": [
      {
        "month": 1,
        "required": 5000.00,
        "paid": 5000.00,
        "remaining": 0.00,
        "is_fully_paid": true,
        "percentage": 100.0
      },
      {
        "month": 2,
        "required": 5000.00,
        "paid": 5000.00,
        "remaining": 0.00,
        "is_fully_paid": true,
        "percentage": 100.0
      },
      {
        "month": 3,
        "required": 5000.00,
        "paid": 0.00,
        "remaining": 5000.00,
        "is_fully_paid": false,
        "percentage": 0.0
      }
      // ... months 4-6
    ],
    "recent_transactions": [
      {
        "id": "uuid",
        "receipt_number": "RCV-20251213-00001",
        "amount": 5000.00,
        "payment_mode": "CASH",
        "processed_at": "2025-12-13T21:00:00Z",
        "is_adjustment": false
      }
    ]
  }
}
```

---

### Create Exam-Month Mapping

**Request:**
```http
POST /api/v1/admissions/exam-mappings/
Authorization: Bearer <registrar_token>
Content-Type: application/json

{
  "semester_id": "uuid-of-current-semester",
  "exam_period": "PRELIM",
  "required_month": 1
}
```

**Exam Periods:**
- `PRELIM` - Preliminary Exam
- `MIDTERM` - Midterm Exam
- `PREFINAL` - Pre-Final Exam
- `FINAL` - Final Exam

**Response:**
```json
{
  "success": true,
  "message": "Preliminary Exam mapped to Month 1",
  "data": {
    "id": "uuid",
    "semester_name": "1st Semester 2025-2026",
    "exam_period": "PRELIM",
    "exam_period_display": "Preliminary Exam",
    "required_month": 1,
    "is_active": true
  }
}
```

---

### Get My Exam Permits (Student)

**Request:**
```http
GET /api/v1/admissions/my-enrollment/exam-permits/
Authorization: Bearer <student_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "permits": [
      {
        "exam_period": "PRELIM",
        "exam_period_label": "Preliminary Exam",
        "status": "GENERATED",
        "permit_code": "EXP-20251213-00001",
        "permit_id": "uuid",
        "is_printed": false,
        "required_month": 1
      },
      {
        "exam_period": "MIDTERM",
        "exam_period_label": "Midterm Exam",
        "status": "LOCKED",
        "permit_code": null,
        "permit_id": null,
        "is_printed": false,
        "required_month": 2
      },
      {
        "exam_period": "PREFINAL",
        "exam_period_label": "Pre-Final Exam",
        "status": "LOCKED",
        "permit_code": null,
        "permit_id": null,
        "is_printed": false,
        "required_month": 4
      },
      {
        "exam_period": "FINAL",
        "exam_period_label": "Final Exam",
        "status": "LOCKED",
        "permit_code": null,
        "permit_id": null,
        "is_printed": false,
        "required_month": 6
      }
    ],
    "semester": "1st Semester 2025-2026"
  }
}
```

**Permit Status Values:**
- `GENERATED` - Permit available, can print
- `ELIGIBLE` - Month is paid, can generate permit
- `LOCKED` - Required month not fully paid
- `NOT_CONFIGURED` - No mapping exists for this exam period

---

### Generate Exam Permit

**Request:**
```http
POST /api/v1/admissions/exam-permits/PRELIM/generate/
Authorization: Bearer <student_token>
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Exam permit generated for Preliminary Exam",
  "data": {
    "id": "uuid",
    "permit_code": "EXP-20251213-00001",
    "exam_period": "PRELIM",
    "exam_period_display": "Preliminary Exam",
    "required_month": 1,
    "is_printed": false,
    "is_valid": true
  }
}
```

**Error (Payment not complete):**
```json
{
  "success": false,
  "error": "Month 1 payment not complete (₱2000.00 remaining)"
}
```

---

### Create Payment Adjustment

**Request:**
```http
POST /api/v1/admissions/payments/adjust/
Authorization: Bearer <registrar_token>
Content-Type: application/json

{
  "transaction_id": "uuid-of-original-transaction",
  "adjustment_amount": -500.00,
  "reason": "Refund for overpayment - student request"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Adjustment recorded successfully",
  "data": {
    "id": "uuid",
    "receipt_number": "RCV-20251213-00002",
    "amount": "-500.00",
    "is_adjustment": true,
    "adjustment_reason": "Refund for overpayment - student request"
  }
}
```

---

## Test Accounts

Use the same accounts from EPIC 1:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@richwell.edu.ph | admin123 |
| Registrar | registrar@richwell.edu.ph | registrar123 |

---

## Default Exam-Month Mappings (Suggested)

```
PRELIM   → Month 1
MIDTERM  → Month 2
PREFINAL → Month 4
FINAL    → Month 6
```

---

## Frontend Tasks Checklist

### Cashier Dashboard
- [ ] **Payment Entry Form**
  - Student search by student number or name
  - Amount input with validation
  - Payment mode dropdown
  - Optional reference number (for online payments)
  - Optional manual month allocation
  - Print receipt after recording

- [ ] **Transaction List View**
  - Date range filter
  - Payment mode filter
  - Search by receipt number
  - View transaction details
  - Create adjustment button (with modal)

### Student Dashboard
- [ ] **Payment Summary Card**
  - Total required vs paid
  - Balance remaining
  - Visual progress bar
  - 6-month breakdown table

- [ ] **Payment History Tab**
  - List of recent transactions
  - Receipt number and date
  - Amount and payment mode

- [ ] **Exam Permits Section**
  - 4 cards for each exam period (PRELIM, MIDTERM, PREFINAL, FINAL)
  - Show status badge (LOCKED/ELIGIBLE/GENERATED)
  - "Generate Permit" button when ELIGIBLE
  - "Print Permit" button when GENERATED
  - Show required payment month

### Registrar/Admin Settings
- [ ] **Exam-Month Mapping Configuration**
  - Select semester
  - Configure which month unlocks which exam
  - Toggle active/inactive
  - Add/edit/delete mappings

- [ ] **Payment Reports**
  - Daily/weekly collection summary
  - Outstanding balances list
  - Payment mode breakdown

---

## Key UI Considerations

1. **Payment Flow:**
   - Cashier selects student → Views balance → Enters amount → Confirms → Prints receipt

2. **Permit Generation:**
   - Permits auto-unlock when month is paid
   - Students click "Generate" → System creates permit with unique code
   - Students can print permit (mark as printed)

3. **Visual Indicators:**
   - ✅ Green badge for fully paid months
   - 🟡 Yellow for partially paid
   - 🔴 Red for unpaid
   - 🔒 Lock icon for locked permits
   - 🎫 Ticket icon for generated permits
