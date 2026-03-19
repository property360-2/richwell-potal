# INC Resolution: Complete Workflow

This guide covers both the Professor's steps and the Backend Finalization logic for resolving Incomplete (INC) grades.

## 1. Interaction Guide (Professor & Staff)
Process for requesting and submitting a resolution.

```mermaid
graph TD
    INC[Original Grade: INC] --> ProfessorRequest[Professor Requests Resolution]
    ProfessorRequest --> Requested[Status: REQUESTED - Pending Registrar Approval]
    
    Requested --> RegistrarReview{Registrar Review}
    RegistrarReview -- "Rejected" --> INC
    RegistrarReview -- "Approved" --> Approved[Status: APPROVED - Grade Entry Unlocked]
    
    Approved --> EnterNumeric[Professor Submits Final Numeric Grade]
    EnterNumeric --> Submitted[Status: SUBMITTED - Pending Program Head Review]
    
    Submitted --> PHReview{Program Head Review}
    PHReview -- "Rejected" --> Approved
    PHReview -- "Approved" --> Finalized[Status: COMPLETED - Grade Officially Finalized]
    
    Finalized --> NotifyStudent[Student Notified of Final Grade]
```

## 2. System Logic (Backend Finalization)
What happens internally when the Program Head gives the final approval.

```mermaid
graph TD
    Start([Finalization Start]) --> CheckSubmission{Is Grade Submitted?}
    CheckSubmission -- "No" --> StatusError[No pending grade to finalize]
    CheckSubmission -- "Yes" --> CopyGrade[Move Resolution Grade to Final Record]
    
    CopyGrade --> FinalStatus{Passed or Failed?}
    FinalStatus -- "grade <= 3.0" --> Passed[Status: PASSED]
    FinalStatus -- "grade > 3.0" --> Failed[Status: FAILED]
    
    Passed --> UpdateStatus[Resolution Status set to COMPLETED]
    Failed --> UpdateStatus
    
    UpdateStatus --> ApplyLock[Lock Academic Record for History]
    ApplyLock --> Save[Commit Changes to Database]
    
    Save --> NotifyRegistrar[Notify Registrar Office]
    NotifyRegistrar --> NotifyStudent[Notify Student of Result]
    NotifyStudent --> End([Flow Completed])
```
