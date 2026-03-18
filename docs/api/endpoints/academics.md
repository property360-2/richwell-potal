# Academics API

## Endpoints

### Programs (`/api/academics/programs/`)
Manage academic programs (e.g., BSIS, BSN).

#### `GET /api/academics/programs/`
List all programs.

#### `POST /api/academics/programs/`
Create a new program.
- `code`: unique string (e.g., "BSIS")
- `name`: full name
- `program_head`: user ID (optional)

---

### Curriculums (`/api/academics/curriculums/`)
Manage versions of a program's curriculum.

#### `POST /api/academics/curriculums/{id}/set-active/`
Set a specific curriculum version as the active one for its program.

---

### Subjects (`/api/academics/subjects/`)
Manage subjects within a curriculum.

#### `GET /api/academics/subjects/`
Filter by `curriculum`, `year_level`, or `semester`.

#### `POST /api/academics/subjects/bulk-upload/`
Bulk create/update subjects via CSV.
- **Method**: POST
- **Content-Type**: multipart/form-data
- **Body**: `file` (CSV file)

---

### Prerequisites (`/api/academics/prerequisites/`)
Define requirements for taking a subject.

#### `POST /api/academics/prerequisites/`
- `subject`: target subject ID
- `prerequisite_type`: "SPECIFIC", "YEAR_STANDING", etc.
- `prerequisite_subject`: required subject ID (if type is SPECIFIC)
- `standing_year`: required year level (if type is YEAR_STANDING)
