# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Richwell Colleges Portal** is a comprehensive Student Information System (SIS) designed for Richwell Colleges to manage the complete student lifecycle from admissions through graduation. The system handles multi-actor workflows (Students, Professors, Registrars, Admissions Staff, Cashiers, Head-Registrars, and Admins) with sophisticated business logic for enrollment, payments, scheduling, grading, and academic administration.

**Current Status:** Project is in the planning and design phase. Business functions and UI/UX specifications are fully documented. Implementation has not yet begun.

## Architecture Overview

### Core Business Domains

The system is organized around 15 major business functions:

1. **Admissions & Online Enrollment** — Public form for new applicants and transferees with automatic account creation
2. **Student Profile & Lifecycle** — Student identity management with status tracking (ACTIVE, LOA, WITHDRAWN, GRADUATED)
3. **Curriculum & Course Management** — Program definitions, subjects, prerequisites, major/minor classifications
4. **Sections & Scheduling** — Class sections, professor assignments, schedule slots, conflict detection
5. **Subject Enrollment** — Student course selection with unit cap (30/semester), prerequisite validation, section conflicts
6. **Payments & Payment Plans** — Semester divided into 6 monthly payment buckets with sequential allocation
7. **Exam Permits** — Auto-unlock when monthly payment completed, gates physical exam access
8. **Grades, GPA & INC Logic** — Grade entry, finalization, GPA calculation, incomplete (INC) expiry with configurable thresholds
9. **Transferee Onboarding** — Registrar-initiated account creation with subject credits from prior institutions
10. **Document Release** — Official document management (TOR, COE, diplomas) with audit trails
11. **Notifications** — In-app system notifications for payments, permits, grade changes
12. **Audit & Security** — Immutable audit logging of all critical operations
13. **Reports & Analytics** — Role-based reporting with CSV/PDF export
14. **Admin Configuration** — System settings (enrollment link toggle, exam-month mapping, grade scales, INC thresholds)
15. **Background Jobs** — Celery tasks for async operations (payment allocation, receipt generation, GPA recalculation, INC expiry)

### Critical Business Rules to Understand

**Sequential Payment Allocation:** Payments must be allocated to months in order. Month N cannot receive payments until Month N-1 is fully paid. This is a hard constraint.

**Unit Cap:** Students can enroll maximum 30 units per semester. This is enforced with database-level concurrency control (select_for_update) to prevent race conditions.

**Prerequisite Enforcement:** If a prerequisite subject has status INC, FAILED, or RETAKE, dependent subject enrollment is blocked. CREDITED status satisfies prerequisites.

**INC Expiry:**
- Major subjects: 6 months until automatic conversion to FAILED
- Minor subjects: 1 year until automatic conversion to FAILED
- Clock pauses during LOA (Leave of Absence)
- Triggering event auto-creates notification and audit log

**First Month Payment Gate:** Students cannot enroll subjects or sit exams until Month 1 is fully paid. This is enforced at the UI and business logic layers.

**Registrar Overrides:** Registrars can override schedule conflicts and section capacity constraints, but every override requires a reason and creates an audit log entry.

## Technology Stack (Planned)

Based on business function complexity and academic institution requirements, the likely stack will be:

- **Backend:** Django + Django REST Framework (Python)
- **Frontend:** React or Vue.js (TypeScript)
- **Database:** PostgreSQL (for complex queries and audit logging)
- **Cache/Jobs:** Redis + Celery (for background jobs and async operations)
- **Document Generation:** ReportLab or WeasyPrint (PDF receipts, exam permits, documents)

## Development Commands (To Be Populated)

These commands will be added once implementation begins:

```bash
# Install dependencies
# TBD

# Database setup
# TBD

# Run development server
# TBD

# Run tests
# TBD

# Run linting
# TBD

# Build for production
# TBD
```

## Project Documentation

**Key Planning Documents:**
- `/plan/plan.md` — High-level project overview and scope
- `/plan/business-functions.md` — Detailed specifications for all 15 business functions with acceptance criteria
- `/plan/collor-theme.md` — Color palette definitions (saffron, purples, orchid)

These documents are comprehensive and contain:
- Detailed business rules and validations for each function
- Data structures and relationships
- UI touchpoints for each role
- Acceptance criteria for development
- KPIs and operational metrics

## Important Implementation Patterns

When implementing features, follow these patterns:

### 1. Sequential Payment Allocation
Use the algorithm outlined in business-functions.md Section 6. Ensure:
- All month buckets up to N-1 are checked
- Remaining amount flows to next unpaid month
- Overpayment is allocated to next month
- Use database transactions to prevent race conditions

### 2. Prerequisite Validation
Before allowing subject enrollment, check that all prerequisites:
- Have a matching SubjectEnrollment record for the student
- Have status PASSED, CREDITED, or equivalent (not INC, FAILED, RETAKE)
- Validate on each subject add before confirmation

### 3. Concurrent Enrollment Race Condition
Use Django's `select_for_update()` on the Enrollment record during subject enrollment transactions to prevent multiple concurrent requests bypassing the 30-unit cap.

### 4. Audit Logging
Every critical operation must create an AuditLog entry with:
- Actor (user or SYSTEM for automated tasks)
- Action name (e.g., "PAYMENT_RECORDED", "GRADE_FINALIZED")
- Target model and target ID
- Before/after payload
- Timestamp
- IP address (for user actions)

### 5. Async Job Idempotency
All Celery tasks must be idempotent. Running the same task twice should produce the same result. Use database-level checks to detect and skip already-processed events.

### 6. Registrar Overrides
Any action that requires a registrar override (schedule conflict, section capacity, post-finalization grade edit) must:
- Accept a `reason` or `override_reason` field
- Create an audit log entry
- Be clearly marked in UI as an override

## Color Theme

The design uses a sophisticated purple and saffron palette:
- **Saffron:** #E3B60F (accent, highlights)
- **Purple:** #75156C (primary dark)
- **Purple-2:** #6D116A (variant)
- **Royal Plum:** #77206C (variant)
- **Vivid Orchid:** #BB41CA (secondary bright)

Gradient utilities are available for UI elements (see `/plan/collor-theme.md`).

## Testing Strategy (To Be Implemented)

Critical areas requiring comprehensive testing:

1. **Payment allocation logic** — Test sequential allocation with partial/full payments, overpayment scenarios
2. **Unit cap enforcement** — Test concurrent enrollments, race conditions
3. **Prerequisite validation** — Test various prerequisite chains, INC/FAILED blocking
4. **Schedule conflict detection** — Test professor conflicts, student conflicts, multiple sections
5. **INC expiry** — Test major/minor thresholds, LOA pausing, auto-conversion
6. **Grade finalization** — Test GPA recalculation, post-finalization overrides
7. **Audit logging** — Verify all critical operations are logged

## Common Development Tasks (When Implementation Begins)

- Add a new payment transaction and verify sequential allocation
- Enroll a student in subjects and verify unit cap, prerequisites, schedule conflicts
- Finalize grades and verify GPA recalculation
- Test INC expiry conversion and notification
- Generate audit reports for compliance

## Key Contacts & Roles

Document contacts as they're identified. For now, reference the business functions document for actor descriptions:
- **Student** — Primary user, can enroll in subjects, make payments, view grades
- **Registrar** — Can create/edit student records, enroll students, finalize grades, override conflicts
- **Head-Registrar** — Can view/audit all registrar actions, handle disputes
- **Admin** — System configuration, user management, audit logs, impersonation
- **Cashier** — Records payments, generates receipts
- **Professor** — Submits and edits grades
- **Admission Staff** — Manages applicant documents and enrollments

## Next Steps

1. Set up project structure (Django + React/Vue, PostgreSQL, Redis, Celery)
2. Create Django models based on business function data structures
3. Implement payment allocation and exam permit logic (highest complexity/priority)
4. Build student enrollment workflow with unit cap and prerequisite validation
5. Implement grade management and INC expiry automation
6. Add comprehensive audit logging
7. Create role-based views and access control
8. Build reporting system
9. Develop notification system
10. Implement admin configuration UI

---

**Document Version:** 1.0
**Last Updated:** 2025-11-29
**Project Status:** Planning Phase (Ready for Development)
