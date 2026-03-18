# Students API

## Student Profiles

Base path: `/api/students/`

Read scope:
- `STUDENT`: self only, reduced serializer
- `ADMISSION`, `REGISTRAR`, `HEAD_REGISTRAR`, `ADMIN`: full student records
- `PROFESSOR`, `DEAN`, `CASHIER`: forbidden

### `GET /api/students/`
Lists student records in scope for the current user.

### `GET /api/students/{id}/`
Returns a student record if the object is in the caller's scope.

### `POST /api/students/apply/`
Creates a public student application.

Auth required: No

### `POST /api/students/{id}/approve/`
Admission approves an applicant, generates the IDN, activates the account, and creates the initial enrollment.

Auth required: `ADMISSION`

Required body:
```json
{
  "monthly_commitment": 3500
}
```

### `POST /api/students/{id}/unlock-advising/`
Unlocks advising for a student.

Auth required: `ADMISSION`

### `POST /api/students/{id}/toggle-regularity/`
Changes regular vs irregular classification for the active term enrollment.

Auth required: Admission or registrar-side records staff

### `POST /api/students/{id}/returning-student/`
Enrolls an existing approved student into the active term.

Allowed callers:
- the student themself
- `ADMISSION`
- `REGISTRAR`
- `HEAD_REGISTRAR`
- `ADMIN`

### `POST /api/students/manual-add/`
Creates a student record manually and enrolls the student into the active term.

Auth required: `ADMISSION`

## Student Enrollments

Base path: `/api/students/enrollments/`

Read scope:
- `STUDENT`: self only
- `PROGRAM_HEAD`: own programs only
- `ADMISSION`, `REGISTRAR`, `HEAD_REGISTRAR`, `ADMIN`: full read access
- `PROFESSOR`, `DEAN`, `CASHIER`: forbidden

### `GET /api/students/enrollments/`
Lists enrollments in scope for the caller.

### `GET /api/students/enrollments/{id}/`
Returns one enrollment in scope for the caller.

### `GET /api/students/enrollments/me/?term={id}`
Returns the current student's enrollment for a term or `null` when none exists.

### `GET /api/students/enrollments/schedule/?term={id}`
Returns the current student's approved class schedule for the selected term.

Write scope:
- create, update, patch, delete are limited to student-records staff

## Serializer Boundary
Student self-service responses intentionally omit sensitive fields that are not required for the browser portal, including:
- date of birth
- address fields
- guardian fields
- unrelated finance or operational staff fields
