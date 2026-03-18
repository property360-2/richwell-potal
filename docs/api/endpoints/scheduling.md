# Scheduling & Sections API

## Endpoints

### Sections (`/api/sections/sections/`)
Manage class sections.

#### `GET /api/sections/sections/`
Filter by `term`, `program`, or `year_level`.

#### `POST /api/sections/sections/generate/`
Bulk-generate sections for a term based on student counts (35 per section).

---

### Schedules (`/api/scheduling/schedules/`)
Manage specific class slots (Subject + Section + Time + Teacher + Room).

#### `GET /api/scheduling/schedules/status-matrix/`
Returns a list of sections with their current enrollment counts vs max capacity.
- **Used by**: Picking system to show available slots.

#### `POST /api/scheduling/schedules/assign/`
Dean assigns a professor, room, and time to a specific schedule slot.

#### `POST /api/scheduling/schedules/pick-regular/`
Student selects an entire section (AM or PM).
- **Body**: `{"term_id": 1, "session": "AM"}`
- **Effect**: Joins the student to the "Home Section" and all its component subjects.

#### `POST /api/scheduling/schedules/pick-irregular/`
Irregular student selects individual subject/section pairs.
- **Body**: `{"term_id": 1, "selections": [{"subject_id": 1, "section_id": 10}, ...]}`

#### `POST /api/scheduling/schedules/publish/`
Dean finalizes the schedule for the term, making it visible and "pickable" for students.
