# Scheduling & Sectioning Flow

## Summary
Term starts -> Sections generated -> Schedules created -> Published -> Students pick seats.

## Step-by-step

### 1. Section Generation (Registrar)
- Registrar triggers `POST /api/sections/sections/generate/`.
- **Logic**: System looks at the number of students enrolled and creates sections (target 35 per section) for each program/year level.

### 2. Schedule Assignment (Dean)
- Dean views the "Scheduling Matrix".
- Assigns a Professor, Room, and Day/Time to each subject in a section.
- Calls `POST /api/scheduling/schedules/assign/`.
- **Validation**: System checks for Professor, Room, and Section conflicts in real-time.

### 3. Publishing (Dean)
- Once the matrix is full, the Dean clicks "Publish Schedule".
- Calls `POST /api/scheduling/schedules/publish/`.
- **Effect**: Term-level `is_schedule_published` becomes `true`.

### 4. Student Picking
- Students with "Approved" advising can now see the "Pick Schedule" page.
- **Regulars**: Pick an entire section (AM/PM) via `pick-regular`.
- **Irregulars**: Pick specific slots for each subject via `pick-irregular`.

## Files involved
| File | Role |
|------|------|
| `SectioningService` | Logic for auto-creating sections |
| `SchedulingService` | Logic for conflict detection and publishing |
| `PickingService` | Logic for adding students to sections |
