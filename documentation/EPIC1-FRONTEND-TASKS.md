# EPIC 1 — Frontend Tasks (Lloyd & Edjohn)
## Admissions & Student Onboarding

**Backend Status:** ✅ Complete  
**API Base URL:** `http://127.0.0.1:8000/api/v1/`  
**API Docs:** `http://127.0.0.1:8000/api/docs/`

---

## API Endpoints Ready

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admissions/system/enrollment-status/` | No | Check if enrollment is open |
| GET | `/admissions/programs/` | No | List available programs |
| POST | `/admissions/enroll/` | No | Submit enrollment form |
| POST | `/accounts/login/` | No | Get JWT tokens |
| POST | `/accounts/logout/` | Yes | Logout (blacklist token) |
| GET | `/accounts/me/` | Yes | Get current user profile |
| GET | `/admissions/applicants/` | Staff | List applicants |
| POST | `/admissions/enrollment/{id}/documents/` | Yes | Upload document |
| PATCH | `/admissions/documents/{id}/verify/` | Staff | Verify document |

---

## Frontend Tasks

### 1. Public Enrollment Form
- [ ] Multi-step wizard (Personal Info → Program → Documents → Payment → Confirm)
- [ ] Form fields: first_name, last_name, email, birthdate, address, contact_number
- [ ] Program selector (fetch from `/admissions/programs/`)
- [ ] Monthly commitment input (decimal)
- [ ] Transferee checkbox → shows previous_school, previous_course fields
- [ ] File upload for documents (multiple files)
- [ ] Show generated student number on success
- [ ] Handle `enrollment_link_disabled` error (check status first)

**Enrollment Payload:**
```json
{
  "email": "student@email.com",
  "first_name": "Juan",
  "last_name": "Dela Cruz",
  "birthdate": "2000-05-15",
  "address": "123 Main St",
  "contact_number": "09171234567",
  "program_id": "uuid-here",
  "monthly_commitment": 5000.00,
  "is_transferee": false
}
```

---

### 2. Login Page
- [ ] Email + password form
- [ ] Store JWT tokens (access, refresh) in localStorage/httpOnly cookie
- [ ] Redirect based on user role
- [ ] Token refresh logic

**Login Payload:**
```json
{
  "email": "user@email.com",
  "password": "password123"
}
```

**Response includes:**
```json
{
  "access": "jwt-token",
  "refresh": "refresh-token",
  "user": {
    "id": "uuid",
    "email": "...",
    "role": "STUDENT",
    "student_number": "2025-00001"
  }
}
```

---

### 3. Student Dashboard
- [ ] Show profile info from `/accounts/me/`
- [ ] Show enrollment status, payment progress
- [ ] Document upload section
- [ ] Show 6 payment buckets with progress bars

---

### 4. Admission Staff Dashboard
- [ ] List applicants from `/admissions/applicants/`
- [ ] Filter by status, created_via
- [ ] View applicant details
- [ ] Document verification workflow
- [ ] Mark documents as verified

---

## Authentication

All authenticated endpoints require:
```
Authorization: Bearer <access_token>
```

Roles in system:
- `STUDENT` - Regular students
- `PROFESSOR` - Faculty
- `CASHIER` - Payment staff
- `REGISTRAR` - Can create transferees
- `HEAD_REGISTRAR` - Senior registrar
- `ADMISSION_STAFF` - Can verify documents
- `ADMIN` - Full access

---

## Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@richwell.edu.ph | admin123 |
| Registrar | registrar@richwell.edu.ph | registrar123 |

---

## Design Notes (from notes-discussed.md)

- Use **Tailwind CSS** for styling
- Responsive design (mobile-first)
- Multi-step enrollment wizard recommended
- Show enrollment confirmation with student number
- Payment progress should show 6 month bars

---

## Questions for Backend?

Contact: **Kirt**
