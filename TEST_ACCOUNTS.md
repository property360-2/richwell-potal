# Test Accounts & Scenarios

This document contains test accounts for various enrollment scenarios.

## Quick Start

After pulling the code, run these commands to set up test data:

```powershell
cd backend
python manage.py migrate
python manage.py loaddata fixtures/test_subjects.json
Get-Content seed_test_data.py | python manage.py shell
```

---

## Staff Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@richwell.edu.ph | admin123 |
| Admission Staff | admission@richwell.edu.ph | admission123 |
| Registrar | registrar@richwell.edu.ph | registrar123 |
| Cashier | cashier@richwell.edu.ph | cashier123 |
| Professor | professor@richwell.edu.ph | prof123 |
| Dept Head | jcamit@richwell.edu.ph | head123 |

---

## Student Test Scenarios

### 1. Student with INC (Blocked from enrolling)
| Field | Value |
|-------|-------|
| Email | student_inc@test.com |
| Password | test123 |
| Program | BSIT |
| Year Level | 2 |
| Status | Has **INC** in IT102 |

**Expected Behavior:** Cannot enroll in IT201 because IT102 (prerequisite) has INC status.

---

### 2. Student with PASSED prerequisites
| Field | Value |
|-------|-------|
| Email | student_passed@test.com |
| Password | test123 |
| Program | BSIT |
| Year Level | 2 |
| Status | **PASSED** IT101, IT102 |

**Expected Behavior:** CAN enroll in IT201 (prerequisite IT102 is passed).

---

### 3. Fresh Year 1 Student
| Field | Value |
|-------|-------|
| Email | student_fresh@test.com |
| Password | test123 |
| Program | BSIT |
| Year Level | 1 |
| Status | No subjects taken yet |

**Expected Behavior:** Can only see and enroll in Year 1 subjects.

---

### 4. Transferee with CREDITED subjects
| Field | Value |
|-------|-------|
| Email | student_transferee@test.com |
| Password | test123 |
| Program | BSIT |
| Year Level | 2 |
| Status | **CREDITED** IT101, IT102 |

**Expected Behavior:** CAN enroll in IT201 (credited subjects count as passed).

---

## Prerequisite Chain (BSIT)

```
IT102 (Programming 1) → IT201 (Programming 2) → IT202 (Data Structures)
                                              → IT203 (OOP)
```

---

## Demo Student Account

| Field | Value |
|-------|-------|
| Email | student@richwell.edu.ph |
| Password | student123 |
| Program | Any |

Use this for general testing.
