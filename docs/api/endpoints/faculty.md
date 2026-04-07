# Faculty Management API

## Overview
The Faculty API handles the management of professor profiles, their subject specializations, and availability for scheduling. It integrates with the `scheduling` application to ensure classes are assigned only to qualified and available faculty.

## Endpoints

### Professor List & Create (`/api/faculty/professors/`)
Manage the overall professor directory.
- **Auth required**: Yes (`ADMIN` role only)
- **Methods**: `GET`, `POST`
- **Fields**:
  - `first_name`, `last_name`, `email`, `department`, `employment_status`, `is_active`, `date_of_birth`.
- **Logic**:
  - **Auto-Generation**: `employee_id` is auto-generated as `EMP-{YY}{sequence}`.
  - **Account Creation**: Creating a professor record automatically creates a corresponding `User` account with the role `PROFESSOR`.
  - **Initial Password**: Set to `{employee_id}{MMDD}` where MMDD is the month and day of birth.

### Faculty Subjects (`/api/faculty/professors/{id}/subjects/`)
Manages the subjects a professor is qualified to teach.
- **Methods**: `GET`, `POST`
- **Request Body (POST)**: `{"subject_ids": [1, 2, 3]}`
- **Note**: The list of subjects is used as a hard constraint during the scheduling process.

### Faculty Availability (`/api/faculty/professors/{id}/availability/`)
Manages the preferred teaching sessions for a professor.
- **Methods**: `GET`, `POST`
- **Request Body (POST)**: 
  ```json
  {
    "availabilities": [
      {"day": "M", "session": "AM"},
      {"day": "W", "session": "PM"}
    ]
  }
  ```
- **Logic**: A `POST` request fully replaces existing availability data for that professor.

---

## Data Model Relationships
- **ProfessorSubject**: Maps a many-to-many relationship between `Professor` and `Subject`.
- **ProfessorAvailability**: Tracks session-level preferences (AM/PM) across the standard school days (M, T, W, TH, F, S).

---
*Last Updated: April 2026*
