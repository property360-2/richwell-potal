# Registrar Sectioning Dashboard Optimization

The Sectioning Dashboard has been transitioned from an automated countdown-driven process to a high-level administrative tool, giving the Dean direct control over the student assignment lifecycle.

## Overview

Previously, the system automatically distributed students after a fixed 3-day window. This has been replaced by a hybrid workflow where:
1.  **Students** can pick their schedules as long as the Dean keeps the window open.
2.  **The Dean** monitors enrollment levels and bottleneck metrics in real-time.
3.  **Manual Distribution** is triggered by the Dean to assign any remaining students who did not pick their own schedules.

## Key Changes

### Backend
- **ReportService**: Added `get_sectioning_dashboard_report` to calculate KPIs:
    - `total_capacity` vs `enrolled_count`
    - `backlog_count` (Approved students waiting for assignment)
    - `late_approvals` (Students approved after picking published)
    - `utilization_rate`
- **PickingService**: Removed the 3-day deadline enforcement in `validate_picking_period`.
- **Views**: Exposed `/distribute-students/` and `/sectioning-report/` endpoints in `ScheduleViewSet`.

### Frontend
- **Sectioning Dashboard**:
    - **KPI Metrics**: Digital cards showing real-time capacity and student counts.
    - **Manual Trigger**: A prominent button to "Distribute Unassigned Students".
    - **Polling**: Automatic 60-second polling to ensure data stays current without manual refreshing.
- **Student Picking**: 
    - Removed countdown banners and automatic lock logic.
    - Simplified the "SchedulePicking" page to reflect that the window is managed by the Dean.

## Verification

The new workflow was verified with following tests:
1.  **Report Accuracy**: Verified the KPIs correctly reflect the state of the active term.
2.  **Deadline Logic**: Confirmed the system no longer blocks students after 3 days.
3.  **Distribution Trigger**: Tested the manual trigger via the backend service.

## Usage Guide
- Navigate to `Registrar > Sectioning Dashboard`.
- Monitor the **Backlog** count.
- Once the picking window is ready to close, click **'Distribute Unassigned Students'**.
- The system will fill the available slots based on the student's preferences and current capacity.
