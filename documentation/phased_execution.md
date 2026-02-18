# Richwell Portal — Phased Execution Plan

> **Created**: 2026-02-18  
> **Reference**: [system_audit.md](./system_audit.md)  
> **Methodology**: Each task follows a strict 7-step execution structure before any code is written.

---

## 7-Step Execution Structure

Every task in this document follows this process:

| Step | Name | Purpose |
|---|---|---|
| 1️⃣ | **Scope Analysis** | Identify what exists, what's missing, and what needs to change |
| 2️⃣ | **Backend Contract Verification** | Verify endpoints, models, serializers, permissions are ready |
| 3️⃣ | **Detailed Micro-Implementation Plan** | File-by-file breakdown of exact changes |
| 4️⃣ | **Execution Order** | Dependency-aware file modification sequence |
| 5️⃣ | **Testing Plan** | Unit, integration, and manual verification steps |
| 6️⃣ | **Regression Risk Assessment** | What could break, mitigation strategies |
| 7️⃣ | **Completion Criteria Checklist** | Exit conditions — all must pass to mark done |

---

## Progress Tracker

| Phase | Focus | Tasks | Status |
|---|---|---|---|
| **Phase B** | Missing Core Features | B1–B6 | ✅ COMPLETE |
| **Phase A** | Critical Business Flows | A1–A6 | ✅ COMPLETE |
| **Phase C** | UI Refinement | C1–C6 | ✅ COMPLETE |
| **Phase D** | Optimization & Refactor | D1–D6 | 🟡 IN PROGRESS |

---

---

# PHASE A — Critical Business Flows ✅ COMPLETE

---

## A1 — Password Reset Pages

### 1️⃣ Scope Analysis

- **What exists**: Backend has `RequestPasswordResetView`, `ValidateResetTokenView`, `ResetPasswordView`. API keys `passwordRequestReset`, `passwordReset` exist in `api.jsx`. No frontend pages exist. Login page has no "Forgot Password?" link.
- **What's missing**: `ForgotPassword.jsx`, `ResetPassword.jsx`, routes in `App.jsx`, link on Login page.
- **What changes**: Frontend only. No backend changes needed.

### 2️⃣ Backend Contract Verification

| Endpoint | Method | Request Body | Response | Status |
|---|---|---|---|---|
| `/accounts/password/request-reset/` | POST | `{ email }` | `{ message }` | ✅ Ready |
| `/accounts/password/validate-token/` | POST | `{ token }` | `{ valid, email }` | ✅ Ready |
| `/accounts/password/reset/` | POST | `{ token, new_password }` | `{ message }` | ✅ Ready |

**API Keys**: `passwordRequestReset`, `passwordReset` — already in `api.jsx`.

### 3️⃣ Detailed Micro-Implementation Plan

| File | Action | Details |
|---|---|---|
| `pages/auth/ForgotPassword.jsx` | **CREATE** | Email input → calls `passwordRequestReset` → shows success message |
| `pages/auth/ResetPassword.jsx` | **CREATE** | Reads `?token=` from URL → new password + confirm → calls `passwordReset` |
| `App.jsx` | **MODIFY** | Add 2 public routes: `/auth/forgot-password`, `/auth/reset-password` |
| `pages/auth/Login.jsx` | **MODIFY** | Add "Forgot Password?" link below login form |

### 4️⃣ Execution Order

```
1. ForgotPassword.jsx  (new, no deps)
2. ResetPassword.jsx   (new, no deps)
3. App.jsx             (add routes, imports 1 & 2)
4. Login.jsx           (add link, no deps)
```

### 5️⃣ Testing Plan

| Type | Test |
|---|---|
| **Build** | `npx vite build` — zero errors |
| **Manual** | Navigate to `/auth/forgot-password` → enter email → check response |
| **Manual** | Navigate to `/auth/reset-password?token=test` → enter passwords → check validation |
| **Manual** | Login page → verify "Forgot Password?" link navigates correctly |
| **Integration** | Full flow: forgot → email → reset → login with new password (requires SMTP or console backend) |

### 6️⃣ Regression Risk Assessment

| Risk | Level | Mitigation |
|---|---|---|
| Login page layout breaks | 🟡 LOW | Only adding one `<Link>`, no structural changes |
| Route conflicts | 🟢 MINIMAL | New routes under `/auth/` prefix, no overlaps |
| Token handling edge cases | 🟡 MEDIUM | Validate token before showing form, show error on invalid/expired |

### 7️⃣ Completion Criteria

- [x] `ForgotPassword.jsx` renders, accepts email, calls API
- [x] `ResetPassword.jsx` renders, reads token, validates passwords, calls API
- [x] Both routes accessible in `App.jsx`
- [x] Login page has "Forgot Password?" link
- [x] Vite build passes with zero errors
- [x] Manual navigation test passes

---

## A2 — Exam Permit API Endpoints

### 1️⃣ Scope Analysis

- **What exists**: Backend has full exam permit system (models, views, serializers, URLs). `api.jsx` has NO exam permit keys.
- **What's missing**: Endpoint keys in `api.jsx` for all exam permit operations.
- **What changes**: `api.jsx` only — adding endpoint key definitions.

### 2️⃣ Backend Contract Verification

| Endpoint | Method | Purpose | Status |
|---|---|---|---|
| `/admissions/my-exam-permits/` | GET | Student's own permits | ✅ Ready |
| `/admissions/generate-exam-permit/` | POST | Generate permit for student | ✅ Ready |
| `/admissions/print-exam-permit/<id>/` | POST | Mark permit as printed | ✅ Ready |
| `/admissions/exam-mappings/` | GET/POST | Exam-month mapping CRUD | ✅ Ready |
| `/admissions/exam-mappings/<id>/` | PUT/DELETE | Update/delete mapping | ✅ Ready |

### 3️⃣ Detailed Micro-Implementation Plan

| File | Action | Details |
|---|---|---|
| `api.jsx` | **MODIFY** | Add 5 endpoint keys: `myExamPermits`, `generateExamPermit`, `printExamPermit(id)`, `examMappings`, `examMappingDetail(id)` |

### 4️⃣ Execution Order

```
1. api.jsx  (single file, add keys)
```

### 5️⃣ Testing Plan

| Type | Test |
|---|---|
| **Build** | `npx vite build` — zero errors |
| **Manual** | Verify endpoint keys resolve correctly in browser console |

### 6️⃣ Regression Risk Assessment

| Risk | Level | Mitigation |
|---|---|---|
| Typos in endpoint paths | 🟢 MINIMAL | Cross-reference with `enrollment/urls.py` |
| Naming conflicts | 🟢 MINIMAL | Check existing keys for duplicates |

### 7️⃣ Completion Criteria

- [x] All 5 endpoint keys added to `api.jsx`
- [x] No duplicate keys
- [x] Vite build passes
- [x] Paths match backend `urls.py`

---

## A3 — Student Exam Permit Page

### 1️⃣ Scope Analysis

- **What exists**: Student role has Dashboard, Grades, Schedule, SOA, SubjectEnrollment pages. No exam permits page.
- **What's missing**: `ExamPermits.jsx` for student view, route, dashboard link.
- **What changes**: Frontend only. Uses endpoints from A2.

### 2️⃣ Backend Contract Verification

| Endpoint | Request | Response | Status |
|---|---|---|---|
| `GET /admissions/my-exam-permits/` | Auth header (student) | `[{ id, exam_period, permit_code, is_printed, is_valid, ... }]` | ✅ Ready |
| `POST /admissions/generate-exam-permit/` | `{ enrollment_id, exam_period }` | `{ permit_code, ... }` | ✅ Ready |

### 3️⃣ Detailed Micro-Implementation Plan

| File | Action | Details |
|---|---|---|
| `pages/student/ExamPermits.jsx` | **CREATE** | List permits by exam period (Prelim, Midterm, Finals), status badges, generate button |
| `App.jsx` | **MODIFY** | Add route `/student/exam-permits` with `STUDENT` role guard |
| `pages/student/index.jsx` | **MODIFY** | Add "Exam Permits" card/link on dashboard |

### 4️⃣ Execution Order

```
1. ExamPermits.jsx     (new page, uses A2 endpoints)
2. App.jsx             (add route + import)
3. student/index.jsx   (add dashboard link)
```

### 5️⃣ Testing Plan

| Type | Test |
|---|---|
| **Build** | `npx vite build` — zero errors |
| **Manual** | Login as student → navigate to exam permits → see list |
| **Manual** | Click "Generate" for an exam period → verify permit appears |
| **Integration** | Pay Month 1 (cashier) → generate Prelim permit (student) → verify eligibility check works |

### 6️⃣ Regression Risk Assessment

| Risk | Level | Mitigation |
|---|---|---|
| Student dashboard layout shift | 🟡 LOW | Adding card, not restructuring |
| Route conflicts | 🟢 MINIMAL | Unique path `/student/exam-permits` |
| Generate without payment | 🟡 MEDIUM | Backend already validates — just show error toast |

### 7️⃣ Completion Criteria

- [x] Student can view permit list with status per exam period
- [x] Generate button works + shows backend validation errors
- [x] Route protected with `STUDENT` role
- [x] Dashboard has navigation link
- [x] Vite build passes

---

## A4 — Registrar Exam Permit Management

### 1️⃣ Scope Analysis

- **What exists**: Registrar has 11 pages. No exam permit management.
- **What's missing**: Admin view to see all permits, search/filter, print action.
- **What changes**: Frontend only.

### 2️⃣ Backend Contract Verification

| Endpoint | Method | Purpose | Response | Status |
|---|---|---|---|---|
| `GET /admissions/my-exam-permits/` | GET | Will need a registrar-level endpoint or reuse with role filter | ⚠️ Verify |
| `POST /admissions/print-exam-permit/<id>/` | POST | Mark as printed | `{ message, printed_at }` | ✅ Ready |

> **Note**: May need to verify if there's a registrar-level "all permits" endpoint or if we need to create one.

### 3️⃣ Detailed Micro-Implementation Plan

| File | Action | Details |
|---|---|---|
| `pages/registrar/ExamPermits.jsx` | **CREATE** | Table of all permits, search by student, filter by exam period, print action |
| `App.jsx` | **MODIFY** | Add route `/registrar/exam-permits` |
| `pages/registrar/index.jsx` | **MODIFY** | Add "Exam Permits" nav link on dashboard |
| `views.py` (if needed) | **MODIFY** | Add registrar-level list endpoint if not exists |

### 4️⃣ Execution Order

```
1. Verify backend has registrar-level list  (scope check)
2. If missing → create view + URL            (backend first)
3. ExamPermits.jsx                            (new page)
4. App.jsx                                    (route)
5. registrar/index.jsx                        (nav link)
```

### 5️⃣ Testing Plan

| Type | Test |
|---|---|
| **Build** | `npx vite build` — zero errors |
| **Manual** | Login as registrar → view all permits → filter by period |
| **Manual** | Click "Print" → verify `is_printed` updates, timestamp records |
| **Integration** | Student generates → registrar sees it → prints → student's permit shows "Printed" |

### 6️⃣ Regression Risk Assessment

| Risk | Level | Mitigation |
|---|---|---|
| Missing backend endpoint | 🟡 MEDIUM | Step 1 verifies before building UI |
| Permission mismatch | 🟡 LOW | Use `REGISTRAR` role check |
| Print action side effects | 🟢 MINIMAL | Only sets `is_printed = True`, idempotent |

### 7️⃣ Completion Criteria

- [x] Registrar can view all student permits in a searchable table
- [x] Filter by exam period works
- [x] Print action updates permit status
- [x] Route protected with `REGISTRAR` role
- [x] Vite build passes

---

## A5 — Exam Month Mapping Config

### 1️⃣ Scope Analysis

- **What exists**: Backend has `ExamMonthMapping` model, CRUD endpoints. No frontend UI.
- **What's missing**: Admin/Registrar config page to manage which payment month maps to which exam period.
- **What changes**: Frontend only (embed in existing `TermManagement.jsx` or new page).

### 2️⃣ Backend Contract Verification

| Endpoint | Method | Request | Response | Status |
|---|---|---|---|---|
| `GET /admissions/exam-mappings/` | GET | — | `[{ id, semester, exam_period, required_month, ... }]` | ✅ Ready |
| `POST /admissions/exam-mappings/` | POST | `{ semester_id, exam_period, required_month }` | `{ id, ... }` | ✅ Ready |
| `PUT /admissions/exam-mappings/<id>/` | PUT | `{ required_month }` | `{ ... }` | ✅ Ready |
| `DELETE /admissions/exam-mappings/<id>/` | DELETE | — | `204` | ✅ Ready |

### 3️⃣ Detailed Micro-Implementation Plan

| File | Action | Details |
|---|---|---|
| `pages/admin/TermManagement.jsx` OR `pages/admin/ExamMappings.jsx` | **CREATE/MODIFY** | CRUD table: select semester, exam period (Prelim/Midterm/Finals), required month (1-6) |
| `api.jsx` | Already done in A2 | — |
| `App.jsx` | **MODIFY** (if new page) | Add route |

### 4️⃣ Execution Order

```
1. Decide: embed in TermManagement vs. new page
2. ExamMappings UI component
3. App.jsx (if new route)
```

### 5️⃣ Testing Plan

| Type | Test |
|---|---|
| **Build** | `npx vite build` — zero errors |
| **Manual** | Create mapping → verify it appears in list |
| **Manual** | Edit mapping → verify update persists |
| **Manual** | Delete mapping → verify removal |
| **Integration** | Create mapping → student pays correct month → can generate permit for that period |

### 6️⃣ Regression Risk Assessment

| Risk | Level | Mitigation |
|---|---|---|
| Duplicate mapping creation | 🟢 MINIMAL | Backend serializer validates uniqueness |
| TermManagement breakage (if embedding) | 🟡 LOW | Add as separate section/tab, don't restructure existing |

### 7️⃣ Completion Criteria

- [x] Admin can view all exam-month mappings per semester
- [x] Create new mapping (semester + period + month)
- [x] Edit existing mapping
- [x] Delete mapping with confirmation
- [x] Vite build passes

---

## A6 — Clean Dead Code & Duplicates

### 1️⃣ Scope Analysis

- **What exists**: Audit identified dead code and duplicate keys in `api.jsx` and `App.jsx`.
- **What's missing**: N/A — this is cleanup only.
- **Targets**:
  - Duplicate `incReport` key in `api.jsx`
  - Duplicate `generateCor` / `generateCOR` keys in `api.jsx`
  - `WelcomePage` unused component in `App.jsx`
  - Commented permission URL routes in `accounts/urls.py`

### 2️⃣ Backend Contract Verification

| Item | Check | Status |
|---|---|---|
| `incReport` usage | Grep frontend for which key is used | Verify before removing |
| `generateCOR` usage | Grep frontend for which key is used | Verify before removing |
| Permission URLs | Confirm routes are commented out, not active | Verify |

### 3️⃣ Detailed Micro-Implementation Plan

| File | Action | Details |
|---|---|---|
| `api.jsx` | **MODIFY** | Remove duplicate `incReport` (keep first), remove duplicate `generateCor` (keep `generateCOR`) |
| `App.jsx` | **MODIFY** | Remove `WelcomePage` component definition + any reference |
| `accounts/urls.py` | **MODIFY** | Remove commented-out permission URLs entirely (or uncomment if D1 is next) |

### 4️⃣ Execution Order

```
1. Grep for usage of duplicated keys  (verify which to keep)
2. api.jsx                             (remove duplicates)
3. App.jsx                             (remove WelcomePage)
4. accounts/urls.py                    (clean comments)
```

### 5️⃣ Testing Plan

| Type | Test |
|---|---|
| **Build** | `npx vite build` — zero errors |
| **Grep** | Search for removed keys — zero references remaining |
| **Manual** | Navigate to pages that used `incReport` / `generateCOR` — still works |

### 6️⃣ Regression Risk Assessment

| Risk | Level | Mitigation |
|---|---|---|
| Removing wrong duplicate key | 🔴 HIGH | Must grep first to verify which is imported |
| Breaking INC management page | 🟡 MEDIUM | Verify `incReport` usage before removing |
| Breaking COR generation | 🟡 MEDIUM | Verify `generateCOR` vs `generateCor` usage |

### 7️⃣ Completion Criteria

- [x] No duplicate keys in `api.jsx`
- [x] No dead `WelcomePage` code in `App.jsx`
- [x] Commented permission URLs cleaned
- [x] All pages that used affected keys still function
- [x] Vite build passes

---

---

# PHASE C — UI Refinement ✅ COMPLETE

---

## C1 — Integrate Dashboard Alerts

### 1️⃣ Scope Analysis

- **What exists**: Backend `GET /audit/dashboard/alerts/` returns role-based alert counts (pending approvals, new enrollments, etc.). No frontend integration.
- **What's missing**: Alert banners or cards on each role dashboard.

### 2️⃣ Backend Contract Verification

| Endpoint | Method | Response | Status |
|---|---|---|---|
| `GET /api/v1/audit/dashboard/alerts/` | GET | `{ alerts: [{ type, message, count, severity }] }` | ✅ Verify response shape |

### 3️⃣ Detailed Micro-Implementation Plan

| File | Action |
|---|---|
| `components/ui/DashboardAlerts.jsx` | **CREATE** — reusable alert banner component |
| `pages/registrar/index.jsx` | **MODIFY** — integrate alerts |
| `pages/cashier/index.jsx` | **MODIFY** — integrate alerts |
| `pages/admin/UserManagement.jsx` | **MODIFY** — integrate alerts |
| `pages/head/index.jsx` | **MODIFY** — integrate alerts |
| `api.jsx` | **MODIFY** — add `dashboardAlerts` key if missing |

### 4️⃣ Execution Order

```
1. Verify backend response shape
2. Add API key (if missing)
3. Create DashboardAlerts.jsx component
4. Integrate into each dashboard (registrar → cashier → admin → head)
```

### 5️⃣ Testing Plan

| Type | Test |
|---|---|
| **Build** | Zero errors |
| **Manual** | Login per role → verify alerts display with correct counts |
| **Edge** | Empty alerts → component renders nothing (no empty state) |

### 6️⃣ Regression Risk Assessment

| Risk | Level | Mitigation |
|---|---|---|
| Dashboard layout shift | 🟡 LOW | Alerts prepend to top, existing layout untouched |
| API failure blocks dashboard | 🟡 MEDIUM | Wrap in try/catch, fail silently |

### 7️⃣ Completion Criteria

- [x] Alerts appear on 4 role dashboards
- [x] Correct alert counts per role
- [x] Graceful fallback on API error
- [x] Vite build passes

---

## C2 — Registrar Override Enroll Button

### 1️⃣ Scope Analysis

- **What exists**: Backend `POST /admissions/enrollment/<id>/override-enroll/` exists. API key `overrideEnroll` exists. No visible button in UI.
- **What's missing**: Button + modal in section/student detail page.

### 2️⃣ Backend Contract Verification

| Endpoint | Method | Request | Response | Status |
|---|---|---|---|---|
| `POST /admissions/enrollment/<id>/override-enroll/` | POST | `{ student_id, subject_id, section_id, override_reason }` | `{ message, enrollment }` | ✅ Verify |

### 3️⃣ Detailed Micro-Implementation Plan

| File | Action |
|---|---|
| Target page (section detail or student detail) | **MODIFY** — add "Override Enroll" button |
| Same file | **MODIFY** — add modal with student search, subject/section select, reason field |

### 4️⃣ Execution Order

```
1. Identify correct page (sections/Detail.jsx or students/Detail.jsx)
2. Add button + modal
3. Wire to API
```

### 5️⃣ Testing Plan

| Type | Test |
|---|---|
| **Build** | Zero errors |
| **Manual** | Click override → fill form → submit → verify enrollment created |
| **Edge** | Override with invalid student/section → verify error handling |

### 6️⃣ Regression Risk Assessment

| Risk | Level | Mitigation |
|---|---|---|
| Section seat count | 🟡 MEDIUM | Backend handles capacity checks |
| Prerequisite bypass | 🟡 MEDIUM | Override intentionally skips — document in UI |

### 7️⃣ Completion Criteria

- [x] Override button visible to registrar
- [x] Modal with all required fields
- [x] Success creates enrollment + shows toast
- [x] Error handling for all validation cases
- [x] Vite build passes

---

## C3 — 404 Fallback Page

### 1️⃣ Scope Analysis

- **What exists**: `NotFoundPage` component exists in `App.jsx` but catch-all route redirects to `/` instead of rendering it.
- **What changes**: Replace `Navigate` fallback with `NotFoundPage`.

### 2️⃣ Backend Contract Verification

N/A — frontend-only change.

### 3️⃣ Detailed Micro-Implementation Plan

| File | Action |
|---|---|
| `App.jsx` | **MODIFY** — replace `<Navigate to="/" />` fallback with `<NotFoundPage />` |
| `App.jsx` | **MODIFY** — style `NotFoundPage` to match design system if needed |

### 4️⃣ Execution Order

```
1. App.jsx — update fallback route
```

### 5️⃣ Testing Plan

| Type | Test |
|---|---|
| **Manual** | Navigate to `/nonexistent-path` → see 404 page |
| **Manual** | Verify all existing routes still work |

### 6️⃣ Regression Risk Assessment

| Risk | Level | Mitigation |
|---|---|---|
| Legitimate routes breaking | 🟢 MINIMAL | Only affects unmatched routes |

### 7️⃣ Completion Criteria

- [x] Unknown URLs show styled 404 page
- [x] All existing routes unaffected
- [x] Vite build passes

---

## C4 — Deduplicate Routes

### 1️⃣ Scope Analysis

- **What exists**: Potential duplicate route entries (e.g., `/admin/dashboard` and `/admin/users` rendering same component).
- **What changes**: Consolidate duplicates.

### 2️⃣ Backend Contract Verification

N/A — frontend-only.

### 3️⃣ Detailed Micro-Implementation Plan

| File | Action |
|---|---|
| `App.jsx` | **MODIFY** — audit all routes, remove duplicates, verify canonical paths |

### 4️⃣ Execution Order

```
1. Grep App.jsx for all Route elements
2. Identify duplicates
3. Remove/consolidate
```

### 5️⃣ Testing Plan

| Type | Test |
|---|---|
| **Manual** | Navigate to all pages via sidebar — all routes work |
| **Build** | Zero errors |

### 6️⃣ Regression Risk Assessment

| Risk | Level | Mitigation |
|---|---|---|
| Removing active route | 🟡 MEDIUM | Test every link after changes |
| Sidebar navigation breaks | 🟡 LOW | Update sidebar links if paths change |

### 7️⃣ Completion Criteria

- [x] No duplicate route entries in `App.jsx`
- [x] All navigation links work
- [x] Vite build passes

---

## C5 — Loading Skeletons

### 1️⃣ Scope Analysis

- **What exists**: Pages use `<Loader2 className="animate-spin" />` spinner. No skeleton UI.
- **What's missing**: Skeleton components that match page layout for shimmer loading.

### 2️⃣ Backend Contract Verification

N/A — frontend-only.

### 3️⃣ Detailed Micro-Implementation Plan

| File | Action |
|---|---|
| `components/ui/Skeleton.jsx` | **CREATE** — reusable skeleton variants (line, card, table row, avatar) |
| Priority pages | **MODIFY** — replace `Loader2` with layout-matching skeletons |

**Priority pages**: Student Dashboard, Cashier, Registrar Masterlist, Admin Users

### 4️⃣ Execution Order

```
1. Create Skeleton.jsx component
2. Student Dashboard
3. Cashier Dashboard
4. Registrar Masterlist
5. Admin Users
```

### 5️⃣ Testing Plan

| Type | Test |
|---|---|
| **Manual** | Throttle network → observe skeleton loading states |
| **Build** | Zero errors |

### 6️⃣ Regression Risk Assessment

| Risk | Level | Mitigation |
|---|---|---|
| Layout shift after load | 🟡 LOW | Match skeleton dimensions to real content |
| Skeleton not disappearing | 🟡 LOW | Tie to existing loading state |

### 7️⃣ Completion Criteria

- [x] Skeleton component exists with multiple variants
- [x] At least 4 priority pages use skeletons
- [x] No layout jumps on load
- [x] Vite build passes

---

## C6 — Mobile Responsive Audit

### 1️⃣ Scope Analysis

- **What exists**: Desktop-first design with some responsive utilities.
- **What's missing**: Verified mobile layouts at 375px, 768px, 1024px.

### 2️⃣ Backend Contract Verification

N/A — frontend-only.

### 3️⃣ Detailed Micro-Implementation Plan

| Area | Action |
|---|---|
| Tables | Add horizontal scroll wrapper on mobile |
| Modals | Ensure max-width and proper padding on small screens |
| Navigation | Verify sidebar collapse works on mobile |
| Forms | Stack form fields vertically on mobile |
| Cards | Ensure proper wrapping and spacing |

### 4️⃣ Execution Order

```
1. Audit all pages at 375px (phone)
2. Fix critical overflow issues
3. Audit at 768px (tablet)
4. Fix modal/form issues
5. Final pass at 1024px
```

### 5️⃣ Testing Plan

| Type | Test |
|---|---|
| **Browser** | DevTools responsive mode → test all pages at 3 breakpoints |
| **Manual** | Touch targets ≥ 44px, no horizontal overflow, text readable |

### 6️⃣ Regression Risk Assessment

| Risk | Level | Mitigation |
|---|---|---|
| Desktop layout breaks from mobile fixes | 🟡 MEDIUM | Use mobile-first breakpoints (`max-w`, `md:`, `lg:`) |
| Inconsistent spacing | 🟡 LOW | Audit systematically page-by-page |

### 7️⃣ Completion Criteria

- [x] No horizontal overflow at 375px on any page
- [x] All modals readable on mobile
- [x] Navigation usable on mobile
- [x] Tables scrollable horizontally
- [x] Vite build passes

---

---

# PHASE D — Optimization & Refactor � IN PROGRESS

---

## D1 — Permission Management UI

### 1️⃣ Scope Analysis

- **What exists**: Permission URLs commented out in `accounts/urls.py`. API keys defined in `api.jsx`. No frontend UI.
- **What's missing**: Backend URLs uncommented, admin permissions page.

### 2️⃣ Backend Contract Verification

| Endpoint | Status |
|---|---|
| Permission CRUD endpoints | ⚠️ Commented out — need to uncomment and verify views exist |

### 3️⃣ Detailed Micro-Implementation Plan

| File | Action |
|---|---|
| `accounts/urls.py` | **MODIFY** — uncomment permission URL routes |
| `pages/admin/Permissions.jsx` | **CREATE** — role-permission matrix UI with toggles |
| `App.jsx` | **MODIFY** — add route `/admin/permissions` |

### 4️⃣ Execution Order

```
1. Uncomment backend URLs + verify views
2. Create Permissions.jsx
3. Add route in App.jsx
```

### 5️⃣ Testing Plan

| Type | Test |
|---|---|
| **Backend** | Hit permission endpoints via Postman/curl |
| **Manual** | Toggle permissions → verify enforcement |

### 6️⃣ Regression Risk Assessment

| Risk | Level | Mitigation |
|---|---|---|
| Uncommenting breaks other URLs | 🟡 LOW | Test all auth endpoints after |
| Permission changes lock out admin | 🔴 HIGH | Add safety check — admin always has full access |

### 7️⃣ Completion Criteria

- [x] Permission endpoints active
- [x] Admin can view/edit role permissions
- [x] Permission enforcement verified
- [x] Build passes

---

## D2 — API Caching

### 1️⃣ Scope Analysis

- **What exists**: No caching on any endpoints.
- **Target**: Read-heavy list endpoints (programs, subjects, sections).

### 2️⃣–7️⃣ (Abbreviated — backend-only optimization)

| Step | Details |
|---|---|
| **Plan** | Add `@cache_page(300)` to list views |
| **Invalidation** | Clear cache on create/update/delete |
| **Test** | Verify response time improvement |
| **Risk** | Stale data (mitigated by 5-min TTL + invalidation) |
| **Criteria** | Cached endpoints return in <50ms on repeat requests |

---

## D3 — PostgreSQL Migration

### 1️⃣–7️⃣ (Abbreviated — infrastructure task)

| Step | Details |
|---|---|
| **Plan** | Install `psycopg2-binary`, update `DATABASES` setting |
| **Migration** | `python manage.py migrate` on new DB |
| **Data** | Export SQLite → import PostgreSQL (if needed) |
| **Test** | All CRUD operations work, UUIDs resolve correctly |
| **Risk** | Data loss during migration (mitigate: backup SQLite first) |
| **Criteria** | All endpoints return correct data from PostgreSQL |

---

## D4 — Rate Limiting

### 1️⃣–7️⃣ (Abbreviated — security hardening)

| Step | Details |
|---|---|
| **Plan** | Configure DRF `DEFAULT_THROTTLE_RATES` |
| **Targets** | Login: 5/min, Register: 3/min, Password Reset: 3/min |
| **Test** | Hit endpoint 6 times → verify 429 response |
| **Risk** | Legitimate users blocked (mitigate: reasonable limits) |
| **Criteria** | Auth endpoints rate-limited, 429 returned on excess |

---

## D5 — SMTP Email

### 1️⃣–7️⃣ (Abbreviated — integration task)

| Step | Details |
|---|---|
| **Plan** | Configure `EMAIL_BACKEND` to SMTP (Gmail App Password or SendGrid) |
| **Update** | Password reset views send real emails |
| **Test** | Full reset flow: request → receive email → click link → reset |
| **Risk** | Email delivery failures (mitigate: use reliable provider) |
| **Criteria** | Password reset emails delivered to real inboxes |

---

## D6 — WebSocket Notifications

### 1️⃣–7️⃣ (Abbreviated — advanced feature)

| Step | Details |
|---|---|
| **Plan** | Install `channels` + `daphne`, create `NotificationConsumer` |
| **Frontend** | Wire `NotificationBell.jsx` to WebSocket |
| **Events** | Enrollment approved, grade submitted, payment recorded |
| **Test** | Two browser tabs — trigger event → notification appears in real-time |
| **Risk** | WebSocket connection instability (mitigate: reconnection logic) |
| **Criteria** | Real-time notifications work across all roles |

---

## Master Execution Checklist

```
Phase A — Critical Business Flows
  [ ] A1 — Password Reset Pages
  [ ] A2 — Exam Permit API Endpoints
  [ ] A3 — Student Exam Permit Page
  [ ] A4 — Registrar Exam Permit Management
  [ ] A5 — Exam Month Mapping Config
  [ ] A6 — Clean Dead Code & Duplicates

Phase B — Missing Core Features (COMPLETE)
  [x] B1 — Document Release Page
  [x] B2 — Export Endpoints
  [x] B3 — ExportButton Wiring
  [x] B4 — Payment Adjustment (Cashier)
  [x] B5 — Payment Transaction Log (Admin)
  [x] B6 — Academic Standing UI

Phase C — UI Refinement
  [ ] C1 — Dashboard Alerts
  [ ] C2 — Override Enroll Button
  [ ] C3 — 404 Fallback Page
  [ ] C4 — Deduplicate Routes
  [ ] C5 — Loading Skeletons
  [ ] C6 — Mobile Responsive Audit

Phase D — Optimization & Refactor
  [ ] D1 — Permission Management UI
  [ ] D2 — API Caching
  [ ] D3 — PostgreSQL Migration
  [ ] D4 — Rate Limiting
  [ ] D5 — SMTP Email
  [ ] D6 — WebSocket Notifications
```

---

> **Usage**: Say "start A1" and the 7-step process will be executed for that task.
