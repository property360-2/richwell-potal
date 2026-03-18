# Returning Student Flow

## Summary
Existing students who wish to enroll for a new term must undergo the Returning Student Flow. This involves checking for any outstanding balances, clearing prerequisites, and choosing a session or specific schedule.

## Process

### 1. Pre-Advising Checks
- **Balance Verification**: Students with outstanding balances from previous terms are blocked from enrollment.
- **Requirement Clearance**: Any pending documentation or disciplinary holds must be cleared.

### 2. Advising (Regular vs. Irregular)
- **Regular Students**: 
  - The system automatically assigns the subjects based on the curriculum sequence for their next year level and semester.
  - Students simply review and submit.
- **Irregular Students**:
  - Must manually select subjects.
  - **Prerequisite Validation**: The system enforces `SPECIFIC`, `YEAR_STANDING`, `GROUP`, and `PERCENTAGE` prerequisites in real-time.
  - **Unit Cap**: Max of 30 units per term (standard is 21-26).

### 3. Schedule Picking
- Once advising is approved by the Program Head, the student proceeds to "Schedule Picking".
- **Regular**: Choose a Morning (AM) or Afternoon (PM) block.
- **Irregular**: Choose specific sections for each subject.
  - **Conflict Detection**: The UI alerts students if two selected sections have overlapping times.

### 4. Finalization
- After picking a schedule, the student's status becomes `ENROLLED`.
- Student can view their personalized timetable in the "My Schedule" page.

## Data Mapping & Logic
| Action | Model | Backend Logic |
|--------|-------|---------------|
| Load Advising | `StudentEnrollment` | Checks `is_regular`, year level, and curriculum subjects. |
| Submit Advising | `Grade` (New Records) | Creates `Grade` records in `ADVISING` status. |
| Pick Schedule | `SectionStudent` | Links student to specific sections; increments `student_count`. |

## Reference
- See [Admission to Enrollment Flow](./admission-to-enrollment.md) for new students.
- See [Grade Finalization & Lock Flow](./grade-finalization-lock.md) for term end processes.
