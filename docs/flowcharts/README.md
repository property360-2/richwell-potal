# System Flowcharts

This directory contains visual guides for the application's core processes.

## 1. Enrollment & Advising Flow
- [Automatic Advising](./auto-advise-regular.md) - Automated logic for regular students.
- [Manual Advising](./manual-advise-irregular.md) - Validation for irregular student selections.
- [Schedule Picking](./schedule-picking.md) - Section selection & conflict detection.
- [Advising Approval](./advising-approval.md) - Program Head review process.

## 2. Grading & Academic Records
- [Professor's Grading Guide](./professor-grading-guide.md) - User guide for professors.
- [Grade Submission Logic](./submit-final-grade.md) - Technical flow for final grade entry.
- [INC Resolution Workflow](./inc-resolution-workflow.md) - Complete guide and logic for incomplete resolutions.
- [Grade Finalization](./grade-finalization.md) - Registrar-level locking of records.
- [Historical Encoding](./historical-encoding.md) - TOR bulk-upload for legacy data.

## 3. Student & Admission Lifecycle
- [Student Application](./student-application.md) - Public-facing application at `/apply`.
- [Admission Approval](./admission-approval.md) - Activation and sequence generation for new students.
- [Student Standing Recalculation](./student-standing.md) - Logic for year level and regularity.

## 4. System Administration & Infrastructure
- [Term Management](./term-management.md) - Controlling active terms and submission windows.
- [Scheduling System](./scheduling-system.md) - Linking Rooms, Sections, and Loads.
- [Audit Logging](./audit-logging.md) - Tracking security and data mutations.
- [Notification System](./notification-system.md) - Real-time alerts for system events.
