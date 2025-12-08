# ✅ **AGILE 8-EPIC BREAKDOWN FOR RICHWELL COLLEGES PORTAL**

---

# **EPIC 1 — Admissions & Student Onboarding**

**Scope:**
Covers online enrollment, transferee onboarding, account creation, document uploads, and admissions dashboard.

**Included from business functions:**

1. Admissions / Online Enrollment
2. Transferee Onboarding & Credit Management
3. Student Profile & Lifecycle Management (initial profile creation part)

**Tasks:**

* Public enrollment form (freshmen + transferees)
* Auto-create student account
* Monthly commitment capture, payment plan generation
* Admission dashboard
* Duplicate handling + incomplete docs workflow
* Manual transferee creation + credit assignment

**Teams:**

* **Frontend:** Lloyd, Edjohn
* **Backend:** Kirt, Anne
* **QA:** Marjorie, Yasmien, Aira
* **Documentation:** Jun

---

# **EPIC 2 — Curriculum, Subjects & Section Scheduling**

**Scope:**
Handles curriculum creation, subject prereqs, section building, schedule conflict engine.

**Included from business functions:**
3) Curriculum & Course Management
4) Sections & Scheduling Management

**Tasks:**

* CRUD for programs, subjects, prerequisites
* Curriculum versioning
* Section creator + professor assignment
* Room/time scheduling grid
* Conflict detection: student, professor, room
* Registrar override with justification

**Teams:**

* **Frontend:** Lloyd, Edjohn
* **Backend:** Kirt, Anne
* **QA:** Marjorie, Yasmien, Aira
* **Documentation:** Jun

---

# **EPIC 3 — Enrollment Flow (Subject Enrollment)**

**Scope:**
Allows students and registrar to select subjects, validate prerequisites, enforce unit cap.

**Included from business functions:**
5) Subject Enrollment (full flow)

**Tasks:**

* Student subject picker + recommended subjects
* Unit/Prereq/Conflict validation
* Payment hold rule (Month 1 must be paid)
* Registrar override panel
* Enrollment statuses (ENROLLED, INC, FAILED, RETAKE, PENDING_PAYMENT)

**Teams:**

* **Frontend:** Lloyd, Edjohn
* **Backend:** Kirt, Anne
* **QA:** Marjorie, Yasmien, Aira
* **Documentation:** Jun

---

# **EPIC 4 — Payments, Ledgers & Exam Permit Automation**

**Scope:**
Manage payment plans, transactions, receipts, exam unlocks.

**Included from business functions:**
6) Payments, Payment Plans & Exam Permits
7) Exam Permits & Exam Access
Part of 11) Notifications (payment notifications)

**Tasks:**

* 6-month payment plan per semester
* Cashier entry for payments + manual allocation
* Auto-allocation job
* Receipt PDF generation
* Exam→month mapping
* Auto-unlock exam permit when month fully paid
* Payment history UI

**Teams:**

* **Frontend:** Lloyd, Edjohn
* **Backend:** Kirt, Anne
* **QA:** Marjorie, Yasmien, Aira
* **Documentation:** Jun

---

# **EPIC 5 — Grades, GPA, INC & Retake Logic**

**Scope:**
Covers the professor grading portal, grade rules, automated INC → FAILED conversion, GPA.

**Included from business functions:**
8) Grades, GPA, INC, Retake Logic
Part of 11) Notifications (INC expiration)

**Tasks:**

* Grade submission UI for professors
* Allowed grade values validation
* Grade edit history
* Registrar finalization
* GPA recalculation job
* INC → FAILED automation (6 months major, 12 months minor)
* Academic standing updates
* Retake logic propagation

**Teams:**

* **Frontend:** Lloyd, Edjohn
* **Backend:** Kirt, Anne
* **QA:** Marjorie, Yasmien, Aira
* **Documentation:** Jun

---

# **EPIC 6 — Document Release System**

**Scope:**
Registrar tool for creating and managing official school documents.

**Included from business functions:**
10) Document Release (TOR, Certificates, etc.)

**Tasks:**

* Registrar document release UI
* Head-Registrar audit viewer
* Access controls per role
* Document revoke/reissue workflow
* Printable protected documents

**Teams:**

* **Frontend:** Lloyd, Edjohn
* **Backend:** Kirt, Anne
* **QA:** Marjorie, Yasmien, Aira
* **Documentation:** Jun

---

# **EPIC 7 — Audit, Notifications & Background Jobs**

**Scope:**
Centralized audit logging, system notifications & Celery jobs.

**Included from business functions:**
11) Notifications
12) Audit & Security
15) Background Jobs & Automation

**Tasks:**

* Audit logging framework (write-once)
* Admin & Head-Registrar audit viewers
* Notification center + UI
* Celery jobs:

  * INC expiry
  * GPA recalculation
  * Payment allocation
  * Exam permit unlock
  * Conflict check
* Impersonation logging

**Teams:**

* **Frontend:** Lloyd, Edjohn
* **Backend:** Kirt, Anne
* **QA:** Marjorie, Yasmien, Aira
* **Documentation:** Jun

---

# **EPIC 8 — Reports, Analytics & System Configuration**

**Scope:**
Reports per role, CSV/PDF export, admin settings & system config.

**Included from business functions:**
13) Reports & Analytics
14) Admin & System Configuration
16) Overrides & Escalation
17) Acceptance Criteria (covered implicitly)
18) KPIs (dashboard cards)

**Tasks:**

* Role-based reports: Enrollment, payments, grades, document releases
* CSV & PDF exports
* Dashboard KPIs
* Admin settings module (grade scale, INC rules, max units, etc.)
* Access control tuning
* Versioned config changes

**Teams:**

* **Frontend:** Lloyd, Edjohn
* **Backend:** Kirt, Anne
* **QA:** Marjorie, Yasmien, Aira
* **Documentation:** Jun

---
