# Richwell Portal — Full Implementation Plan

> **Stack:** Django 5.x + DRF + PostgreSQL (Backend) | React 18 + Vite (Frontend)
> **Auth:** JWT (SimpleJWT)
> **Architecture:** Layered (Presentation → Service → Domain → Data Access)
> **Principles:** GEMINI.md rules — SOLID, DRY, KISS, YAGNI, Clean Code
> **Testing:** Backend auto-tested | Frontend manual verification (screenshots by user)

---

## Project Structure

```
richwell-portal/
├── backend/
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── development.py
│   │   │   └── production.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── apps/
│   │   ├── accounts/           # User, auth, JWT, permissions
│   │   ├── academics/          # Program, CurriculumVersion, Subject, SubjectPrerequisite
│   │   ├── terms/              # Term management
│   │   ├── students/           # Student, StudentEnrollment
│   │   ├── faculty/            # Professor, ProfessorSubject
│   │   ├── sections/           # Section, SectionStudent
│   │   ├── scheduling/         # Schedule (Dean scheduling + student picking)
│   │   ├── grades/             # Grade (advising → grading → resolution → dropping)
│   │   ├── finance/            # Payment (append-only)
│   │   ├── facilities/         # Room
│   │   ├── notifications/      # Notification
│   │   └── auditing/           # AuditLog
│   ├── core/
│   │   ├── services.py         # Base service class
│   │   ├── permissions.py      # Role-based permission classes
│   │   ├── pagination.py       # Standard pagination
│   │   ├── exceptions.py       # Custom exceptions
│   │   └── mixins.py           # Audit mixin, timestamp mixin
│   ├── data/
│   │   └── bulacan_locations.json
│   ├── .env.example            # All required env vars documented
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/                # Axios instance, API service functions
│   │   ├── assets/             # Static assets
│   │   ├── components/
│   │   │   ├── ui/             # Button, Input, Modal, Badge, Card, Table, Select, Pagination
│   │   │   ├── layout/         # Sidebar (role-aware), Header, PageWrapper
│   │   │   └── shared/         # NotificationBell, SearchBar, StatusBadge, LoadingSpinner, ErrorBoundary
│   │   ├── contexts/           # AuthContext, NotificationContext
│   │   ├── hooks/              # useAuth, useFetch, useDebounce, useIdleTimer
│   │   ├── pages/
│   │   │   ├── auth/           # Login
│   │   │   ├── admin/          # Dashboard, programs, terms, rooms, audit logs
│   │   │   ├── admission/      # Applicants, verification, enrollment
│   │   │   ├── registrar/      # Docs, sectioning, grades, COR, masterlist, subject drop
│   │   │   ├── head_registrar/ # Registrar oversight, registrar audit logs
│   │   │   ├── programhead/    # Advising approval, credit approval, resolution approval
│   │   │   ├── dean/           # Scheduling, faculty load, publish
│   │   │   ├── professor/      # Grade submission, resolution requests
│   │   │   ├── cashier/        # Payment processing (append-only)
│   │   │   └── student/        # Dashboard, advising, schedule picking, grades, payments
│   │   ├── routes/             # Route definitions, ProtectedRoute
│   │   ├── styles/             # Global CSS, design tokens
│   │   ├── utils/              # Formatters, validators, constants
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── docs/
    ├── RICHWELL_SYSTEM_DOCUMENTATION.md
    ├── schema.md
    └── IMPLEMENTATION_PLAN.md
```

---

## Sidebar Menu per Role

| Role | Menu Items |
|---|---|
| **Admin** | Dashboard, Programs, Curriculum, Terms, Rooms, Faculty, Staff Management, Audit Logs |
| **Head Registrar** | Dashboard, Registrar Activity, Audit Logs (registrar-scoped) |
| **Registrar** | Dashboard, Document Verification, Sectioning, Section Transfer, Grade Finalization, COR, Masterlist, Subject Drop |
| **Admission** | Dashboard, Applicants, Appointments |
| **Cashier** | Dashboard, Payment Recording, Payment History |
| **Dean** | Dashboard, Scheduling, Faculty Load |
| **Program Head** | Dashboard, Advising Approval, Credit Approval, Resolution Approval |
| **Professor** | Dashboard, Grade Entry, Resolution Requests |
| **Student** | Dashboard, Advising, Schedule Picking, Schedule View, Grades, Payments, Profile |

---

## Migration Dependency Order

Apps must be migrated in this order (FK dependencies):

```
1. accounts          (User — no dependencies)
2. academics          (Program → User, Subject → CurriculumVersion)
3. terms              (Term — no FK dependencies)
4. students           (Student → User, Program, CurriculumVersion)
5. faculty            (Professor → User, ProfessorSubject → Subject)
6. sections           (Section → Term, Program | SectionStudent → Student)
7. grades             (Grade → Student, Subject, Term, Section)
8. scheduling         (Schedule → Term, Section, Subject, Professor, Room)
9. finance            (Payment → Student, Term)
10. facilities        (Room — no dependencies)
11. notifications     (Notification → User)
12. auditing          (AuditLog → User)
```

---

## Environment Variables (.env.example)

```env
# Django
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DB_NAME=richwell_portal
DB_USER=postgres
DB_PASSWORD=your-password
DB_HOST=localhost
DB_PORT=5432

# JWT
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=30
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173

# Frontend URL (for notification links)
FRONTEND_URL=http://localhost:5173
```

---

## Phase 1: Foundation Setup

### 1.1 — Backend Project Init + Seed Data

**Task:** Django project with layered structure, all dependencies, env config, seed data.

**Steps:**
1. Create `backend/` directory
2. Init Django project: `django-admin startproject config .`
3. Split settings: `base.py` (shared), `development.py` (DEBUG=True), `production.py`
4. Install dependencies:
   ```
   djangorestframework
   djangorestframework-simplejwt
   psycopg2-binary
   django-cors-headers
   django-filter
   python-decouple         # Env variable management
   reportlab               # PDF generation (COR)
   openpyxl                # Excel export (masterlist)
   ```
5. Create `.env.example` and `.env` with all variables
6. Configure PostgreSQL from env vars
7. Configure CORS from env vars
8. Create `core/` package: permissions, pagination, exceptions, mixins
9. Load `bulacan_locations.json` in `backend/data/`
10. Create management command `seed_data`:
    - 1 Admin, 1 Head Registrar, 1 Registrar, 1 Admission, 1 Cashier, 1 Dean, 1 Program Head
    - 3 Professors with assigned subjects
    - 1 Program (BSIS) with curriculum + all subjects from `curriculum.csv`
    - 1 active Term (current dates)
    - 5 Rooms (3 lecture, 2 computer lab)
    - 5 Sample students (3 regular, 2 transferee) at various stages

**Backend Test:**
- `python manage.py check` ✓
- `python manage.py runserver` ✓
- `python manage.py seed_data` creates all data ✓

---

### 1.2 — Frontend Project Init + Design System

**Task:** React + Vite with design system, reusable components, error handling.

**Steps:**
1. Create `frontend/` using Vite: `npx -y create-vite@latest ./ --template react`
2. Install:
   ```
   axios
   react-router-dom
   lucide-react
   react-hook-form         # Form validation
   ```
3. Run `ui-ux-pro-max` skill:
   ```bash
   python scripts/search.py "education school portal dashboard professional" --design-system -p "Richwell Portal" --persist
   ```
4. Create `styles/index.css` with design tokens (colors, spacing, typography, shadows)
5. Create UI components: Button, Input, Modal, Card, Badge, Table, Select, Pagination, LoadingSpinner, Toast
6. Create layout components:
   - **Sidebar:** role-aware menu items (uses sidebar menu map above)
   - **Header:** title + notification bell slot + user dropdown
   - **PageWrapper:** sidebar + header + content area
7. Create ErrorBoundary, NotFound (404), Forbidden (403), ServerError (500) pages
8. Setup React Router with `ProtectedRoute` (auth-check + role-check)
9. Setup Axios instance: base URL, JWT header injection, 401 → refresh → retry, refresh fails → logout
10. Setup `useIdleTimer` hook: 30-min no activity → warning toast → logout

**Manual Verification:**
- [x] `npm run dev` starts
- [x] Design tokens render correctly (colors, fonts)
- [x] Layout: sidebar + header + content area
- [x] Sidebar shows role-specific menu items
- [x] 404 page for unknown routes
- [x] Loading spinner appears during API calls

---

## Phase 2: Authentication & Users

### 2.1 — User Model + JWT Auth (Backend)

**Task:** Custom User model with roles + JWT endpoints.

**Steps:**
1. Create `accounts` app
2. Custom User model (per schema.md)
3. Serializers: `LoginSerializer`, `UserSerializer`, `TokenRefreshSerializer`, `StaffCreateSerializer`
4. Views: `LoginView`, `LogoutView`, `TokenRefreshView`, `MeView`, `StaffManagementViewSet`
5. Permission classes in `core/permissions.py`:
   - Individual: `IsAdmin`, `IsRegistrar`, `IsHeadRegistrar`, `IsAdmission`, `IsCashier`, `IsDean`, `IsProgramHead`, `IsProfessor`, `IsStudent`
   - Composite: `IsAdminOrRegistrar`, `IsStaff` (any non-student)
6. SimpleJWT: 30-min access, 7-day refresh (from env vars)
7. **Initial password policy:** `{IDN or employee_id}{birthdate_MMDD}` (Permanent)
8. **Staff account management:** Admin can create/edit/deactivate users for all staff roles (Registrar, Admission, Cashier, Dean, ProgramHead)
9. Management command: `create_admin` with ADMIN role
10. Tests: login, refresh, permissions, password change, staff CRUD

**Backend Test:**
- Login returns tokens ✓ | Invalid creds → 401 ✓
- MeView returns user + role + must_change_password ✓
- Role permissions enforce correctly ✓
- Token refresh works ✓
- ~~Change password works + sets must_change_password=False ✓~~ (Removed)
- Staff CRUD (Admin only) ✓

---

### 2.2 — Login + Change Password + Staff Management (Frontend)

**Task:** Login with JWT, force password change, idle timeout, staff account management.

**Steps:**
1. Login page: email + password form (react-hook-form)
2. Connect to login API, store tokens
3. ~~**If `must_change_password=true`** → redirect to Change Password page~~ (Removed)
4. ~~Change Password page~~ (Removed)
5. AuthContext: `user`, `role`, `login()`, `logout()`, `isAuthenticated`
6. ProtectedRoute: auth + role check, redirects to login or 403
7. Role → dashboard redirect mapping:
   - ADMIN → `/admin` | REGISTRAR → `/registrar` | ADMISSION → `/admission`
   - HEAD_REGISTRAR → `/head-registrar` | CASHIER → `/cashier`
   - DEAN → `/dean` | PROGRAM_HEAD → `/program-head`
   - PROFESSOR → `/professor` | STUDENT → `/student`
8. Idle timeout: 30-min, warning toast at 25-min, auto-logout at 30-min
9. **Admin: Staff Management page:**
   - Staff list table (all non-student users)
   - Create staff: name, email, role dropdown, initial password auto-generated
   - Edit staff: name, email, role, active/inactive toggle
   - Reset password button (generates new initial password, sets must_change_password=True)

**Manual Verification:**
- [ ] Login form renders
- [ ] Valid login → correct dashboard per role
- ~~[ ] First login → forced to change password page~~ (Removed)
- ~~[ ] After password change → redirects to dashboard~~ (Removed)
- [ ] Invalid → error message
- [ ] Logout works
- [ ] Protected routes guard correctly
- [ ] 403 page for wrong role
- [ ] Admin: Staff list renders
- [ ] Admin: Create staff → user created
- [ ] Admin: Edit/deactivate staff works
- [ ] Admin: Reset password works

---

## Phase 3: Academic Data

### 3.1 — Academic Models + API (Backend)

**Task:** Program, CurriculumVersion, Subject, SubjectPrerequisite + CRUD + CSV upload.

**Steps:**
1. Create `academics` app
2. Models per schema.md
3. Serializers with nested relationships
4. ViewSets: `ProgramViewSet`, `CurriculumVersionViewSet`, `SubjectViewSet`
5. CSV upload endpoint: parse curriculum.csv → bulk create subjects
6. Filters: subjects by curriculum, year_level, semester
7. Bulacan location endpoint: serve JSON (municipalities → barangays)
8. Permission: Admin-only for CRUD, public for locations
9. Tests: CRUD, CSV upload, filters, permissions

**Backend Test:**
- All CRUD operations ✓
- CSV upload bulk-creates subjects ✓
- Filters work correctly ✓
- Location endpoint returns JSON ✓
- Non-admin → 403 ✓

---

### 3.2 — Admin: Program & Curriculum Management (Frontend)

**Task:** Admin pages for programs, curriculum, subjects.

**Steps:**
1. Dashboard: stats cards (programs, subjects, professors, students, rooms)
2. Program list: table with search, CRUD actions
3. Program create/edit modal (code, name, effective year, has_summer, program_head)
4. Curriculum version management per program
5. Subject list per curriculum: table with year/semester tab filters
6. Subject create/edit form (all fields)
7. CSV upload: drag-drop zone → preview table → confirm import
8. Prerequisite management: add/remove per subject

**Manual Verification:**
- [ ] Dashboard stats accurate
- [ ] Program CRUD works
- [ ] Curriculum versions switchable
- [ ] Subject filters work
- [ ] CSV import works
- [ ] Prerequisites link correctly

---

## Phase 4: Term & Facility Management

### 4.1 — Term + Room Models + API (Backend)

**Steps:**
1. Create `terms` app: Term model + ViewSet
2. Create `facilities` app: Room model + ViewSet
3. `activate_term`: deactivates all others, activates selected
4. Permission: Admin-only
5. Tests

**Backend Test:**
- Term CRUD ✓ | Only one active ✓
- Room CRUD ✓ | Type + capacity validated ✓

---

### 4.2 — Admin: Term & Room Management (Frontend)

**Steps:**
1. Term list: Active/Inactive badges, all dates displayed
2. Term create/edit: date fields grouped (enrollment period, advising period, grading period, schedule picking period)
3. "Activate Term" with confirmation
4. Room list: type badges, capacity bars
5. Room create/edit modal

**Manual Verification:**
- [ ] Term list renders with badges
- [ ] Activate works, previous deactivated
- [ ] Room CRUD works
- [ ] All Term date fields save correctly

---

## Phase 5: Faculty Management // 3/8/2026 finished

### 5.1 — Professor Models + API (Backend)

**Steps:**
1. Create `faculty` app
2. Models: Professor, ProfessorSubject
3. ViewSets with subject assignment endpoints
4. Employee ID: auto-generate `EMP-{sequential}` or admin input
5. Creating professor creates User (role=PROFESSOR, `must_change_password=True`)
6. Initial password: `{employee_id}{birthdate_MMDD}` → professor must change on first login
7. Permission: Admin for CRUD, Dean for subject assignment
8. Tests

**Backend Test:**
- Professor CRUD ✓ | User created ✓
- Subject assignment works ✓ | Employee ID unique ✓

---

### 5.2 — Admin: Faculty Management (Frontend)

**Steps:**
1. Professor list: status badge, subject count, employee ID
2. Create/edit form (creates user account)
3. Subject assignment: multi-select with search
4. Active/Inactive toggle

**Manual Verification:**
- [ ] Professor list renders
- [ ] Create → user account created
- [ ] Subject assignment saves
- [ ] Status toggle works

---

## Phase 6: Student Enrollment 3/8/2026 

### 6.1 — Student + Enrollment API (Backend)

**Steps:**
1. Create `students` app
2. Models: Student (with `document_checklist` JSONField), StudentEnrollment (with `year_level` cache)
3. **Public API:** Application form → Student with status=APPLICANT
4. **Admission APIs:** List, view, approve (→ IDN + User), reject, update docs, appointment, commitment
5. **Registrar API:** 2nd-layer verification (update `verified` flags)
6. **Returning student API:** Create StudentEnrollment for active term
7. Year level computation: `AdvisingService.get_year_level()` → cached in `StudentEnrollment.year_level`
8. **IDN generation:** Use `transaction.atomic()` + `select_for_update()` to prevent race conditions during concurrent approvals
9. IDN format: `{YY}{sequential_4_digit}` (e.g., `270001`)
10. Initial student password: `{IDN}{birthdate_MMDD}` → `must_change_password=True`
11. Permission: Public for apply, Admission for process, Registrar for docs, Student for own enrollment
12. Tests: full lifecycle + concurrent IDN generation

**Backend Test:**
- Application → APPLICANT ✓ | Approval → IDN + User ✓
- IDN sequential + unique + atomic (no race condition) ✓ | Rejection works ✓
- Initial password set + must_change_password=True ✓
- Document checklist (submitted + verified) ✓
- Returning enrollment creates record ✓
- Year level computed + cached ✓

---

### 6.2 — Student Application Form (Frontend — Public)

**Steps:**
1. Public page (no auth, no sidebar) with SEO meta tags (seo-meta-optimizer skill)
2. Form: name, DOB, gender, Bulacan address (municipality → barangay cascading), contact, email, guardian, program, student type
3. react-hook-form with validation rules
4. Success page: "Application submitted. Visit campus for verification."

**Manual Verification:**
- [ ] Form renders all fields
- [ ] Address cascading works
- [ ] Validation errors shown
- [ ] Submission → success page

---

### 6.3 — Admission Dashboard (Frontend)

**Steps:**
1. Dashboard: pending count, today's appointments, approvals today
2. Applicant list with status tabs
3. Applicant detail: all data
4. Document checklist (checkboxes)
5. Approve → shows generated IDN
6. Reject → reason input
7. Appointment picker, commitment input

**Manual Verification:**
- [ ] Dashboard stats correct
- [ ] List tabs filter correctly
- [ ] Approve/Reject flow works
- [ ] IDN displayed on approval

---

### 6.4 — Registrar: Document Verification (Frontend)

**Steps:**
1. Student search (name or IDN)
2. Document checklist with separate "submitted" and "verified" columns
3. Registrar verifies each document independently

**Manual Verification:**
- [ ] Search works
- [ ] Submitted vs Verified columns separate
- [ ] Save verification status

---

### 6.5 — Student: Re-Enrollment (Frontend)

**Steps:**
1. "New Term Available" banner on dashboard (if active term, no enrollment yet)
2. "Enroll for This Term" button → confirm → creates StudentEnrollment
3. Banner disappears after enrollment
4. Flows into advising (Phase 7)

**Manual Verification:**
- [ ] Banner shows when applicable
- [ ] Button creates enrollment
- [ ] Banner gone after enrollment

---

## Phase 7: Subject Advising // partially done 3/9/2026

### 7.1 — Advising + Crediting API (Backend)

**Steps:**
1. Create/extend `grades` app
2. `AdvisingService`:
   - `get_year_level(student)` → count passed subjects per curriculum year, return year with most
   - `auto_advise_regular(student, term)` → create Grade records (status=ADVISING) for curriculum subjects matching year_level + semester. Skip `semester_type=S` (summer = always manual)
   - `manual_advise_irregular(student, term, subject_ids)` → validate prerequisites, create Grades
   - `credit_subject(student, subject, credited_by)` → Grade with `is_credited=True`, `grade_status=PASSED`, `term=active_term`, `section=null`
   - `approve_advising(enrollment, user)` → advising_status=APPROVED, Grade statuses → ENROLLED, cache year_level
   - `reject_advising(enrollment, reason)` → advising_status=REJECTED
3. Prerequisite enforcement: all 4 types checked
4. Retake detection: find existing RETAKE/INC grades → include with `is_retake=True`
5. Units validation: warn at >35, block at >40
6. Summer: auto_advise skips `semester_type=S` — summer subjects must be manually selected
7. Permission: Student advises, ProgramHead approves, Registrar credits
8. Tests: regular, irregular, prereqs, retakes, credits, summer

**Backend Test:**
- Regular auto-picks correct subjects ✓
- Summer subjects NOT auto-picked ✓
- Irregular manual selection ✓
- Prerequisites block correctly ✓
- Credits created correctly ✓
- Retakes flagged ✓
- Year level cached on approval ✓
- Units limit enforced ✓

---

### 7.2 — Student: Advising Page (Frontend)

**Steps:**
1. Regular: auto-picked subject table (read-only)
2. Irregular: searchable subject picker (grouped by year/semester)
3. Table: code, name, units, major/minor badge, retake badge, prereq status
4. Retake subjects highlighted
5. Total units counter (warning at >35, error at >40)
6. Submit for approval button
7. Status badge: Pending / Approved / Rejected (with reason if rejected)

**Manual Verification:**
- [ ] Regular sees auto-picked, can't modify
- [ ] Irregular can search/pick
- [ ] Prerequisites warn correctly
- [ ] Retake badges show
- [ ] Units counter works with limits
- [ ] Submit → Pending

---

### 7.3 — Program Head: Advising Approval (Frontend)

**Steps:**
1. Two tabs: Regular (batch) | Irregular (individual)
2. Regular: "Approve All Regular" batch button
3. Irregular: expandable rows showing subject list
4. Approve / Reject per student (reason for rejection)

**Manual Verification:**
- [ ] Batch approve works
- [ ] Individual review works
- [ ] Approve/Reject changes status

---

### 7.4 — Registrar: Subject Crediting (Frontend)

**Steps:**
1. Search transferee student
2. Curriculum subject list → check to credit
3. Credit creates Grade with is_credited=True
4. Status tracking per credited subject

**Manual Verification:**
- [ ] Search finds transferees
- [ ] Credit checkboxes work
- [ ] Credits saved correctly

---

## Phase 8: Sectioning 

### 8.1 — Sectioning Algorithm (Backend)

**Task:** Generate sections (optimal=35, max=40, AM/PM split), assign students.

**Steps:**
1. Create `sections` app
2. `SectioningService`:
   - Count approved students per program + year_level
   - Section count: `ceil(count / 35)` — optimal 35 per section, max 40
   - Equal AM/PM split: if 4 sections → 2 AM + 2 PM
   - Create Section records: `{PROGRAM} {YEAR}-{NUMBER}` with session=AM or PM
   - **DO NOT assign students yet** — students pick AM/PM in Phase 9
   - Irregular students: home section determined AFTER they pick schedule
3. Section transfer API: validate capacity (< max_students=40), override option
4. `drop_subject()` service:
   - Registrar marks a Grade as `DROPPED` (only for ENROLLED status)
   - Student is removed from SectionStudent for that subject's section
   - Notifies student
5. Permission: Registrar
6. Tests: section count math, naming, AM/PM split, drops

**Backend Test:**
- 30 students → 1 AM + 1 PM section ✓
- 70 students → 2 AM + 2 PM sections ✓
- 80 students → 2 AM + 2 PM (35+35+35+... distributed) ✓
- Section names correct ✓
- Subject drop changes Grade to DROPPED ✓
- Transfer validates capacity ✓

**Sectioning math examples:**
```
35 students → ceil(35/35) = 1 → split: 1 AM, 1 PM (wait for picks)
70 students → ceil(70/35) = 2 → split: 1 AM, 1 PM (each ~35)
80 students → ceil(80/35) = 3 → split: 2 AM, 1 PM (or 1, 2 — configurable)
140 students → ceil(140/35) = 4 → split: 2 AM, 2 PM
```

---

### 8.2 — Registrar: Sectioning Page (Frontend)

**Steps:**
1. Dashboard: program × year_level matrix with counts
2. "Generate Sections" button (per group or all)
3. Section list: name, session badge (AM/PM), student count / capacity bar
4. Section detail: student roster
5. Transfer: search student → pick section → confirm (capacity warning if >35, block if >40 without override)
6. Subject drop: Registrar picks student + subject → DROPPED

**Manual Verification:**
- [ ] Matrix shows correct counts
- [ ] Sections generated correctly
- [ ] AM/PM badges show
- [ ] Student roster per section
- [ ] Transfer works with capacity check
- [ ] Subject drop flow works

---

## Phase 9: Scheduling + Student Schedule Picking

### 9.1 — Scheduling + Picking API (Backend)

**Steps:**
1. Create `scheduling` app
2. `SchedulingService`:
   - Create schedule: professor + section + subject + days + room (session inherited from section)
   - Conflict checks: professor (same day + section.session), room (same day + session), section (same day)
   - Get professor's available pairs (assigned subjects → matching sections)
   - Auto-assign room: available room matching type + capacity
   - `publish_schedule(term)` → opens student picking
   - Dean **can edit after publish** — affected students notified
3. `SchedulePickingService`:
   - **Regular:** picks AM or PM → assigned to section with that session (first-come-first-served, max_students enforced)
   - **Irregular:** sees available schedules → picks per subject → system assigns to as few sections as possible
   - `get_available_slots(term, program, year_level, session)` → returns sections with availability count
   - `auto_assign_remaining(term)` → after deadline, auto-assign unpicked students to available slots (balanced)
4. Permission: Dean for scheduling/publish, Student for picking
5. Tests: conflicts, picking, capacity limits, auto-assign, irregular optimization

**Backend Test:**
- Schedule CRUD ✓
- All 3 conflicts detected ✓
- Publish opens picking ✓
- Regular AM pick → assigned to AM section ✓
- Full session → error with alternative ✓
- Irregular picks minimize sections ✓
- Auto-assign after deadline ✓
- Dean edit after publish → notifications sent ✓

---

### 9.2 — Dean: Scheduling Page (Frontend)

**Steps:**
1. Professor list with badges (All Scheduled / Partial / Pending)
2. Click professor → modal with section-subject pairs (grouped by section, showing AM/PM badge from Section.session)
3. Per row: day checkboxes (M–S) only (session is inherited from section, no session toggle needed)
4. Inline conflict warnings
5. Room auto-shown per row
6. Save All button
7. "Publish Schedule" button (enables student picking)
8. Edit/delete after publish (with confirmation)

**Manual Verification:**
- [ ] Professor list with badges
- [ ] Modal shows pairs grouped by section with AM/PM badge
- [ ] Day checkboxes work (no session toggle — inherited)
- [ ] Conflicts highlighted
- [ ] Save All works
- [ ] Publish button works
- [ ] Edit after publish with confirmation

---

### 9.3 — Student: Schedule Picking Page (Frontend)

**Steps:**
1. **Regular student:**
   - "Pick Your Session" page with AM and PM cards
   - Each card: schedule overview (subjects, days, professors), slot count ("12 of 35 available")
   - Select → assigns to that session's section
   - If preferred is full → warning: "AM is full. PM has 15 slots available."
2. **Irregular student:**
   - Subject-by-subject schedule picker
   - Per subject: available sections with schedules shown
   - System shows recommended combination (fewest sections)
   - Student confirms selections
3. After picking: show confirmed weekly timetable

**Manual Verification:**
- [ ] Regular sees AM/PM cards with details
- [ ] Slot counts are real-time accurate
- [ ] Pick → confirmed, shows timetable
- [ ] Full session shows alternative
- [ ] Irregular sees per-subject options
- [ ] Irregular confirmation works

---

## Phase 10: Grade Submission + Resolution

### 10.1 — Grading + Resolution + Expiry API (Backend)

**Steps:**
1. `GradingService`:
   - `submit_midterm(grade_id, value)` → midterm_grade updated
   - `submit_final(grade_id, value)` → grade_status set (PASSED/INC/NO_GRADE)
   - INC → `inc_deadline` = final_submitted_at + 6mo (major) or 1yr (minor)
   - `finalize_grades(term, subject, section, user)` → Registrar bulk-finalize
2. `ResolutionService`:
   - Full chain: request → registrar_approve → submit_grade → head_approve → finalize
   - Head can reject → professor re-submits
   - Dean acts for inactive professor
3. **Background task** `check_inc_expiry` (management command, run daily via cron):
   - Grade where status=INC and inc_deadline < today → RETAKE
   - Grade where status=NO_GRADE and term ended → RETAKE
   - Notify student + professor on each expiry
4. **Term transition rules:**
   - Professors **can submit grades for previous terms** until `final_grade_end` of that term
   - After `final_grade_end`: remaining ENROLLED grades → NO_GRADE → eventually RETAKE
   - INC deadlines are **date-based** (not term-based) — they carry across terms naturally
   - Activating a new term doesn't affect previous term's data
5. Permission: Professor submits, Registrar finalizes, Head approves resolution, Dean acts for inactive
6. Tests: full lifecycle, resolution chain, expiry, term transition

**Backend Test:**
- Midterm → no status change ✓
- Final 1.5 → PASSED ✓ | INC → deadline set ✓ | NG → NO_GRADE ✓
- Resolution chain complete ✓
- Head reject → re-submit ✓
- Dean acts for inactive ✓
- Expiry command → RETAKE + notifications ✓

---

### 10.2 — Professor: Grade Entry (Frontend)

**Steps:**
1. Dashboard: assigned section-subjects list
2. Click → student grade table
3. Inline grade dropdown (1.0–3.0, INC, NG)
4. Midterm and Final columns
5. Submit All button
6. Status badges per student
7. INC grades: "Request Resolution" → reason + new grade form

**Manual Verification:**
- [ ] Only own sections shown
- [ ] Grade dropdowns work
- [ ] Submit updates statuses
- [ ] Resolution request form works

---

### 10.3 — Registrar: Grade Finalization (Frontend)

**Steps:**
1. Pending grades list (submitted, not finalized)
2. Grade table per section
3. "Finalize All" batch button
4. Resolution queue: approve requests → unlock professor

**Manual Verification:**
- [ ] Pending list correct
- [ ] Finalize updates statuses
- [ ] Resolution approval works

---

### 10.4 — Program Head: Resolution Approval (Frontend)

**Steps:**
1. Resolution queue: grades pending Head approval
2. Each row: student, subject, original grade, proposed new grade, reason
3. Approve → moves to Registrar final step
4. Reject with reason → professor re-submits

**Manual Verification:**
- [ ] Queue shows pending items
- [ ] Approve/Reject works
- [ ] Rejected items show reason

---

## Phase 11: Payments & Permits

### 11.1 — Payment API — Append-Only (Backend)

**Steps:**
1. Create `finance` app
2. `PaymentService`:
   - `record_payment(student, term, month, amount, is_promissory, processed_by)`
   - `record_adjustment(student, term, month, negative_amount, processed_by)` → correction entry
   - Month 1 promissory: always allowed
   - Month 2+: check sum(amount_paid) > 0 for previous month
   - **No edit or delete** — corrections via negative adjustments
   - `get_permit_status(student, term)` → sum payments per month range
3. API: Cashier records/views, Student views own
4. Permission: Cashier for recording, Student for read-only
5. Tests

**Backend Test:**
- Payment recorded ✓
- Adjustment (negative amount) works ✓
- Month 1 promissory allowed ✓ | Month 2 blocked if Month 1 unpaid ✓
- Permit status derived from sums ✓
- No edit/delete endpoints exist ✓

---

### 11.2 — Cashier: Payment Processing (Frontend)

**Steps:**
1. Dashboard: daily collection, monthly total, overdue students
2. Student search → payment history (all entries including adjustments)
3. Record: month dropdown, amount, promissory toggle
4. Adjustment button: negative correction entry with reason
5. Promissory validation on UI

**Manual Verification:**
- [ ] Search works
- [ ] Payment records
- [ ] Adjustment creates negative entry
- [ ] Promissory validation enforced

---

### 11.3 — Student: Payment View (Frontend)

**Steps:**
1. Payment history table
2. Three permit cards with status indicators
3. Visual: ✅ paid, ⚠️ promissory, ❌ unpaid

**Manual Verification:**
- [ ] History accurate
- [ ] Permits show correctly
- [ ] Colors match state

---

## Phase 12: Notifications

### 12.1 — Notification System (Backend)

**Steps:**
1. Create `notifications` app
2. `NotificationService.notify(recipient, type, title, message, link_url)`
3. 14 triggers integrated into existing services:
   | Trigger | Recipient |
   |---|---|
   | Advising approved | Student |
   | Advising rejected | Student |
   | Grade submitted | Registrar |
   | Grade finalized | Student |
   | INC expiring (7 days) | Professor |
   | INC expired | Professor + Student |
   | Resolution requested | Registrar |
   | Resolution approved | Professor |
   | Resolution rejected | Professor |
   | Enrollment approved | Student |
   | Enrollment rejected | Student |
   | Schedule published | All students |
   | Payment recorded | Student |
   | Section transfer | Student |
   | Subject dropped | Student |
4. API: list (paginated), mark_read, mark_all_read, unread_count
5. Permission: own only
6. Tests

**Backend Test:**
- Each trigger creates notification ✓
- Pagination works ✓ | Unread first ✓
- Mark read/all ✓ | Own only ✓

---

### 12.2 — Notification Bell (Frontend)

**Steps:**
1. Bell icon in header with red unread badge
2. Dropdown: recent notifications (max 10)
3. Click → mark read + navigate to link_url
4. "Mark all as read"
5. Polling every 30s for unread count

**Manual Verification:**
- [ ] Badge shows count
- [ ] Dropdown lists items
- [ ] Click navigates
- [ ] Mark all clears badge

---

## Phase 13: Audit Trail

### 13.1 — Audit Log System (Backend)

**Steps:**
1. Create `auditing` app
2. `AuditMixin`: auto-log CREATE/UPDATE/DELETE with field_changes
3. Apply to: Student, Grade, Payment, Section, SectionStudent, Schedule, Professor
4. Captures: user, action, model, object_id, field_changes, IP
5. API: list with filters (user, model, action, date_range)
6. Permission: Admin=all, Head Registrar=registrar actions, others=own
7. Tests

---

### 13.2 — Admin + Head Registrar: Audit Viewer (Frontend)

**Steps:**
1. **Admin:** Full log table with all filters + CSV export
2. **Head Registrar:** Same table filtered to Registrar users only
3. Expandable rows: field_changes diff (old → new)

**Manual Verification:**
- [ ] Tables populate
- [ ] Filters work
- [ ] Diff view shows changes
- [ ] Head Registrar sees only Registrar logs
- [ ] CSV export downloads

---

## Phase 14: Reports & COR

### 14.1 — Reports + Export (Backend)

**Steps:**
1. Enrollment stats: per program, term, year level
2. Grade distribution: per section, subject, term
3. Payment summary: per month, total, overdue
4. Masterlist: students + grades → Excel export (`openpyxl`)
5. COR: student subjects + schedule → PDF (`reportlab`)
6. Faculty load: professor hours/sections
7. Graduation check: verify all curriculum subjects passed → can mark GRADUATED
8. Permission: role-appropriate
9. Tests

---

### 14.2 — Registrar: COR + Masterlist (Frontend)

**Steps:**
1. COR: search student → preview → download PDF
2. Masterlist: select term + program + year → table → export Excel
3. Graduation: search student → verify completion → mark graduated

**Manual Verification:**
- [ ] COR search + preview + PDF download
- [ ] Masterlist renders + Excel export
- [ ] Graduation check works

---

### 14.3 — Role Dashboards (Frontend)

All dashboards with relevant stat cards + quick links:

| Role | Stats Shown |
|---|---|
| Admin | Programs, Subjects, Professors, Rooms, Recent audit |
| Admission | Pending applicants, Today's appointments, Approvals today |
| Registrar | Pending docs, Pending grades, Sections, Masterlist link |
| Head Registrar | Registrar activity, Audit log preview |
| Program Head | Pending advising, Pending credits, Pending resolutions |
| Dean | Scheduling status, Professor load, Published status |
| Professor | Assigned sections, Pending grades count |
| Cashier | Today's payments, Monthly total, Overdue students |
| Student | Subjects, Grades, Schedule, Payments, Permits |

**Manual Verification:**
- [ ] Each role sees correct dashboard
- [ ] Stats accurate
- [ ] Cards link to detail pages

---

## Phase 15: Student Portal

### 15.1 — Full Student Pages (Frontend)

**Steps:**
1. Dashboard: term info, subjects, schedule, grades, permits
2. Weekly timetable (color-coded by subject)
3. Grade history: all terms, midterm + final, status badges
4. Payment history + permit cards
5. Profile: personal info, document status

**Manual Verification:**
- [ ] Dashboard complete
- [ ] Timetable renders correctly
- [ ] Grade history all terms
- [ ] Payments + permits accurate
- [ ] Profile data correct

---

## Execution Summary

```
Phase 1  → Foundation (scaffolding, design system, seed data, .env)
Phase 2  → Auth (JWT, login, roles, idle timeout)
Phase 3  → Academic (programs, curriculum, subjects, CSV import)
Phase 4  → Terms & Rooms (term activation, room mgmt)
Phase 5  → Faculty (professor CRUD, subject assignment)
Phase 6  → Enrollment (application, admission, docs, re-enrollment)
Phase 7  → Advising (auto/manual, credits, approval, summer skip)
Phase 8  → Sectioning (35/40 split, AM/PM, subject drop)
Phase 9  → Scheduling (Dean assigns, publish, student AM/PM pick, auto-assign)
Phase 10 → Grades (submit, finalize, resolution chain, INC expiry cron)
Phase 11 → Payments (append-only, promissory, permits)
Phase 12 → Notifications (14 triggers, bell UI, polling)
Phase 13 → Audit Trail (auto-logging, viewer, CSV export)
Phase 14 → Reports (COR PDF, masterlist Excel, graduation, dashboards)
Phase 15 → Student Portal (timetable, grades, payments, profile)
```

**Per phase:** Backend → Tests → Frontend → Manual Verification → Next Phase

---

## Full System Cycle (End-to-End)

```
 1. Admin creates Program + Curriculum + Subjects              [Phase 3]
 2. Admin creates Term and activates it                        [Phase 4]
 3. Admin creates Rooms                                        [Phase 4]
 4. Admin creates Professors, assigns subjects                 [Phase 5]
 5. New student applies online (public form)                   [Phase 6]
 6. Admission verifies, approves, generates IDN                [Phase 6]
 7. Registrar verifies documents (2nd layer)                   [Phase 6]
 8. Returning student re-enrolls from dashboard                [Phase 6]
 9. System auto-picks subjects (regular, skips summer)         [Phase 7]
10. Irregular student manually picks subjects                  [Phase 7]
11. Registrar credits transferee subjects                      [Phase 7]
12. Program Head approves advising                             [Phase 7]
13. Registrar triggers sectioning (35 optimal, 40 max)         [Phase 8]
14. Sections created with AM/PM assignments                    [Phase 8]
15. Dean assigns professors + days to sections (session from section)  [Phase 9]
16. Dean publishes schedule                                    [Phase 9]
17. Regular student picks AM or PM (first-come-first-served)   [Phase 9]
18. Irregular student picks schedule slots (few sections)      [Phase 9]
19. Unpicked students auto-assigned after deadline             [Phase 9]
20. Professor submits midterm grades                           [Phase 10]
21. Professor submits final grades                             [Phase 10]
22. Registrar finalizes grades                                 [Phase 10]
23. If INC → resolution chain (Prof→Reg→Prof→Head→Reg)         [Phase 10]
24. INC auto-expires to RETAKE (daily cron)                    [Phase 10]
25. Registrar processes subject drops (→ DROPPED status)       [Phase 8]
26. Cashier records monthly payments (append-only)             [Phase 11]
27. System derives permits from payment sums                   [Phase 11]
28. Notifications fire at every major step (14 triggers)       [Phase 12]
29. All changes logged to audit trail                          [Phase 13]
30. Registrar generates COR (PDF) and Masterlist (Excel)       [Phase 14]
31. Registrar marks graduating students                        [Phase 14]
32. Student views everything from portal                       [Phase 15]
```

---

## Rules Compliance

| GEMINI.md Rule | Applied |
|---|---|
| Layered architecture | Services handle logic, views are thin |
| SOLID | Single responsibility per service, open for extension |
| DRY | Core mixins, shared components, base classes |
| KISS | Simple models, clear APIs |
| YAGNI | Only documented features |
| Backend permissions | Every endpoint has role-based permission |
| No frontend security reliance | All validation on backend |
| Clean code | Consistent naming, error handling, comments where needed |
| Modular design | One Django app per domain, one page folder per role |
| Append-only payments | No destructive financial operations |

## Skills Used

| Skill | When |
|---|---|
| `django-expert` | All backend phases — models, views, serializers, tests, query optimization |
| `ui-ux-pro-max` | Phase 1.2 — design system, applied to all frontend phases |
| `seo-meta-optimizer` | Phase 6.2 — public application page SEO |
