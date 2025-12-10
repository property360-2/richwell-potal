# EPIC 2 — Frontend Tasks
## Curriculum, Subjects & Section Scheduling

**For:** Lloyd & Edjohn  
**Backend by:** Kirt & Ann  
**Contact:** Kirt, Ann

---

## Verification Summary ✅

| Requirement | Backend Status | Notes |
|-------------|----------------|-------|
| CRUD for programs, subjects, prerequisites | ✅ Implemented | `ProgramViewSet`, `SubjectViewSet` |
| Curriculum versioning | ✅ Implemented | `CurriculumVersion` model + snapshot API |
| Section creator + professor assignment | ✅ Implemented | `SectionViewSet`, `SectionSubjectViewSet` |
| Room/time scheduling grid | ✅ Implemented | `ScheduleSlotViewSet` |
| Conflict detection: student, professor, room | ✅ Implemented | `SchedulingService` + check endpoints |
| Registrar override with justification | ✅ Implemented | Audit logging on conflict override |

---

## API Endpoints

### Base URL: `/api/v1/academics/`

### 1. Public Endpoints (No Auth Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/programs/` | List all active programs |
| GET | `/programs/{id}/` | Get program details |

### 2. Authenticated Endpoints (Registrar/Admin)

#### Program Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/manage/programs/` | List all programs (including inactive) |
| POST | `/manage/programs/` | Create new program |
| GET | `/manage/programs/{id}/` | Get program with all subjects |
| PUT | `/manage/programs/{id}/` | Update program |
| DELETE | `/manage/programs/{id}/` | Soft delete program |
| POST | `/manage/programs/{id}/snapshot/` | Create curriculum version |
| GET | `/manage/programs/{id}/versions/` | List curriculum versions |

#### Subject Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/manage/subjects/` | List subjects (filter: `?program={id}`) |
| POST | `/manage/subjects/` | Create subject |
| GET | `/manage/subjects/{id}/` | Get subject details |
| PUT | `/manage/subjects/{id}/` | Update subject |
| DELETE | `/manage/subjects/{id}/` | Soft delete subject |
| GET | `/manage/subjects/{id}/prerequisite-tree/` | Get prereq tree |
| POST | `/manage/subjects/{id}/prerequisites/` | Add prerequisite |
| DELETE | `/manage/subjects/{id}/prerequisites/{prereq_id}/` | Remove prerequisite |

#### Section Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sections/` | List sections (filter: `?semester={id}&program={id}`) |
| POST | `/sections/` | Create section |
| GET | `/sections/{id}/` | Get section with subjects & schedule |
| PUT | `/sections/{id}/` | Update section |
| DELETE | `/sections/{id}/` | Soft delete section |

#### Section Subject (Professor Assignment)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/section-subjects/` | List (filter: `?section={id}`) |
| POST | `/section-subjects/` | Assign subject to section |
| PUT | `/section-subjects/{id}/` | Update (change professor, TBA) |
| DELETE | `/section-subjects/{id}/` | Remove from section |

#### Schedule Slots
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/schedule-slots/` | List (filter: `?section_subject={id}`) |
| POST | `/schedule-slots/` | Create schedule slot |
| PUT | `/schedule-slots/{id}/` | Update slot |
| DELETE | `/schedule-slots/{id}/` | Delete slot |

#### Conflict Detection
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/check-professor-conflict/` | Check professor schedule conflict |
| POST | `/check-room-conflict/` | Check room double-booking |
| GET | `/professor/{id}/schedule/{semester_id}/` | Get professor's full schedule |

---

## Request/Response Payloads

### Create Program
```json
POST /api/v1/academics/manage/programs/
{
  "code": "BSIT",
  "name": "Bachelor of Science in Information Technology",
  "description": "4-year IT degree program",
  "duration_years": 4,
  "is_active": true
}
```

### Create Subject
```json
POST /api/v1/academics/manage/subjects/
{
  "program": "uuid-of-program",
  "code": "IT101",
  "title": "Introduction to Computing",
  "description": "Fundamentals of computing",
  "units": 3,
  "is_major": true,
  "year_level": 1,
  "semester_number": 1,
  "allow_multiple_sections": false,
  "prerequisite_ids": ["uuid-of-prereq-1", "uuid-of-prereq-2"]
}
```

### Add Prerequisite (Circular Check Included)
```json
POST /api/v1/academics/manage/subjects/{id}/prerequisites/
{
  "prerequisite_id": "uuid-of-prerequisite"
}

// Success Response
{
  "message": "Prerequisite IT100 added to IT101",
  "prerequisites": ["IT100"]
}

// Error Response (circular dependency)
{
  "error": "Adding IT102 would create a circular dependency"
}
```

### Create Section
```json
POST /api/v1/academics/sections/
{
  "name": "BSIT-1A",
  "program": "uuid-of-program",
  "semester": "uuid-of-semester",
  "year_level": 1,
  "capacity": 40
}
```

### Assign Subject to Section
```json
POST /api/v1/academics/section-subjects/
{
  "section": "uuid-of-section",
  "subject": "uuid-of-subject",
  "professor": "uuid-of-professor",
  "is_tba": false
}
```

### Create Schedule Slot (with Conflict Check)
```json
POST /api/v1/academics/schedule-slots/
{
  "section_subject": "uuid-of-section-subject",
  "day": "MON",
  "start_time": "08:00",
  "end_time": "09:30",
  "room": "Room 301",
  "override_conflict": false,
  "override_reason": ""
}

// Error Response (professor conflict)
{
  "professor": "Professor has a schedule conflict: IT102 MON 08:00-10:00"
}
```

### Check Professor Conflict
```json
POST /api/v1/academics/check-professor-conflict/
{
  "professor_id": "uuid-of-professor",
  "semester_id": "uuid-of-semester",
  "day": "MON",
  "start_time": "08:00",
  "end_time": "09:30"
}

// Response
{
  "has_conflict": true,
  "conflict": "BSIT-1A - IT101 - Monday 08:00-09:30"
}
```

### Create Curriculum Snapshot
```json
POST /api/v1/academics/manage/programs/{id}/snapshot/
{
  "semester_id": "uuid-of-semester",
  "notes": "Approved curriculum for 1st Sem 2024-2025"
}

// Response
{
  "id": "uuid",
  "program": "uuid",
  "program_code": "BSIT",
  "semester": "uuid",
  "version_number": 1,
  "subjects_snapshot": [...],
  "is_active": true,
  "created_by": "uuid",
  "created_by_name": "John Doe",
  "notes": "...",
  "created_at": "2024-12-10T12:00:00Z"
}
```

---

## Day Choices for Schedule
```
MON = Monday
TUE = Tuesday
WED = Wednesday
THU = Thursday
FRI = Friday
SAT = Saturday
```

---

## Test Accounts
- **Admin:** `admin@richwell.edu.ph` / `admin123`
- **Registrar:** `registrar@richwell.edu.ph` / `registrar123`

---

## Frontend Tasks Checklist

### Pages to Build

- [ ] **Curriculum Editor** (Registrar)
  - [ ] Program list with CRUD
  - [ ] Subject list per program with CRUD
  - [ ] Prerequisite linking UI (drag-drop or modal)
  - [ ] Create curriculum snapshot button
  - [ ] View curriculum versions list

- [ ] **Section Management** (Registrar)
  - [ ] Create section form (name, program, semester, capacity)
  - [ ] Section list with filters
  - [ ] Assign subjects to section
  - [ ] Assign professor to each subject

- [ ] **Schedule Grid Editor** (Registrar)
  - [ ] Weekly grid view (Mon-Sat, 7am-9pm)
  - [ ] Add schedule slot (day, time, room)
  - [ ] Conflict warning modal
  - [ ] Override conflict with reason input

- [ ] **Professor Schedule View** (Professor, Read-only)
  - [ ] Weekly schedule display
  - [ ] Show assigned subjects/sections

### API Integration Checklist
- [ ] Fetch programs list
- [ ] CRUD for programs
- [ ] Fetch subjects by program
- [ ] CRUD for subjects
- [ ] Add/remove prerequisites with error handling
- [ ] Fetch sections by semester
- [ ] CRUD for sections
- [ ] Assign subjects to section
- [ ] Create schedule slots with conflict check
- [ ] Handle conflict override flow

---

## Questions?

Contact: **Kirt, Ann**
