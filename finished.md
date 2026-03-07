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
