# Students API

## Endpoints

### Student Profiles (`/api/students/students/`)
Manage student records and applications.

#### `POST /api/students/students/apply/`
Public endpoint for new applicants.
- **Auth required**: No
- **Fields**: email, first_name, last_name, date_of_birth, gender, program, curriculum, student_type.

#### `POST /api/students/students/{id}/approve/`
Admission staff approves an applicant.
- **Auth required**: Yes (Admission)
- **Body**: `{"monthly_commitment": 3500}`
- **Effect**: Generates IDN, creates user account, and creates initial enrollment record.

#### `POST /api/students/students/{id}/unlock-advising/`
Manually unlock the advising process for a student (usually used for transferees after crediting).

#### `POST /api/students/students/{id}/returning-student/`
Enroll an existing student into the active term.

---

### Student Enrollments (`/api/students/enrollments/`)
Track student/term pairs and their advising status.

#### `GET /api/students/enrollments/me/?term={id}`
Returns the current student's enrollment status for a specific term.

#### `GET /api/students/enrollments/schedule/?term={id}`
Returns the student's class schedule for the term (only for approved subjects).

#### `POST /api/students/enrollments/{id}/toggle-regularity/`
Manually toggle whether a student is Regular or Irregular for the term.
