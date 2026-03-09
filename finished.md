# Finished Tasks

## — Backend Project Init + Seed Data
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

##  — Frontend Project Init + Design System
- Install dependencies (axios, react-router-dom, lucide-react, react-hook-form)
- Create UI components: Button, Input, Modal, Card, Badge, Table, Select, Pagination, LoadingSpinner, Toast
- Create layout: Sidebar (role-aware), Header, PageWrapper
- Create error pages: ErrorBoundary, NotFound (404), Forbidden (403), ServerError (500)
- Setup React Router with ProtectedRoute
- Setup Axios instance (JWT injection, 401 refresh, retry)
- Setup useIdleTimer hook

##  — Authentication & Users (Backend)
- Create `accounts` app models (User with roles)
- Implement Serializers (Login, User, TokenRefresh, ChangeAuth, Staff)
- Implement Views (Login, Logout, Me, Password, StaffViewSet)
- Apply Permission classes (`IsAdmin`, `IsStaff`, etc.)
- Configure SimpleJWT (30m access, 7d refresh)
- ~~Implement initial password policy (`must_change_password=True`)~~ (Removed per user request)
- Create `create_admin` management command
- Write backend tests

## — Authentication & Staff UI (Frontend)
- Create Login page form (email/password)
- Connect login API + store JWT tokens
- ~~Create Change Password page (forced on first login)~~ (Removed per user request)
- Update AuthContext with login logic and token decoding
- Update ProtectedRoute redirect logic (role -> dashboard)
- Create Staff Management page for Admins (List, Create, Edit, Reset Password)

## — Academic Models + API (Backend)
- Create `academics` app and models (Program, CurriculumVersion, Subject, SubjectPrerequisite)
- Implement Serializers with nested relationships
- Implement ViewSets (`ProgramViewSet`, `CurriculumVersionViewSet`, `SubjectViewSet`)
- Create CSV upload endpoint (parse `curriculum.csv` -> bulk create subjects)
- Add filters (by curriculum, year_level, semester)
- Create Bulacan location endpoint (serve JSON)
- Write backend tests

## — Admin: Academic Dashboard & UI Refinements (Frontend)
- Build Academic Management dashboard with tabbed UI
- Build Program management table with CRUD modals (removed `effective_year`)
- Build Subject management with asynchronous **Year Level** filter
- Improved dashboard layout spacing and margins ("magkakadikit" fix)
- Build CSV bulk subject upload with prerequisite support and 415 error fix
- Build Subject edit/create forms with prerequisite management UI
- Implement automated curriculum parsing logic (improved)

## — Term & Facility Management
- Create `terms` app: Term model with comprehensive date ranges (Enrollment, Advising, Grades, etc.)
- Create `facilities` app: Room model with capacity and type (LECTURE/LAB)
- Implement `activate_term` logic: automatically deactivates other terms
- Build Admin UI for Term Management (list, create, edit, activate)
- Build Admin UI for Room Management (list, create, edit)

## — Student Enrollment Lifecycle
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

## — Faculty Management
- Create `faculty` app: Professor and ProfessorSubject models
- Implemented Professor CRUD endpoints with subject assignment
- Auto-generation of Employee ID (`EMP-{YY}{seq}`) and User Account
- Initial default password generation: `{employee_id}{birthdate_MMDD}`
- Build Admin UI for Faculty Management (table list, edit modals)
- Build specific UI Subject Assignment modal fetching from Curriculum

## — Advanced Student Enrollment 3/9/2026
- Implement Robust Sequential IDN Generation: `SystemSequence` model for safe and unique IDs (e.g., `270001`)
- Build Advising Service: `AdvisingService` for automated Year Level computation for Freshmen and Returning students
- Create Returning Student API: Dedicated endpoint for one-click enrollment with payment commitment recording
- Enhanced Account Security: Initial password `{IDN}{birthdate_MMDD}`
- Frontend Refinements:
    - SEO Optimization: Meta titles and descriptions for public application form
    - Bulacan-specific Cascading Address: Municipality-based Barangay filtering
    - Strict Validation: Philippine mobile number and email format verification
## — Registrar Verification & Student Self-Enrollment
- Build Registrar Document Verification UI:
    - Created `RegistrarVerificationModal.jsx` for verifying submitted documents
    - Logic: Only "Submitted" documents can be "Verified" with progress tracking (e.g., "3/10")
    - Permissions: Restricted updates to ADMIN, REGISTRAR, or the owner STUDENT
- Build Student Re-Enrollment Dashboard:
    - Replaced placeholder with functional `StudentDashboard.jsx`
    - Dynamic "New Term Available" banner for unenrolled students in active terms
    - One-click enrollment with monthly payment commitment recording
    - Post-enrollment "Quick Actions" for Subject Advising and Schedule Picking
- Backend Security:
    - Addressed authentication interceptors that were incorrectly applying old Authorization headers.
    - Updated `TermViewSet` permissions from `IsAdmin` to `IsAdminOrReadOnly` to allow read access for students.

## — Authentication Flow & Race Condition Fixes
- UI Navigation & State Synchronization:
    - Implemented a direct navigation logic from Login to role-specific dashboard (e.g., `/student`), bypassing unnecessary `/` redirects.
    - Enhanced `AuthContext` to synchronously update `user` and `role` state alongside `setIsLoading(false)` to prevent split-second "Access Denied" errors.
- Guarded Route Security Check:
    - Updated `ProtectedRoute` to display a `LoadingSpinner` when roles are hydrating (preventing premature 403 redirects).
    - Applied case-insensitive role matching to prevent token naming mismatches.
- API Interceptor Handling:
    - Updated `axios.js` to explicitly clear old `Authorization` headers on `/login` and `/refresh` requests to ensure clean session instantiation.
