# Admission to Enrollment Flow

## Summary
Applicant submits form -> Admission staff approves -> Enrollment record created -> Student is ready for Advising.

### State Transitions
| From Status | Action | To Status | Role |
|-------------|--------|-----------|------|
| (None) | `apply` | `APPLICANT` | Public |
| `APPLICANT` | `approve` | `ENROLLED / PENDING` | Admission Staff |
| `PENDING` | `auto/manual-advise` | `ADVISING_PENDING` | Student |
| `ADVISING_PENDING` | `approve-advising` | `ENROLLED` | Program Head |
| `ADVISING_PENDING` | `reject-advising` | `REJECTED` | Program Head |

## Step-by-step

### 1. Application (Public)
- Applicant fills the form at `/apply`.
- Calls `POST /api/students/students/apply/`.
- **Backend**: Creates an inactive User account and a Student record with status `APPLICANT`.

### 2. Approval (Admission Staff)
- Admission staff reviews documents and interviews the applicant.
- Clicks "Approve" in the Admission Dashboard.
- Calls `POST /api/students/students/{id}/approve/`.
- **Backend**: 
  - Generates a permanent `IDN` (e.g., 270001).
  - Activates the User account and sets the IDN as the username.
  - Sets a default password (`idn + MMDD` of birthdate).
  - Creates a `StudentEnrollment` record for the active term.

### 3. Readiness for Advising
- If the student is a **Freshman**, `is_advising_unlocked` is set to `true` immediately.
- If the student is a **Transferee**, it remains `false` until the Registrar credits their previous subjects.
- Once unlocked, the student can proceed to select subjects.

## Files involved
| File | Role |
|------|------|
| `StudentViewSet.apply` | Handles public application |
| `StudentViewSet.approve` | Handles the logical "activation" of a student |
| `SystemSequence` | Ensures sequential and unique IDN generation |
