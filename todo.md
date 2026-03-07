# Richwell Portal — TODO

## 🔥 Pre-Development (Must Do First)

- [ ] **Dean Scheduling UI Prototype** — Create and iterate on the scheduling UI before full development. See `scheduling_prototype.html` for the initial design.
- [ ] **Bulacan Location Data** — User to provide municipality/barangay data as CSV or JSON.
- [ ] **Create Implementation Plan** — Django models, API structure, React page breakdown, development order.

## 🏗️ Development Phases

### Phase 1: Foundation
- [ ] Django project setup + PostgreSQL + JWT auth
- [ ] Core models (User, Program, Curriculum, Subject, Term)
- [ ] Role-based permission system
- [ ] React project setup + routing + auth flow

### Phase 2: Enrollment Flow
- [ ] Online applicant form (with Bulacan location API)
- [ ] Admission verification + approval/rejection
- [ ] IDN auto-generation
- [ ] Returning student term enrollment
- [ ] Student document verification (Registrar 2nd layer)

### Phase 3: Academic Flow
- [ ] Subject crediting (transferees)
- [ ] Subject advising (regular auto-pick + irregular manual)
- [ ] Prerequisite enforcement + standing prerequisites
- [ ] Sectioning algorithm (auto-generate + irregular float)
- [ ] Scheduling (student pick + Dean professor assignment)

### Phase 4: Grading
- [ ] Grade submission (Midterm + Final)
- [ ] INC/No Grade/Retake logic
- [ ] Grade resolution + approval chain
- [ ] Dean acting on behalf of inactive professor

### Phase 5: Finance & Permits
- [ ] Payment recording (Cashier)
- [ ] Monthly commitment tracking
- [ ] Promissory note logic (Month 1 always allowed)
- [ ] Permit flags per month

### Phase 6: Supporting Modules
- [ ] Reports (real-time, per role)
- [ ] Audit trailing (field-level)
- [ ] Notifications (bell icon + triggers)
- [ ] Dashboards (per role)
- [ ] Data upload/export (CSV/XLSX)
- [ ] Faculty management (CRUD + profile)
- [ ] Program management (CRUD + curriculum)
- [ ] Facility management (rooms CRUD)

## 📝 Notes

- Beta testing is **BSIS only**
- Room types for beta: **Computer Lab + Lecture Room** only
- All 8 programs loaded but BSIS is primary test target
