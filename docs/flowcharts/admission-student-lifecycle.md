# Student & Admission Master Flow

The complete student lifecycle, from initial application to official standing.

## 1. Application & Admission
New applicants entering the system.

### A. Student Application
```mermaid
graph TD
    Start([Public User]) --> FillForm[Fill Application Form]
    FillForm --> Submit[Submit Application Data]
    
    Submit --> CreateRecord[Create Student Record: APPLICANT]
    CreateRecord --> InactiveUser[Create Inactive User Account]
    InactiveUser --> PendingReview[Place in Admission Dashboard queue]
    
    PendingReview --> End([Process Complete])
```

### B. Admission Approval (Logical Activation)
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
    ActivateUser --> SetPass[Set Password: IDN plus Birthdate MMDD]
    
    SetPass --> CreateEnrollment[Create StudentEnrollment Record]
    CreateEnrollment --> CalcStanding[Calculate Standing & Regularity]
    
    CalcStanding --> SetEnrolledBy[Record Enrolled By & Commitment]
    SetEnrolledBy --> EnrollmentComplete[Status: APPROVED]
    
    EnrollmentComplete --> End([Credentials Returned to Staff])
```

---

## 2. Academic Standing & Regularity
How the system determines year level and regularity status.

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
