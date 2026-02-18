# Richwell Portal — Full System Audit & Continuation Plan

> **Prepared**: 2026-02-18  
> **Scope**: Backend (Django REST) + Frontend (React + Vite)

---

## PHASE 1 — System Understanding

### 1.1 Backend Architecture

| Layer | Technology | Notes |
|---|---|---|
| Framework | Django 5 + DRF | RESTful API at `/api/v1/` |
| Auth | SimpleJWT | Access (1h) + Refresh (1d) tokens |
| DB | SQLite (dev) | UUID primary keys via `BaseModel` |
| Apps | 5 total | `accounts`, `academics`, `enrollment`, `audit`, `core` |

**App Responsibilities**:

| App | Endpoints | Purpose |
|---|---|---|
| `accounts` | 12 | Auth, profiles, users, staff, password reset |
| `academics` | 30+ | Programs, subjects, sections, schedules, curricula, rooms, professors, archives |
| `enrollment` | 50+ | Admissions, payments, grading, exam permits, documents, COR, reports |
| `audit` | 4 | Immutable logs, dashboard alerts |
| `core` | 6 | System config, notifications |

### 1.2 Frontend Architecture

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite |
| Routing | React Router v6 |
| State | Context API (AuthContext, ToastContext) |
| HTTP | Custom `api` client with JWT auto-refresh |
| UI | 18 reusable components in `/components/ui/` |

**Registered Routes (30 total)**:

| Role | Pages | Route Prefix |
|---|---|---|
| Student | 5 (Dashboard, Grades, Schedule, SOA, SubjectEnrollment) | `/student/`, `/enrollment/` |
| Registrar | 11 (Dashboard, Students, Subjects, Semesters, Sections, COR, INC, Grades, Finalization) | `/registrar/` |
| Professor | 3 (Dashboard, Schedule, Grades) | `/professor/` |
| Admission | 1 (Dashboard) | `/admission/` |
| Head | 3 (Dashboard, Reports, Resolutions) | `/head/` |
| Cashier | 1 (Dashboard) | `/cashier/` |
| Admin | 4 (Users, Config, Audit Logs, Term Mgmt) | `/admin/` |
| Academics | 2 (Programs List, Program Detail) | `/academics/` |

---

## PHASE 2 — Business Function Mapping

### 2.1 Core Business Domain

**Academic Student Management System** — manages the full lifecycle from admission → enrollment → subject selection → payment → grading → document release for a private college (Richwell Colleges).

### 2.2 Actors

| Actor | Role Key | Primary Functions |
|---|---|---|
| Applicant | (public) | Submit online enrollment form |
| Student | `STUDENT` | View dashboard, schedule, grades, SOA; enroll in subjects |
| Professor | `PROFESSOR` | View schedule, submit/bulk-submit grades |
| Admission Staff | `ADMISSION_STAFF` | Review applicants, approve/reject, assign Student IDs |
| Cashier | `CASHIER` | Search students, record payments, view daily transactions |
| Registrar | `REGISTRAR` | Student masterlist, COR, INC management, grade finalization, documents |
| Department Head | `DEPARTMENT_HEAD` | Approve enrollments, resolve grades, view reports |
| Head Registrar | `HEAD_REGISTRAR` | Academic management (programs, curricula) |
| Superadmin | `ADMIN` | User management, system config, audit logs, term management |

### 2.3 End-to-End Business Flows

#### Flow A: Applicant → Enrolled Student

```
Applicant submits form → System creates PENDING enrollment
    → Admission Staff reviews → Assigns Student Number (ACTIVE)
    → Student logs in → Selects subjects → Cashier records Month 1 payment
    → Head approves enrollment → Student is FULLY ENROLLED
```

**Status**: ✅ Mostly Complete (Frontend + Backend wired)

#### Flow B: Payment → Exam Permit

```
Cashier records payment for Month N
    → MonthlyPaymentBucket marked PAID
    → Student generates Exam Permit for corresponding exam period
    → Registrar prints permit
```

**Status**: ❌ **Exam Permit frontend pages missing entirely**

#### Flow C: Professor → Grade Submission → Finalization

```
Professor views assigned sections → Selects section/subject
    → Enters grades (single or bulk) → Submits
    → Registrar reviews → Finalizes grades (locks section)
    → System auto-detects INC grades → Processes expired INCs
```

**Status**: ✅ Backend complete, ⚠️ Frontend partially wired

#### Flow D: Document Release

```
Registrar searches student → Checks enrollment status
    → Creates DocumentRelease (TOR, Good Moral, etc.)
    → System generates document code
    → Student/Admin can view, revoke, or reissue
```

**Status**: ⚠️ Backend complete, frontend **not yet built**

#### Flow E: Password Reset

```
User clicks "Forgot Password" → Enters email
    → System sends reset link → User clicks link
    → Validates token → User sets new password
```

**Status**: ✅ Backend complete, ❌ **No frontend page for reset**

---

## PHASE 3 — Gap Analysis

### 3.1 Backend Features NOT Exposed in Frontend

| Backend Feature | Endpoint | Frontend Status |
|---|---|---|
| **Exam Permits** | `my-exam-permits/`, `generate-exam-permit/`, `print-exam-permit/` | ❌ No page, no API endpoint in `api.jsx` |
| **Password Reset** | `password/request-reset/`, `password/reset/` | ❌ No page (endpoint in `api.jsx` but no UI) |
| **Document Release** | `documents/release/`, `documents/all/`, `documents/stats/` | ❌ No management page |
| **Export Endpoints** | `export/students/`, `export/enrollments/`, `export/payments/` | ⚠️ No endpoints in `api.jsx` (ExportButton component exists but uses local logic) |
| **Exam Month Mapping** | `exam-mappings/` | ❌ No admin UI to configure mappings |
| **Payment Adjustments** | `payments/adjust/` | ❌ No UI in Cashier |
| **Payment Transactions List** | `payments/transactions/` | ❌ No admin-level payment log |
| **Academic Standing** | `students/<id>/standing/` | ❌ No UI |
| **Registrar Override Enroll** | `enrollment/<id>/override-enroll/` | ⚠️ Endpoint in `api.jsx`, no visible UI button |
| **Dashboard Alerts** | `audit/dashboard/alerts/` | ❌ Not used in any dashboard |

### 3.2 Frontend Features NOT Supported by Backend

| Frontend Element | Status |
|---|---|
| `NotificationBell.jsx` component | ✅ Backend exists (`/core/notifications/`) |
| Permission Management UI (commented out URLs) | ⚠️ Backend URL routes are commented out in `accounts/urls.py` |
| `WelcomePage` component | 🟡 Dead code — never routed (root redirects to `/auth/login`) |
| Staff management (`/accounts/staff/`) | ✅ Backend exists |

### 3.3 Inconsistent API Contracts

| Issue | Details |
|---|---|
| Duplicate `incReport` key | Defined twice in `api.jsx` (lines 331 and 354) |
| Duplicate `generateCor`/`generateCOR` | Two keys for the same endpoint (lines 356 and 365) |
| `registrarStudentSearch` reuses cashier endpoint | Shares `/admissions/cashier/students/search/` — not wrong but unclear |
| Permission endpoints commented out | Backend URLs commented out, but `api.jsx` has full endpoint definitions |

### 3.4 Dead Code

| Item | Location | Type |
|---|---|---|
| `WelcomePage` | `App.jsx:290-309` | Unused component (never routed) |
| `NotFoundPage` | `App.jsx:311-319` | Unused (fallback redirects to `/` instead) |
| Permission endpoint definitions | `api.jsx:387-390` | Backend routes commented out |

---

## PHASE 4 — System Cleanup Plan

### 4.1 REMOVE

| Target | File | Reason |
|---|---|---|
| `WelcomePage` component | `App.jsx` | Never rendered, dead code |
| Duplicate `incReport` key | `api.jsx:354` | Already defined at line 331 |
| Duplicate `generateCor` key | `api.jsx:356` | Already defined as `generateCOR` at line 365 |
| Commented permission URLs | `accounts/urls.py` | Not implemented, remove or uncomment |

### 4.2 FIX

| Target | File(s) | Issue |
|---|---|---|
| Fallback route | `App.jsx:280` | Should render `NotFoundPage` instead of redirect |
| Export endpoints | `api.jsx` | Add `export/students/`, `export/enrollments/`, `export/payments/` |
| Exam permit endpoints | `api.jsx` | Add all exam permit endpoints |
| `registrarStudentSearch` naming | `api.jsx:342` | Rename or create a dedicated registrar search endpoint |

### 4.3 COMPLETE

| Feature | Backend | Frontend | Priority |
|---|---|---|---|
| Exam Permit System | ✅ Done | ❌ Build pages + api endpoints | 🔴 HIGH |
| Password Reset Page | ✅ Done | ❌ Build `/auth/forgot-password` and `/auth/reset-password` pages | 🔴 HIGH |
| Document Release Management | ✅ Done | ❌ Build registrar document management page | 🟡 MEDIUM |
| Payment Adjustments UI | ✅ Done | ❌ Add to Cashier dashboard | 🟡 MEDIUM |
| Exam Month Mapping Config | ✅ Done | ❌ Add to Admin/Registrar settings | 🟡 MEDIUM |
| Academic Standing UI | ✅ Done | ❌ Add to Student Detail page | 🟢 LOW |
| Dashboard Alerts | ✅ Done | ❌ Integrate into role dashboards | 🟢 LOW |
| Registrar Override Button | ✅ Done | ⚠️ Wire into section detail | 🟢 LOW |

---

## PHASE 5 — Structured Continuation Plan

### Phase A — Fix Critical Business Flows (Week 1)

| # | Task | Where | Files | Deps | Complexity |
|---|---|---|---|---|---|
| A1 | Build Password Reset pages | Frontend | `pages/auth/ForgotPassword.jsx`, `pages/auth/ResetPassword.jsx`, `App.jsx` | None | ⭐⭐ |
| A2 | Build Exam Permit endpoints in api.jsx | Frontend | `api.jsx` | None | ⭐ |
| A3 | Build Student Exam Permit page | Frontend | `pages/student/ExamPermits.jsx`, `App.jsx` | A2 | ⭐⭐⭐ |
| A4 | Build Registrar Exam Permit management | Frontend | `pages/registrar/ExamPermits.jsx`, `App.jsx` | A2 | ⭐⭐⭐ |
| A5 | Build Exam Month Mapping config page | Frontend | `pages/admin/ExamMappings.jsx` or embed in `TermManagement.jsx` | A2 | ⭐⭐ |
| A6 | Clean up dead code & duplicates | Frontend | `App.jsx`, `api.jsx` | None | ⭐ |

### Phase B — Complete Missing Core Features (Week 2)

| # | Task | Where | Files | Deps | Complexity |
|---|---|---|---|---|---|
| B1 | Build Document Release page | Frontend | `pages/registrar/documents/Management.jsx`, `App.jsx` | None | ⭐⭐⭐ |
| B2 | Add Export endpoints to api.jsx | Frontend | `api.jsx` | None | ⭐ |
| B3 | Wire ExportButton to backend exports | Frontend | `components/ui/ExportButton.jsx` | B2 | ⭐⭐ |
| B4 | Add Payment Adjustment to Cashier | Frontend | `pages/cashier/index.jsx` | None | ⭐⭐ |
| B5 | Add payment transaction log (Admin) | Frontend | `pages/admin/PaymentLog.jsx` or embed in dashboard | None | ⭐⭐ |
| B6 | Add Academic Standing to Student Detail | Frontend | `pages/registrar/students/Detail.jsx` | None | ⭐ |

### Phase C — UI Refinement (Week 3)

| # | Task | Where | Files | Deps | Complexity |
|---|---|---|---|---|---|
| C1 | Integrate Dashboard Alerts | Frontend | All dashboard pages | None | ⭐⭐ |
| C2 | Add Registrar Override button | Frontend | `pages/registrar/sections/Detail.jsx` | None | ⭐ |
| C3 | Use `NotFoundPage` for 404 fallback | Frontend | `App.jsx` | None | ⭐ |
| C4 | Deduplicate admission/dashboard routes | Frontend | `App.jsx` | None | ⭐ |
| C5 | Add loading skeletons to all pages | Frontend | All pages | None | ⭐⭐ |
| C6 | Responsive audit on mobile breakpoints | Frontend | All pages | None | ⭐⭐⭐ |

### Phase D — Optimization & Refactor (Week 4)

| # | Task | Where | Files | Deps | Complexity |
|---|---|---|---|---|---|
| D1 | Enable permission endpoints & build UI | Both | `accounts/urls.py`, `pages/admin/Permissions.jsx` | None | ⭐⭐⭐ |
| D2 | Add caching to list endpoints | Backend | `academics/views.py`, `enrollment/views.py` | None | ⭐⭐ |
| D3 | Migrate to PostgreSQL | Backend | `settings.py` | None | ⭐⭐ |
| D4 | Add rate limiting to auth endpoints | Backend | `core/middleware/` | None | ⭐⭐ |
| D5 | Implement real email sending (SMTP) | Backend | `settings.py`, `password_reset_views.py` | None | ⭐⭐ |
| D6 | Add WebSocket for real-time notifications | Both | `core/consumers.py`, `NotificationBell.jsx` | None | ⭐⭐⭐⭐ |

---

## PHASE 6 — Execution Order

```
Step 1:  A6  → Clean dead code & duplicates (api.jsx, App.jsx)
Step 2:  A1  → Build ForgotPassword + ResetPassword pages
Step 3:  A2  → Add exam permit endpoints to api.jsx
Step 4:  A3  → Build Student ExamPermits page
Step 5:  A4  → Build Registrar ExamPermit management page
Step 6:  A5  → Build ExamMonthMapping config
Step 7:  B1  → Build Document Release management page
Step 8:  B2  → Add export endpoints to api.jsx
Step 9:  B3  → Wire ExportButton to backend
Step 10: B4  → Add PaymentAdjustment UI in Cashier
Step 11: B5  → Add Payment Transaction log
Step 12: B6  → Add Academic Standing UI
Step 13: C1  → Integrate Dashboard Alerts
Step 14: C2  → Add Override Enroll button
Step 15: C3  → Use NotFoundPage for 404
Step 16: C4  → Deduplicate routes
Step 17: C5  → Loading skeletons
Step 18: C6  → Mobile responsive audit
Step 19: D1  → Permission management
Step 20: D2  → API caching
Step 21: D3  → PostgreSQL migration
Step 22: D4  → Rate limiting
Step 23: D5  → SMTP email
Step 24: D6  → WebSocket notifications
```

---

## PHASE 7 — Testing Strategy

### 7.1 Unit Tests

| Area | Test Target | Framework |
|---|---|---|
| Backend Models | `BaseModel`, `Enrollment`, `SubjectEnrollment`, `ExamPermit` | `pytest-django` |
| Backend Services | `EnrollmentService`, `SubjectEnrollmentService`, `SchedulingService` | `pytest-django` |
| Backend Permissions | `IsStudent`, `IsRegistrar`, `IsAdmin`, `IsCashier` | `pytest-django` |
| Frontend Utils | `validation.jsx`, `formatters.jsx`, `errorHandler.jsx` | `vitest` |

### 7.2 Integration Tests

| Flow | Endpoints Tested | Method |
|---|---|---|
| Enrollment E2E | `POST /enroll/` → `PATCH /applicants/<id>/` → `GET /my-enrollment/` | API test |
| Payment → Permit | `POST /payments/record/` → `POST /exam-permits/generate/` | API test |
| Grading → Finalization | `POST /grading/submit/` → `POST /grades/section/<id>/finalize/` | API test |
| Password Reset | `POST /password/request-reset/` → `POST /password/validate-token/` → `POST /password/reset/` | API test |

### 7.3 Manual Test Checklist (Per Business Flow)

| # | Flow | Steps to Test |
|---|---|---|
| 1 | **Enrollment** | Fill form → check duplicate validation → verify PENDING status → login with temp creds |
| 2 | **Admission Approval** | Login as Admission → view applicant → approve → verify Student Number assigned → status = ACTIVE |
| 3 | **Subject Enrollment** | Login as Student → view recommended → enroll in subject → verify section seat decreases |
| 4 | **Payment** | Login as Cashier → search student → record payment → verify bucket updated → check SOA |
| 5 | **Exam Permit** | After payment → student generates permit → registrar prints → verify validity |
| 6 | **Grading** | Login as Professor → select section → enter grades → submit → login as Registrar → finalize |
| 7 | **INC Management** | Create INC grade → verify in INC report → process expired → verify auto-converted to 5.00 |
| 8 | **Document Release** | Login as Registrar → search student → create release → verify code generated |
| 9 | **Password Reset** | Click forgot → enter email → check email → click link → set new password → login |
| 10 | **Head Approval** | Login as Head → view pending → approve → verify `head_approved = true` |
