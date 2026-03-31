# Advising Dashboard

The Advising Dashboard handles the critical phase where an accepted student transitions to an enrolled state by selecting their subjects. The interface differs significantly between the Staff (Program Head / Registrar) and the Student views.

## Student View (`ScheduleStatusScreens.jsx` / `EnrollmentModal.js`)

> [!IMPORTANT]
> A student can only pick subjects if `is_advising_unlocked` is true.

### Pick Subjects Flow
1. **Fetching Available Loads**: The frontend queries the active term schedules matching the student's program and year level.
2. **Conflict Checking**: The UI must flag if selected schedules overlap in time or room assignment.
3. **Capacity Tracking**: Sections that are FULL are visually disabled in the selector.

### Review Flow
Once submitted, the student sees a standard read-only tracking view for their preferred schedule while awaiting staff approval.

## Staff View (Program Head / Registrar)

The staff view acts as a queue management system for advising approvals.

### Capabilities
1. **Queue Review**: View all students currently in the `ADVISING_PENDING` state. (Program Heads filter this down to their owned programs.)
2. **Approval Action**: Calls `POST /api/students/{id}/approve-advising/`. On success, the student's status upgrades to `ENROLLED`.
3. **Rejection Action**: If the schedule is invalid (e.g., prerequisite missing), the staff can reject the advising payload and unlock the student's interface to pick again.

## Complex UI Patterns
- **Schedule Matrix Rendering**: Time blocks (e.g., 7:00 AM to 8:30 AM) are mapped to a visual grid. The UI uses CSS grid positioning calculations to correctly layer overlapping subjects.
- **Bulk Selection**: Students can select "Block Sections" which auto-select all matched subjects for a specific preset block.
