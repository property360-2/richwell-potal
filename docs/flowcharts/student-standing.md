# Student Standing Recalculation Flowchart

Logic for calculating year level and determining if a student is "Regular".

```mermaid
graph TD
    Start([Recalc Event]) --> CalcYear[Calculate Highest Year Level with Passed Subjects]
    CalcYear --> Regularity{Check Regularity Logic}
    
    Regularity -- "Has UNRESOLVED INC" --> Irregular[Status: IRREGULAR]
    Regularity -- "New Transferee (0 Credits)" --> Irregular
    Regularity -- "Failed a Prerequisite" --> Irregular
    
    Regularity -- "Standard Checks" --> BackSubjectCheck{Missing Back Subjects?}
    BackSubjectCheck -- "Yes" --> Irregular
    BackSubjectCheck -- "No" --> Regular[Status: REGULAR]
    
    Irregular --> Save[Update StudentEnrollment]
    Regular --> Save
    
    Save --> End([Standing & Regularity Updated])
```

#### Regularity Rules (Backend)
- **Back Subjects**: Subjects from previous years or previous semesters that have not been passed.
- **Prerequisites**: Failing a subject that blocks other subjects immediately flags the student as irregular.
- **Transferees**: Start as irregular by default until their previous credits are encoded in the system.
