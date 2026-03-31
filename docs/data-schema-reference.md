# Data Schema Reference

This reference provides a granular view of the more complex backend models that orchestrate the academic and financial workflows. Note: For the high level relationships, see `data-model.md`.

## `students.Student`

The master record for a person.

| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `idn` | `CharField(max_length=20, unique=True)` | False | The generated matriculation number (e.g. 270001). |
| `user`| `OneToOneField(User)` | False | Ties the student profile to their authentication context. User acts as `APPLICANT` when first created. |
| `type`| `CharField(choices)` | False | `FRESHMAN`, `TRANSFEREE`, `RETURNEE`. Determines advising unlock conditions. |
| `is_advising_unlocked` | `BooleanField(default=False)` | False | System flag flipped when registrar reviews transferees, or immediate for freshmen. |

## `grades.Grade`

The central record of academic performance.

| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `student` | `ForeignKey(Student)` | False | The student. |
| `subject` | `ForeignKey(Subject)` | False | The subject being graded. |
| `term` | `ForeignKey(Term)` | False | The active term when enrolled. |
| `midterm_grade` | `DecimalField(max_digits=3, decimal_places=1)` | True | 1.0 to 5.0. |
| `final_grade` | `DecimalField(max_digits=3, decimal_places=1)` | True | 1.0 to 5.0. Can be `INC` or `DRP` logic state. |
| `resolution_status` | `CharField(choices)` | True | `PENDING`, `APPROVED` for tracking INC resolutions. |

## `finance.Payment`
Tracks collections and permits.

| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `student` | `ForeignKey(Student)` | False | Payer. |
| `month` | `IntegerField` | False | 1 to 6 (representing Prelims/Midterms/Finals permit phases). |
| `amount` | `DecimalField(max_digits=10, decimal_places=2)` | False | Collected amount. |
| `is_promissory` | `BooleanField(default=False)` | False | Used by Cashier to force-generate a test permit without payment. |
| `reference_number` | `CharField(max_length=50, unique=True)` | False | Like `PAY-20260331-1234`. |
