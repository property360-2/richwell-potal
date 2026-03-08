# Finished Tasks

## Phase 1.1 — Backend Project Init + Seed Data
- Create `backend/` directory structure
- Init Django project with `config` package
- Split settings: `base.py`, `development.py`, `production.py`
- Install all dependencies (requirements.txt)
- Create `.env.example` and `.env`
- Configure PostgreSQL from env vars
- Configure CORS from env vars
- Create `core/` package (permissions, pagination, exceptions, mixins)
- Load `bulacan_locations.json`
- Create `seed_data` management command
- Verify: `manage.py check`, `runserver`, `seed_data`

## Phase 1.2 — Frontend Project Init + Design System
- Install dependencies (axios, react-router-dom, lucide-react, react-hook-form)
- Create UI components: Button, Input, Modal, Card, Badge, Table, Select, Pagination, LoadingSpinner, Toast
- Create layout: Sidebar (role-aware), Header, PageWrapper
- Create error pages: ErrorBoundary, NotFound (404), Forbidden (403), ServerError (500)
- Setup React Router with ProtectedRoute
- Setup Axios instance (JWT injection, 401 refresh, retry)
- Setup useIdleTimer hook

## Phase 2.1 — Authentication & Users (Backend)
- Create `accounts` app models (User with roles)
- Implement Serializers (Login, User, TokenRefresh, ChangeAuth, Staff)
- Implement Views (Login, Logout, Me, Password, StaffViewSet)
- Apply Permission classes (`IsAdmin`, `IsStaff`, etc.)
- Configure SimpleJWT (30m access, 7d refresh)
- ~~Implement initial password policy (`must_change_password=True`)~~ (Removed per user request)
- Create `create_admin` management command
- Write backend tests

## Phase 2.2 — Authentication & Staff UI (Frontend)
- Create Login page form (email/password)
- Connect login API + store JWT tokens
- ~~Create Change Password page (forced on first login)~~ (Removed per user request)
- Update AuthContext with login logic and token decoding
- Update ProtectedRoute redirect logic (role -> dashboard)
- Create Staff Management page for Admins (List, Create, Edit, Reset Password)

## Phase 3.1 — Academic Models + API (Backend)
- Create `academics` app and models (Program, CurriculumVersion, Subject, SubjectPrerequisite)
- Implement Serializers with nested relationships
- Implement ViewSets (`ProgramViewSet`, `CurriculumVersionViewSet`, `SubjectViewSet`)
- Create CSV upload endpoint (parse `curriculum.csv` -> bulk create subjects)
- Add filters (by curriculum, year_level, semester)
- Create Bulacan location endpoint (serve JSON)
- Write backend tests

## Phase 3.2 — Admin: Academic Dashboard & UI Refinements (Frontend)
- Build Academic Management dashboard with tabbed UI
- Build Program management table with CRUD modals (removed `effective_year`)
- Build Subject management with asynchronous **Year Level** filter
- Improved dashboard layout spacing and margins ("magkakadikit" fix)
- Build CSV bulk subject upload with prerequisite support and 415 error fix
- Build Subject edit/create forms with prerequisite management UI
- Implement automated curriculum parsing logic (improved)

## Phase 4 — Term & Facility Management
- Create `terms` app: Term model with comprehensive date ranges (Enrollment, Advising, Grades, etc.)
- Create `facilities` app: Room model with capacity and type (LECTURE/LAB)
- Implement `activate_term` logic: automatically deactivates other terms
- Build Admin UI for Term Management (list, create, edit, activate)
- Build Admin UI for Room Management (list, create, edit)

## Phase 5 — Student Enrollment Lifecycle
- Build Public Application Form (`/apply`) with auto-curriculum and Bulacan location integration
- Enhanced Admission Approval:
    - Auto-generation of **Student ID (IDN)** using `{YY}{sequential_4_digit}`
    - Auto-generation of **User Account** and default password `{IDN}{birthdate_MMDD}`
    - Added **Monthly Payment Commitment** recording (mandatory for approval)
    - Success screen displaying credentials for immediate handover to student
- Registrar Verification:
    - Second layer of document verification for officially enrolled status
    - Visibility of monthly commitment amount recorded by Admission
- Backend: Auto-enrollment of approved students into the **Active Term**

## Phase 6 — Faculty Management
- Create `faculty` app: Professor and ProfessorSubject models
- Implemented Professor CRUD endpoints with subject assignment
- Auto-generation of Employee ID (`EMP-{YY}{seq}`) and User Account
- Initial default password generation: `{employee_id}{birthdate_MMDD}`
- Build Admin UI for Faculty Management (table list, edit modals)
- Build specific UI Subject Assignment modal fetching from Curriculum

## Phase 7 — Advanced Student Enrollment
- Implement Atomic IDN Generation: `SystemSequence` model with `select_for_update()` for race-condition safe sequential IDs (e.g., `270001`)
- Build Advising Service: `AdvisingService` for automated Year Level computation for Freshmen and Returning students
- Create Returning Student API: Dedicated endpoint for one-click enrollment with payment commitment recording
- Enhanced Account Security: Initial password `{IDN}{birthdate_MMDD}` with mandatory `must_change_password` flag
- Frontend Refinements:
    - SEO Optimization: Meta titles and descriptions for public application form
    - Bulacan-specific Cascading Address: Municipality-based Barangay filtering
    - Strict Validation: Philippine mobile number and email format verification
