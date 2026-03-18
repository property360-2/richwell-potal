# Scheduling and Schedule Picking Flow

## Summary
Registrar or Dean generates sections, Dean assigns schedules, Dean publishes the term schedule, then approved students pick schedules inside the configured window.

## Workflow

### 1. Section Generation
- Registrar or Dean generates sections for a term, program, and year level.
- The section configuration defines the real capacity through `max_students`.

### 2. Schedule Assignment
- Dean assigns professor, room, and meeting time.
- Conflict checks run for professor, room, and section overlap.

### 3. Schedule Publishing
- Dean publishes the schedule for the term.
- Student schedule picking stays closed until `schedule_published` is true.

### 4. Regular Student Picking
- Endpoint: `POST /api/scheduling/pick-regular/`
- Requirements:
  - active enrollment exists for the term
  - advising status is `APPROVED`
  - the student is regular
  - the request falls inside `schedule_picking_start` and `schedule_picking_end`
- Assignment uses live section capacity and row locking to avoid overbooking.

### 5. Irregular Student Picking
- Endpoint: `POST /api/scheduling/pick-irregular/`
- Each selection must:
  - belong to the same term
  - match an approved subject for that student
  - point to a section that actually offers that subject
  - avoid schedule conflicts with the student's other selected sections

## Failure Rules
- `400` for invalid term, invalid section, or malformed selection payloads
- `403` when picking is unpublished, outside the window, or the student is outside the allowed workflow state
- `409` when the schedule is already locked, a section is full, or the chosen schedules conflict
