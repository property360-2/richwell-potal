# EPIC 3 — Frontend Tasks
## Subject Enrollment Flow

> **Backend Status**: ✅ Fully Implemented (by Ann)  
> **Last Updated**: December 13, 2025

---

## Summary

EPIC 3 covers the subject enrollment flow:
- Student subject picker with recommended subjects
- Prerequisites and unit cap validation
- Payment hold rule (Month 1 must be paid)
- Schedule conflict detection
- Registrar override panel

---

## API Endpoints

All endpoints are prefixed with `/api/v1/admissions/`

### Student Subject Enrollment

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/subjects/recommended/` | Get recommended subjects | Student |
| GET | `/subjects/available/` | Get all available subjects | Student |
| GET | `/subjects/my-enrollments/` | Get my enrolled subjects | Student |
| POST | `/subjects/enroll/` | Enroll in a subject | Student |
| POST | `/subjects/{id}/drop/` | Drop a subject | Student |

### Registrar Override

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/enrollment/{id}/override-enroll/` | Override enrollment rules | Registrar |

---

## Example Requests & Responses

### Get Recommended Subjects

**Request:**
```http
GET /api/v1/admissions/subjects/recommended/
Authorization: Bearer <student_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recommended_subjects": [
      {
        "id": "uuid",
        "code": "CS101",
        "title": "Introduction to Computing",
        "units": 3,
        "is_major": true,
        "year_level": 1,
        "semester_number": 1,
        "prerequisites": [],
        "prerequisites_met": true,
        "available_sections": [
          {
            "section_id": "uuid",
            "section_name": "Section A",
            "professor": "Dr. John Smith",
            "available_slots": 30,
            "schedule": [
              {"day": "Monday", "start_time": "08:00", "end_time": "09:30", "room": "Room 101"},
              {"day": "Wednesday", "start_time": "08:00", "end_time": "09:30", "room": "Room 101"}
            ]
          }
        ]
      }
    ],
    "current_units": 0,
    "max_units": 24,
    "remaining_units": 24
  }
}
```

---

### Enroll in Subject

**Request:**
```http
POST /api/v1/admissions/subjects/enroll/
Authorization: Bearer <student_token>
Content-Type: application/json

{
  "subject_id": "uuid-of-subject",
  "section_id": "uuid-of-section"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Successfully enrolled in CS101",
  "data": {
    "id": "uuid",
    "subject_code": "CS101",
    "subject_title": "Introduction to Computing",
    "units": 3,
    "section_name": "Section A",
    "status": "ENROLLED",
    "status_display": "Enrolled",
    "is_irregular": false,
    "schedule": [
      {"day": "Monday", "start_time": "08:00", "end_time": "09:30", "room": "Room 101"}
    ],
    "professor_name": "Dr. John Smith"
  }
}
```

**Error - Prerequisites not met:**
```json
{
  "success": false,
  "error": "Missing prerequisites: CS100, MATH101"
}
```

**Error - Unit cap exceeded:**
```json
{
  "success": false,
  "error": "Would exceed unit cap (21 + 6 > 24)"
}
```

**Error - Payment required:**
```json
{
  "success": false,
  "error": "Month 1 payment required before subject enrollment"
}
```

**Error - Schedule conflict:**
```json
{
  "success": false,
  "error": "Schedule conflict on Monday 08:00-09:30 with CS102"
}
```

---

### Get My Subject Enrollments

**Request:**
```http
GET /api/v1/admissions/subjects/my-enrollments/
Authorization: Bearer <student_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subject_enrollments": [
      {
        "id": "uuid",
        "subject_code": "CS101",
        "subject_title": "Introduction to Computing",
        "units": 3,
        "section_name": "Section A",
        "status": "ENROLLED",
        "status_display": "Enrolled",
        "grade": null,
        "is_irregular": false,
        "schedule": [
          {"day": "Monday", "start_time": "08:00", "end_time": "09:30", "room": "Room 101"}
        ],
        "professor_name": "Dr. John Smith"
      }
    ],
    "enrolled_units": 3,
    "semester": "1st Semester 2025-2026"
  }
}
```

---

### Drop Subject

**Request:**
```http
POST /api/v1/admissions/subjects/{subject_enrollment_id}/drop/
Authorization: Bearer <student_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully dropped CS101",
  "data": {
    "id": "uuid",
    "subject_code": "CS101",
    "status": "DROPPED",
    "status_display": "Dropped"
  }
}
```

---

### Registrar Override Enrollment

**Request:**
```http
POST /api/v1/admissions/enrollment/{enrollment_id}/override-enroll/
Authorization: Bearer <registrar_token>
Content-Type: application/json

{
  "student_id": "uuid-of-student",
  "subject_id": "uuid-of-subject",
  "section_id": "uuid-of-section",
  "override_reason": "Student petitioned for cross-enrollment, approved by Dean"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Override enrollment successful for CS101",
  "data": {
    "id": "uuid",
    "subject_code": "CS101",
    "status": "ENROLLED",
    "is_irregular": true
  }
}
```

---

## Subject Enrollment Status Values

| Status | Description |
|--------|-------------|
| `ENROLLED` | Currently enrolled |
| `PASSED` | Completed with passing grade |
| `FAILED` | Completed with failing grade |
| `INC` | Incomplete |
| `DROPPED` | Dropped by student |
| `CREDITED` | Credit from previous school (transferees) |

---

## Frontend Tasks Checklist

### Student Subject Picker Page
- [ ] **Recommended Subjects Tab**
  - List subjects for current year/semester
  - Show prerequisites status (met/not met)
  - Show available sections with schedule
  - "Enroll" button (disabled if prerequisites not met)

- [ ] **All Subjects Tab**
  - Browse all subjects in program
  - Filter by year level
  - Show which are already passed/enrolled

- [ ] **Unit Counter**
  - Display current enrolled units
  - Show max units (24)
  - Warning when approaching limit

- [ ] **Schedule Preview**
  - Weekly calendar view
  - Show enrolled subjects by time slot
  - Conflict detection visual

### My Enrolled Subjects Page
- [ ] **Subject List**
  - Subject code, title, units
  - Section and professor
  - Schedule details
  - "Drop" button

- [ ] **Summary Card**
  - Total enrolled units
  - Semester info

### Registrar Override Panel
- [ ] **Student Search**
  - Find student by number/name
  - Show current enrollment status

- [ ] **Override Form**
  - Select subject and section
  - Required: Override reason (min 10 chars)
  - Confirm override action

---

## Key UI Considerations

1. **Prerequisites:**
   - Show ✅ for met prerequisites
   - Show ❌ for missing with locked enrollment
   - List missing prerequisites clearly

2. **Payment Block:**
   - If Month 1 not paid, show prominent message
   - Redirect to payment page option

3. **Schedule Conflicts:**
   - Visual overlap indication
   - Prevent enrollment if conflict exists

4. **Irregular Status:**
   - Badge for subjects outside normal year/semester
   - Show why (different year level or semester)
