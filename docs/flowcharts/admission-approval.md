# Admission Approval Flowchart

Logical activation of students from `APPLICANT` status.

```mermaid
graph TD
    Start([Admission Staff Action]) --> ApproveBtn[Click Approve]
    ApproveBtn --> InputCheck{Input: Monthly Commitment?}
    InputCheck -- "Missing" --> ShowError[ValidationError: Required Field]
    
    InputCheck -- "Provided" --> TermCheck{Active Term Check}
    TermCheck -- "No Term" --> ShowError[ValidationError: No Active Term]
    
    TermCheck -- "Found" --> Transaction[Transaction: Start Processing]
    Transaction --> IDNGen[Generate Unique IDN: YYXXXX format]
    
    IDNGen --> ActivateUser[Activate User: Username=IDN, is_active=True]
    ActivateUser --> SetPass[Set Password: IDN + Birthdate (MMDD)]
    
    SetPass --> CreateEnrollment[Create StudentEnrollment Record]
    CreateEnrollment --> CalcStanding[Calculate Standing & Regularity]
    
    CalcStanding --> SetEnrolledBy[Record Enrolled By & Commitment]
    SetEnrolledBy --> EnrollmentComplete[Status: APPROVED]
    
    EnrollmentComplete --> End([Credentials Returned to Staff])
```

#### Backend Reference
- Handled by `StudentViewSet.approve` in `/api/students/students/{id}/approve/`.
- Validates **Monthly Commitment** (Required for Registrar/Finance records).
- IDN is generated based on the current year prefix (e.g., `240001`).
