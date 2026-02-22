# Post-MVP Feature Backlog

This document tracks system configurations and features that were deferred to keep the MVP simple and clean.

## 1. Global Exam Configurations
- **Original Route**: `/registrar/exam-mappings`
- **Description**: A dedicated UI for mapping Exam Periods (Prelim, Midterm, etc.) to Required Payment Months.
- **Why Deferred**: Institutional rules like "Must pay Month 1 for Prelims" are currently static or managed via the backend seeder. A UI is only needed for dynamic institutional changes.
- **Future Recommendation**: Instead of a standalone page, this should be integrated as a "Dynamic Rules" tab inside the **Semester Management** module.

## 2. Grade Resolution Flow [COMPLETED]
- **Status**: Implemented in Phase 8.
- **Workflow**: Professor -> Program Head -> Registrar.
- **Features**: Includes automated grade updates, role-aware notifications, and a real-time progress tracker for students.

## 5. Academic Policies (Internal Rules)
- **INC Expiry**: Students have one year (2 regular semesters) to resolve an Incomplete grade. After this, the system automatically converts it to a grade of 5.0 (Failure).
- **Retake Waiting Periods**:
    - **Minor Subjects**: 1 year waiting period after failing.
    - **Major Subjects**: 6 months waiting period after failing.
- **Pre-requisite Enforcement**: Enrolling in a subject will be blocked if the student has a grade lower than 3.0 or an unexpired INC in the necessary pre-requisites.

## 3. Global Exam Permits Masterlist
- **Original Route**: `/registrar/exam-permits`
- **Description**: A searchable masterlist of all generated student examination permits across all periods.
- **Why Deferred**: For MVP, permit verification can be done by searching for individual students. A global list is only needed for high-volume auditing or batch printing.
- **Future Recommendation**: 
  - **Individual**: Add a "Permits" tab in the **Student Detail** page for per-student history.
  - **Global**: Move this under a new **Registrar > Reports** dashboard later.

## 4. Universal System Configuration
- **Original Route**: `/admin/config`
- **Description**: Key-Value pair storage for global environment variables (e.g., `MAINTENANCE_MODE`, `MAX_UNITS`).
- **Why Deferred**: Admin prefers direct codebase updates for simplicity in the MVP.
- **Future Recommendation**: Re-activate if non-technical administrators need to adjust system rules without touching the code.

## 6. Live System Health Monitoring
- **Description**: Real-time dashboard widgets for monitoring database integrity, API latency, and security protocol enforcement.
- **Why Deferred**: Currently being simulated in the UI; a true dynamic monitoring system would require deeper infrastructure integration.
- **Future Recommendation**: Implement a ping-based health check system to provide legitimate system status icons on the Admin Dashboard.

---
*Last Updated: February 21, 2026*
