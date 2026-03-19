# Grade Submission System Logic

Detailed logic for processing final grade submissions.

```mermaid
graph TD
    Start([Submission Start]) --> Finalized{Record Locked?}
    Finalized -- "Yes" --> LockError[Show Record Locked Error]
    Finalized -- "No" --> WindowCheck{Grading Window Open?}
    
    WindowCheck -- "No" --> WindowError[Show Window Closed Error]
    WindowCheck -- "Yes" --> UpdateRecord[Update Grade Value & Timestamp]
    
    UpdateRecord --> StatusLogic{Determine Grade Status}
    StatusLogic -- "1.0 - 3.0" --> Passed[Status: PASSED]
    StatusLogic -- "5.0" --> Failed[Status: FAILED]
    StatusLogic -- "INC" --> Incomplete[Status: INC]
    
    Incomplete --> SubjectCheck{Is Major Subject?}
    SubjectCheck -- "Yes" --> MajorDeadline[Set 6-Month Resolution Deadline]
    SubjectCheck -- "No" --> MinorDeadline[Set 12-Month Resolution Deadline]
    
    Passed --> Save[Save & Record Professor Load Assignment]
    Failed --> Save
    MajorDeadline --> Save
    MinorDeadline --> Save
    
    Save --> Notify[Notify Registrar for Finalization]
    Notify --> End([Process Complete])
```

#### Backend Reference
- Handled by `GradingService.submit_final`.
- **INC Policy**: The system automatically differentiates between major and minor subjects for the resolution window.
