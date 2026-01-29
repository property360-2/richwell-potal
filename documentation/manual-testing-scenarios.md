# Manual Testing Scenarios

Comprehensive test cases for verifying seeded data and system functionality.

---

## Test Accounts

| Account | Password | Scenario |
|---------|----------|----------|
| `admin@richwell.edu` | password123 | Full admin access |
| `registrar@richwell.edu` | password123 | Registrar functions |
| `head@richwell.edu` | password123 | Department Head (Grade approvals) |
| `cashier@richwell.edu` | password123 | Payment processing |
| `juan.dela cruz@richwell.edu` | password123 | Professor |
| `student.regular1@richwell.edu` | password123 | Regular, Paid |
| `student.regular2@richwell.edu` | password123 | Regular, Unpaid |
| `student.irregular@richwell.edu` | password123 | Irregular with retake |
| `student.overload@richwell.edu` | password123 | Overloaded student |
| `student.transferee@richwell.edu` | password123 | Transferee |
| `student.curr2024@richwell.edu` | password123 | 2024 Curriculum |
| `student.curr2025@richwell.edu` | password123 | 2025 Curriculum |

---

## 1. Grade Resolution Workflow

| # | Step | Expected Result |
|---|------|-----------------|
| 1.1 | Login as `head@richwell.edu` | Dashboard loads |
| 1.2 | Click "Resolutions" in navigation | See 1 pending resolution (PENDING_HEAD) |
| 1.3 | Click "Approve" on resolution | Success toast, forwarded to Registrar |
| 1.4 | Login as `registrar@richwell.edu` | See resolution awaiting final approval |

---

## 2. Multi-Curriculum Students

| # | Step | Expected Result |
|---|------|-----------------|
| 2.1 | Login as `student.curr2024@richwell.edu` | Student portal loads |
| 2.2 | Go to "Grades & Curriculum" | Shows **BSIT 2024 Curriculum** |
| 2.3 | Check subjects | Should NOT include "IT102" |
| 2.4 | Login as `student.curr2025@richwell.edu` | Student portal loads |
| 2.5 | Go to "Grades & Curriculum" | Shows **BSIT 2025 Curriculum** |
| 2.6 | Check subjects | Should INCLUDE "IT102 - Computing and Professional Ethics" |

---

## 3. Enrollment Validation (Section Restriction)

| # | Step | Expected Result |
|---|------|-----------------|
| 3.1 | Login as `student.regular1@richwell.edu` | Home section: BSIT-1A |
| 3.2 | Go to "Subjects" page | See available subjects |
| 3.3 | Try enrolling from BSIT-1B section | Error: "Regular students must enroll in their Home Section" |
| 3.4 | Enroll from BSIT-1A | Success |

---

## 4. Irregular Student (Retake)

| # | Step | Expected Result |
|---|------|-----------------|
| 4.1 | Login as `student.irregular@richwell.edu` | Shows "Irregular" status |
| 4.2 | Check enrolled subjects | See RETAKE subject from another section |
| 4.3 | Try enrolling NEW subject from different section | Error: "Irregular students can only take new subjects from their Home Section" |

---

## 5. Overloaded Student

| # | Step | Expected Result |
|---|------|-----------------|
| 5.1 | Login as `student.overload@richwell.edu` | Shows overload status |
| 5.2 | Check enrolled subjects | Extra subjects beyond normal load |
| 5.3 | Try enrolling any subject | Should be allowed (overload privilege) |

---

## 6. INC Grade Expiry

| # | Step | Expected Result |
|---|------|-----------------|
| 6.1 | Login as `registrar@richwell.edu` | Registrar dashboard |
| 6.2 | Look for "Expiring INC" section | 1 INC grade expiring in ~10 days |
| 6.3 | Check student details | INC finalized ~20 days ago |

---

## 7. Transferee with Credited Subjects

| # | Step | Expected Result |
|---|------|-----------------|
| 7.1 | Login as `student.transferee@richwell.edu` | Shows transferee status |
| 7.2 | Go to "Grades & Curriculum" | Shows credited subjects from previous school |

---

## 8. Payment Scenarios

| # | Step | Expected Result |
|---|------|-----------------|
| 8.1 | Login as `student.regular1@richwell.edu` | Can access exam permits |
| 8.2 | Login as `student.regular2@richwell.edu` | Shows "Pending Payment" status |
| 8.3 | Login as `cashier@richwell.edu`, search unpaid student | Can process payment |

---

## Reseed Command

```bash
python manage.py seed_full_v2 --wipe
```
