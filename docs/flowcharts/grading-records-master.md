# Grading & Records Master Flow

Comprehensive guide for grade submission, finalization, and resolution management.

## 1. Grade Submission (Professor Step)
How professors record academic performance.

```mermaid
graph TD
    Start([Professor Dashboard]) --> SelectSection[Select Assigned Section]
    SelectSection --> ViewRoster[View Student Roster]
    
    ViewRoster --> GradingPeriod{Grading Period?}
    GradingPeriod -- "Midterm Open" --> EnterMidterm[Enter Midterm Grades]
    GradingPeriod -- "Final Open" --> EnterFinal[Enter Final Grades]
    GradingPeriod -- "Closed" --> WindowClosed([Window Closed: View Only])
    
    EnterMidterm --> SaveMidterm[Save Records & Notify Registrar]
    
    EnterFinal --> FinalStatus{Grade Value}
    FinalStatus -- "1.0 - 3.0" --> Passed[Status: PASSED]
    FinalStatus -- "5.0" --> Failed[Status: FAILED]
    FinalStatus -- "INC" --> INC[Status: INC]
    
    INC --> SetDeadline[System Sets 6/12 Month Resolution Deadline]
    
    Passed --> SubmitFinal[Submit & Lock Record]
    Failed --> SubmitFinal
    SetDeadline --> SubmitFinal
    
    SubmitFinal --> Finalize[Registrar Finalizes & Locks]
    Finalize --> End([Official Record Saved])
```

---

## 2. Grade Finalization & Historical Data
Registrar steps to lock records and encode TORs.

### A. Record Finalization
```mermaid
graph TD
    Start([Grades Submitted]) --> RegistrarReview[Registrar Reviews Roster]
    RegistrarReview --> FinalizeSection{Finalize Section?}
    
    FinalizeSection -- "Yes" --> ApplyLock[Set finalized_at and finalized_by]
    ApplyLock --> FreezeRecords[Disable all further edits]
    
    FinalizeSection -- "Term End" --> GlobalLock[Apply Global Term Lock]
    GlobalLock --> ArchiveRecords[Archive Academic Records for Term]
    
    FreezeRecords --> End([Records Official])
    ArchiveRecords --> End
```

### B. Historical Encoding (Legacy Data)
```mermaid
graph TD
    Start([Input Data]) --> BulkUpload[Upload CSV/Excel of Student Grades]
    BulkUpload --> ValidateRecords[Validate IDN and Subject Codes]
    
    ValidateRecords --> LoopRecords{Loop: Process each record}
    LoopRecords -- "Record" --> CreateGrade[Create Grade Record with historical_source]
    CreateGrade --> BypassApproval[Bypass Program Head Approval]
    BypassApproval --> SetStatus[Set Status: COMPLETED / PASSED]
    SetStatus --> LoopRecords
    
    LoopRecords -- "Finished" --> RecalcStanding[Trigger Student Standing Recalculation]
    RecalcStanding --> End([History Encoded])
```

---

## 3. INC Resolution Flow
Process for resolving Incomplete grades.

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
