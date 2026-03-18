# Grades & Advising API

## Endpoints

### `GET /api/grades/advising/`
List grades/advising records for the current user (if student) or based on role permissions.

**Auth required:** Yes

### `POST /api/grades/grading/finalize-section/`
Registrar bulk-finalizes grades for a section.

**Auth required:** Yes (Registrar/Admin)

### Request body
```json
{
  "term_id": "integer (required)",
  "subject_id": "integer (required)",
  "section_id": "integer (required)"
}
```

---

### `POST /api/grades/resolution/{id}/head-approve/`
Program Head gives final approval for the resolved grade, transitioning status to COMPLETED.

**Auth required:** Yes (Program Head/Admin)

### Success response `200 OK`
```json
{
  "id": 123,
  "student_name": "Juan Dela Cruz",
  "resolution_status": "COMPLETED",
  "final_grade": 2.00,
  "grade_status": "PASSED"
}
```
