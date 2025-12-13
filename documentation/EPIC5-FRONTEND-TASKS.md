# EPIC 5 — Frontend Tasks
## Grades, GPA, INC & Retake Logic

> **Backend Status**: ✅ Fully Implemented  
> **Last Updated**: December 13, 2025

---

## Summary

EPIC 5 covers the complete grading lifecycle:
- Professor grade submission portal
- Allowed grade values validation (1.0-3.0, 5.0)
- Grade edit history with full audit trail
- Registrar finalization
- GPA calculation (automatic after finalization)
- INC → FAILED automation (6mo major, 12mo minor)
- Academic standing updates (manual by registrar)
- Retake tracking

---

## API Endpoints

All endpoints are prefixed with `/api/v1/admissions/`

### Professor Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/grades/my-sections/` | Get sections where professor teaches | Professor |
| GET | `/grades/section/{section_id}/subject/{subject_id}/students/` | Get students with grades | Professor |
| POST | `/grades/submit/` | Submit/update a grade | Professor |
| GET | `/grades/history/{subject_enrollment_id}/` | Get grade change history | Professor/Registrar |

### Registrar Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/grades/sections/` | List sections for finalization | Registrar |
| POST | `/grades/section/{section_id}/finalize/` | Finalize section grades | Registrar |
| POST | `/grades/override/` | Override a grade (even if finalized) | Registrar |
| GET | `/grades/inc-report/` | Get INC status report | Registrar |
| POST | `/grades/process-expired-incs/` | Convert expired INCs to FAILED | Registrar |
| PATCH | `/students/{student_id}/standing/` | Update academic standing | Registrar |

### Student Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/my-enrollment/grades/` | Get my grades for current semester | Student |
| GET | `/my-enrollment/transcript/` | Get full academic transcript | Student |

---

## Example Requests & Responses

### Get My Sections (Professor)

**Request:**
```http
GET /api/v1/admissions/grades/my-sections/
Authorization: Bearer <professor_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "section_id": "uuid",
      "section_name": "BSCS-1A",
      "semester": "1st Semester 2025-2026",
      "semester_id": "uuid",
      "subjects": [
        {
          "subject_id": "uuid",
          "subject_code": "CS101",
          "subject_title": "Introduction to Computing",
          "units": 3
        }
      ]
    }
  ]
}
```

---

### Get Section Students with Grades

**Request:**
```http
GET /api/v1/admissions/grades/section/{section_id}/subject/{subject_id}/students/
Authorization: Bearer <professor_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "section": "BSCS-1A",
    "subject_code": "CS101",
    "subject_title": "Introduction to Computing",
    "students": [
      {
        "subject_enrollment_id": "uuid",
        "student_number": "2025-00001",
        "student_name": "Juan Dela Cruz",
        "grade": null,
        "status": "ENROLLED",
        "status_display": "Currently Enrolled",
        "is_finalized": false,
        "finalized_at": null
      }
    ],
    "total_students": 30
  }
}
```

---

### Submit Grade (Professor)

**Request:**
```http
POST /api/v1/admissions/grades/submit/
Authorization: Bearer <professor_token>
Content-Type: application/json

{
  "subject_enrollment_id": "uuid-of-subject-enrollment",
  "grade": 1.50
}
```

**Allowed Grade Values:**
- `1.00` - Excellent
- `1.25`
- `1.50`
- `1.75`
- `2.00` - Good
- `2.25`
- `2.50`
- `2.75`
- `3.00` - Passed
- `5.00` - Failed

**Mark as INC:**
```json
{
  "subject_enrollment_id": "uuid",
  "is_inc": true,
  "change_reason": "Student did not complete final project"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Grade submitted successfully",
  "data": {
    "id": "uuid",
    "subject": "CS101",
    "grade": "1.50",
    "status": "PASSED",
    "is_finalized": false
  }
}
```

---

### Finalize Section Grades (Registrar)

**Request:**
```http
POST /api/v1/admissions/grades/section/{section_id}/finalize/
Authorization: Bearer <registrar_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Finalized 30 grades",
  "data": {
    "section": "BSCS-1A",
    "finalized_count": 30
  }
}
```

---

### Override Grade (Registrar)

**Request:**
```http
POST /api/v1/admissions/grades/override/
Authorization: Bearer <registrar_token>
Content-Type: application/json

{
  "subject_enrollment_id": "uuid",
  "new_grade": 2.00,
  "reason": "Grade correction approved by Dean per Grade Appeal #2025-123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Grade overridden successfully",
  "data": {
    "id": "uuid",
    "grade": "2.00",
    "status": "PASSED"
  }
}
```

---

### Get My Grades (Student)

**Request:**
```http
GET /api/v1/admissions/my-enrollment/grades/
Authorization: Bearer <student_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "semester": "1st Semester 2025-2026",
    "grades": [
      {
        "subject_code": "CS101",
        "subject_title": "Introduction to Computing",
        "units": 3,
        "grade": "1.50",
        "status": "PASSED",
        "status_display": "Passed",
        "is_finalized": true,
        "professor_name": "Dr. John Smith"
      }
    ],
    "gpa": "1.75",
    "total_units": 21,
    "is_finalized": true
  }
}
```

---

### Get Full Transcript (Student)

**Request:**
```http
GET /api/v1/admissions/my-enrollment/transcript/
Authorization: Bearer <student_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "semesters": [
      {
        "semester": "1st Semester 2024-2025",
        "semester_id": "uuid",
        "enrollment_id": "uuid",
        "subjects": [
          {
            "code": "CS101",
            "title": "Introduction to Computing",
            "units": 3,
            "grade": "1.50",
            "status": "PASSED",
            "is_finalized": true
          }
        ],
        "gpa": "1.75",
        "total_units": 21,
        "is_finalized": true
      }
    ],
    "cumulative_gpa": "1.80",
    "cumulative_units": 42
  }
}
```

---

### Get INC Report (Registrar)

**Request:**
```http
GET /api/v1/admissions/grades/inc-report/?days_ahead=30
Authorization: Bearer <registrar_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_incs": 15,
    "expiring_within_days": 30,
    "expiring_count": 3,
    "expiring_incs": [
      {
        "enrollment_id": "uuid",
        "subject_code": "CS201",
        "subject_title": "Data Structures",
        "student_number": "2024-00015",
        "student_name": "Maria Santos",
        "is_major": true,
        "inc_marked_at": "2025-06-15T08:00:00Z",
        "expires_at": "2025-12-15T08:00:00Z",
        "days_remaining": 2
      }
    ]
  }
}
```

---

### Update Academic Standing (Registrar)

**Request:**
```http
PATCH /api/v1/admissions/students/{student_id}/standing/
Authorization: Bearer <registrar_token>
Content-Type: application/json

{
  "academic_standing": "Dean's List"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Academic standing updated",
  "data": {
    "student_number": "2025-00001",
    "student_name": "Juan Dela Cruz",
    "academic_standing": "Dean's List"
  }
}
```

---

## Grade Status Values

| Status | Description |
|--------|-------------|
| `ENROLLED` | Currently enrolled, no grade yet |
| `PASSED` | Completed with passing grade (≤ 3.00) |
| `FAILED` | Completed with failing grade (5.00) |
| `INC` | Incomplete - awaiting completion |
| `DROPPED` | Dropped by student |
| `CREDITED` | Credit from previous school (transferees) |
| `RETAKE` | Retaking a previously failed subject |

---

## INC Expiry Rules

| Subject Type | Expiry Period |
|--------------|---------------|
| Major Subject | 6 months |
| Minor Subject | 12 months |

When INC expires:
1. Automatically converts to FAILED (grade = 5.0)
2. Creates audit log entry
3. Creates notification for student
4. Triggers GPA recalculation

---

## Frontend Tasks Checklist

### Professor Grading Portal
- [ ] **My Sections View**
  - List sections where professor teaches
  - Show subjects per section
  - Navigate to grade entry

- [ ] **Grade Entry View**
  - List students in section
  - Show current grade/status
  - Grade dropdown (1.0-3.0, 5.0)
  - INC checkbox option
  - Submit individual grades
  - Bulk grade submission (optional)

- [ ] **Grade History Modal**
  - View grade change history
  - Show who made changes
  - Show timestamps

### Student Dashboard
- [ ] **Grades Tab**
  - Current semester grades
  - Subject, units, grade, status
  - GPA display
  - Finalization status indicator

- [ ] **Transcript View**
  - All semesters
  - Cumulative GPA
  - Export/print option (future)

### Registrar Panel
- [ ] **Section Finalization**
  - List sections pending finalization
  - Show finalized vs unfinalized count
  - Finalize button per section
  - Bulk finalize option

- [ ] **Grade Override**
  - Search student
  - View current grade
  - Enter new grade with reason
  - Confirmation dialog

- [ ] **INC Management**
  - View all INCs
  - Filter by expiry date
  - Manual trigger for INC conversion
  - Notification preview

- [ ] **Academic Standing**
  - Search student
  - View current standing
  - Update standing text

---

## Key UI Considerations

1. **Grade Entry:**
   - Dropdown with only allowed values (1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 5.0)
   - INC as separate toggle/checkbox
   - Visual indicator for finalized vs unfinalied

2. **Finalization:**
   - Warning before finalizing (irreversible for professors)
   - "All grades must be submitted" validation
   - Show count of ungraded students

3. **GPA Display:**
   - Color code based on performance
   - Green: ≤ 2.0
   - Yellow: 2.0-3.0
   - Red: > 3.0 or 5.0

4. **INC Status:**
   - Show days remaining until expiry
   - Warning icon for expiring soon (< 7 days)
   - Alert for already expired
